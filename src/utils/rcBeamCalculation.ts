import { BeamInput, CalculationResult, FlexureResult, LayerResult, Standard, SteelGrade, Language } from '../types';
import { CONSTANTS, GRADE_PROPERTIES, UI_TEXT } from '../constants';

// ==========================================
// 1. HELPER FUNCTIONS
// ==========================================

const checkBarFit = (numBars: number, barSizeMm: number, stirrupSizeMm: number, bw: number, cover: number) => {
    const db = barSizeMm / 10;
    const minClear = Math.max(db, CONSTANTS.MIN_CLEAR_SPACING_CM);
    const stirrup = stirrupSizeMm / 10;
    const reqWidth = (2 * cover) + (2 * stirrup) + (numBars * db) + (Math.max(0, numBars - 1) * minClear);
    return reqWidth <= bw;
};

const getMaxBarsPerLayer = (barSizeMm: number, stirrupSizeMm: number, bw: number, cover: number) => {
    if (bw <= (2 * cover)) return 1; 
    for (let n = 20; n >= 2; n--) {
        if (checkBarFit(n, barSizeMm, stirrupSizeMm, bw, cover)) return n;
    }
    return 1;
};

const fmt = (n: number, d: number = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

// ✅ Critical: Dynamic Phi Calculation based on ACI 318
const getPhiFlexure = (epsilon_t: number, standard: Standard) => {
    const PHI = standard === 'ACI318-19' ? CONSTANTS.PHI.ACI318_19 : CONSTANTS.PHI.EIT;
    
    // Tension Controlled (Strain >= 0.005)
    if (epsilon_t >= 0.005) return PHI.FLEXURE_MAX;
    
    // Compression Controlled (Strain <= 0.002)
    if (epsilon_t <= 0.002) return PHI.FLEXURE_MIN; 
    
    // Transition Zone (Linear Interpolation)
    return PHI.FLEXURE_MIN + (epsilon_t - 0.002) * (250/3) * (PHI.FLEXURE_MAX - PHI.FLEXURE_MIN);
};

// ==========================================
// 2. MAIN CALCULATION ENGINE
// ==========================================

export const calculateBeamDesign = (inputs: BeamInput, standard: Standard, lang: Language): CalculationResult => {
    const { fc, bw, h, covering, Mu_pos, Mu_neg, Vu, Tu } = inputs;
    
    if (bw <= 0 || h <= 0 || fc <= 0 || covering < 0) {
        // Return Empty Result if inputs are invalid
        return {
            phi_bending: 0.9, phi_shear: 0.75, phi_torsion: 0.75, fy_main: 0, fy_stirrup: 0, beta1: 0.85,
            bot: { a: 0, d_design: 0, epsilon_t: 0, As_calc: 0, As_min: 0, As_req: 0, Mu_capacity:0, ratio:0, isTensionControlled: true, layers: { numBars: 0, numLayers: 1, barsPerLayer: [], d_centroid: 0, isCongested: false } },
            top: { a: 0, d_design: 0, epsilon_t: 0, As_calc: 0, As_min: 0, As_req: 0, Mu_capacity:0, ratio:0, isTensionControlled: true, layers: { numBars: 0, numLayers: 1, barsPerLayer: [], d_centroid: 0, isCongested: false } },
            Vc: 0, phiVc: 0, Vu_limit: 0, Vs_req: 0, Av_s_shear_req: 0, Av_s_min: 0, shearStatus: 'OK',
            Tth: 0, isTorsionRequired: false, Al_req: 0, At_s_req: 0,
            Total_Av_s_req: 0, Total_As_bot_req: 0, Total_As_top_req: 0,
            actualNumBarsBot: 0, actualNumBarsTop: 0, actualStirrupSpacing: 0,
            As_bot_prov: 0, As_top_prov: 0, Av_s_prov: 0,
            statusBot: 'fail', statusTop: 'fail', statusShear: 'fail',
            notes: ["Invalid Input"],
            reportSteps: []
        } as unknown as CalculationResult;
    }

    const t = UI_TEXT[lang].beam.report;
    const { topBarSize, botBarSize, stirrupSize, mainBarGrade, stirrupGrade, providedTopBars, providedBotBars, providedStirrupSpacing, isManual } = inputs;
    const notes: string[] = [];

    const fy_main = GRADE_PROPERTIES[mainBarGrade as SteelGrade].fy;
    const fy_stirrup = GRADE_PROPERTIES[stirrupGrade as SteelGrade].fy;

    // PHI FACTORS (Base)
    const PHI = standard === 'ACI318-19' ? CONSTANTS.PHI.ACI318_19 : CONSTANTS.PHI.EIT;
    const phi_shear = PHI.SHEAR;
    const phi_torsion = PHI.TORSION || phi_shear;
    
    // ✅ Use Constants for Beta1
    let beta1 = CONSTANTS.CONCRETE.BETA1_BASE;
    if (fc > CONSTANTS.CONCRETE.BETA1_BREAKPOINT_KSC) {
        beta1 = Math.max(CONSTANTS.CONCRETE.BETA1_MIN, CONSTANTS.CONCRETE.BETA1_BASE - 0.05 * (fc - CONSTANTS.CONCRETE.BETA1_BREAKPOINT_KSC) / 70);
    }

    const epsilon_cu = 0.003;
    const epsilon_t_limit = 0.005;

    // --- FLEXURE CALCULATION ---
    const calcFlexure = (Mu: number, barSize: number, locationName: string, provBars: number): FlexureResult & { phi_used: number } => {
        const db = barSize / 10;
        const dst = stirrupSize / 10;
        const layerSpacing = db + Math.max(db, CONSTANTS.MIN_CLEAR_SPACING_CM);
        const y_first_layer = covering + dst + db/2; 
        
        let d_design = h - y_first_layer;
        let As_req_final = 0;
        let layersInfo: LayerResult = { numBars: 0, numLayers: 1, barsPerLayer: [], d_centroid: d_design, isCongested: false };
        let calculationVars = { a: 0, epsilon_t: 0, isTensionControlled: true, As_calc: 0, As_min: 0 };
        let phi_flex_final = PHI.FLEXURE_MAX;

        const MAX_ITER = 10;
        
        for (let iter = 0; iter < MAX_ITER; iter++) {
            let As_min_val = 0;
            if (standard === 'ACI318-19') {
                const min1 = (0.8 * Math.sqrt(fc) * bw * d_design) / fy_main;
                const min2 = (14 * bw * d_design) / fy_main;
                As_min_val = Math.max(min1, min2);
            } else {
                As_min_val = (14 / fy_main) * bw * d_design; 
            }

            if (Mu <= 0) { As_req_final = 0; break; }

            let phi_iter = PHI.FLEXURE_MAX; 
            
            const term_moment = (2 * Mu * 100) / (0.85 * fc * phi_iter * bw);
            const root_term = Math.pow(d_design, 2) - term_moment;
            let a = 0, As_calc = 0;
            let isTensionControlled = true, epsilon_t = 0;

            if (root_term < 0) {
                if(iter === 0) notes.push(`Error (${locationName}): Section too small (Compression Fail)`);
                a = d_design; isTensionControlled = false;
            } else {
                a = d_design - Math.sqrt(root_term);
                const c = a / beta1;
                epsilon_t = ((d_design - c) / c) * epsilon_cu;
                
                phi_iter = getPhiFlexure(epsilon_t, standard);
                
                if (epsilon_t < epsilon_t_limit) {
                    isTensionControlled = false;
                }
                
                As_calc = (Mu * 100) / (phi_iter * fy_main * (d_design - a/2));
            }

            let As_final = Math.max(As_calc, As_min_val);
            if (As_calc < As_min_val) {
                const As_req_4_3 = (4/3) * As_calc;
                if (As_req_4_3 < As_min_val) { As_final = As_req_4_3; As_min_val = As_req_4_3; }
            }

            calculationVars = { a, epsilon_t, isTensionControlled, As_calc, As_min: As_min_val };
            As_req_final = As_final;
            phi_flex_final = phi_iter;

            const barArea = (Math.PI * Math.pow(db / 2, 2));
            let numBars = Math.max(2, Math.ceil(As_final / barArea));
            if (isManual && provBars > 0) numBars = provBars;

            const maxBarsPerLayer = getMaxBarsPerLayer(barSize, stirrupSize, bw, covering);
            const numLayers = Math.ceil(numBars / maxBarsPerLayer);
            const barsPerLayer: number[] = [];
            let remaining = numBars, sum_Ay = 0, sum_A = 0;

            for (let i = 0; i < numLayers; i++) {
                const count = Math.min(remaining, maxBarsPerLayer);
                barsPerLayer.push(count);
                const y_layer = y_first_layer + (i * layerSpacing);
                sum_Ay += (count * barArea) * y_layer;
                sum_A += (count * barArea);
                remaining -= count;
            }

            const y_centroid = sum_A > 0 ? sum_Ay / sum_A : y_first_layer; 
            const d_new = h - y_centroid;
            layersInfo = { numBars, numLayers, barsPerLayer, d_centroid: d_new, isCongested: numBars > (maxBarsPerLayer * 3) };

            if (Math.abs(d_new - d_design) < 0.1) { d_design = d_new; break; }
            d_design = d_new;
        }

        const db_final = barSize / 10;
        const barArea = (Math.PI * Math.pow(db_final / 2, 2));
        const As_prov = layersInfo.numBars * barArea;
        const a_real = (As_prov * fy_main) / (0.85 * fc * bw);
        const Mn_kgm = (As_prov * fy_main * (d_design - a_real/2)) / 100;
        
        const Mu_capacity = phi_flex_final * Mn_kgm;
        const ratio = Mu > 0 ? Mu / Mu_capacity : 0;

        return { ...calculationVars, d_design, As_req: As_req_final, layers: layersInfo, Mu_capacity, ratio, phi_used: phi_flex_final };
    };

    const bot = calcFlexure(Mu_pos, botBarSize, "Bottom", providedBotBars);
    const top = calcFlexure(Mu_neg, topBarSize, "Top", providedTopBars);

    // --- SHEAR ---
    const d_shear = bot.d_design; 
    let Vc = 0;
    let Vc_formula = "";
    if (standard === 'ACI318-19') {
        const d_mm = d_shear * 10;
        let lambda_s = Math.sqrt(2 / (1 + 0.004 * d_mm));
        if (lambda_s > 1.0) lambda_s = 1.0;
        const botBarArea = (Math.PI * Math.pow(botBarSize/20, 2));
        const As_shear = Math.max(bot.As_req, isManual ? providedBotBars * botBarArea : 0);
        const rho_w = As_shear / (bw * d_shear);
        const fc_MPa = fc * CONSTANTS.CONV_KSC_TO_MPA;
        const bw_mm = bw * 10;
        const d_shear_mm = d_shear * 10;
        
        const lambda = CONSTANTS.CONCRETE.LAMBDA_LIGHTWEIGHT; // 1.0
        const Vc_N = (0.66 * lambda * lambda_s * Math.pow(Math.min(rho_w, 0.025), 1/3) * Math.sqrt(fc_MPa)) * bw_mm * d_shear_mm;
        Vc = Math.max(Vc_N * CONSTANTS.CONV_N_TO_KG, 0.53 * Math.sqrt(fc) * bw * d_shear);
        Vc_formula = `ACI (λ=${lambda}, λs=${fmt(lambda_s)}, ρw=${fmt(rho_w,4)})`;
    } else {
        Vc = 0.53 * Math.sqrt(fc) * bw * d_shear;
        Vc_formula = `0.53√fc' b d`;
    }

    const phiVc = phi_shear * Vc;
    const Vu_limit = phiVc / 2;
    const V_limit_section = phi_shear * 2.2 * Math.sqrt(fc) * bw * d_shear;

    let shearStatus: CalculationResult['shearStatus'] = 'OK';
    let Vs_req = 0, Av_s_shear_req = 0;

    if (Vu > V_limit_section) { shearStatus = 'Section Too Small'; notes.push("Error: Vu exceeds max capacity"); }
    else if (Vu > phiVc) { shearStatus = 'Need Stirrup'; Vs_req = (Vu - phiVc) / phi_shear; Av_s_shear_req = Vs_req / (fy_stirrup * d_shear); }
    else if (Vu > Vu_limit) { shearStatus = 'Need Stirrup'; notes.push("Vu > 0.5 phi Vc"); }

    let Av_s_min = standard === 'ACI318-19' ? Math.max((0.2 * Math.sqrt(fc) * bw) / fy_stirrup, (3.5 * bw) / fy_stirrup) : (3.5 * bw) / fy_stirrup;

    // --- TORSION ---
    const Acp = bw * h;
    const Pcp = 2 * (bw + h);
    const Tth = (phi_torsion * 0.27 * Math.sqrt(fc) * (Math.pow(Acp, 2) / Pcp)) / 100;
    
    let isTorsionRequired = false, At_s_req = 0, Al_req = 0;
    if (Tu > Tth) {
        isTorsionRequired = true;
        const Aoh = 0.85 * Acp;
        const Ph = 2 * ((bw - 8) + (h - 8));
        const Tn = (Tu * 100) / phi_torsion;
        At_s_req = Tn / (2 * Aoh * fy_stirrup);
        Al_req = standard === 'ACI318-19' ? At_s_req * Ph * (fy_stirrup / fy_main) : 2 * At_s_req * Ph;
    }

    const Total_Av_s_req = Math.max(Av_s_shear_req, Av_s_min) + (2 * At_s_req);
    const Total_As_bot_req = bot.As_req + (Al_req / 2);
    const Total_As_top_req = top.As_req + (Al_req / 2);

    const botBarAreaCalc = (Math.PI * Math.pow(botBarSize / 10 / 2, 2));
    const topBarAreaCalc = (Math.PI * Math.pow(topBarSize / 10 / 2, 2));
    const stirrupArea = 2 * (Math.PI * Math.pow(stirrupSize / 10 / 2, 2));

    let finalBot = isManual ? providedBotBars : Math.max(2, Math.ceil(Total_As_bot_req / botBarAreaCalc));
    let finalTop = isManual ? providedTopBars : Math.max(2, Math.ceil(Total_As_top_req / topBarAreaCalc));
    
    let finalSpacing = providedStirrupSpacing;
    if (!isManual) {
        if (Total_Av_s_req > 0) {
            const s_calc = stirrupArea / Total_Av_s_req;
            const s_max = Math.min(d_shear/2, 60);
            const raw = Math.min(s_calc, s_max);
            finalSpacing = Math.floor(raw / CONSTANTS.STIRRUP_STEP_CM) * CONSTANTS.STIRRUP_STEP_CM;
            if (finalSpacing < CONSTANTS.MIN_CLEAR_SPACING_CM) finalSpacing = CONSTANTS.MIN_CLEAR_SPACING_CM;
        } else { finalSpacing = 0; }
    }

    const Av_s_prov = finalSpacing > 0 ? stirrupArea / finalSpacing : 0;
    
    const statusBot = bot.ratio <= 1.0 ? 'pass' : 'fail';
    const statusTop = top.ratio <= 1.0 ? 'pass' : 'fail';
    const statusShear = Av_s_prov >= (Total_Av_s_req - 0.0001) ? 'pass' : 'fail';

    // ✅ LOCALIZED REPORT
    const formatPass = (s: string) => `<span style="color:${s==='pass'?'#166534':'#dc2626'}; font-weight:bold;">${s.toUpperCase()}</span>`;
    
    const reportSteps = [
        {
            title: t.step1,
            content: [
                `<b>${t.code}:</b> ${standard} (φFlex=${PHI.FLEXURE_MAX}-${PHI.FLEXURE_MIN}, φShear=${phi_shear})`,
                `<b>${t.concrete}:</b> f'c = ${fc} ksc, β1 = ${beta1.toFixed(2)}`,
                `<b>${t.rebar}:</b> Main fy = ${fy_main} ksc, Stirrup fy = ${fy_stirrup} ksc`,
                `<b>${t.section}:</b> ${bw} x ${h} cm, Cov = ${covering} cm`,
                `<b>Factored Loads:</b> Mu+ = ${fmt(Mu_pos)} kg-m, Mu- = ${fmt(Mu_neg)} kg-m, Vu = ${fmt(Vu)} kg`
            ]
        },
        {
            title: t.step2,
            content: [
                `<b>${t.effDepth}:</b> ${fmt(bot.d_design)} cm (Iterated)`,
                `<b>${t.calcA}:</b> a = d - √(d² - (2*Mu / (0.85*f'c*φ*b)))`,
                `&nbsp;&nbsp; a = ${fmt(bot.d_design)} - √(${fmt(bot.d_design)}² - (2*${fmt(Mu_pos*100,0)} / (0.85*${fc}*${bot.phi_used}*${bw}))) = <b>${fmt(bot.a)} cm</b>`,
                `&nbsp;&nbsp; εt = ${fmt(bot.epsilon_t,4)} -> φ used = <b>${fmt(bot.phi_used,3)}</b>`,
                `<b>${t.reqSteel}:</b> As = Mu / (φ * fy * (d - a/2))`,
                `&nbsp;&nbsp; As = ${fmt(Mu_pos*100,0)} / (${fmt(bot.phi_used,3)} * ${fy_main} * (${fmt(bot.d_design)} - ${fmt(bot.a)}/2)) = <b>${fmt(bot.As_calc)} cm²</b>`,
                `&nbsp;&nbsp; ${t.minAs} = ${fmt(bot.As_min)} cm² -> <b>${t.designAs} = ${fmt(bot.As_req)} cm²</b>`,
                `<b>${t.provide}:</b> ${finalBot}-DB${botBarSize} (As = ${fmt(finalBot*botBarAreaCalc)} cm²) ... ${formatPass(statusBot)}`,
                `<b>${t.capacity}:</b> φMn = ${fmt(bot.Mu_capacity,0)} kg-m (Ratio: ${bot.ratio.toFixed(2)})`
            ]
        },
        {
            title: t.step3,
            content: [
                `<b>${t.designMu}:</b> ${fmt(Mu_neg)} kg-m`,
                `&nbsp;&nbsp; a = ${fmt(top.a)} cm, εt = ${fmt(top.epsilon_t,4)} -> φ used = <b>${fmt(top.phi_used,3)}</b>`,
                `&nbsp;&nbsp; As_calc = ${fmt(top.As_calc)} cm², ${t.minAs} = ${fmt(top.As_min)} cm²`,
                `&nbsp;&nbsp; <b>${t.designAs} = ${fmt(top.As_req)} cm²</b>`,
                `<b>${t.provide}:</b> ${finalTop}-DB${topBarSize} (As = ${fmt(finalTop*topBarAreaCalc)} cm²) ... ${formatPass(statusTop)}`,
                `<b>${t.capacity}:</b> φMn = ${fmt(top.Mu_capacity,0)} kg-m (Ratio: ${top.ratio.toFixed(2)})`
            ]
        },
        {
            title: t.step4,
            content: [
                `<b>${t.concCap}:</b> ${Vc_formula}`,
                `&nbsp;&nbsp; Vc = <b>${fmt(Vc,0)} kg</b> -> φVc = <b>${fmt(phiVc,0)} kg</b>`,
                `<b>${t.shearReinf}:</b> Vu (${fmt(Vu,0)}) ${Vu > phiVc ? '>' : '<'} φVc (${fmt(phiVc,0)}) -> <b>${Vu > phiVc ? t.stirrupReq : t.minStirrup}</b>`,
                Vs_req > 0 ? `&nbsp;&nbsp; Vs_req = (Vu - φVc)/φ = <b>${fmt(Vs_req,0)} kg</b>` : ``,
                `<b>${t.torsion}:</b> Tu = ${fmt(Tu,0)} kg-m, Tth = ${fmt(Tth,0)} kg-m -> <b>${isTorsionRequired ? t.consider : t.ignore}</b>`,
                `<b>${t.spacingCalc}:</b> Av (2 legs RB${stirrupSize}) = ${fmt(stirrupArea)} cm²`,
                `&nbsp;&nbsp; ${t.avReq} = ${fmt(Total_Av_s_req, 4)} cm²/cm`,
                `&nbsp;&nbsp; ${t.maxSpace} = ${fmt(d_shear/2)} cm`,
                `<b>${t.provide}:</b> RB${stirrupSize} @ ${finalSpacing} cm ... ${formatPass(statusShear)}`
            ]
        }
    ];

    return {
        phi_bending: PHI.FLEXURE_MAX,
        phi_shear, phi_torsion, fy_main, fy_stirrup, beta1,
        bot, top, Vc, phiVc, Vu_limit, Vs_req, Av_s_shear_req, Av_s_min, shearStatus,
        Tth, isTorsionRequired, Al_req, At_s_req, Total_Av_s_req, Total_As_bot_req, Total_As_top_req,
        actualNumBarsBot: finalBot, actualNumBarsTop: finalTop, actualStirrupSpacing: finalSpacing,
        As_bot_prov: finalBot * botBarAreaCalc, As_top_prov: finalTop * topBarAreaCalc, Av_s_prov,
        statusBot, statusTop, statusShear,
        notes,
        reportSteps
    };
};