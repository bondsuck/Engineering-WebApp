import React from 'react';

interface Props {
    bx: number; // m
    by: number; // m
    cx: number; // cm
    cy: number; // cm
    isReport?: boolean;
}

const FootingView = ({ bx, by, cx, cy, isReport = false }: Props) => {
    // Scaling Logic
    const padding = 40;
    const maxDim = Math.max(bx, by);
    const scale = 220 / maxDim; // Max width/height in px

    const w = bx * scale;
    const h = by * scale;
    const colW = (cx/100) * scale;
    const colH = (cy/100) * scale;
    
    const center = { x: w/2 + padding, y: h/2 + padding };

    // Styling
    const strokeColor = isReport ? "#000" : "#94a3b8";
    const fillColor = isReport ? "#fff" : "#1e293b";
    const colFill = isReport ? "#ddd" : "#475569";
    const textColor = isReport ? "#000" : "#cbd5e1";

    return (
        <div className="flex flex-col items-center justify-center">
            <svg width={w + padding*2} height={h + padding*2} className="overflow-visible">
                {/* 1. Footing Boundary */}
                <rect 
                    x={padding} y={padding} 
                    width={w} height={h} 
                    fill={fillColor} stroke={strokeColor} strokeWidth="2" 
                />

                {/* 2. Column */}
                <rect 
                    x={center.x - colW/2} y={center.y - colH/2} 
                    width={colW} height={colH} 
                    fill={colFill} stroke={strokeColor} strokeWidth="1"
                />
                
                {/* 3. Rebar Indication (Dashed Lines) */}
                {!isReport && (
                    <>
                        <line x1={padding+10} y1={center.y} x2={padding+w-10} y2={center.y} stroke="red" strokeWidth="1" strokeDasharray="4 2" opacity="0.6"/>
                        <line x1={center.x} y1={padding+10} x2={center.x} y2={padding+h-10} stroke="blue" strokeWidth="1" strokeDasharray="4 2" opacity="0.6"/>
                    </>
                )}

                {/* 4. Dimensions */}
                <text x={center.x} y={padding - 10} textAnchor="middle" fill={textColor} fontSize="12" fontWeight="bold">
                    Bx = {bx.toFixed(2)} m
                </text>
                <text x={padding - 10} y={center.y} textAnchor="middle" transform={`rotate(-90 ${padding-10},${center.y})`} fill={textColor} fontSize="12" fontWeight="bold">
                    By = {by.toFixed(2)} m
                </text>
            </svg>
            <p className="text-[10px] text-slate-500 mt-2">Plan View (Top)</p>
        </div>
    );
};

export default FootingView;