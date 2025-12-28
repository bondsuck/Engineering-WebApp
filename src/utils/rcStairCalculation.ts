import { CONSTANTS } from '../constants';
import { checkStairStandard, DesignStandard, getLoadFactors, CodeCheckResult } from './stairStandards';

export interface StairInput {
    structType: 'Slab' | 'Zigzag' | 'Spiral';      
    supportType: 'Longitudinal' | 'Cantilever'; 
    layoutType: 'Straight' | 'DogLegged';
    landingSupport: 'Supported' | 'Free'; 
    standard: DesignStandard;

    floorHeight: number; width: number;
    riser: number; going: number; waist: number;
    landingTop: number; landingBot: number; upperFloorThk: number;
    
    spiralRadius: number; spiralSweep: number;

    sdl: number; ll: number;
    fc: number; fy: number; covering: number; mainBarDia: number; spacing: number;
}

export interface StairResult {
    calcHeight: number; numSteps: number; actualRiser: number; totalRun: number; totalSpan: number; slopeDeg: number;
    headroom: number; headroomStatus: 'PASS' | 'FAIL';
    w_dead_slope: number; w_live: number; w_total: number; 
    loadFactorText: string; // ✅ Display Factor Info
    beamLoad_Unfactored: number; beamLoad_Factored: number; beamTorsion_Factored: number;
    reaction_R1: number; reaction_R2: number;
    Mu_max: number; d: number; As_req: number; As_prov: number; As_temp: number;
    delta_immediate: number; delta_longterm: number; delta_allow: number; deflectionStatus: 'PASS' | 'FAIL';
    naturalFreq: number; vibrationStatus: 'COMFORT' | 'BOUNCY';
    status: 'PASS' | 'FAIL'; warnings: string[];
    volConcrete: number; weightSteel: number; areaForm: number;
    codeCheck: CodeCheckResult;
}

export const calculateStair = (input: StairInput): StairResult => {
    const { 
        structType, supportType, layoutType, landingSupport, standard,
        floorHeight, width, riser, going, waist, landingTop, landingBot,
        spiralRadius, spiralSweep, sdl, ll, fc, fy, covering, mainBarDia, spacing
    } = input;

    const warnings: string[] = [];

    // 1. Geometry Setup
    const isDogLegged = layoutType === 'DogLegged';
    const calcHeight = isDogLegged ? floorHeight / 2 : floorHeight;
    const numSteps = Math.round((calcHeight * 100) / riser);
    const actualRiser = (calcHeight * 100) / numSteps;
    
    let flightRun = 0, actualGoing = going, totalSpan = 0;

    if (structType === 'Spiral') {
        const innerRadius = spiralRadius - width;
        const walkingRadius = innerRadius + 0.6 * width; 
        const arcLen = (spiralSweep / 360) * 2 * Math.PI * walkingRadius;
        actualGoing = (arcLen * 100) / numSteps;
        flightRun = (spiralSweep / 360) * 2 * Math.PI * spiralRadius; 
        totalSpan = arcLen; 
        warnings.push("Spiral Stair: PCA Method required for detailed rebar.");
    } else {
        flightRun = (numSteps - 1) * (going / 100); 
        actualGoing = going;
        totalSpan = supportType === 'Cantilever' ? width : landingBot + flightRun + landingTop;
    }

    const angleRad = Math.atan(actualRiser / actualGoing);
    const angleDeg = angleRad * (180 / Math.PI);
    const cosTheta = Math.cos(angleRad);

    // 2. Headroom & Code
    const verticalWaist = (waist / 100) / cosTheta;
    const headroom = (floorHeight / (isDogLegged ? 2 : 1)) - verticalWaist;
    const codeCheck = checkStairStandard(standard, actualRiser, actualGoing, width, headroom);
    if (codeCheck.status === 'FAIL') warnings.push(...codeCheck.messages);
    const headroomStatus = codeCheck.status === 'FAIL' && headroom < 2.0 ? 'FAIL' : 'PASS';

    // 3. Loads (Dynamic Factors) ✅
    const factors = getLoadFactors(standard); // Get DL/LL factors
    let w_self = structType === 'Slab' ? (verticalWaist * 2400) + ((actualRiser/100/2)*2400) : (verticalWaist * 2400); 
    const w_dead = w_self + sdl; 
    const w_service = w_dead + ll; 
    const w_factored = (factors.DL * w_dead) + (factors.LL * ll); // ✅ Dynamic Formula
    const w_design = w_factored * 1.0; 

    // 4. Analysis
    let Mu = 0, R1 = 0, R2 = 0, beamLoad_Unf = 0, beamLoad_Fac = 0, beamTorsion = 0;  

    if (structType === 'Spiral') {
        Mu = (w_design * Math.pow(totalSpan, 2)) / 10; 
        beamTorsion = Mu * 0.15; 
        R1 = (w_factored * width * totalSpan) / 2 / 1000; R2 = R1;
    } else if (supportType === 'Cantilever') {
        Mu = (w_design * Math.pow(totalSpan, 2)) / 2;
        R1 = (w_factored * totalSpan * (landingBot + flightRun + landingTop)) / 1000;
        beamTorsion = Mu; 
        beamLoad_Fac = w_factored * totalSpan;
        beamLoad_Unf = w_service * totalSpan;
        warnings.push("Cantilever: Beam/Wall must be designed for TORSION.");
    } else {
        if (landingSupport === 'Free') { 
            Mu = (w_design * Math.pow(totalSpan, 2)) / 8;
            warnings.push("Cranked Slab: Check re-entrant corners.");
            R1 = (w_factored * width * totalSpan) / 2 / 1000; R2 = R1;
        } else { 
            Mu = (w_design * Math.pow(totalSpan, 2)) / 8;
            R1 = (w_factored * width * totalSpan) / 2 / 1000; R2 = R1;
            beamLoad_Fac = (R1 * 1000) / width;
            beamLoad_Unf = (w_service * width * totalSpan / 2) / width;
        }
    }

    // 5. Rebar & Serviceability
    let d = waist - covering - (mainBarDia/10)/2;
    if (structType === 'Zigzag') d = d * 0.85;

    const calcAs = (Mu_kgm: number, d_cm: number) => {
        const Rn = (Mu_kgm * 100) / (0.9 * 100 * d_cm * d_cm);
        const m_steel = fy / (0.85 * fc);
        let rho = (1/m_steel) * (1 - Math.sqrt(Math.max(0, 1 - (2*m_steel*Rn)/fy)));
        if (rho < 0.0018 || isNaN(rho)) rho = 0.0018;
        return rho * 100 * d_cm; 
    };

    const As_req = calcAs(Mu, d);
    const As_temp = 0.0018 * 100 * waist;
    const As_prov = (100 / spacing) * (Math.PI * Math.pow(mainBarDia/10, 2)) / 4;
    
    // Deflection
    const Ec = 15100 * Math.sqrt(fc); const Es = 2040000; const n = Es / Ec;
    const Ig = (100 * Math.pow(waist, 3)) / 12;
    const nAs = n * As_prov;
    const kd = (Math.sqrt(Math.pow(nAs, 2) + 2*100*nAs*d) - nAs) / 100;
    const Icr = (100 * Math.pow(kd, 3) / 3) + (nAs * Math.pow(d - kd, 2));
    const fr = 2.0 * Math.sqrt(fc);
    const Ma = (supportType==='Cantilever' ? w_service * Math.pow(totalSpan,2)/2 : w_service * Math.pow(totalSpan,2)/8) * 100;
    const ratio = (fr * Ig / (waist/2)) < Ma ? Math.pow((fr * Ig / (waist/2))/Ma, 3) : 1;
    const Ie = Math.min(Ig, ratio * Ig + (1 - ratio) * Icr);

    const L_cm = totalSpan * 100;
    let delta_imm = supportType==='Cantilever' ? (w_service/100 * Math.pow(L_cm, 4))/(8*Ec*Ie) : (5 * w_service/100 * Math.pow(L_cm, 4))/(384*Ec*Ie);
    const delta_long = delta_imm * 3.0; 
    const delta_allow = L_cm / 480;
    const deflectionStatus = delta_long <= delta_allow ? 'PASS' : 'FAIL';

    // Vibration
    const g = 981;
    const w_mass = (w_dead + 0.2*ll) * 1.0 / 100; 
    let fn = supportType === 'Cantilever' ? 0.56 * Math.sqrt((Ec*Ie*g) / (w_mass * Math.pow(L_cm, 4))) : (Math.PI / 2) * Math.sqrt((Ec*Ie*g) / (w_mass * Math.pow(L_cm, 4)));
    const vibrationStatus = fn >= 5.0 ? 'COMFORT' : 'BOUNCY';
    if(vibrationStatus==='BOUNCY') warnings.push(`Vibration: ${fn.toFixed(1)}Hz < 5Hz`);

    // 6. BOQ
    const vol = (totalSpan * width * waist/100) + (numSteps * actualRiser/100 * actualGoing/100 / 2 * width);
    const weightSteel = vol * 120;
    const areaForm = totalSpan * width * 2; 

    return {
        calcHeight, numSteps, actualRiser, totalRun: flightRun, totalSpan, slopeDeg: angleDeg,
        headroom, headroomStatus,
        w_dead_slope: w_dead, w_live: ll, w_total: w_factored,
        loadFactorText: `${factors.DL}DL + ${factors.LL}LL`, // ✅
        beamLoad_Unfactored: beamLoad_Unf, beamLoad_Factored: beamLoad_Fac, beamTorsion_Factored: beamTorsion,
        reaction_R1: R1, reaction_R2: R2,
        Mu_max: Mu, d, As_req, As_prov, As_temp,
        delta_immediate: delta_imm, delta_longterm: delta_long, delta_allow, deflectionStatus, crackStatus: 'PASS',
        naturalFreq: fn, vibrationStatus,
        status: (As_prov >= As_req && deflectionStatus === 'PASS' && headroomStatus === 'PASS' && codeCheck.status === 'PASS') ? 'PASS' : 'FAIL',
        warnings, volConcrete: vol, weightSteel, areaForm, codeCheck
    };
};