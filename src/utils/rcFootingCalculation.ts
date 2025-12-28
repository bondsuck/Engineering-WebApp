import { CONSTANTS } from '../constants';

// ==========================================
// 1. INTERFACES
// ==========================================
export interface FootingInput {
    // Loads
    P_dl: number;       // Tons (Service Dead Load)
    P_ll: number;       // Tons (Service Live Load)
    Mx_dl: number;      // T-m (Service Moment X)
    Mx_ll: number;      // T-m
    My_dl: number;      // T-m (Service Moment Y)
    My_ll: number;      // T-m

    // Soil
    qa: number;         // Tons/m2 (Allowable Soil Bearing Capacity)
    
    // Geometry
    bx: number;         // m (Footing Width X)
    by: number;         // m (Footing Length Y)
    thickness: number;  // cm (Thickness)
    col_x: number;      // cm (Column Width)
    col_y: number;      // cm (Column Depth)
    depth_df: number;   // m (Depth of Foundation from ground)
    soil_density: number; // kg/m3 (Avg soil density above footing)

    // Material
    fc: number;         // ksc
    fy: number;         // ksc
    covering: number;   // cm (Usually 7.5cm)
    
    // Rebar
    mainBarDia: number; // mm
    spacingX: number;   // cm (Provided)
    spacingY: number;   // cm (Provided)
}

export interface FootingResult {
    // Loads
    P_service: number;
    P_ultimate: number;
    Mx_ultimate: number;
    My_ultimate: number;
    
    // Soil Pressure Check
    q_gross_max: number; // T/m2
    q_net_allow: number; // T/m2
    q_status: 'PASS' | 'FAIL';
    
    // Pressure Profile (For Section View & Design)
    q_max_x: number; // Edge pressure along X
    q_min_x: number;
    q_max_y: number; // Edge pressure along Y
    q_min_y: number;
    
    eccentricityStatus: 'OK' | 'WARNING'; // e > B/6 check
    
    // Shear Check
    d: number; // cm
    OneWayX: { Vu: number, PhiVn: number, status: 'PASS' | 'FAIL' };
    OneWayY: { Vu: number, PhiVn: number, status: 'PASS' | 'FAIL' };
    Punching: { Vu: number, PhiVn: number, status: 'PASS' | 'FAIL', perimeter: number };

    // Flexure Design
    DesignX: { Mu: number, As_req: number, As_prov: number, status: 'PASS' | 'FAIL' };
    DesignY: { Mu: number, As_req: number, As_prov: number, status: 'PASS' | 'FAIL' };

    overallStatus: 'PASS' | 'FAIL';
    
    // BOQ
    volConcrete: number;
    weightSteel: number;
    areaForm: number;
    volExcavate: number;
}

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

// คำนวณโมเมนต์ของแรงดันดินรูปสี่เหลี่ยมคางหมู (Trapezoidal Load Integration)
const calculateCantileverMoment = (q_face: number, q_edge: number, L_cantilever: number, Width: number) => {
    // q_face = Pressure at column face (T/m2)
    // q_edge = Pressure at footing edge (T/m2)
    // L_cantilever = Length of overhang (m)
    // Width = Width of footing perpendicular to span (m)
    
    // Formula derived from integration: M = Width * (L^2 / 6) * (q_face + 2 * q_edge)
    return (Math.pow(L_cantilever, 2) / 6) * (q_face + 2 * q_edge) * Width;
};

// ==========================================
// 3. CALCULATION ENGINE
// ==========================================
export const calculateFooting = (input: FootingInput): FootingResult => {
    const { 
        P_dl, P_ll, Mx_dl, Mx_ll, My_dl, My_ll,
        qa, bx, by, thickness, col_x, col_y, depth_df, soil_density,
        fc, fy, covering, mainBarDia, spacingX, spacingY
    } = input;

    // --- 1. Load Combinations ---
    const P_serv = P_dl + P_ll;
    const Mx_serv = Mx_dl + Mx_ll;
    const My_serv = My_dl + My_ll;

    const P_ult = 1.4 * P_dl + 1.7 * P_ll;
    const Mx_ult = 1.4 * Mx_dl + 1.7 * Mx_ll;
    const My_ult = 1.4 * My_dl + 1.7 * My_ll;

    const Area = bx * by;
    const Sx = (bx * Math.pow(by, 2)) / 6; // Section Modulus for Mx (bending around X axis)
    const Sy = (by * Math.pow(bx, 2)) / 6; // Section Modulus for My (bending around Y axis)

    // --- 2. Soil Pressure Check (Service Load) ---
    // Self Weight Footing + Soil Surcharge
    const w_footing = (bx * by * (thickness/100)) * 2.4; // Tons
    const w_soil = (bx * by * (depth_df - thickness/100)) * (soil_density/1000); // Tons
    const P_total_serv = P_serv + w_footing + w_soil;

    // q = P/A + M/S
    const q_avg = P_total_serv / Area;
    const q_mx = Math.abs(Mx_serv) / Sx;
    const q_my = Math.abs(My_serv) / Sy;
    
    const q_gross_max = q_avg + q_mx + q_my;
    const q_gross_min = q_avg - q_mx - q_my;

    // Check Uplift & Bearing
    let soilStatus: 'PASS' | 'FAIL' = q_gross_max <= qa ? 'PASS' : 'FAIL';
    if (q_gross_min < 0) soilStatus = 'FAIL'; // Uplift

    // Eccentricity Check (e > B/6)
    const ex = Math.abs(My_serv) / P_serv; // Moment My causes eccentricity along X
    const ey = Math.abs(Mx_serv) / P_serv; // Moment Mx causes eccentricity along Y
    let eccStatus: 'OK' | 'WARNING' = 'OK';
    if (ex > bx/6 || ey > by/6) eccStatus = 'WARNING';


    // --- 3. Ultimate Pressure for Structural Design ---
    // We use Factored Load P_ult / Area +/- M_ult / S
    const qu_avg = P_ult / Area;
    const qu_mx_term = Math.abs(Mx_ult) / Sx;
    const qu_my_term = Math.abs(My_ult) / Sy;

    // Calculate Pressure Profiles for Design
    // Along X-Axis (caused by My):
    const qu_x_max = qu_avg + qu_my_term + qu_mx_term; // Conservative: combine both moments
    const qu_x_min = qu_avg - qu_my_term + qu_mx_term; 
    
    // Along Y-Axis (caused by Mx):
    const qu_y_max = qu_avg + qu_mx_term + qu_my_term;
    const qu_y_min = qu_avg - qu_mx_term + qu_my_term;

    const qu_design_max = qu_avg + qu_mx_term + qu_my_term; // Absolute max corner pressure

    // Effective Depth (d)
    const d = thickness - covering - (mainBarDia/10); // cm

    // --- 4. Shear Design ---
    const phi_shear = 0.85;

    // 4.1 One-Way Shear
    // Design for X-Shear (Cut perpendicular to X axis)
    const dist_col_face_x = (bx/2) - (col_x/100)/2; // Cantilever length X
    const crit_dist_x = dist_col_face_x - (d/100); 
    let Vu_1way_x = 0;
    if (crit_dist_x > 0) Vu_1way_x = qu_design_max * (crit_dist_x * by); // Conservative (using max q)
    
    const Vc_1way_x = 0.53 * Math.sqrt(fc) * (by*100) * d / 1000;
    const PhiVc_1way_x = phi_shear * Vc_1way_x;

    // Design for Y-Shear
    const dist_col_face_y = (by/2) - (col_y/100)/2;
    const crit_dist_y = dist_col_face_y - (d/100);
    let Vu_1way_y = 0;
    if (crit_dist_y > 0) Vu_1way_y = qu_design_max * (crit_dist_y * bx);
    
    const Vc_1way_y = 0.53 * Math.sqrt(fc) * (bx*100) * d / 1000;
    const PhiVc_1way_y = phi_shear * Vc_1way_y;

    // 4.2 Punching Shear
    const c1 = col_x + d; 
    const c2 = col_y + d;
    const bo = 2 * (c1 + c2);
    
    const area_punch = (c1 * c2) / 10000; // m2
    const Vu_punch = P_ult - (qu_design_max * area_punch); // Conservative
    
    const beta = Math.max(col_x, col_y) / Math.min(col_x, col_y);
    const Vc_p1 = 1.06 * Math.sqrt(fc) * bo * d;
    const Vc_p2 = 0.53 * (1 + 2/beta) * Math.sqrt(fc) * bo * d;
    const Vc_punch = Math.min(Vc_p1, Vc_p2) / 1000;
    const PhiVc_punch = phi_shear * Vc_punch;

    // --- 5. Flexural Design (Optimized Trapezoidal) ---
    const phi_flex = 0.90;
    
    // Design Direction X (Rebar runs parallel to X, Resists My moment)
    // Analyze cantilever strip of length Lx = dist_col_face_x
    // Pressure varies linearly from Center to Edge along X.
    // q_edge = qu_x_max
    // q_center = qu_avg + qu_mx_term (Pressure at x=0)
    // q_face = q_center + (slope * distance_to_face)
    const slope_x = (qu_x_max - (qu_avg + qu_mx_term)) / (bx/2);
    const q_face_x = (qu_avg + qu_mx_term) + slope_x * (col_x/100)/2;
    
    // Optimized Moment X
    const Mu_x_tonm = calculateCantileverMoment(q_face_x, qu_x_max, dist_col_face_x, by);

    // Design Direction Y (Rebar runs parallel to Y, Resists Mx moment)
    const slope_y = (qu_y_max - (qu_avg + qu_my_term)) / (by/2);
    const q_face_y = (qu_avg + qu_my_term) + slope_y * (col_y/100)/2;
    
    // Optimized Moment Y
    const Mu_y_tonm = calculateCantileverMoment(q_face_y, qu_y_max, dist_col_face_y, bx);

    // Rebar Calculation Function
    const calcRebar = (Mu: number, width_m: number) => {
        const Mu_kgcm = Mu * 1000 * 100;
        const b_cm = width_m * 100;
        const Rn = Mu_kgcm / (phi_flex * b_cm * d * d);
        const m = fy / (0.85 * fc);
        let rho = (1/m) * (1 - Math.sqrt(Math.max(0, 1 - (2*m*Rn)/fy)));
        
        const rho_min = 0.0018; 
        if (rho < rho_min || isNaN(rho)) rho = rho_min;
        
        return rho * b_cm * d; // As req (cm2)
    };

    const As_req_x = calcRebar(Mu_x_tonm, by); // Distributed along by
    const As_req_y = calcRebar(Mu_y_tonm, bx); // Distributed along bx

    // Provided Rebar
    const barArea = (Math.PI * Math.pow(mainBarDia/10, 2)) / 4;
    const numBarsX = Math.floor((by * 100) / spacingX) + 1; // Bars running X are spaced along Y
    const As_prov_x = numBarsX * barArea;

    const numBarsY = Math.floor((bx * 100) / spacingY) + 1; // Bars running Y are spaced along X
    const As_prov_y = numBarsY * barArea;

    // --- 6. Results ---
    const overallStatus = (
        soilStatus === 'PASS' && eccStatus === 'OK' &&
        PhiVc_1way_x >= Vu_1way_x && PhiVc_1way_y >= Vu_1way_y && PhiVc_punch >= Vu_punch &&
        As_prov_x >= As_req_x && As_prov_y >= As_req_y
    ) ? 'PASS' : 'FAIL';

    // BOQ
    const volConcrete = bx * by * (thickness/100);
    const lenX = bx - 2*(covering/100);
    const lenY = by - 2*(covering/100);
    const unitW = Math.pow(mainBarDia/10, 2) * 0.00617 * 100; // kg/m
    const weightSteel = (numBarsX * lenX + numBarsY * lenY) * unitW;
    const areaForm = 2 * (bx + by) * (thickness/100);
    const volExcavate = (bx + 0.5) * (by + 0.5) * depth_df;

    return {
        P_service: P_serv, P_ultimate: P_ult, Mx_ultimate: Mx_ult, My_ultimate: My_ult,
        q_gross_max, q_net_allow: qa, q_status: soilStatus,
        q_max_x: qu_x_max, q_min_x: qu_x_min, q_max_y: qu_y_max, q_min_y: qu_y_min,
        eccentricityStatus: eccStatus,
        d,
        OneWayX: { Vu: Vu_1way_x, PhiVn: PhiVc_1way_x, status: PhiVc_1way_x >= Vu_1way_x ? 'PASS' : 'FAIL' },
        OneWayY: { Vu: Vu_1way_y, PhiVn: PhiVc_1way_y, status: PhiVc_1way_y >= Vu_1way_y ? 'PASS' : 'FAIL' },
        Punching: { Vu: Vu_punch, PhiVn: PhiVc_punch, status: PhiVc_punch >= Vu_punch ? 'PASS' : 'FAIL', perimeter: bo },
        DesignX: { Mu: Mu_x_tonm, As_req: As_req_x, As_prov: As_prov_x, status: As_prov_x >= As_req_x ? 'PASS' : 'FAIL' },
        DesignY: { Mu: Mu_y_tonm, As_req: As_req_y, As_prov: As_prov_y, status: As_prov_y >= As_req_y ? 'PASS' : 'FAIL' },
        overallStatus,
        volConcrete, weightSteel, areaForm, volExcavate
    };
};

// ==========================================
// 4. OPTIMIZATION ENGINE
// ==========================================
export const optimizeFooting = (currentInput: FootingInput): FootingInput | null => {
    // 1. Setup Constraints
    const minBx = Math.ceil((currentInput.col_x / 100) * 10) / 10 + 0.4; // Col + 40cm round up
    const minBy = Math.ceil((currentInput.col_y / 100) * 10) / 10 + 0.4;
    const maxB = 5.0; 
    const maxThk = 100; // cm

    // 2. Search Loop (Smallest -> Largest)
    for (let b = Math.max(minBx, minBy); b <= maxB; b += 0.10) { // Step 10cm
        for (let t = 20; t <= maxThk; t += 5) { // Step 5cm
            
            // Construct Trial Input (Assume Square for simplicity in Auto mode)
            const trialInput: FootingInput = {
                ...currentInput,
                bx: parseFloat(b.toFixed(2)),
                by: parseFloat(b.toFixed(2)),
                thickness: t
            };

            const res = calculateFooting(trialInput);

            const soilPass = res.q_status === 'PASS';
            const eccPass = res.eccentricityStatus === 'OK';
            const shearPass = res.OneWayX.status === 'PASS' && 
                              res.OneWayY.status === 'PASS' && 
                              res.Punching.status === 'PASS';
            
            // If Geometry Passes, return it immediately (Smallest Cost)
            // Rebar can be adjusted later by user if needed.
            if (soilPass && eccPass && shearPass) {
                return trialInput;
            }
        }
    }

    return null; // Not found
};