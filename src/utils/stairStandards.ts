export type DesignStandard = 'Thai_MR55' | 'NFPA_101' | 'IBC_2021';

export interface CodeCheckResult {
    status: 'PASS' | 'FAIL';
    messages: string[];
}

// ✅ New: Helper to get Load Factors dynamically
export const getLoadFactors = (std: DesignStandard) => {
    switch (std) {
        case 'Thai_MR55':
            return { DL: 1.4, LL: 1.7, note: 'EIT/ACI (Classic)' };
        case 'NFPA_101':
        case 'IBC_2021':
            return { DL: 1.2, LL: 1.6, note: 'ASCE 7 / ACI 318 (Modern)' };
        default:
            return { DL: 1.4, LL: 1.7, note: 'Default' };
    }
};

export const checkStairStandard = (
    std: DesignStandard,
    riser: number, // cm
    going: number, // cm
    width: number, // m
    headroom: number // m
): CodeCheckResult => {
    const msgs: string[] = [];
    let isPass = true;

    // 1. กฎกระทรวงฉบับที่ 55 (ไทย)
    if (std === 'Thai_MR55') {
        if (riser > 20.0) { msgs.push(`ลูกตั้ง ${riser} cm เกินกำหนด (Max 20 cm)`); isPass = false; }
        if (going < 22.0) { msgs.push(`ลูกนอน ${going} cm น้อยกว่ากำหนด (Min 22 cm)`); isPass = false; }
        if (width < 0.90) { msgs.push(`ความกว้าง ${width} m น้อยกว่ากำหนด (Min 0.90 m)`); isPass = false; }
        if (headroom < 1.90) { msgs.push(`ระยะดิ่ง ${headroom.toFixed(2)} m น้อยกว่ากำหนด (Min 1.90 m)`); isPass = false; }
    }
    
    // 2. NFPA 101 (Life Safety Code)
    else if (std === 'NFPA_101') {
        if (riser > 17.8) { msgs.push(`Riser ${riser} cm exceeds NFPA Max (17.8 cm / 7")`); isPass = false; }
        if (going < 28.0) { msgs.push(`Tread ${going} cm is less than NFPA Min (28 cm / 11")`); isPass = false; }
        if (headroom < 2.03) { msgs.push(`Headroom ${headroom.toFixed(2)} m is less than NFPA Min (2.03 m / 80")`); isPass = false; }
    }

    // 3. IBC 2021 (International Building Code)
    else if (std === 'IBC_2021') {
        if (riser > 17.8) { msgs.push(`Riser ${riser} cm exceeds IBC Max (17.8 cm / 7")`); isPass = false; }
        if (going < 28.0) { msgs.push(`Tread ${going} cm is less than IBC Min (28 cm / 11")`); isPass = false; }
        if (width < 1.12) { msgs.push(`Width ${width} m is less than IBC Min for egress (1.12 m)`); isPass = false; }
    }

    return { status: isPass ? 'PASS' : 'FAIL', messages: msgs };
};