import { THEME } from '../constants';

interface Props {
    bx: number; // m
    by: number; // m
    cx: number; // cm (Column Width X)
    cy: number; // cm (Column Depth Y)
    isReport?: boolean;
}

const FootingView = ({ bx, by, cx, cy, isReport = false }: Props) => {
    const padding = 40;
    const maxDim = Math.max(bx, by);
    const scale = isReport ? 150 / maxDim : 220 / maxDim;

    const w = bx * scale;
    const h = by * scale;
    const colW = (cx/100) * scale;
    const colH = (cy/100) * scale;
    
    const center = { x: w/2 + padding, y: h/2 + padding };

    // Colors
    const strokeColor = isReport ? "#000" : "#94a3b8"; // Slate-400
    const fillColor = isReport ? "#fff" : "#1e293b";   // Slate-800
    const colFill = isReport ? "#ddd" : "#475569";     // Slate-600
    const dimColor = isReport ? "#000" : "#cbd5e1";    // Slate-300

    return (
        <div className="flex flex-col items-center justify-center">
            <svg width={w + padding*2} height={h + padding*2} className="overflow-visible">
                {/* Footing Boundary */}
                <rect 
                    x={padding} y={padding} 
                    width={w} height={h} 
                    fill={fillColor} stroke={strokeColor} strokeWidth="2" 
                />

                {/* Column */}
                <rect 
                    x={center.x - colW/2} y={center.y - colH/2} 
                    width={colW} height={colH} 
                    fill={colFill} stroke={strokeColor} strokeWidth="1"
                />
                
                {/* Rebar Indication (Dashed) */}
                {!isReport && (
                    <>
                        <line x1={padding+10} y1={center.y} x2={padding+w-10} y2={center.y} stroke={THEME.COLORS.REBAR_MAIN} strokeWidth="1" strokeDasharray="4 2" opacity="0.6"/>
                        <line x1={center.x} y1={padding+10} x2={center.x} y2={padding+h-10} stroke={THEME.COLORS.REBAR_STIRRUP} strokeWidth="1" strokeDasharray="4 2" opacity="0.6"/>
                    </>
                )}

                {/* Dimensions */}
                {/* Bx */}
                <line x1={padding} y1={padding - 15} x2={padding + w} y2={padding - 15} stroke={dimColor} strokeWidth="1"/>
                <line x1={padding} y1={padding - 10} x2={padding} y2={padding - 20} stroke={dimColor} strokeWidth="1"/>
                <line x1={padding + w} y1={padding - 10} x2={padding + w} y2={padding - 20} stroke={dimColor} strokeWidth="1"/>
                <text x={center.x} y={padding - 25} textAnchor="middle" fill={dimColor} fontSize="12" fontWeight="bold">
                    Bx = {bx.toFixed(2)} m
                </text>

                {/* By */}
                <line x1={padding - 15} y1={padding} x2={padding - 15} y2={padding + h} stroke={dimColor} strokeWidth="1"/>
                <line x1={padding - 10} y1={padding} x2={padding - 20} y2={padding} stroke={dimColor} strokeWidth="1"/>
                <line x1={padding - 10} y1={padding + h} x2={padding - 20} y2={padding + h} stroke={dimColor} strokeWidth="1"/>
                <text x={padding - 25} y={center.y} textAnchor="middle" transform={`rotate(-90 ${padding-25},${center.y})`} fill={dimColor} fontSize="12" fontWeight="bold">
                    By = {by.toFixed(2)} m
                </text>
            </svg>
            <p className="text-[10px] text-slate-500 mt-2">Plan View (Top)</p>
        </div>
    );
};

export default FootingView;