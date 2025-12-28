import { SteelGrade } from './types';

// ==========================================
// 1. THEME COLORS & STYLE TOKENS
// ==========================================
export const THEME = {
    BG: {
        MAIN: "bg-[#0B1120]",
        PANEL: "bg-[#151F32]",
        INPUT: "bg-slate-900",
        PAPER: "bg-white",
        HOVER: "hover:bg-slate-800",
    },
    BORDER: {
        DEFAULT: "border-slate-800",
        INPUT: "border-slate-700",
        ACCENT: "border-blue-500",
    },
    TEXT: {
        PRIMARY: "text-slate-100",
        SECONDARY: "text-slate-400",
        ACCENT: "text-blue-400",
        LABEL: "text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block",
    },
    COLORS: {
        PASS: "#10b981", FAIL: "#ef4444", BLUE: "#3b82f6", YELLOW: "#eab308",
        GRID: "#334155", TEXT: "#94a3b8", BG_TOOLTIP: "#0f172a",
        REBAR_MAIN: "#ef4444", REBAR_STIRRUP: "#3b82f6", CONCRETE: "#334155" // ✅ เพิ่มสีสำหรับ Section View
    }
};

export const TYPO = {
    H1: "text-2xl font-bold flex items-center gap-2 text-slate-100 uppercase tracking-wide",
    SECTION_HEADER: "text-sm font-bold text-blue-400 uppercase mb-3 flex items-center gap-2 border-b border-slate-800 pb-2",
    LABEL: "text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider",
    INPUT: `w-full ${THEME.BG.INPUT} border ${THEME.BORDER.INPUT} rounded p-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors`,
    INPUT_LARGE: "text-xl font-black text-white bg-transparent text-center w-full outline-none",
    HINT: "text-[10px] text-slate-500 mt-1 italic",
    
    // Report Typography
    RPT_TITLE: "text-xl font-black uppercase tracking-wider text-slate-900 leading-none",
    RPT_SUBTITLE: "text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1",
    RPT_SECTION: "text-xs font-bold text-blue-900 border-b border-blue-300 mb-1 pb-0.5 uppercase mt-3",
    RPT_TEXT: "text-[10px] font-mono text-slate-700 leading-tight",
    RPT_LABEL: "text-[10px] font-bold text-slate-600 uppercase mr-1",
    RPT_VALUE: "text-[10px] font-bold text-slate-900",
    
    STATUS: {
        PASS: "font-bold text-green-500 bg-green-900/20 px-2 py-0.5 rounded text-xs",
        FAIL: "font-bold text-red-500 bg-red-900/20 px-2 py-0.5 rounded text-xs",
        PASS_RPT: "font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded text-[9px]",
        FAIL_RPT: "font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded text-[9px]",
    }
};

// ==========================================
// 2. ENGINEERING CONSTANTS & MATERIALS
// ==========================================
export const CONSTANTS = {
    CONV_KSC_TO_MPA: 0.0980665, CONV_N_TO_KG: 1 / 9.80665,
    MIN_CLEAR_SPACING_CM: 2.5, STIRRUP_STEP_CM: 2.5, BRESLER_ALPHA: 1.5,
    // ✅ เพิ่ม Engineering Constants
    CONCRETE: {
        BETA1_BREAKPOINT_KSC: 280,
        BETA1_BASE: 0.85,
        BETA1_MIN: 0.65,
        LAMBDA_LIGHTWEIGHT: 1.0 // Assume Normal Weight (Comment in Calculation)
    },
    PHI: {
        ACI318_19: { FLEXURE_MAX: 0.90, FLEXURE_MIN: 0.65, SHEAR: 0.75, COMPRESSION_TIED: 0.65, COMPRESSION_SPIRAL: 0.75, TORSION: 0.75 },
        EIT: { FLEXURE_MAX: 0.90, FLEXURE_MIN: 0.90, SHEAR: 0.85, COMPRESSION_TIED: 0.70, COMPRESSION_SPIRAL: 0.75, TORSION: 0.85 } // EIT Flexure often constant 0.90 but can be checked
    },
    // ✅ จุดที่ Error: ต้องมีตัวนี้
    LOAD_FACTORS: {
        ACI318_19: { DL: 1.2, LL: 1.6 },
        EIT: { DL: 1.4, LL: 1.7 }
    }
};

// ✅ เพิ่ม Config สำหรับ Free User (แก้ Hardcoding)
export const FREE_USER_CONFIG = {
    ALLOWED_MAIN_GRADES: ['SD30', 'SR24'],
    ALLOWED_STIRRUP_GRADES: ['SR24']
};

export const MATERIAL_COSTS = { CONCRETE_M3: 2400, REBAR_KG: 30, STEEL_KG: 35, FORMWORK_M2: 400 };
export const REBAR_GRADES: Record<string, number> = { "SR24": 2400, "SD30": 3000, "SD40": 4000, "SD50": 5000 };
export const STRUCTURAL_STEEL_GRADES: Record<string, number> = { "SS400": 2400, "SM520": 3600, "ASTM A36": 2500, "ASTM A572 Gr50": 3450 };
export const GRADE_PROPERTIES: Record<SteelGrade, { fy: number; type: 'RB'|'DB'; sizes: number[] }> = {
    "SR24": { fy: 2400, type: 'RB', sizes: [6, 9, 12] },
    "SD30": { fy: 3000, type: 'DB', sizes: [10, 12, 16, 20, 25, 28, 32] },
    "SD40": { fy: 4000, type: 'DB', sizes: [10, 12, 16, 20, 25, 28, 32] },
    "SD50": { fy: 5000, type: 'DB', sizes: [10, 12, 16, 20, 25, 28, 32] },
};
export const H_BEAM_STD: Record<string, any> = {
    "None": null,
    "H-100x100": { d: 100, bf: 100, tw: 6, tf: 8, Ix: 374, Iy: 134, w: 17.2 },
    "H-125x125": { d: 125, bf: 125, tw: 6.5, tf: 9, Ix: 839, Iy: 293, w: 23.8 },
    "H-150x150": { d: 150, bf: 150, tw: 7, tf: 10, Ix: 1620, Iy: 563, w: 31.5 },
    "H-200x200": { d: 200, bf: 200, tw: 8, tf: 12, Ix: 4720, Iy: 1600, w: 49.9 },
    "H-250x250": { d: 250, bf: 250, tw: 9, tf: 14, Ix: 10800, Iy: 3650, w: 72.4 },
    "H-300x300": { d: 300, bf: 300, tw: 10, tf: 15, Ix: 20400, Iy: 6750, w: 94.0 },
    "H-350x350": { d: 350, bf: 350, tw: 12, tf: 19, Ix: 40300, Iy: 13600, w: 137.0 },
    "H-400x400": { d: 400, bf: 400, tw: 13, tf: 21, Ix: 66600, Iy: 22400, w: 172.0 },
};

// ==========================================
// 3. UI TEXT (Full Localization)
// ==========================================
export const UI_TEXT = {
    en: {
        common: {
            analysis: "Analysis", report: "Report", boq: "BOQ",
            back: "Back to Design", print: "Print Report",
            status: "Status", provided: "Provided", required: "Required",
            parameters: "Parameters", loads: "Loads", summary: "Summary", details: "Calculation Details",
            auto: "AUTO", manual: "MANUAL", generateReport: "Generate Report"
        },
        beam: {
            title: "RC Beam Design",
            mainBar: "Main Bar", topDB: "Top Bar", botDB: "Bot Bar", stirrup: "Stirrup",
            spacing: "Spacing", width: "Width (b)", depth: "Depth (h)", fc: "fc'", cover: "Cover",
            detailing: "Reinforcement Detailing", topSteel: "Top Steel", botSteel: "Bottom Steel", stirrupSpace: "Stirrup Spacing",
            report: {
                step1: "1. Design Parameters & Material",
                step2: "2. Flexural Design (Bottom - Positive Moment)",
                step3: "3. Flexural Design (Top - Negative Moment)",
                step4: "4. Shear & Torsion Design",
                code: "Code Ref", concrete: "Concrete", rebar: "Rebar", section: "Section",
                designMu: "Design Moment", effDepth: "Effective Depth (d)",
                blockA: "Equivalent Stress Block (a)", calcA: "Determine 'a'",
                reqSteel: "Required Steel (As)", designAs: "Design As", minAs: "Min As",
                provide: "Provide", capacity: "Capacity", ratio: "Ratio",
                shearLoad: "Shear Load (Vu)", concCap: "Concrete Capacity (Vc)",
                shearReinf: "Shear Reinforcement (Vs)", stirrupReq: "Stirrup Required", minStirrup: "Min. Stirrup Only",
                torsion: "Torsion Check", consider: "CONSIDER TORSION", ignore: "IGNORE TORSION",
                spacingCalc: "Spacing Calculation", avReq: "Av/s Required", maxSpace: "Max Spacing"
            }
        },
        rcColumn: { 
            reportTitle: "RC Column Design Report",
            tabs: ["Analysis", "Visual & BOQ", "Base Plate", "Shear Studs", "Report"], 
            geo: "Geometry", rebar: "Reinforcement", loads: "Loads", res: "Analysis Results",
            inputs: {
                bx: "Bx", by: "By", l: "Length (L)", fc: "fc'", cov: "Covering",
                mainGrade: "Main Grade", size: "Size", nx: "Nx", ny: "Ny",
                stirrup: "Stirrup", spacing: "Spacing", steelCore: "Steel Core",
                slenderness: "Consider Slenderness Effect?"
            },
            report: {
                step1: "1. Design Parameters",
                step2: "2. Critical Load Analysis",
                step3: "3. P-M Interaction Check",
                step4: "4. Shear Design",
                size: "Column Size", length: "Length", code: "Code",
                main: "Main Rebar", stirrup: "Stirrup",
                factored: "Factored Loads", slenderness: "Slenderness", ignored: "Ignored",
                axialCap: "Axial Capacity (Pmax)", bendCap: "Bending Capacity",
                interaction: "Interaction Ratio", shearLoad: "Shear Load (Vu)",
                concCap: "Concrete Vc", stirrupReq: "Stirrup Req", check: "Check",
                torsionTitle: "5. Torsion Check",
                threshold: "Threshold Torsion (Tth)",
                torsionNeglect: "Torsion Effects Neglected"
            }
        },
        rcPileCap: {
            title: "Pile Cap Design",
            geo: "Geometry & Piles",
            loads: "Loads",
            mat: "Materials & Reinforcement",
            res: "Analysis",
            inputs: {
                pu: "Axial Load (Pu)", mx: "Moment Mx", my: "Moment My", sw: "Include Self-Weight",
                num: "No. of Piles", dia: "Pile Dia.", safe: "Safe Load", fs: "F.S.",
                cx: "Col X", cy: "Col Y", thk: "Thickness", cov: "Covering",
                barX: "Main Bar X", barY: "Main Bar Y", stirrup: "Binder (Stirrup)",
                sx: "@ Spacing", sy: "@ Spacing", 
                // ✅ แก้ไขป้ายชื่อ (EN)
                spacing: "Spacing Factor (c/c)", 
                edge: "Edge Factor (Center-to-Edge)",
                embed: "Pile Embedment",
                topBar: "Include Top Bar", expand: "Auto-expand Cap Size",
                deepOption: "Consider Deep Beam Action", // ✅ เพิ่ม
            },
            report: {
                // ... (คงเดิม)
                step1: "1. Design Parameters",
                step2: "2. Pile Reactions",
                step3: "3. Structural Design (X-Axis)",
                step4: "4. Structural Design (Y-Axis)",
                step5: "5. Punching Shear",
                mode: "Mode", deep: "Deep Beam", shallow: "Shallow Beam",
                mu: "Design Moment (Mu)", vu: "Shear Force (Vu)",
                req: "Required", prov: "Provided",
                check: "Check", status: "Status",
                chkPunch: "Punching Shear",
                chkFlexX: "Flexure (Moment) X",
                chkShearX: "One-Way Shear X",
                chkFlexY: "Flexure (Moment) Y",
                chkShearY: "One-Way Shear Y",
            }
        },
        rcSlab: {
            title: "RC Slab Design",
            mat: "Materials & Loads",
            geo: "Geometry & Conditions",
            res: "Analysis & Design",
            inputs: {
                lx: "Width Lx", ly: "Length Ly", t: "Thickness", cov: "Covering",
                ll: "Live Load", sdl: "Superimposed DL",
                fc: "Concrete (fc')", fy: "Steel (fy)",
                case: "Support Condition", bar: "Main Bar", spa: "Spacing",
                expand: "Auto Expand",
                cantilever: "Cantilever (Overhang)" // ✅ NEW
            },
            report: {
                step1: "1. Design Parameters",
                step2: "2. Minimum Thickness & Loads",
                step3: "3. Moment Analysis (Method 2)",
                step4: "4. Reinforcement Design",
                step5: "5. Shear Check",
                req: "Required", prov: "Provided",
                status: "Status"
            }
        }
    },
    th: {
        common: {
            analysis: "วิเคราะห์ผล", report: "รายงานคำนวณ", boq: "ประมาณราคา",
            back: "กลับหน้าออกแบบ", print: "พิมพ์รายงาน",
            status: "สถานะ", provided: "ที่เลือกใช้", required: "ที่ต้องการ",
            parameters: "พารามิเตอร์", loads: "น้ำหนักบรรทุก", summary: "สรุปผลการออกแบบ", details: "รายการคำนวณละเอียด",
            auto: "อัตโนมัติ", manual: "กำหนดเอง", generateReport: "สร้างรายงาน"
        },
        beam: {
            title: "ออกแบบคาน คสล.",
            mainBar: "เหล็กแกนหลัก", topDB: "เหล็กบน", botDB: "เหล็กล่าง", stirrup: "เหล็กปลอก",
            spacing: "ระยะห่าง", width: "ความกว้าง (b)", depth: "ความลึก (h)", fc: "กำลังคอนกรีต", cover: "ระยะหุ้ม",
            detailing: "รายละเอียดเหล็กเสริม", topSteel: "เหล็กเสริมรับโมเมนต์ลบ (บน)", botSteel: "เหล็กเสริมรับโมเมนต์บวก (ล่าง)", stirrupSpace: "ระยะห่างเหล็กปลอก",
            report: {
                step1: "1. ข้อกำหนดการออกแบบและคุณสมบัติวัสดุ",
                step2: "2. ออกแบบรับแรงดัด (เหล็กล่าง - โมเมนต์บวก)",
                step3: "3. ออกแบบรับแรงดัด (เหล็กบน - โมเมนต์ลบ)",
                step4: "4. ออกแบบรับแรงเฉือนและแรงบิด",
                code: "มาตรฐานอ้างอิง", concrete: "คอนกรีต", rebar: "เหล็กเสริม", section: "ขนาดหน้าตัด",
                designMu: "โมเมนต์ออกแบบ", effDepth: "ความลึกประสิทธิผล (d)",
                blockA: "ความลึกบล็อกความเค้น (a)", calcA: "คำนวณค่า a",
                reqSteel: "ปริมาณเหล็กที่ต้องการ (As)", designAs: "As ที่ใช้คำนวณ", minAs: "เนื้อที่เหล็กขั้นต่ำ",
                provide: "เลือกใช้", capacity: "กำลังรับโมเมนต์", ratio: "อัตราส่วน",
                shearLoad: "แรงเฉือนประลัย (Vu)", concCap: "กำลังรับแรงเฉือนคอนกรีต (Vc)",
                shearReinf: "เหล็กเสริมรับแรงเฉือน (Vs)", stirrupReq: "ต้องเสริมเหล็กปลอกรับแรง", minStirrup: "เสริมเหล็กปลอกขั้นต่ำ",
                torsion: "ตรวจสอบแรงบิด", consider: "พิจารณาแรงบิด", ignore: "ไม่พิจารณาแรงบิด",
                spacingCalc: "คำนวณระยะห่าง", avReq: "ปริมาณเหล็กปลอกที่ต้องการ (Av/s)", maxSpace: "ระยะห่างสูงสุดที่ยอมให้"
            }
        },
        rcColumn: { 
            reportTitle: "รายการคำนวณออกแบบเสา คสล.",
            tabs: ["วิเคราะห์ผล", "รูปตัด & ราคา", "แผ่นเพลท", "หมุดรับแรงเฉือน", "รายงานคำนวณ"], 
            geo: "ขนาดหน้าตัด", rebar: "เหล็กเสริม", loads: "น้ำหนักบรรทุก", res: "ผลการคำนวณ",
            inputs: {
                bx: "กว้าง (Bx)", by: "ลึก (By)", l: "ความสูง (L)", fc: "กำลังคอนกรีต", cov: "ระยะหุ้ม",
                mainGrade: "เหล็กยืน", size: "ขนาด", nx: "จำนวนด้าน x", ny: "จำนวนด้าน y",
                stirrup: "เหล็กปลอก", spacing: "ระยะห่าง", steelCore: "แกนเหล็กรูปพรรณ",
                slenderness: "คิดผลของความชะลูด (Slenderness)?"
            },
            report: {
                step1: "1. ข้อมูลการออกแบบ (Design Parameters)",
                step2: "2. วิเคราะห์น้ำหนักบรรทุกวิกฤต (Critical Load Analysis)",
                step3: "3. ตรวจสอบกำลังรับแรงอัดและดัด (P-M Interaction)",
                step4: "4. ออกแบบรับแรงเฉือน (Shear Design)",
                size: "ขนาดเสา", length: "ความสูง", code: "มาตรฐาน",
                main: "เหล็กยืน", stirrup: "เหล็กปลอก",
                factored: "น้ำหนักบรรทุกประลัย", slenderness: "ผลความชะลูด", ignored: "ไม่พิจารณา (Short Column)",
                axialCap: "กำลังรับแรงอัดสูงสุด (Pmax)", bendCap: "กำลังรับโมเมนต์ดัด",
                interaction: "อัตราส่วนกำลัง (Interaction Ratio)", shearLoad: "แรงเฉือน (Vu)",
                concCap: "กำลังคอนกรีต Vc", stirrupReq: "ความต้องการเหล็กปลอก", check: "ตรวจสอบ",
                torsionTitle: "5. ตรวจสอบแรงบิด (Torsion Check)",
                threshold: "แรงบิดขีดจำกัด (Threshold Torsion)",
                torsionNeglect: "ไม่พิจารณาผลของแรงบิด (Neglected)"
            }
        },
        rcPileCap: {
            title: "ออกแบบฐานรากเสาเข็ม",
            geo: "มิติและเสาเข็ม",
            loads: "น้ำหนักบรรทุก",
            mat: "วัสดุและเหล็กเสริม",
            res: "วิเคราะห์ผล",
            inputs: {
                pu: "แรงแนวดิ่ง (Pu)", mx: "โมเมนต์ Mx", my: "โมเมนต์ My", sw: "รวมน้ำหนักฐานราก",
                num: "จำนวนเข็ม", dia: "ขนาดเข็ม", safe: "รับนน.ปลอดภัย", fs: "F.S.",
                cx: "ตอม่อ X", cy: "ตอม่อ Y", thk: "ความหนา", cov: "ระยะหุ้ม",
                barX: "เหล็กแกน X", barY: "เหล็กแกน Y", stirrup: "เหล็กรัดรอบ",
                sx: "@ ระยะเรียง", sy: "@ ระยะเรียง",
                // ✅ แก้ไขป้ายชื่อ (TH) ให้ชัดเจน
                spacing: "ระยะห่างเข็ม (c/c) (x เท่าของ d)", 
                edge: "ระยะขอบ (จากกึ่งกลาง) (x เท่าของ d)",
                embed: "ระยะฝั่งเข็ม (Embed)",
                topBar: "เสริมเหล็กบน (Top)", expand: "ขยายฐานอัตโนมัติ",
                deepOption: "พิจารณาผลของคานลึก (Deep Beam)", // ✅ เพิ่ม
            },
            report: {
                // ... (คงเดิม)
                step1: "1. ข้อมูลการออกแบบ (Design Parameters)",
                step2: "2. ตรวจสอบน้ำหนักลงเสาเข็ม (Pile Reactions)",
                step3: "3. ออกแบบโครงสร้าง (แกน X)",
                step4: "4. ออกแบบโครงสร้าง (แกน Y)",
                step5: "5. ตรวจสอบแรงเฉือนทะลุ (Punching Shear)",
                mode: "พฤติกรรม", deep: "คานลึก (Deep)", shallow: "คานตื้น (Shallow)",
                mu: "โมเมนต์ออกแบบ (Mu)", vu: "แรงเฉือน (Vu)",
                req: "ที่ต้องการ", prov: "ที่ใส่จริง",
                check: "ตรวจสอบ", status: "สถานะ",
                chkPunch: "แรงเฉือนทะลุ (Punching)",
                chkFlexX: "โมเมนต์ดัด (Flexure) X",
                chkShearX: "แรงเฉือนคาน (Shear) X",
                chkFlexY: "โมเมนต์ดัด (Flexure) Y",
                chkShearY: "แรงเฉือนคาน (Shear) Y",
            }
        },
        rcSlab: {
            title: "ออกแบบพื้น คสล.",
            mat: "วัสดุและน้ำหนักบรรทุก",
            geo: "มิติและเงื่อนไขจุดรองรับ",
            res: "วิเคราะห์และออกแบบ",
            inputs: {
                lx: "ความกว้าง Lx", ly: "ความยาว Ly", t: "ความหนาพื้น", cov: "ระยะหุ้ม",
                ll: "น้ำหนักจร (LL)", sdl: "น้ำหนักบรรทุกเพิ่ม (SDL)",
                fc: "กำลังคอนกรีต (fc')", fy: "กำลังเหล็ก (fy)",
                case: "รูปแบบจุดรองรับ", bar: "เหล็กเสริม", spa: "ระยะเรียง",
                expand: "ขยายฐานอัตโนมัติ",
                cantilever: "พื้นยื่น (Cantilever)" // ✅ NEW
            },
            report: {
                step1: "1. ข้อมูลการออกแบบ (Design Parameters)",
                step2: "2. ตรวจสอบความหนา & น้ำหนัก (Thickness & Loads)",
                step3: "3. วิเคราะห์โมเมนต์ (Moment Analysis)",
                step4: "4. ออกแบบเหล็กเสริม (Reinforcement)",
                step5: "5. ตรวจสอบแรงเฉือน (Shear Check)",
                req: "ที่ต้องการ", prov: "ที่ใส่จริง",
                status: "สถานะ"
            }
        }
    }
}; 
 
// ==========================================
// 4. SLAB DATA (Phase 1: Precision)
// ==========================================
export const SLAB_DATA = {
    CASES: [
        { id: 1, name_th: "1. อิสระ 4 ด้าน (Simple)", name_en: "1. Simple Support All" },
        { id: 2, name_th: "2. ต่อเนื่อง 4 ด้าน", name_en: "2. Continuous All Sides" },
        { id: 3, name_th: "3. ต่อเนื่องด้านสั้น 2 ด้าน", name_en: "3. Short Edges Continuous" },
        { id: 4, name_th: "4. ต่อเนื่องด้านยาว 2 ด้าน", name_en: "4. Long Edges Continuous" },
        { id: 5, name_th: "5. ต่อเนื่องด้านสั้น 1 + ยาว 1", name_en: "5. Two Adjacent Edges Cont." },
        { id: 6, name_th: "6. ต่อเนื่องด้านสั้น 1 + ยาว 2", name_en: "6. Two Long + One Short Cont." },
        { id: 7, name_th: "7. ต่อเนื่องด้านสั้น 2 + ยาว 1", name_en: "7. Two Short + One Long Cont." },
        { id: 8, name_th: "8. ต่อเนื่องด้านสั้น 1 ด้าน", name_en: "8. One Short Edge Continuous" },
        { id: 9, name_th: "9. ต่อเนื่องด้านยาว 1 ด้าน", name_en: "9. One Long Edge Continuous" }
    ],
    COEFFICIENTS: {
        1: { ca_neg: 0, cb_neg: 0, ca_dl: 0.036, cb_dl: 0.036, ca_ll: 0.036, cb_ll: 0.036 },
        2: { ca_neg: 0.050, cb_neg: 0.050, ca_dl: 0.018, cb_dl: 0.018, ca_ll: 0.027, cb_ll: 0.027 },
        3: { ca_neg: 0.050, cb_neg: 0, ca_dl: 0.027, cb_dl: 0.027, ca_ll: 0.032, cb_ll: 0.032 },
        4: { ca_neg: 0, cb_neg: 0.050, ca_dl: 0.027, cb_dl: 0.027, ca_ll: 0.032, cb_ll: 0.032 },
        5: { ca_neg: 0.050, cb_neg: 0.050, ca_dl: 0.022, cb_dl: 0.022, ca_ll: 0.029, cb_ll: 0.029 },
        6: { ca_neg: 0.050, cb_neg: 0.050, ca_dl: 0.020, cb_dl: 0.020, ca_ll: 0.028, cb_ll: 0.028 },
        7: { ca_neg: 0.050, cb_neg: 0.050, ca_dl: 0.020, cb_dl: 0.020, ca_ll: 0.028, cb_ll: 0.028 },
        8: { ca_neg: 0.060, cb_neg: 0, ca_dl: 0.030, cb_dl: 0.030, ca_ll: 0.035, cb_ll: 0.035 },
        9: { ca_neg: 0, cb_neg: 0.060, ca_dl: 0.030, cb_dl: 0.030, ca_ll: 0.035, cb_ll: 0.035 }
    }
};
