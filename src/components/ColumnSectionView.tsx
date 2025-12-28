import { THEME } from '../constants';

interface ColumnSectionProps {
    bx: number;          // cm
    by: number;          // cm
    covering: number;    // cm
    nx: number;          // number of bars along x
    ny: number;          // number of bars along y
    mainBarSize: number; // mm
    stirrupSize: number; // mm
    steelProp?: any;     // Steel Core properties (optional)
    mainBarType?: string;
    stirrupText?: string;
    isReport?: boolean;
}

const ColumnSectionView = ({
    bx, by, covering, nx, ny,
    mainBarSize, stirrupSize,
    steelProp,
    mainBarType = 'DB',
    stirrupText = '',
    isReport = false
}: ColumnSectionProps) => {

    // Scale Logic
    const maxDim = Math.max(bx, by);
    // ✅ ปรับ Scale ให้เล็กลงนิดหน่อยในโหมดรายงาน เพื่อให้มีที่เหลือสำหรับเส้นบอกระยะ
    const scale = isReport ? 160 / maxDim : 300 / maxDim;
    
    const W = bx * scale;
    const H = by * scale;
    const cov = covering * scale;
    const db = (mainBarSize / 10) * scale; // cm -> scaled
    const dst = (stirrupSize / 10) * scale;

    // Colors
    const concreteFill = isReport ? "#f3f4f6" : "#1e293b";
    const concreteStroke = isReport ? "#000" : THEME.COLORS.CONCRETE;
    const rebarFill = isReport ? "#000" : THEME.COLORS.REBAR_MAIN;
    const stirrupStroke = isReport ? "#000" : THEME.COLORS.REBAR_STIRRUP;
    const steelCoreFill = isReport ? "#9ca3af" : "#475569";
    const textFill = isReport ? "#000" : "#94a3b8";

    // Calculate Rebar Positions
    const bars: { cx: number, cy: number }[] = [];
    const coreW = W - 2*cov - 2*dst - db;
    const coreH = H - 2*cov - 2*dst - db;
    const startX = cov + dst + db/2;
    const startY = cov + dst + db/2;

    for (let i = 0; i < nx; i++) {
        const cx = startX + (i * (coreW / (nx - 1)));
        bars.push({ cx, cy: startY }); // Top
        bars.push({ cx, cy: startY + coreH }); // Bottom
    }

    if (ny > 2) {
        for (let i = 1; i < ny - 1; i++) {
            const cy = startY + (i * (coreH / (ny - 1)));
            bars.push({ cx: startX, cy }); // Left
            bars.push({ cx: startX + coreW, cy }); // Right
        }
    }

    // ✅ เพิ่มความสูงของ SVG ในโหมดรายงานจาก 200 เป็น 220
    const svgWidth = isReport ? 200 : 400;
    const svgHeight = isReport ? 220 : 400;

    return (
        <div className="flex flex-col items-center">
            <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="overflow-visible">
                <g transform={`translate(${svgWidth/2 - W/2}, ${svgHeight/2 - H/2})`}>
                    
                    {/* Concrete Column */}
                    <rect x={0} y={0} width={W} height={H} fill={concreteFill} stroke={concreteStroke} strokeWidth="2" />

                    {/* Steel Core (Optional) */}
                    {steelProp && (
                        <g transform={`translate(${W/2}, ${H/2})`}>
                            {(() => {
                                const sd = (steelProp.d / 10) * scale;
                                const sbf = (steelProp.bf / 10) * scale;
                                const stw = (steelProp.tw / 10) * scale;
                                const stf = (steelProp.tf / 10) * scale;
                                return (
                                    <path 
                                        d={`M ${-stw/2} ${-sd/2 + stf} H ${-sbf/2} V ${-sd/2} H ${sbf/2} V ${-sd/2 + stf} H ${stw/2} V ${sd/2 - stf} H ${sbf/2} V ${sd/2} H ${-sbf/2} V ${sd/2 - stf} H ${-stw/2} Z`} 
                                        fill={steelCoreFill} stroke="none"
                                    />
                                );
                            })()}
                        </g>
                    )}

                    {/* Stirrup */}
                    <rect x={cov} y={cov} width={W - 2*cov} height={H - 2*cov} fill="none" stroke={stirrupStroke} strokeWidth={dst || 1.5} rx={dst} />

                    {/* Main Bars */}
                    {bars.map((b, i) => (<circle key={i} cx={b.cx} cy={b.cy} r={db/2} fill={rebarFill} />))}

                    {/* Dimensions & Labels */}
                    {/* ✅ ปรับตำแหน่งเส้นบอกระยะให้ชิดขึ้น */}
                    {/* Width Bx */}
                    <line x1={0} y1={H + 8} x2={W} y2={H + 8} stroke={textFill} strokeWidth="1"/>
                    <line x1={0} y1={H + 3} x2={0} y2={H + 13} stroke={textFill} strokeWidth="1"/>
                    <line x1={W} y1={H + 3} x2={W} y2={H + 13} stroke={textFill} strokeWidth="1"/>
                    <text x={W/2} y={H + 22} textAnchor="middle" fill={textFill} fontSize={isReport ? 10 : 12}>{bx} cm</text>

                    {/* Depth By */}
                    <line x1={-8} y1={0} x2={-8} y2={H} stroke={textFill} strokeWidth="1"/>
                    <line x1={-3} y1={0} x2={-13} y2={0} stroke={textFill} strokeWidth="1"/>
                    <line x1={-3} y1={H} x2={-13} y2={H} stroke={textFill} strokeWidth="1"/>
                    <text x={-18} y={H/2} textAnchor="middle" transform={`rotate(-90 -18,${H/2})`} fill={textFill} fontSize={isReport ? 10 : 12}>{by} cm</text>

                    {/* Rebar Label (Only for Design View) */}
                    {!isReport && (
                        <>
                            <text x={W/2} y={H/2} textAnchor="middle" dominantBaseline="middle" fill={textFill} fontSize="14" fontWeight="bold" opacity={0.3}>
                                {bars.length}-{mainBarType}{mainBarSize}
                            </text>
                            <text x={W/2} y={H + 50} textAnchor="middle" fill={stirrupStroke} fontSize="12">
                                Stirrup: {stirrupText}
                            </text>
                        </>
                    )}
                </g>
            </svg>
        </div>
    );
};

export default ColumnSectionView;