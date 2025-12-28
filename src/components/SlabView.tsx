import { THEME } from '../constants';

interface Props {
    lx: number; 
    ly: number;
    edges: { top: boolean; right: boolean; bottom: boolean; left: boolean };
    onEdgeClick?: (edge: 'top' | 'right' | 'bottom' | 'left') => void;
    rebarX?: string;
    rebarY?: string;
    isReport?: boolean;
}

const SlabView = ({ lx, ly, edges, onEdgeClick, rebarX, rebarY, isReport = false }: Props) => {
    const padding = 60;
    const maxDim = Math.max(lx, ly);
    const scale = 250 / maxDim;
    
    const w = lx * scale;
    const h = ly * scale;
    const cx = w/2 + padding;
    const cy = h/2 + padding;

    const strokeColor = isReport ? "#000" : "#94a3b8";
    const fillColor = isReport ? "#fff" : "#1e293b";
    const hatchColor = isReport ? "#000" : "#64748b";
    const textColor = isReport ? "#000" : "#cbd5e1";
    
    // ✅ ใช้สีจาก THEME
    const mainRebarColor = isReport ? "#000" : THEME.COLORS.REBAR_MAIN;
    const secRebarColor = isReport ? "#000" : THEME.COLORS.REBAR_STIRRUP;

    const Hatch = ({ side }: { side: 'top'|'right'|'bottom'|'left' }) => {
        const depth = 15;
        const spacing = 10;
        let path = "";

        if (side === 'top') {
            for(let x = padding; x <= padding + w; x += spacing) path += `M${x} ${padding} L${x-5} ${padding-depth} `;
        } else if (side === 'bottom') {
            for(let x = padding; x <= padding + w; x += spacing) path += `M${x} ${padding+h} L${x+5} ${padding+h+depth} `;
        } else if (side === 'left') {
            for(let y = padding; y <= padding + h; y += spacing) path += `M${padding} ${y} L${padding-depth} ${y-5} `;
        } else if (side === 'right') {
            for(let y = padding; y <= padding + h; y += spacing) path += `M${padding+w} ${y} L${padding+w+depth} ${y+5} `;
        }
        return <path d={path} stroke={hatchColor} strokeWidth="1" fill="none" />;
    };

    const ClickZone = ({ side }: { side: 'top'|'right'|'bottom'|'left' }) => {
        if (!onEdgeClick) return null;
        let props = {};
        const z = 40;
        if (side === 'top') props = { x: padding, y: padding - z/2, width: w, height: z };
        else if (side === 'bottom') props = { x: padding, y: padding + h - z/2, width: w, height: z };
        else if (side === 'left') props = { x: padding - z/2, y: padding, width: z, height: h };
        else if (side === 'right') props = { x: padding + w - z/2, y: padding, width: z, height: h };

        return (
            <rect {...props} fill="transparent" className="cursor-pointer hover:fill-blue-500/20 transition-colors" onClick={() => onEdgeClick(side)}>
                <title>Click to toggle continuity</title>
            </rect>
        );
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <svg width={w + padding*2} height={h + padding*2} className="overflow-visible">
                <rect x={padding} y={padding} width={w} height={h} fill={fillColor} stroke={strokeColor} strokeWidth="2" />
                
                {edges.top && <Hatch side="top" />}
                {edges.right && <Hatch side="right" />}
                {edges.bottom && <Hatch side="bottom" />}
                {edges.left && <Hatch side="left" />}

                <text x={cx} y={padding - 25} textAnchor="middle" fill={textColor} fontSize="12" fontWeight="bold">{lx.toFixed(2)} m</text>
                <text x={padding - 25} y={cy} textAnchor="middle" transform={`rotate(-90 ${padding-25},${cy})`} fill={textColor} fontSize="12" fontWeight="bold">{ly.toFixed(2)} m</text>

                {!isReport && (
                    <>
                        <line x1={padding+10} y1={cy} x2={padding+w-10} y2={cy} stroke={mainRebarColor} strokeWidth="2" />
                        <text x={cx} y={cy - 5} textAnchor="middle" fill={mainRebarColor} fontSize="10">{rebarX}</text>
                        
                        <line x1={cx} y1={padding+10} x2={cx} y2={padding+h-10} stroke={secRebarColor} strokeWidth="2" />
                        <text x={cx + 5} y={cy + 20} textAnchor="start" fill={secRebarColor} fontSize="10">{rebarY}</text>
                        
                        <ClickZone side="top" /><ClickZone side="right" /><ClickZone side="bottom" /><ClickZone side="left" />
                    </>
                )}
            </svg>
            {!isReport && <div className="text-[10px] text-slate-500 mt-2 text-center">* Click edges to toggle Continuity</div>}
        </div>
    );
};

export default SlabView;