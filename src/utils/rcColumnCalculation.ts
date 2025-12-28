import { Standard, Language } from '../types';
import { 
    REBAR_GRADES, 
    STRUCTURAL_STEEL_GRADES, 
    H_BEAM_STD, 
    MATERIAL_COSTS, 
    CONSTANTS,
    UI_TEXT
} from '../constants';

export interface CalculationStep { title: string; content: string[]; }

export interface ColumnInput {
    bx: number; by: number; L: number; fc: number; covering: number; 
    mainBarGrade: string; mainBarSize: number; nx: number; ny: number; 
    stirrupGrade: string; stirrupSize: number; stirrupSpacing: number; 
    steelSectionKey: string; steelGrade: string; customSteelProp?: any;
    kx: number; ky: number; braced: boolean; standard: Standard; 
    considerSlenderness: boolean;
    loads: LoadCase[];
}

export interface LoadCase {
    id: string; Pu: number; 
    Mx_top: number; Mx_bot: number; My_top: number; My_bot: number; 
    Vx: number; Vy: number; curvature: 'single' | 'double'; 
}

export interface LoadCheckResult {
    id: string; pc_x: number; delta_x: number; pc_y: number; delta_y: number;
    Mc_x: number; Mc_y: number; Mcap_x: number; Mcap_y: number;
    ratio_PM: number; ratio_Shear: number; 
    req_stirrup_spacing: number;
    As_req: number; As_prov: number; 
    status: 'pass' | 'fail'; note: string;
}

export interface ColumnResult {
    Pn_max: number; phiPn_max: number;
    curveX: { M: number, P: number }[]; curveY: { M: number, P: number }[];
    results: LoadCheckResult[]; maxInteractionRatio: number;
    status: 'pass' | 'fail'; criticalCase: string;
    volConcrete: number; weightRebar: number; weightStirrup: number; weightSteel: number;
    areaForm: number; estCost: number; 
    designStirrupSpacing: number;
    reportSteps: CalculationStep[];
}

// Helper Functions
const getEc = (fc: number) => CONSTANTS.STEEL.Ec_formula(fc);
const fmt = (n: number, d: number = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const getBeta1 = (fc: number) => {
    if (fc <= CONSTANTS.CONCRETE.BETA1_BREAKPOINT_KSC) return CONSTANTS.CONCRETE.BETA1_BASE;
    const beta = CONSTANTS.CONCRETE.BETA1_BASE - 0.05 * (fc - CONSTANTS.CONCRETE.BETA1_BREAKPOINT_KSC) / 70;
    return Math.max(CONSTANTS.CONCRETE.BETA1_MIN, beta);
};

const getPhiAxial = (epsilon_t: number, std: Standard) => {
    const PHI = std === 'ACI318-19' ? CONSTANTS.PHI.ACI318_19 : CONSTANTS.PHI.EIT;
    const phi_compression = PHI.COMPRESSION_TIED;
    const phi_tension = 0.90;
    if (epsilon_t <= 0.002) return phi_compression;
    if (epsilon_t >= 0.005) return phi_tension;
    return phi_compression + (epsilon_t - 0.002) * (250/3) * (phi_tension - phi_compression);
};

const getSteelProp = (key: string, custom?: any) => {
    if (key === "Custom" && custom) return custom;
    return H_BEAM_STD[key];
};

const formatResult = (val: number, limit: number, isMaxLimit: boolean = true) => {
    const pass = isMaxLimit ? val <= limit : val >= limit;
    const color = pass ? '#166534' : '#dc2626'; 
    const text = pass ? 'PASS' : 'FAIL';
    return `<span style="color:${color}; font-weight:bold;">${text}</span>`;
};

const formatPass = (status: string) => {
    const pass = status === 'pass';
    const color = pass ? '#166534' : '#dc2626'; 
    return `<span style="color:${color}; font-weight:bold;">${status.toUpperCase()}</span>`;
};

export const calculateColumnDesign = (input: ColumnInput, lang: Language): ColumnResult => {
    const { 
        bx, by, L, fc, covering, 
        mainBarGrade, mainBarSize, nx, ny, 
        stirrupGrade, stirrupSize, stirrupSpacing,
        steelSectionKey, customSteelProp, steelGrade,
        kx, ky, standard, considerSlenderness
    } = input;

    // --- Prepare Constants ---
    const t = UI_TEXT[lang]?.rcColumn?.report || UI_TEXT['en'].rcColumn.report;
    const fy_main = REBAR_GRADES[mainBarGrade] || 4000;
    const fy_stir = REBAR_GRADES[stirrupGrade] || 2400;
    const fy_steel = STRUCTURAL_STEEL_GRADES[steelGrade] || 2400;
    const Es_steel = CONSTANTS.STEEL.Es_ksc;

    // --- Geometry Properties ---
    const Ag = bx * by; 
    const As_bar = Math.PI * Math.pow(mainBarSize/10, 2) / 4;
    const numBars = Math.max(4, 2 * nx + 2 * (ny - 2)); 
    const As_total_rebar = numBars * As_bar;

    const steelProp = getSteelProp(steelSectionKey, customSteelProp);
    let As_struct = 0, Ix_steel = 0, Iy_steel = 0;
    if (steelProp) {
        const d = steelProp.d / 10, bf = steelProp.bf / 10, tw = steelProp.tw / 10, tf = steelProp.tf / 10;
        As_struct = (2 * bf * tf) + (d - 2 * tf) * tw;
        Ix_steel = (bf * Math.pow(d, 3) - (bf - tw) * Math.pow(d - 2 * tf, 3)) / 12;
        Iy_steel = (2 * tf * Math.pow(bf, 3) + (d - 2 * tf) * Math.pow(tw, 3)) / 12;
    }

    // --- P-M Interaction Curve Logic ---
    const genPMCurve = (b_bend: number, h_perp: number, n_bend_side: number, n_perp_side: number, axis: 'x'|'y') => {
        const points: { M: number, P: number }[] = [];
        const beta1 = getBeta1(fc);
        const d_prime = covering + stirrupSize/10 + mainBarSize/20;
        const layers: { d: number, A: number, type: 'rebar' | 'steel' }[] = [];
        layers.push({ d: d_prime, A: n_perp_side * As_bar, type: 'rebar' });
        layers.push({ d: b_bend - d_prime, A: n_perp_side * As_bar, type: 'rebar' });
        if (n_bend_side > 2) {
            const spacing = (b_bend - 2*d_prime) / (n_bend_side - 1);
            for (let i = 1; i < n_bend_side - 1; i++) layers.push({ d: d_prime + i*spacing, A: 2 * As_bar, type: 'rebar' });
        }
        if (steelProp) {
            const d_s = steelProp.d / 10, bf_s = steelProp.bf / 10, tf_s = steelProp.tf / 10, tw_s = steelProp.tw / 10;
            const center = b_bend / 2;
            if (axis === 'x') {
                const gap = (b_bend - d_s) / 2;
                layers.push({ d: gap + tf_s/2, A: bf_s * tf_s, type: 'steel' });
                layers.push({ d: center, A: (d_s - 2*tf_s) * tw_s, type: 'steel' });
                layers.push({ d: b_bend - gap - tf_s/2, A: bf_s * tf_s, type: 'steel' });
            } else {
                layers.push({ d: center, A: As_struct, type: 'steel' }); 
            }
        }
        const c_steps = [b_bend * 2.0, b_bend * 1.2, b_bend, b_bend * 0.75, b_bend * 0.6, b_bend * 0.375, b_bend * 0.25, b_bend * 0.15, b_bend * 0.1, 0.01];
        const P0 = 0.85 * fc * (Ag - As_total_rebar - As_struct) + As_total_rebar * fy_main + As_struct * fy_steel;
        const phi_axial = standard === 'ACI318-19' ? CONSTANTS.PHI.ACI318_19.COMPRESSION_TIED : CONSTANTS.PHI.EIT.COMPRESSION_TIED;
        const P_peak = phi_axial * P0 / 1000;
        points.push({ M: 0, P: P_peak });
        for (const c of c_steps) {
            const a = Math.min(beta1 * c, b_bend);
            const Cc = 0.85 * fc * a * h_perp;
            const y_c = b_bend / 2;
            let F_steel_sum = 0, M_sum = 0, min_strain = 0;
            for (const layer of layers) {
                const strain = 0.003 * (c - layer.d) / c;
                if (strain < min_strain) min_strain = strain;
                const E = Es_steel;
                const fy = layer.type === 'rebar' ? fy_main : fy_steel;
                let fs = Math.max(-fy, Math.min(fy, strain * E));
                let force = (strain > 0 && layer.d < a) ? layer.A * (fs - 0.85 * fc) : layer.A * fs;
                F_steel_sum += force;
                M_sum += force * (y_c - layer.d);
            }
            const M_conc = Cc * (y_c - a/2);
            const Pn = (Cc + F_steel_sum) / 1000; 
            const Mn = (M_conc + M_sum) / 100000; 
            const phi = getPhiAxial(Math.abs(min_strain), standard);
            const Pn_design = Pn * phi;
            if (Pn > -P0/1000) points.push({ M: Mn * phi, P: Pn_design });
        }
        return points.sort((a, b) => b.P - a.P);
    };

    const curveX = genPMCurve(by, bx, ny, nx, 'x');
    const curveY = genPMCurve(bx, by, nx, ny, 'y');
    
    // --- Axial Capacity ---
    const P0_calc = 0.85 * fc * (Ag - As_total_rebar - As_struct) + As_total_rebar * fy_main + As_struct * fy_steel;
    const phi_factor = standard === 'ACI318-19' ? CONSTANTS.PHI.ACI318_19.COMPRESSION_TIED : CONSTANTS.PHI.EIT.COMPRESSION_TIED;
    const Pn_max_val = phi_factor * 0.80 * P0_calc / 1000;

    // --- Slenderness Prep ---
    const Ec = getEc(fc);
    const Ig_x = bx * Math.pow(by, 3) / 12, Ig_y = by * Math.pow(bx, 3) / 12;
    let EI_eff_x = 0.4 * Ec * Ig_x, EI_eff_y = 0.4 * Ec * Ig_y;
    if (steelProp) {
        EI_eff_x = Es_steel * Ix_steel + 0.2 * Ec * Ig_x;
        EI_eff_y = Es_steel * Iy_steel + 0.2 * Ec * Ig_y;
    }

    // --- LOAD ANALYSIS LOOP ---
    const results: LoadCheckResult[] = input.loads.map(load => {
        let delta_x = 1.0, delta_y = 1.0;
        let Pc_x = 0, Pc_y = 0;
        
        // 1. Slenderness
        if (considerSlenderness) {
            const kLu = kx * L * 100;
            Pc_x = (Math.PI**2 * EI_eff_x) / Math.pow(kLu, 2) / 1000;
            Pc_y = (Math.PI**2 * EI_eff_y) / Math.pow(ky * L * 100, 2) / 1000;
            
            let Cm_x = 1.0, Cm_y = 1.0;
            if (Math.abs(load.Mx_top) > 0 || Math.abs(load.Mx_bot) > 0) {
                 const M1 = Math.min(Math.abs(load.Mx_top), Math.abs(load.Mx_bot));
                 const M2 = Math.max(Math.abs(load.Mx_top), Math.abs(load.Mx_bot));
                 Cm_x = 0.6 - 0.4 * (M1/M2); 
            }
            if (Math.abs(load.My_top) > 0 || Math.abs(load.My_bot) > 0) {
                 const M1 = Math.min(Math.abs(load.My_top), Math.abs(load.My_bot));
                 const M2 = Math.max(Math.abs(load.My_top), Math.abs(load.My_bot));
                 Cm_y = 0.6 - 0.4 * (M1/M2); 
            }
            delta_x = load.Pu < 0.75 * Pc_x ? Math.max(1.0, Cm_x / (1 - load.Pu / (0.75 * Pc_x))) : 99.9;
            delta_y = load.Pu < 0.75 * Pc_y ? Math.max(1.0, Cm_y / (1 - load.Pu / (0.75 * Pc_y))) : 99.9;
        }

        const M_input_x = Math.max(Math.abs(load.Mx_top), Math.abs(load.Mx_bot));
        const M_input_y = Math.max(Math.abs(load.My_top), Math.abs(load.My_bot));
        const Mc_x = M_input_x * delta_x;
        const Mc_y = M_input_y * delta_y;

        // 2. Interaction
        const getCapacityM = (curve: {M:number, P:number}[], targetP: number) => {
            if (targetP > curve[0].P) return 0;
            for (let i = 0; i < curve.length - 1; i++) {
                if (targetP <= curve[i].P && targetP >= curve[i+1].P) {
                    const ratio = (targetP - curve[i+1].P) / (curve[i].P - curve[i+1].P);
                    return curve[i+1].M + ratio * (curve[i].M - curve[i+1].M);
                }
            }
            return curve[curve.length-1].M;
        };
        const Mcap_x = getCapacityM(curveX, load.Pu);
        const Mcap_y = getCapacityM(curveY, load.Pu);
        
        let termX = 0, termY = 0;
        if (Mcap_x > 0) termX = Math.abs(Mc_x / Mcap_x);
        if (Mcap_y > 0) termY = Math.abs(Mc_y / Mcap_y);
        const ratio_PM = Math.pow(Math.pow(termX, CONSTANTS.BRESLER_ALPHA) + Math.pow(termY, CONSTANTS.BRESLER_ALPHA), 1/CONSTANTS.BRESLER_ALPHA);
        
        // 3. Shear Check
        const d_eff = by - covering; 
        const Vu = Math.sqrt(load.Vx**2 + load.Vy**2) * 1000; 
        const Nu = load.Pu * 1000; 
        const axial_factor = Nu > 0 ? (1 + Nu / (140 * Ag)) : 1.0; 
        const Vc_kg = 0.53 * Math.sqrt(fc) * bx * d_eff * axial_factor; 
        const phi_shear = standard === 'ACI318-19' ? CONSTANTS.PHI.ACI318_19.SHEAR : CONSTANTS.PHI.EIT.SHEAR;
        const phiVc = phi_shear * Vc_kg;
        
        const Av_prov = 2 * (Math.PI * Math.pow(stirrupSize/10, 2) / 4); // cm2
        let Av_req = 0;
        let req_stirrup_spacing = 999;

        if (Vu > phiVc) {
            const Vs_req_kg = (Vu / phi_shear) - Vc_kg;
            Av_req = (Vs_req_kg * stirrupSpacing) / (fy_stir * d_eff);
            const s_calc = (Av_prov * fy_stir * d_eff) / Vs_req_kg;
            req_stirrup_spacing = Math.min(s_calc, d_eff/2, 60); 
        } else {
            const Av_min = (3.5 * bx * stirrupSpacing) / fy_stir;
            if (Vu > phiVc / 2) {
                 Av_req = Av_min; 
            } else {
                 Av_req = 0; 
            }
            req_stirrup_spacing = Math.min(d_eff/2, 60); 
        }

        const Vs_prov = (Av_prov * fy_stir * d_eff) / stirrupSpacing;
        const phiVn = phi_shear * (Vc_kg + Vs_prov);
        const ratio_Shear = Vu / phiVn;

        let status: 'pass' | 'fail' = 'pass';
        let note = 'OK';
        if (delta_x > 90) { status = 'fail'; note = 'Unstable'; }
        else if (ratio_PM > 1.0) { status = 'fail'; note = 'P-M Fail'; }
        else if (ratio_Shear > 1.0) { status = 'fail'; note = 'Shear Fail'; }
        else if (load.Pu > Pn_max_val) { status = 'fail'; note = 'Axial Exceed'; }
        
        return { 
            id: load.id, pc_x: Pc_x, delta_x, pc_y: Pc_y, delta_y, 
            Mc_x, Mc_y, Mcap_x, Mcap_y, ratio_PM, ratio_Shear, 
            req_stirrup_spacing, 
            As_req: Av_req, As_prov: Av_prov,
            status, note 
        };
    });

    const status = results.every(r => r.status === 'pass') ? 'pass' : 'fail';
    const criticalRes = results.reduce((prev, curr) => (curr.ratio_PM > prev.ratio_PM ? curr : prev), results[0]);

    // BOQ
    const volConcrete = (bx * by / 10000) * L;
    const weightRebar = (As_total_rebar / 10000 * L) * CONSTANTS.MATERIAL_WEIGHTS.STEEL;
    const weightSteel = (As_struct / 10000 * L) * CONSTANTS.MATERIAL_WEIGHTS.STEEL;
    const areaForm = 2 * (bx + by) / 100 * L;
    const perimeterCore = 2 * (bx - 2 * covering) + 2 * (by - 2 * covering);
    const lenPerStirrup = (perimeterCore + 20) / 100;
    const numStirrups = Math.ceil((L * 100) / stirrupSpacing) + 1;
    const weightStirrup = lenPerStirrup * numStirrups * (Math.PI * Math.pow(stirrupSize/1000,2)/4 * CONSTANTS.MATERIAL_WEIGHTS.STEEL); 
    const estCost = (volConcrete * MATERIAL_COSTS.CONCRETE_M3) + 
                    (weightRebar * MATERIAL_COSTS.REBAR_KG) + 
                    (weightStirrup * MATERIAL_COSTS.REBAR_KG) + 
                    (weightSteel * MATERIAL_COSTS.STEEL_KG) + 
                    (areaForm * MATERIAL_COSTS.FORMWORK_M2); 

    // --- REPORT GENERATION ---
    const reportSteps: CalculationStep[] = [];
    const critLoad = input.loads.find(l => l.id === criticalRes.id)!;
    
    // 1. Params
    reportSteps.push({
        title: t.step1,
        content: [
            `<b>${t.size}:</b> ${bx} x ${by} cm, ${t.length}: ${L} m`,
            `<b>${t.code}:</b> ${standard} | f'c = ${fc} ksc | Main Fy = ${fy_main} ksc | Stirrup Fy = ${fy_stir} ksc`,
            `<b>${t.main}:</b> ${numBars}-DB${mainBarSize} (Ast = ${fmt(As_total_rebar,2)} cm²)`,
            `<b>${t.stirrup}:</b> RB${stirrupSize} @ ${stirrupSpacing} cm`
        ]
    });

    // 2. Critical Load
    reportSteps.push({
        title: `${t.step2}: ${criticalRes.id}`,
        content: [
            `<b>${t.factored}:</b> Pu = ${critLoad.Pu} T, Mx = ${fmt(Math.max(Math.abs(critLoad.Mx_top),Math.abs(critLoad.Mx_bot)))} T-m, My = ${fmt(Math.max(Math.abs(critLoad.My_top),Math.abs(critLoad.My_bot)))} T-m`,
            `<b>${t.slenderness}:</b> ${considerSlenderness ? `δx=${fmt(criticalRes.delta_x,3)}, δy=${fmt(criticalRes.delta_y,3)}` : t.ignored}`,
            `&nbsp;&nbsp; Mcx = ${fmt(criticalRes.Mc_x,2)} T-m, Mcy = ${fmt(criticalRes.Mc_y,2)} T-m`
        ]
    });

    // 3. P-M Interaction
    reportSteps.push({
        title: t.step3,
        content: [
            `<b>${t.axialCap}:</b> φPn(max) = ${fmt(Pn_max_val,2)} T ... ${formatResult(critLoad.Pu, Pn_max_val)}`,
            `<b>${t.bendCap}:</b> φMnx = ${fmt(criticalRes.Mcap_x,2)} T-m, φMny = ${fmt(criticalRes.Mcap_y,2)} T-m`,
            `<b>${t.interaction}:</b>`,
            `(${fmt(criticalRes.Mc_x,2)}/${fmt(criticalRes.Mcap_x,2)})^${CONSTANTS.BRESLER_ALPHA} + (${fmt(criticalRes.Mc_y,2)}/${fmt(criticalRes.Mcap_y,2)})^${CONSTANTS.BRESLER_ALPHA}`,
            `= <b>${fmt(criticalRes.ratio_PM,3)}</b> ... ${formatResult(criticalRes.ratio_PM, 1.0)}`
        ]
    });

    // 4. Shear Design (Detailed)
    const d_shear_eff = by - covering;
    const Vu_kg = Math.sqrt(critLoad.Vx**2 + critLoad.Vy**2) * 1000;
    const Nu_kg = critLoad.Pu * 1000;
    const axial_factor_shear = Nu_kg > 0 ? (1 + Nu_kg / (140 * Ag)) : 1.0;
    const Vc_ton = (0.53 * Math.sqrt(fc) * bx * d_shear_eff * axial_factor_shear) / 1000;
    const phi = standard === 'ACI318-19' ? CONSTANTS.PHI.ACI318_19.SHEAR : CONSTANTS.PHI.EIT.SHEAR;
    const phiVc = phi * Vc_ton;

    const shearContent = [
        `<b>${t.shearLoad}:</b> Vu = ${fmt(Vu_kg/1000,2)} T`,
        `<b>${t.concCap}:</b> Vc = 0.53√fc bd(1+Nu/140Ag) = <b>${fmt(Vc_ton,2)} T</b>`,
        `&nbsp;&nbsp; φVc = ${phi} * ${fmt(Vc_ton,2)} = <b>${fmt(phiVc,2)} T</b>`
    ];

    if (Vu_kg/1000 > phiVc) {
        shearContent.push(`<b>${t.stirrupReq}:</b> Vu > φVc -> Stirrups Required`);
        shearContent.push(`&nbsp;&nbsp; As Required = <b>${fmt(criticalRes.As_req,2)} cm²</b> (for s=${stirrupSpacing} cm)`);
    } else {
        shearContent.push(`<b>${t.stirrupReq}:</b> Vu < φVc -> Min. Reinforcement Check`);
        const Av_min_1 = (0.2 * Math.sqrt(fc) * bx * stirrupSpacing) / fy_stir;
        const Av_min_2 = (3.5 * bx * stirrupSpacing) / fy_stir;
        const Av_min_req = Math.max(Av_min_1, Av_min_2);
        
        shearContent.push(`&nbsp;&nbsp; Av,min = Max(0.2√fc bw s/fy, 3.5 bw s/fy)`);
        shearContent.push(`&nbsp;&nbsp; = Max(${fmt(Av_min_1,2)}, ${fmt(Av_min_2,2)}) = <b>${fmt(Av_min_req,2)} cm²</b>`);
        
        if (criticalRes.As_req < Av_min_req && Vu_kg/1000 > phiVc/2) {
             shearContent.push(`&nbsp;&nbsp; Use Min Area: <b>${fmt(Av_min_req,2)} cm²</b>`);
        }
    }

    shearContent.push(`<b>${t.check}:</b> As Provided = <b>${fmt(criticalRes.As_prov,2)} cm²</b> (RB${stirrupSize} @ ${stirrupSpacing}) ... ${formatPass(criticalRes.ratio_Shear <= 1 ? 'pass' : 'fail')}`);

    reportSteps.push({ title: t.step4, content: shearContent });

    // 5. Torsion
    const Acp = bx * by;
    const Pcp = 2 * (bx + by);
    const Tth = (0.27 * Math.sqrt(fc) * Math.pow(Acp, 2) / Pcp) / 100000; // T-m
    const phi_torsion = standard === 'ACI318-19' ? CONSTANTS.PHI.ACI318_19.TORSION : CONSTANTS.PHI.EIT.TORSION;
    const phiTth = phi_torsion * Tth;

    reportSteps.push({
        title: t.torsionTitle,
        content: [
            `<b>${t.threshold}:</b> ~ 0.27√fc Acp²/Pcp`,
            `&nbsp;&nbsp; Acp = ${fmt(Acp,0)} cm², Pcp = ${fmt(Pcp,0)} cm`,
            `&nbsp;&nbsp; Tth = ${fmt(Tth,3)} T-m -> φTth = <b>${fmt(phiTth,3)} T-m</b>`,
            `<b>${t.check}:</b> Tu (Input) = 0.00 T-m`,
            `&nbsp;&nbsp; Tu < φTth -> <b>${t.torsionNeglect}</b>`
        ]
    });

    return { 
        Pn_max: Pn_max_val, phiPn_max: Pn_max_val, 
        curveX, curveY, results, 
        maxInteractionRatio: Math.max(...results.map(r => r.ratio_PM)), 
        status, criticalCase: criticalRes.id, 
        volConcrete, weightRebar, weightStirrup, weightSteel, areaForm, estCost,
        designStirrupSpacing: stirrupSpacing, 
        reportSteps
    };
};

export const calculateBasePlate = (Pu: number, Mu: number, B_plate: number, N_plate: number, fc_pedestal: number, fy_plate: number, col_depth: number, col_width: number) => {
    const e = Pu > 0 ? (Math.abs(Mu) * 100) / (Pu * 1000) : 0;
    const L = N_plate;
    const crit_e = L / 6.0;
    const phi_c = 0.65;
    const fp_max = 0.85 * fc_pedestal;
    let bearing_stress = 0, anchor_tension = 0, status = "OK";
    if (e <= crit_e) {
        bearing_stress = (Pu * 1000) / (B_plate * N_plate) * (1 + (6 * e / N_plate));
    } else {
        let bearing_len = 3 * (L / 2.0 - e);
        if (bearing_len <= 0) bearing_len = 1.0;
        bearing_stress = (2 * Pu * 1000) / (B_plate * bearing_len);
        const vol_bearing = 0.5 * bearing_stress * bearing_len * B_plate;
        anchor_tension = Math.max(0, vol_bearing - Pu * 1000);
    }
    if (bearing_stress > phi_c * fp_max) status = "FAIL (Bearing)";
    const m = (N_plate - 0.95 * col_depth) / 2.0;
    const n = (B_plate - 0.80 * col_width) / 2.0;
    const n_prime = Math.sqrt(col_depth * col_width) / 4.0;
    const l_crit = Math.max(m, n, n_prime);
    const phi_b = 0.90;
    const req_t = l_crit * Math.sqrt((2 * bearing_stress) / (phi_b * fy_plate));
    return { e, bearing_stress, limit_stress: phi_c * fp_max, req_t, anchor_tension, status };
};

export const calculateShearStuds = (fc: number, stud_dia_mm: number, stud_fu: number, total_shear_ton: number, length_m: number) => {
    const Ec = CONSTANTS.STEEL.Ec_formula(fc);
    const Asc = Math.PI * Math.pow(stud_dia_mm/10, 2) / 4.0;
    const Rg = 1.0, Rp = 0.75;
    const term1 = 0.5 * Asc * Math.sqrt(fc * Ec);
    const term2 = Rg * Rp * Asc * stud_fu;
    const Qn_kg = Math.min(term1, term2);
    const Qn_ton = Qn_kg / 1000;
    const num_req = total_shear_ton > 0 && Qn_ton > 0 ? Math.ceil(total_shear_ton / Qn_ton) : 0;
    const pitch = num_req > 0 ? (length_m * 100) / num_req : 0;
    return { Qn_ton, num_req, pitch };
};