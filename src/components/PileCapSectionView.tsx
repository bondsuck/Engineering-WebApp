import { THEME } from '../constants';

interface Props {
    width_X: number; // cm
    width_Y: number; // cm
    thickness: number; // cm
    col_bx: number;
    col_by: number;
    coords: { x: number, y: number }[]; 
    pileDia: number;
    barDiaX: number;
    barDiaY: number;
    hasTopBar: boolean;
    stirrupDia: number;
    spacingX?: number; 
    spacingY?: number; 
    covering?: number; 
    pileEmbedment?: number; 
    isReport?: boolean;
}

export const PileCapSectionView = ({ 
    width_X, width_Y, thickness, col_bx, col_by, coords, 
    pileDia, barDiaX, barDiaY, hasTopBar, stirrupDia,
    spacingX = 15, spacingY = 15, covering = 7.5, pileEmbedment = 10,
    isReport = false 
}: Props) => {
    
    // Scale Logic
    // ✅ เพิ่ม Padding แนวตั้ง (Y) ให้เยอะขึ้น เพื่อให้มีที่สำหรับป้ายด้านล่าง
    const paddingX = isReport ? 45 : 60; 
    const paddingY = isReport ? 65 : 90; // เพิ่มจาก 50->65/90
    const maxDim = Math.max(width_X, width_Y, thickness * 2.5); 
    const scale = isReport ? 150 / maxDim : 260 / maxDim;
    
    const W = width_X * scale;
    const H = width_Y * scale; 
    const Thk = thickness * scale;
    const ColW = col_bx * scale;
    const ColH = col_by * scale;
    const P_Dia = pileDia * scale;
    const Cov = covering * scale;
    const Embed = pileEmbedment * scale;

    const rbX_r = (barDiaX / 20) * scale;
    const rbY_r = (barDiaY / 20) * scale;
    
    // Colors
    const capFill = isReport ? "#f3f4f6" : "#1e293b";
    const capStroke = isReport ? "#000" : "#64748b";
    const colFill = isReport ? "#d1d5db" : "#475569";
    const rebarMain = THEME.COLORS.REBAR_MAIN;
    const rebarStirrup = THEME.COLORS.REBAR_STIRRUP;
    const labelColor = isReport ? "#000" : "#94a3b8";
    const labelLine = isReport ? "#000" : "#64748b";
    const fontSize = isReport ? "8px" : "10px";

    const ViewContainer = ({ label, children }: any) => (
        <div className={`flex flex-col items-center justify-center p-2 ${!isReport && 'bg-slate-900 rounded-xl border border-slate-700'}`}>
            {children}
            <div className={`mt-2 text-center ${isReport ? 'text-[10px] font-bold' : 'text-xs text-slate-400'}`}>{label}</div>
        </div>
    );

    // 1. PLAN VIEW (Top)
    const PlanView = () => {
        const cx = W/2 + paddingX;
        const cy = H/2 + paddingY;
        const svgW = W + paddingX*2;
        const svgH = H + paddingY*2;

        return (
            <svg width={svgW} height={svgH} className="overflow-visible">
                {coords.map((p, i) => (
                    <g key={i} transform={`translate(${cx + p.x * scale}, ${cy - p.y * scale})`}>
                        <circle r={P_Dia/2} fill="none" stroke={capStroke} strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />
                    </g>
                ))}
                <rect x={paddingX} y={paddingY} width={W} height={H} fill={capFill} stroke={capStroke} strokeWidth="1.5" fillOpacity={0.5} />
                <rect x={cx - ColW/2} y={cy - ColH/2} width={ColW} height={ColH} fill={colFill} stroke={capStroke} />
                
                {/* Dimensions */}
                <line x1={paddingX} y1={paddingY - 15} x2={paddingX + W} y2={paddingY - 15} stroke={labelLine} strokeWidth="0.5"/>
                <line x1={paddingX} y1={paddingY - 10} x2={paddingX} y2={paddingY - 20} stroke={labelLine} strokeWidth="0.5"/>
                <line x1={paddingX + W} y1={paddingY - 10} x2={paddingX + W} y2={paddingY - 20} stroke={labelLine} strokeWidth="0.5"/>
                <text x={cx} y={paddingY - 20} textAnchor="middle" fill={labelColor} fontSize={fontSize}>{width_X.toFixed(0)} cm</text>

                <line x1={paddingX - 15} y1={paddingY} x2={paddingX - 15} y2={paddingY + H} stroke={labelLine} strokeWidth="0.5"/>
                <line x1={paddingX - 10} y1={paddingY} x2={paddingX - 20} y2={paddingY} stroke={labelLine} strokeWidth="0.5"/>
                <line x1={paddingX - 10} y1={paddingY + H} x2={paddingX - 20} y2={paddingY + H} stroke={labelLine} strokeWidth="0.5"/>
                <text x={paddingX - 25} y={cy} textAnchor="middle" transform={`rotate(-90 ${paddingX - 25},${cy})`} fill={labelColor} fontSize={fontSize}>{width_Y.toFixed(0)} cm</text>
            </svg>
        );
    };

    // 2. SECTION VIEW (A-A)
    const SectionView = () => {
        const svgW = W + paddingX*2;
        const svgH = Thk + paddingY*2;
        const baseX = paddingX;
        const baseY = paddingY; // Top of cap
        
        // Rebar Calculation
        const numBarsY = Math.floor((width_X - 2*covering) / spacingY) + 1;
        const startX_bar = baseX + Cov;
        const stepX = spacingY * scale; 
        
        const yBars = [];
        const yPosBot = baseY + Thk - Cov - rbY_r; 
        for(let i=0; i<numBarsY; i++) {
            yBars.push(<circle key={`bot-${i}`} cx={startX_bar + i*stepX} cy={yPosBot} r={rbY_r} fill={rebarMain} />);
        }
        
        const yPosTop = baseY + Cov + rbY_r;
        if(hasTopBar) {
            for(let i=0; i<numBarsY; i++) {
                yBars.push(<circle key={`top-${i}`} cx={startX_bar + i*stepX} cy={yPosTop} r={rbY_r} fill={rebarMain} />);
            }
        }

        const xBarY_Bot = baseY + Thk - Cov - (barDiaY/10)*scale - rbX_r;
        const xBarLineBot = <line x1={baseX+Cov} y1={xBarY_Bot} x2={baseX+W-Cov} y2={xBarY_Bot} stroke={rebarMain} strokeWidth={rbX_r*2} strokeLinecap="round" />;
        
        const xBarY_Top = baseY + Cov + (barDiaY/10)*scale + rbX_r;
        const xBarLineTop = hasTopBar ? <line x1={baseX+Cov} y1={xBarY_Top} x2={baseX+W-Cov} y2={xBarY_Top} stroke={rebarMain} strokeWidth={rbX_r*2} strokeLinecap="round" /> : null;

        const numBarsX = Math.floor((width_Y - 2*covering) / spacingX) + 1;
        const labelTextTop = hasTopBar ? `Top: ${numBarsY}-DB${barDiaY} & ${numBarsX}-DB${barDiaX}` : "";

        // ✅ ปรับตำแหน่งป้ายเหล็กล่าง (ดึงลงมาต่ำๆ)
        const lblY_Bot = baseY + Thk + 45; 
        const lblY_Top = baseY - 20;

        return (
            <svg width={svgW} height={svgH} className="overflow-visible">
                {/* Piles */}
                {coords.map((p, i) => {
                    const px = baseX + (width_X/2 + p.x) * scale;
                    // Draw pile stump
                    return (
                        <g key={i}>
                            <rect x={px - P_Dia/2} y={baseY + Thk - Embed} width={P_Dia} height={30 + Embed} fill={colFill} stroke={capStroke} />
                        </g>
                    );
                })}

                {/* Cap & Col */}
                <rect x={baseX} y={baseY} width={W} height={Thk} fill={capFill} stroke={capStroke} strokeWidth="1.5" />
                <rect x={baseX + W/2 - ColW/2} y={baseY - 20} width={ColW} height={20} fill={colFill} stroke={capStroke} />
                
                {/* Stirrup */}
                <rect x={baseX + Cov/2} y={baseY + Cov/2} width={W - Cov} height={Thk - Cov} fill="none" stroke={rebarStirrup} strokeWidth="1" rx="2" />

                {/* Bars */}
                {yBars}
                {xBarLineBot}
                {xBarLineTop}

                {/* --- LABELS --- */}
                
                {/* 1. Stirrup Label (Left Side) */}
                <path d={`M ${baseX + Cov} ${baseY + Thk/2} L ${baseX - 15} ${baseY + Thk/2}`} fill="none" stroke={labelLine} strokeWidth="0.8" />
                <text x={baseX - 18} y={baseY + Thk/2} textAnchor="end" dominantBaseline="middle" fill={labelColor} fontSize={fontSize} fontWeight="bold">
                    Binder: RB{stirrupDia} (Min)
                </text>

                {/* 2. Bottom Bars Label (Centered Bottom - Pulled Down) */}
                <path d={`M ${baseX + W/2} ${yPosBot + 5} L ${baseX + W/2} ${lblY_Bot - 10}`} fill="none" stroke={labelLine} strokeWidth="0.8" />
                <circle cx={baseX + W/2} cy={yPosBot + 5} r="1.5" fill={labelLine} />
                <text x={baseX + W/2} y={lblY_Bot} textAnchor="middle" dominantBaseline="middle" fill={labelColor} fontSize={fontSize} fontWeight="bold">
                    Bot: {numBarsY}-DB{barDiaY} (Pt) & {numBarsX}-DB{barDiaX} (Ln)
                </text>

                {/* 3. Top Bars Label (Centered Top) */}
                {hasTopBar && (
                    <>
                        <path d={`M ${baseX + W/2} ${yPosTop - 5} L ${baseX + W/2} ${lblY_Top + 5}`} fill="none" stroke={labelLine} strokeWidth="0.8" />
                        <circle cx={baseX + W/2} cy={yPosTop - 5} r="1.5" fill={labelLine} />
                        <text x={baseX + W/2} y={lblY_Top} textAnchor="middle" dominantBaseline="middle" fill={labelColor} fontSize={fontSize}>
                            {labelTextTop}
                        </text>
                    </>
                )}

                {/* ✅ 4. Pile Label (ชี้เสาเข็มต้นซ้ายสุด) */}
                {(() => {
                    // หาตำแหน่งเข็มซ้ายสุดเพื่อชี้
                    // (Project 2D coords to 1D X-axis section)
                    const sortedPiles = [...coords].sort((a, b) => a.x - b.x);
                    const leftPile = sortedPiles[0];
                    const px = baseX + (width_X/2 + leftPile.x) * scale;
                    const pileBottomY = baseY + Thk + 20; // จุดที่จะชี้ (กลางตอหม้อเข็ม)

                    return (
                        <g>
                            {/* Leader Line */}
                            <path d={`M ${px - P_Dia/2} ${pileBottomY} L ${px - P_Dia/2 - 15} ${pileBottomY}`} fill="none" stroke={labelLine} strokeWidth="0.8" />
                            <circle cx={px - P_Dia/2} cy={pileBottomY} r="1.5" fill={labelLine} />
                            
                            {/* Text Label */}
                            <text x={px - P_Dia/2 - 18} y={pileBottomY} textAnchor="end" dominantBaseline="middle" fill={labelColor} fontSize={fontSize}>
                                Pile: Ø{pileDia} cm
                            </text>
                        </g>
                    );
                })()}

                {/* Thickness Dim (Right Side) */}
                <line x1={baseX + W + 5} y1={baseY} x2={baseX + W + 5} y2={baseY + Thk} stroke={labelLine} strokeWidth="0.5" />
                <text x={baseX + W + 10} y={baseY + Thk/2} fill={labelColor} fontSize={fontSize} dominantBaseline="middle">t={thickness}cm</text>
            </svg>
        );
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            <ViewContainer label="Plan View (Top)">
                <PlanView />
            </ViewContainer>
            <ViewContainer label="Section View (A-A)">
                <SectionView />
            </ViewContainer>
        </div>
    );
};

export default PileCapSectionView;