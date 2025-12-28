import { THEME } from '../constants';

interface Props {
    type: 'Cantilever' | 'Counterfort';
    h_total: number; t_stem: number; t_base: number; l_toe: number; l_heel: number;
    hasKey: boolean; keyDepth: number; keyThk: number;
    beta: number; waterDepth: number; q_max?: number;
    useSeismic: boolean; 
}

const RetainingWallView = ({ type, h_total, t_stem, t_base, l_toe, l_heel, hasKey, keyDepth, keyThk, beta, waterDepth, q_max, useSeismic }: Props) => {
    const padding = 50;
    const viewHeight = 400;
    const scale = (viewHeight - 100) / Math.max(h_total, 2.0);

    const H = h_total * scale;
    const T_stem = (t_stem/100) * scale;
    const T_base = (t_base/100) * scale;
    const L_toe = l_toe * scale;
    const L_heel = l_heel * scale;
    
    const startX = padding + 100;
    const groundY = padding + 50;
    const baseBottomY = groundY + H;
    const baseTopY = baseBottomY - T_base;
    const stemLeftX = startX + L_toe;
    const stemRightX = stemLeftX + T_stem;

    const slopeY = groundY - (L_heel * Math.tan(beta * Math.PI / 180));
    const waterY = groundY + (waterDepth * scale);
    const hasWater = waterDepth < h_total;

    let path = `M ${startX} ${baseBottomY} L ${startX} ${baseTopY} L ${stemLeftX} ${baseTopY} L ${stemLeftX} ${groundY} L ${stemRightX} ${groundY} L ${stemRightX} ${baseTopY} L ${stemRightX + L_heel} ${baseTopY} L ${stemRightX + L_heel} ${baseBottomY} `;
    if (hasKey) {
        const K_d = (keyDepth/100)*scale; const K_t = (keyThk/100)*scale; const kX = stemLeftX + (T_stem-K_t)/2;
        path = `M ${startX} ${baseBottomY} L ${startX} ${baseTopY} L ${stemLeftX} ${baseTopY} L ${stemLeftX} ${groundY} L ${stemRightX} ${groundY} L ${stemRightX} ${baseTopY} L ${stemRightX + L_heel} ${baseTopY} L ${stemRightX + L_heel} ${baseBottomY} L ${kX+K_t} ${baseBottomY} L ${kX+K_t} ${baseBottomY+K_d} L ${kX} ${baseBottomY+K_d} L ${kX} ${baseBottomY} `;
    }
    path += `L ${startX} ${baseBottomY} Z`;

    const rebarColor = THEME.COLORS.REBAR_MAIN;

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <svg width={startX + L_toe + T_stem + L_heel + 150} height={baseBottomY + 80} className="overflow-visible">
                {/* Backfill */}
                <path d={`M ${stemRightX} ${groundY} L ${stemRightX + L_heel + 100} ${groundY - ((L_heel+100)*Math.tan(beta*Math.PI/180))} L ${stemRightX+L_heel+100} ${baseBottomY} L ${stemRightX} ${baseBottomY} Z`} fill="url(#soilPattern)" stroke="none" />
                
                {/* Water */}
                {hasWater && (
                    <rect x={stemRightX} y={waterY} width={L_heel + 100} height={baseBottomY - waterY} fill="#3b82f6" opacity="0.2" />
                )}

                {/* Counterfort */}
                {type === 'Counterfort' && (
                    <path d={`M ${stemRightX} ${groundY} L ${stemRightX + L_heel} ${baseTopY} L ${stemRightX} ${baseTopY} Z`} fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="5 3"/>
                )}

                {/* Ground */}
                <line x1={startX - 50} y1={baseTopY} x2={startX} y2={baseTopY} stroke="#475569" strokeDasharray="4 2"/>
                <line x1={stemRightX} y1={groundY} x2={stemRightX + L_heel + 50} y2={slopeY - (50 * Math.tan(beta*Math.PI/180))} stroke="#475569" strokeWidth="2"/>

                {/* Concrete */}
                <path d={path} fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
                
                {/* Rebar */}
                {type === 'Cantilever' ? (
                    <line x1={stemRightX - 5} y1={groundY + 10} x2={stemRightX - 5} y2={baseBottomY - 5} stroke={rebarColor} strokeWidth="2" strokeDasharray="4 2"/>
                ) : (
                    <g fill={rebarColor}>
                        <circle cx={stemRightX - 5} cy={baseTopY - 20} r="3" />
                        <circle cx={stemRightX - 5} cy={baseTopY - 50} r="3" />
                        <circle cx={stemRightX - 5} cy={baseTopY - 80} r="3" />
                    </g>
                )}

                {/* Seismic */}
                {useSeismic && (
                    <>
                        <line x1={stemRightX + L_heel + 80} y1={groundY + H*0.4} x2={stemRightX + L_heel + 20} y2={groundY + H*0.4} stroke="#f97316" strokeWidth="3" markerEnd="url(#arrowSeismic)"/>
                        <text x={stemRightX + L_heel + 50} y={groundY + H*0.4 - 10} fontSize="12" fill="#f97316" fontWeight="bold">Pae</text>
                    </>
                )}

                {/* Pressure */}
                {q_max && (
                    <>
                        <line x1={startX} y1={baseBottomY+10} x2={startX} y2={baseBottomY+40} stroke="#f59e0b" markerEnd="url(#arrowUp)"/>
                        <line x1={stemRightX+L_heel} y1={baseBottomY+10} x2={stemRightX+L_heel} y2={baseBottomY+30} stroke="#f59e0b" markerEnd="url(#arrowUp)"/>
                        <path d={`M ${startX} ${baseBottomY+40} L ${stemRightX+L_heel} ${baseBottomY+30} L ${stemRightX+L_heel} ${baseBottomY+5} L ${startX} ${baseBottomY+5} Z`} fill="none" stroke="#f59e0b" strokeDasharray="2 2"/>
                    </>
                )}

                {/* Dimension */}
                <line x1={startX - 20} y1={groundY} x2={startX - 20} y2={baseBottomY} stroke="#64748b" markerStart="url(#tick)" markerEnd="url(#tick)" />
                <text x={startX - 25} y={(groundY+baseBottomY)/2} textAnchor="end" fontSize="12" fill="#64748b">{h_total.toFixed(2)}m</text>

                <defs>
                    <pattern id="soilPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse"><line x1="0" y1="10" x2="10" y2="0" stroke="#fcd34d" strokeWidth="1" opacity="0.3" /></pattern>
                    <marker id="arrowUp" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto" fill="#f59e0b"><path d="M0,0 L0,6 L6,3 z"/></marker>
                    <marker id="arrowSeismic" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" fill="#f97316"><path d="M0,0 L0,8 L8,4 z"/></marker>
                    <marker id="tick" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><circle cx="3" cy="3" r="2" fill="#64748b" /></marker>
                </defs>
            </svg>
        </div>
    );
};

export default RetainingWallView;