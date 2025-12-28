// Shared Types

export type Standard = 'ACI318-19' | 'EIT-Thai';
export type Language = 'en' | 'th';
export type SteelGrade = 'SR24' | 'SD30' | 'SD40' | 'SD50';

export interface BeamInput {
    fc: number;
    mainBarGrade: string;
    stirrupGrade: string;
    bw: number;
    h: number;
    covering: number;
    Mu_pos: number;
    Mu_neg: number;
    Vu: number;
    Tu: number;
    topBarSize: number;
    botBarSize: number;
    stirrupSize: number;
    providedTopBars: number;
    providedBotBars: number;
    providedStirrupSpacing: number;
    isManual: boolean;
}

export interface FlexureResult {
    a: number;
    d_design: number;
    epsilon_t: number;
    isTensionControlled: boolean;
    As_calc: number;
    As_min: number;
    As_req: number;
    Mu_capacity: number;
    ratio: number;
    layers: LayerResult;
}

export interface LayerResult {
    numBars: number;
    numLayers: number;
    barsPerLayer: number[];
    d_centroid: number;
    isCongested: boolean;
}

// ✅ เพิ่ม Interface สำหรับ Report Step
export interface CalculationStep {
    title: string;
    content: string[];
}

export interface CalculationResult {
    // Factors
    phi_bending: number;
    phi_shear: number;
    phi_torsion: number;
    fy_main: number;
    fy_stirrup: number;
    beta1: number;

    // Results
    bot: FlexureResult;
    top: FlexureResult;
    Vc: number;
    phiVc: number;
    Vu_limit: number;
    Vs_req: number;
    Av_s_shear_req: number;
    Av_s_min: number;
    shearStatus: 'OK' | 'Need Stirrup' | 'Section Too Small';
    
    // Torsion
    Tth: number;
    isTorsionRequired: boolean;
    Al_req: number;
    At_s_req: number;

    // Totals
    Total_Av_s_req: number;
    Total_As_bot_req: number;
    Total_As_top_req: number;

    // Provided
    actualNumBarsBot: number;
    actualNumBarsTop: number;
    actualStirrupSpacing: number;
    As_bot_prov: number;
    As_top_prov: number;
    Av_s_prov: number;

    // Status
    statusBot: 'pass' | 'fail';
    statusTop: 'pass' | 'fail';
    statusShear: 'pass' | 'fail';
    notes: string[];

    // ✅ เพิ่มบรรทัดนี้ครับ (Fix Error 2353)
    reportSteps: CalculationStep[]; 
}