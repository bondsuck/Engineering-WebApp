interface Props {
    bx: number; // m
    thickness: number; // cm
    col_x: number; // cm
    df: number; // m
    q_max: number; // T/m2
    q_min: number; // T/m2
    rebarX?: string; // Optional prop, not used in visual but passed
}

const FootingSectionView = ({ bx, thickness, col_x, df, q_max, q_min }: Props) => {
    const padding = 50;
    const w_scale = 200 / Math.max(bx, df*1.5);
    
    const W = bx * w_scale;
    const H_ftg = (thickness/100) * w_scale;
    const H_col = (df - thickness/100) * w_scale;
    const W_col = (col_x/100) * w_scale;
    
    const groundY = padding;
    const ftgTopY = groundY + H_col;
    const ftgBotY = ftgTopY + H_ftg;
    const centerX = padding + W/2;

    const p_scale = 40 / Math.max(q_max, 1);
    const h_p_left = q_min * p_scale;
    const h_p_right = q_max * p_scale;

    return (
        <div className="flex flex-col items-center">
            <svg width={W + padding*2} height={ftgBotY + 80} className="overflow-visible">
                {/* 1. Ground Line */}
                <line x1={padding - 20} y1={groundY} x2={padding + W + 20} y2={groundY} stroke="#475569" strokeWidth="2" />
                <path d={`M${padding-20} ${groundY} L${padding-10} ${groundY+10} M${padding} ${groundY} L${padding+10} ${groundY+10}`} stroke="#475569" strokeWidth="1"/>
                <text x={padding + W + 25} y={groundY + 5} fontSize="10" fill="#475569">GL</text>

                {/* 2. Column Stub */}
                <rect 
                    x={centerX - W_col/2} y={groundY - 20} 
                    width={W_col} height={H_col + 20} 
                    fill="#cbd5e1" stroke="#334155" 
                />

                {/* 3. Footing Box */}
                <rect 
                    x={padding} y={ftgTopY} 
                    width={W} height={H_ftg} 
                    fill="#e2e8f0" stroke="#334155" strokeWidth="2"
                />

                {/* 4. Rebar */}
                <line 
                    x1={padding + 10} y1={ftgBotY - 10} 
                    x2={padding + W - 10} y2={ftgBotY - 10} 
                    stroke="#ef4444" strokeWidth="3" 
                />
                <g fill="#3b82f6">
                    <circle cx={padding + 20} cy={ftgBotY - 18} r="3" />
                    <circle cx={padding + 40} cy={ftgBotY - 18} r="3" />
                    <circle cx={padding + 60} cy={ftgBotY - 18} r="3" />
                    <circle cx={centerX} cy={ftgBotY - 18} r="3" />
                    <circle cx={padding + W - 20} cy={ftgBotY - 18} r="3" />
                </g>

                {/* 5. Pressure */}
                <path 
                    d={`M${padding} ${ftgBotY} L${padding} ${ftgBotY + h_p_left} L${padding + W} ${ftgBotY + h_p_right} L${padding + W} ${ftgBotY} Z`} 
                    fill="url(#soilGradient)" stroke="#f59e0b" strokeWidth="1" opacity="0.8"
                />
                
                <line x1={padding} y1={ftgBotY+h_p_left} x2={padding} y2={ftgBotY} stroke="#f59e0b" markerEnd="url(#arrow)" />
                <line x1={padding+W} y1={ftgBotY+h_p_right} x2={padding+W} y2={ftgBotY} stroke="#f59e0b" markerEnd="url(#arrow)" />

                <text x={padding} y={ftgBotY + h_p_left + 15} textAnchor="middle" fontSize="10" fill="#b45309">{q_min.toFixed(1)}</text>
                <text x={padding + W} y={ftgBotY + h_p_right + 15} textAnchor="middle" fontSize="10" fill="#b45309">{q_max.toFixed(1)} T/m²</text>

                {/* Dimensions */}
                <line x1={padding - 10} y1={groundY} x2={padding - 10} y2={ftgBotY} stroke="#64748b" markerStart="url(#tick)" markerEnd="url(#tick)" />
                <text x={padding - 15} y={(groundY+ftgBotY)/2} textAnchor="end" fontSize="10" fill="#64748b">Df = {df.toFixed(2)}m</text>
                
                <line x1={padding + W + 10} y1={ftgTopY} x2={padding + W + 10} y2={ftgBotY} stroke="#64748b" markerStart="url(#tick)" markerEnd="url(#tick)" />
                <text x={padding + W + 15} y={(ftgTopY+ftgBotY)/2} textAnchor="start" fontSize="10" fill="#64748b">t = {thickness}cm</text>

                <defs>
                    <linearGradient id="soilGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
                    </linearGradient>
                    <marker id="arrow" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L5,3 z" fill="#f59e0b" />
                    </marker>
                    <marker id="tick" markerWidth="10" markerHeight="1" refX="5" refY="0.5" orient="auto">
                        <rect width="10" height="1" fill="#64748b"/>
                    </marker>
                </defs>
            </svg>
            <p className="text-[10px] text-slate-500 mt-2">Section View X-X</p>
        </div>
    );
};

export default FootingSectionView;