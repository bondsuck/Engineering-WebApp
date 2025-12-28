import { CONSTANTS, MATERIAL_COSTS, UI_TEXT } from '../constants';
import { Standard, Language } from '../types';

export interface PileCapInput {
    Pu: number; Mx: number; My: number; includeSelfWeight: boolean;
    col_x: number; col_y: number; h: number; covering: number; fc: number; fy: number;
    pileDia: number; pileSafeLoad: number; pileFS: number; numPiles: number;
    spacingFactor: number; edgeFactor: number; pileEmbedment: number;
    autoExpand: boolean; deviations: { dx: number, dy: number }[];
    barDiaX: number; spacingX: number; barDiaY: number; spacingY: number;
    stirrupDia: number; hasTopBar: boolean;
    isDeepBeamAnalysis: boolean;
    standard: Standard; 
}

export interface CalculationStep { title: string; content: string[]; }

export interface AxisDesignResult { 
    axis: 'X' | 'Y'; mode: 'Shallow' | 'Deep'; av: number; 
    Mu: number; As_req: number; As_prov: number; As_min: number; 
    Vu: number; PhiVn: number; 
    statusMoment: 'PASS' | 'FAIL'; statusShear: 'PASS' | 'FAIL'; 
    note: string; steps: string[]; 
}

export interface PileReaction { id: number; x: number; y: number; R: number; status: 'PASS' | 'FAIL'; }

export interface PileCapResult {
    status: 'PASS' | 'FAIL'; Lx: number; Ly: number; d: number;
    P_total: number; Mx_design: number; My_design: number;
    reactions: PileReaction[]; maxReaction: number; minReaction: number; pileCapacityUlt: number;
    designX: AxisDesignResult; designY: AxisDesignResult;
    punching: { Vu: number; PhiVn: number; perimeter: number; ratio: number; status: 'PASS' | 'FAIL'; steps: string[] };
    spacingCheck: { min: number, actual: number, status: 'PASS' | 'FAIL' };
    volConcrete: number; weightSteel: number; areaForm: number; estCost: number;
    reportSteps: CalculationStep[];
    topBarReq: number;
}

const fmt = (n: number, d: number = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const roundUp5 = (val: number) => Math.ceil(val / 5) * 5;

const eq = (name: string, val: string, unit: string = "") => 
    `<div style="display:flex; justify-content:space-between; align-items:center;"><span>${name}</span> <span style="white-space:nowrap; margin-left:8px;">= <b>${val}</b> ${unit}</span></div>`;
const sub = (text: string) => `<span style="color:#64748b; display:block; margin-left:8px; opacity:0.8;">↳ ${text}</span>`;

const getCoordinatesPattern = (n: number, s: number): { x: number, y: number }[] => {
    const coords: { x: number, y: number }[] = [];
    if (n === 2) { coords.push({ x: -s/2, y: 0 }, { x: s/2, y: 0 }); } 
    else if (n === 3) { const h = s * Math.sin(Math.PI/3); coords.push({ x: -s/2, y: -h/3 }, { x: s/2, y: -h/3 }, { x: 0, y: 2*h/3 }); } 
    else if (n === 4) { coords.push({ x: -s/2, y: s/2 }, { x: s/2, y: s/2 }, { x: -s/2, y: -s/2 }, { x: s/2, y: -s/2 }); } 
    else if (n === 5) { coords.push({ x: -s/2, y: s/2 }, { x: s/2, y: s/2 }, { x: -s/2, y: -s/2 }, { x: s/2, y: -s/2 }, { x: 0, y: 0 }); } 
    else if (n === 6) { coords.push({ x: -s, y: s/2 }, { x: 0, y: s/2 }, { x: s, y: s/2 }); coords.push({ x: -s, y: -s/2 }, { x: 0, y: -s/2 }, { x: s, y: -s/2 }); }
    return coords;
};

export const calculatePileCap = (input: PileCapInput, lang: Language): PileCapResult => {
    const { 
        Pu, Mx, My, fc, fy, standard,
        col_x, col_y, h, covering,
        pileDia, pileSafeLoad, pileFS, numPiles, 
        spacingFactor, edgeFactor, pileEmbedment, 
        deviations, autoExpand, isDeepBeamAnalysis,
        barDiaX, spacingX, barDiaY, spacingY, stirrupDia, hasTopBar 
    } = input;

    const t = UI_TEXT[lang]?.rcPileCap?.report || UI_TEXT['en'].rcPileCap.report;
    const PHI = standard === 'ACI318-19' ? CONSTANTS.PHI.ACI318_19 : CONSTANTS.PHI.EIT;
    const phi_flex = PHI.FLEXURE_MAX; 
    const phi_shear = PHI.SHEAR;

    const pileSpacing = spacingFactor * pileDia;
    const edgeDistance = edgeFactor * pileDia;
    const avgBarDia = (barDiaX + barDiaY) / 2;
    const d = h - covering - (avgBarDia / 10); 

    // --- GEOMETRY ---
    const baseCoords = getCoordinatesPattern(numPiles, pileSpacing);
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    
    const finalCoords = baseCoords.map((c, i) => {
        const dev = deviations[i] || { dx: 0, dy: 0 };
        const x = c.x + dev.dx;
        const y = c.y + dev.dy;
        if (i === 0) { minX = x; maxX = x; minY = y; maxY = y; }
        else {
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
        return { x, y };
    });

    let Lx_cm, Ly_cm;
    if (autoExpand) {
        Lx_cm = (maxX - minX) + 2 * edgeDistance; 
        Ly_cm = (maxY - minY) + 2 * edgeDistance;
    } else {
        const baseMinX = Math.min(...baseCoords.map(c=>c.x));
        const baseMaxX = Math.max(...baseCoords.map(c=>c.x));
        const baseMinY = Math.min(...baseCoords.map(c=>c.y));
        const baseMaxY = Math.max(...baseCoords.map(c=>c.y));
        Lx_cm = (baseMaxX - baseMinX) + 2 * edgeDistance;
        Ly_cm = (baseMaxY - baseMinY) + 2 * edgeDistance;
    }

    const Lx_calc = Math.max(Lx_cm, col_x + 2 * covering); 
    const Ly_calc = Math.max(Ly_cm, col_y + 2 * covering);
    
    const Lx_final = roundUp5(Lx_calc);
    const Ly_final = roundUp5(Ly_calc);

    let P_total = Pu; 
    let SW = 0;
    if (input.includeSelfWeight) {
        SW = (Lx_final * Ly_final * h / 1e6) * 2.4 * 1.4; 
        P_total += SW;
    }

    // --- REACTIONS ---
    const sumX = finalCoords.reduce((s, c) => s + c.x, 0);
    const sumY = finalCoords.reduce((s, c) => s + c.y, 0);
    const cgX = sumX / numPiles;
    const cgY = sumY / numPiles;

    const relCoords = finalCoords.map(c => ({ x: c.x - cgX, y: c.y - cgY }));
    const Ix = relCoords.reduce((s, c) => s + c.y**2, 0);
    const Iy = relCoords.reduce((s, c) => s + c.x**2, 0);

    const ex = -cgX; 
    const ey = -cgY;

    const Mx_design_cm = (Mx * 100) + (P_total * ey);
    const My_design_cm = (My * 100) + (P_total * ex);

    const pileCapacityUlt = pileSafeLoad * pileFS;
    const reactions: PileReaction[] = relCoords.map((c, i) => {
        const R_axial = P_total / numPiles;
        const R_mx = Ix !== 0 ? (Mx_design_cm * c.y) / Ix : 0;
        const R_my = Iy !== 0 ? (My_design_cm * c.x) / Iy : 0;
        const R = R_axial + R_mx + R_my;
        return {
            id: i + 1,
            x: finalCoords[i].x, 
            y: finalCoords[i].y,
            R: R,
            status: R <= pileCapacityUlt ? 'PASS' : 'FAIL'
        };
    });

    const maxReaction = Math.max(...reactions.map(r => r.R));
    const minReaction = Math.min(...reactions.map(r => r.R));
    let overallStatus: 'PASS' | 'FAIL' = reactions.some(r => r.status === 'FAIL') ? 'FAIL' : 'PASS';

    // --- DESIGN LOGIC ---
    const analyzeAxis = (axis: 'X' | 'Y'): AxisDesignResult => {
        const isX = axis === 'X';
        const colDim = isX ? col_x : col_y;
        const width_b = isX ? Ly_final : Lx_final;
        const currentBarDia = isX ? barDiaX : barDiaY;
        const currentSpacing = isX ? spacingX : spacingY;
        
        const d_axis = isX 
            ? h - covering - (barDiaX/10/2) 
            : h - covering - (barDiaX/10) - (barDiaY/10/2);

        const pilesWithDist = reactions.map(p => {
            const pos = isX ? p.x : p.y; 
            const distFromCenter = Math.abs(pos);
            const armToFace = distFromCenter - (colDim / 2);
            return { ...p, distFromCenter, armToFace, pos };
        });

        const criticalPiles = pilesWithDist.filter(p => p.armToFace > 0);
        let av = 0;
        if (criticalPiles.length > 0) av = Math.min(...criticalPiles.map(p => p.armToFace));
        
        const isDeep = isDeepBeamAnalysis && (av < 2 * d_axis); 
        
        let Mu = 0, Vu = 0, As_req = 0;
        let note = '';
        let statusMoment: 'PASS'|'FAIL' = 'PASS';
        let statusShear: 'PASS'|'FAIL' = 'PASS';
        let steps: string[] = [];

        // Moment
        const Mu_Pos = pilesWithDist.filter(p=>p.pos > 0 && p.armToFace > 0).reduce((s,p)=>s+p.R*p.armToFace, 0);
        const Mu_Neg = pilesWithDist.filter(p=>p.pos < 0 && p.armToFace > 0).reduce((s,p)=>s+p.R*p.armToFace, 0);
        const Mu_Tcm = Math.max(Mu_Pos, Mu_Neg);
        Mu = Mu_Tcm / 100; // T-m
        const Mu_kgcm = Mu_Tcm * 1000;

        steps.push(`<b>Flexure (${axis}-Axis):</b>`);
        steps.push(eq("Moment (Mu)", fmt(Mu), "T-m"));

        if (isDeep) {
            const z = 0.9 * d_axis;
            As_req = Mu_kgcm / (phi_flex * fy * z);
            Vu = pilesWithDist.reduce((sum, p) => p.armToFace > 0 ? sum + p.R : sum, 0);
            note = `${t.deep}`;
            steps.push(sub(`Deep Beam Mode (av < 2d)`));
            steps.push(eq("As = Mu/(φfy0.9d)", fmt(As_req), "cm²"));
        } else {
            const Rn = Mu_kgcm / (phi_flex * width_b * d_axis * d_axis);
            const m = fy / (0.85 * fc);
            let rho = (1/m) * (1 - Math.sqrt(Math.max(0, 1 - (2*m*Rn)/fy)));
            if (rho <= 0 || isNaN(rho)) rho = 0.002;
            As_req = rho * width_b * d_axis;
            
            const shearCritDist = (colDim/2) + d_axis;
            const Vu_1 = pilesWithDist.filter(p => p.pos > shearCritDist).reduce((s, p) => s + p.R, 0);
            const Vu_2 = pilesWithDist.filter(p => p.pos < -shearCritDist).reduce((s, p) => s + p.R, 0);
            Vu = Math.max(Vu_1, Vu_2);
            note = `${t.shallow}`;
            steps.push(sub(`Shallow Beam Mode`));
            steps.push(eq("As = ρbd", fmt(As_req), "cm²"));
        }

        let As_min = 0.0025 * width_b * d_axis;
        if (As_req < As_min) {
            As_req = As_min;
            steps.push(sub(`Check Min Steel: ${fmt(As_min)}`));
        }

        const numBars = Math.floor(width_b / currentSpacing) + 1;
        const barArea = (Math.PI * (currentBarDia/10)**2) / 4;
        const As_prov = numBars * barArea;

        steps.push(eq("As Prov", `<b>${fmt(As_prov)}</b>`, "cm²"));
        steps.push(sub(`${numBars}-DB${currentBarDia} @ ${currentSpacing}cm`));
        
        if (As_prov < As_req) statusMoment = 'FAIL';

        // Shear
        steps.push(`<b>Shear Check (${axis}-Axis):</b>`);
        steps.push(eq("Vu", fmt(Vu), "T"));
        
        const Vc_kg = 0.53 * Math.sqrt(fc) * width_b * d_axis;
        const PhiVn_tons = (phi_shear * Vc_kg) / 1000;
        
        steps.push(eq("Capacity φVn", `<b>${fmt(PhiVn_tons)}</b>`, "T"));

        if (Vu > PhiVn_tons) statusShear = 'FAIL';

        return { 
            axis, mode: isDeep ? 'Deep' : 'Shallow', av, 
            Mu, As_req, As_prov, As_min, 
            Vu, PhiVn: PhiVn_tons, 
            statusMoment, statusShear, note, steps 
        };
    };

    const designX = analyzeAxis('X');
    const designY = analyzeAxis('Y');
    
    if (designX.statusMoment === 'FAIL' || designX.statusShear === 'FAIL') overallStatus = 'FAIL';
    if (designY.statusMoment === 'FAIL' || designY.statusShear === 'FAIL') overallStatus = 'FAIL';

    // --- 5. PUNCHING ---
    const bo_x = col_x + d; 
    const bo_y = col_y + d;
    const bo = 2 * (bo_x + bo_y);
    
    const Vu_punch = reactions.reduce((sum, p) => {
         const dx = Math.abs(p.x - cgX - ex); 
         const dy = Math.abs(p.y - cgY - ey);
         if (dx > bo_x/2 || dy > bo_y/2) return sum + p.R;
         return sum;
    }, 0);

    const Vc_punch_kg = 1.06 * Math.sqrt(fc) * bo * d;
    const PhiVn_punch = (phi_shear * Vc_punch_kg) / 1000;
    const punchRatio = Vu_punch / PhiVn_punch;
    const punchingStatus = Vu_punch <= PhiVn_punch ? 'PASS' : 'FAIL';
    if (punchingStatus === 'FAIL') overallStatus = 'FAIL';

    const punchingSteps: string[] = [
        eq("Perimeter (bo)", fmt(bo), "cm"),
        eq("Vu Punching", fmt(Vu_punch), "T"),
        eq("Capacity φVn", `<b>${fmt(PhiVn_punch)}</b>`, "T"),
        eq("Ratio", fmt(punchRatio), punchingStatus)
    ];

    // --- 6. SPACING CHECK ---
    const actSpacingX = getMinPileSpacing(finalCoords);
    const reqSpacing = Math.max(2.5 * pileDia, 75);
    const spacingStatus = actSpacingX >= reqSpacing ? 'PASS' : 'FAIL';
    if (spacingStatus === 'FAIL') overallStatus = 'FAIL';

    // --- 7. BOQ ---
    const volConcrete = (Lx_final * Ly_final * h) / 1e6;
    const weightSteel_X = (designX.As_prov / 10000) * (Lx_final/100) * 7850; 
    const weightSteel_Y = (designY.As_prov / 10000) * (Ly_final/100) * 7850; 
    let weightSteel = weightSteel_X + weightSteel_Y;
    
    const topBarReq = 0.0018 * (Lx_final * h); 
    if (hasTopBar) {
        const weightTop = (topBarReq / 10000) * (Lx_final/100 + Ly_final/100) * 7850; 
        weightSteel += weightTop;
    }

    const areaForm = 2 * (Lx_final + Ly_final) * h / 10000; 
    
    const estCost = (volConcrete * MATERIAL_COSTS.CONCRETE_M3) +
                    (weightSteel * MATERIAL_COSTS.REBAR_KG) +
                    (areaForm * MATERIAL_COSTS.FORMWORK_M2);

    // --- 8. REPORT GENERATION ---
    const reactionSteps = [
        eq("P (Total)", fmt(P_total), "T"),
        eq("Mx / My", `${fmt(Mx_design_cm/100)} / ${fmt(My_design_cm/100)}`, "T-m"),
        `<div style="margin-top:4px; font-weight:bold; font-size:inherit;">Pile Reactions:</div>`
    ];
    reactions.forEach(r => {
        reactionSteps.push(eq(`P${r.id}`, fmt(r.R), "T"));
    });

    // ✅ เพิ่มหัวข้อ Detailing ใน Report (Stirrup/Binder)
    const detailingSteps: string[] = [
        sub("<b>Horizontal Binder (Stirrup):</b>"),
        sub(`Provide <b>RB${stirrupDia} @ 20 cm</b> (Min.)`),
        sub("Around perimeter & main steel group"),
        sub("For construction & crack control")
    ];

    // Append Detailing to one of the sections (e.g. Punching or New Section)
    // Here we will add it to the Design Object for UI to render
    
    return {
        status: overallStatus,
        Lx: Lx_final/100, Ly: Ly_final/100, d,
        P_total, Mx_design: Mx_design_cm/100000, My_design: My_design_cm/100000,
        reactions, maxReaction: Math.max(...reactions.map(r=>r.R)), minReaction: 0, pileCapacityUlt,
        designX, designY,
        // Append detailing to punching steps for compactness
        punching: { Vu: Vu_punch, PhiVn: PhiVn_punch, perimeter: bo, ratio: punchRatio, status: punchingStatus, steps: [...punchingSteps, ...detailingSteps] },
        spacingCheck: { min: actSpacingX, actual: actSpacingX, status: spacingStatus },
        volConcrete, weightSteel, areaForm, estCost,
        reportSteps: [
            { title: t.step2, content: reactionSteps }
        ],
        topBarReq
    };
};

function getMinPileSpacing(coords: {x:number, y:number}[]): number {
    let minD = Infinity;
    if (coords.length < 2) return 0;
    for (let i = 0; i < coords.length; i++) {
        for (let j = i + 1; j < coords.length; j++) {
            const dist = Math.sqrt((coords[i].x - coords[j].x)**2 + (coords[i].y - coords[j].y)**2);
            if (dist < minD) minD = dist;
        }
    }
    return minD;
}