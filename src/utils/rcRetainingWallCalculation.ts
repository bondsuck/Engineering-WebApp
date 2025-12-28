import { CONSTANTS } from '../constants';

// ==========================================
// 1. INTERFACES
// ==========================================
export interface WallInput {
    // Structure Type
    type: 'Cantilever' | 'Counterfort'; 
    
    // Geometry
    h_total: number;    // m
    t_stem: number;     // cm
    t_base: number;     // cm
    l_toe: number;      // m
    l_heel: number;     // m
    
    // Counterfort Specific
    cf_spacing: number; // m (Spacing center-to-center)
    cf_thick: number;   // cm (Thickness of fin)

    // Key
    hasKey: boolean;
    keyDepth: number;   // cm
    keyThk: number;     // cm

    // Soil & Water
    gamma_soil: number; // kg/m3
    phi: number;        // degrees
    beta: number;       // degrees (Backfill Slope)
    mu: number;         // Friction coeff
    qa: number;         // Tons/m2
    surcharge: number;  // kg/m2
    waterDepth: number; // m (Depth of water from ground level)

    // Seismic (Mononobe-Okabe)
    useSeismic: boolean;
    kh: number; // Horizontal coeff (e.g. 0.18)
    kv: number; // Vertical coeff

    // Material
    fc: number;         // ksc
    fy: number;         // ksc
    covering: number;   // cm
    mainBarDia: number; // mm
    spacing: number;    // cm
}

export interface WallResult {
    B: number;
    Ka: number;
    Kae: number; 
    
    // Forces
    Pa_static: number;
    Pa_seismic_increment: number; 
    Pa_water: number;
    Pa_surcharge: number;
    P_total_horiz: number;
    
    // Vertical
    Sum_V: number;

    // Stability
    M_overturn: number;
    M_resist: number;
    FS_overturn: number; status_overturn: 'PASS' | 'FAIL';
    FS_sliding: number; status_sliding: 'PASS' | 'FAIL';
    
    // Bearing
    q_max: number; q_min: number; eccentricity: number; status_bearing: 'PASS' | 'FAIL';

    // Structural Design
    designMode: string; // "Vertical Cantilever" or "Horizontal Slab"
    Mu_stem: number; d_stem: number; As_req_stem: number; As_prov: number; status_stem: 'PASS' | 'FAIL';
    
    Mu_toe: number; As_req_toe: number; status_toe: 'PASS' | 'FAIL';
    Mu_heel: number; As_req_heel: number; status_heel: 'PASS' | 'FAIL';

    warnings: string[];
    volConcrete: number; weightSteel: number; areaForm: number;
}

// ==========================================
// 2. HELPER: MONONOBE-OKABE
// ==========================================
const calcKae = (phi: number, beta: number, delta: number, theta: number) => {
    const d2r = Math.PI / 180;
    const p = phi * d2r;
    const b = beta * d2r;
    const d = delta * d2r; 
    const t = theta * d2r; 

    // M-O Formula
    const num = Math.pow(Math.cos(p - t), 2);
    
    const term1 = Math.cos(t) * Math.pow(Math.cos(b), 2) * Math.cos(d + b + t);
    const sqrtTop = Math.sin(p + d) * Math.sin(p - t - b); 
    const sqrtBot = Math.cos(d + b + t) * Math.cos(b); 
    
    if (sqrtTop < 0 || sqrtBot < 0) return 1.0; // Fail safe

    const term2 = Math.pow(1 + Math.sqrt(sqrtTop / sqrtBot), 2);
    
    return num / (term1 * term2);
};

// ==========================================
// 3. CALCULATION ENGINE
// ==========================================
export const calculateRetainingWall = (input: WallInput): WallResult => {
    const { 
        type, h_total, t_stem, t_base, l_toe, l_heel,
        cf_spacing, cf_thick,
        hasKey, keyDepth, keyThk,
        gamma_soil, phi, beta, mu, qa, surcharge, waterDepth,
        useSeismic, kh, kv,
        fc, fy, covering, mainBarDia, spacing
    } = input;

    const warnings: string[] = [];

    // 1. Geometry Setup
    const B = l_toe + (t_stem/100) + l_heel;
    const h_stem = h_total - (t_base/100);

    // 2. Lateral Pressures (Static + Seismic)
    const phiRad = phi * (Math.PI / 180);
    const betaRad = beta * (Math.PI / 180);
    
    // Static Ka (Rankine)
    const cosBeta = Math.cos(betaRad);
    const cosPhi = Math.cos(phiRad);
    const rootTerm = Math.sqrt(Math.pow(cosBeta, 2) - Math.pow(cosPhi, 2));
    const Ka = cosBeta * ((cosBeta - rootTerm) / (cosBeta + rootTerm));

    // Seismic Kae (M-O)
    let Kae = Ka;
    let theta = 0;
    if (useSeismic) {
        theta = Math.atan(kh / (1 - kv)) * (180 / Math.PI);
        const delta = phi / 2; 
        Kae = calcKae(phi, 0, delta, theta); 
        if (Kae > Ka * 1.5) warnings.push(`High Seismic Pressure: Kae (${Kae.toFixed(3)}) is significantly higher than Ka.`);
    }

    // 3. Forces Calculation
    const h_water = Math.max(0, h_total - waterDepth);
    const h_soil = h_total; 

    // 3.1 Water (Hydrostatic)
    const Pa_water = 0.5 * 1000 * Math.pow(h_water, 2);
    const arm_water = h_water / 3;

    // 3.2 Soil (Static Active)
    const Pa_static = 0.5 * gamma_soil * Math.pow(h_soil, 2) * Ka;
    const arm_static = h_soil / 3;

    // 3.3 Seismic Increment (Delta Pae)
    let Pa_seismic_inc = 0;
    let arm_seismic = h_soil * 0.6; // M-O force acts higher
    
    if (useSeismic) {
        const Pae = 0.5 * gamma_soil * Math.pow(h_soil, 2) * Kae * (1 - kv);
        Pa_seismic_inc = Math.max(0, Pae - Pa_static);
    }

    // 3.4 Surcharge
    const Pa_sur = surcharge * h_soil * (useSeismic ? Kae : Ka);
    const arm_sur = h_soil / 2;

    const P_total_horiz = Pa_static + Pa_seismic_inc + Pa_water + Pa_sur;

    // Moments (Overturning)
    const M_overturn = (Pa_static * arm_static) + (Pa_seismic_inc * arm_seismic) + (Pa_water * arm_water) + (Pa_sur * arm_sur);

    // 4. Vertical Forces (Resisting)
    let W_cf = 0;
    if (type === 'Counterfort') {
        const vol_one_cf = l_heel * h_stem * (cf_thick/100);
        W_cf = (vol_one_cf * 2400) / cf_spacing; // Weight per m run
    }

    const W_stem = (t_stem/100) * h_stem * CONSTANTS.MATERIAL_WEIGHTS.CONCRETE;
    const W_base = B * (t_base/100) * CONSTANTS.MATERIAL_WEIGHTS.CONCRETE;
    const W_soil = (l_heel * h_stem * gamma_soil) - W_cf; 
    const W_sur_vert = l_heel * surcharge;
    
    let W_key = 0;
    if (hasKey) W_key = (keyThk/100) * (keyDepth/100) * CONSTANTS.MATERIAL_WEIGHTS.CONCRETE;

    const Sum_V = W_stem + W_base + W_soil + W_sur_vert + W_key + W_cf;

    // Moments Resisting (About Toe)
    const arm_stem = l_toe + (t_stem/100)/2;
    const arm_base = B/2;
    const arm_heel_centroid = l_toe + (t_stem/100) + l_heel/2;
    
    const M_resist = (W_stem*arm_stem) + (W_base*arm_base) + (W_soil*arm_heel_centroid) + (W_sur_vert*arm_heel_centroid) + (W_key*arm_stem) + (W_cf*arm_heel_centroid);

    // 5. Stability Checks
    const FS_overturn = M_resist / M_overturn;
    const limit_OT = useSeismic ? 1.1 : 2.0; 
    const status_overturn = FS_overturn >= limit_OT ? 'PASS' : 'FAIL';

    const Fr = Sum_V * mu;
    const FS_sliding = Fr / P_total_horiz;
    const limit_SL = useSeismic ? 1.1 : 1.5;
    const status_sliding = FS_sliding >= limit_SL ? 'PASS' : 'FAIL';

    const x_bar = (M_resist - M_overturn) / Sum_V;
    const eccentricity = (B/2) - x_bar;
    const q_avg = (Sum_V / 1000) / B; 
    const q_max = q_avg * (1 + (6*Math.abs(eccentricity))/B);
    const q_min = q_avg * (1 - (6*Math.abs(eccentricity))/B);
    
    let status_bearing: 'PASS' | 'FAIL' = 'PASS';
    if (Math.abs(eccentricity) > B/6) status_bearing = 'FAIL'; // Tension check
    if (q_max > qa * (useSeismic ? 1.33 : 1.0)) status_bearing = 'FAIL'; 

    // 6. Structural Design
    // Stem Pressure Base (Triangular)
    const p_base = (gamma_soil * h_stem * Ka) + (surcharge * Ka); 
    const p_base_factored = 1.7 * p_base;

    // --- STEM DESIGN LOGIC ---
    let Mu_stem = 0;
    let designMode = "";

    if (type === 'Cantilever') {
        designMode = "Vertical Cantilever";
        Mu_stem = 1.7 * ((0.5 * gamma_soil * Math.pow(h_stem, 2) * Ka * h_stem/3) + (surcharge * h_stem * Ka * h_stem/2));
    } else {
        designMode = "Horizontal Slab (Continuous)";
        // Counterfort: Design bottom strip spanning horizontally
        const L_span = cf_spacing;
        Mu_stem = (p_base_factored * Math.pow(L_span, 2)) / 12; 
        warnings.push("Counterfort: Main reinforcement is HORIZONTAL. Vertical is temp.");
    }

    const d_stem = t_stem - covering - (mainBarDia/10)/2;
    
    const calcRebar = (Mu: number, d_cm: number) => {
        const phi = 0.90;
        const Mu_kgcm = Mu * 100;
        const Rn = Mu_kgcm / (phi * 100 * d_cm * d_cm);
        const m = fy / (0.85 * fc);
        let rho = (1/m) * (1 - Math.sqrt(Math.max(0, 1 - (2*m*Rn)/fy)));
        if (rho < 0.002 || isNaN(rho)) rho = 0.002;
        return rho * 100 * d_cm; 
    };

    const As_req_stem = calcRebar(Mu_stem, d_stem);
    const barArea = (Math.PI * Math.pow(mainBarDia/10, 2)) / 4;
    const As_prov_stem = (100 / spacing) * barArea;
    const status_stem = As_prov_stem >= As_req_stem ? 'PASS' : 'FAIL';

    // Base Design (Toe & Heel)
    // Toe Design (Cantilever Upward)
    const q_stem_face = q_max - ((q_max - q_min) / B) * l_toe;
    const Mu_toe = 1.7 * ((q_stem_face * 1000 * l_toe * l_toe/2) - (l_toe * t_base/100 * 2400 * l_toe/2)); 
    const d_base = t_base - covering - (mainBarDia/10)/2;
    const As_req_toe = calcRebar(Math.max(0, Mu_toe), d_base);
    const status_toe = As_prov_stem >= As_req_toe ? 'PASS' : 'FAIL'; 

    // Heel Design (Cantilever Downward - Conservative)
    const Mu_heel = 1.7 * ((l_heel * h_stem * gamma_soil * l_heel/2) + (l_heel * t_base/100 * 2400 * l_heel/2)); 
    const As_req_heel = calcRebar(Math.max(0, Mu_heel), d_base);
    const status_heel = As_prov_stem >= As_req_heel ? 'PASS' : 'FAIL';

    // BOQ
    const volConc = (Sum_V - W_soil - W_sur_vert)/2400;
    const weightSteel = volConc * 100;
    const areaForm = h_stem*2 + B*2;

    return {
        B, Ka, Kae, Pa_static, Pa_seismic_increment: Pa_seismic_inc, Pa_water, 
        
        // ✅ แก้ตรงนี้ครับ: จับคู่ตัวแปร Pa_sur ให้ตรงกับ Interface
        Pa_surcharge: Pa_sur, 
        
        P_total_horiz, Sum_V,
        M_overturn, M_resist, 
        FS_overturn, status_overturn, FS_sliding, status_sliding,
        q_max, q_min, eccentricity, status_bearing,
        designMode, Mu_stem, d_stem, As_req_stem, As_prov: As_prov_stem, status_stem,
        Mu_toe, As_req_toe, status_toe,
        Mu_heel, As_req_heel, status_heel,
        warnings, volConcrete: volConc, weightSteel, areaForm
    };
};

export const autoGeometry = (H: number) => {
    const B = Math.ceil(H * 0.6 * 10) / 10;
    const t_base = Math.ceil(H * 0.1 * 100 / 5) * 5;
    return { t_stem: t_base, t_base, l_toe: Math.ceil(B/3*10)/10, l_heel: B - Math.ceil(B/3*10)/10 - t_base/100 };
};