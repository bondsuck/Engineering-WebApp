import React from 'react';
// ✅ Import THEME มาใช้
import { THEME } from '../constants';

interface Props {
    lx: number; ly: number;
    edges: { top: boolean; right: boolean; bottom: boolean; left: boolean }; 
    onEdgeClick?: (edge: 'top' | 'right' | 'bottom' | 'left') => void;
    rebarX?: string; rebarY?: string;
    isReport?: boolean;
}

const SlabView = ({ lx, ly, edges, onEdgeClick, rebarX, rebarY, isReport = false }: Props) => {
    const padding = 50;
    const maxDim = Math.max(lx, ly);
    const scale = isReport ? 150 / maxDim : 220 / maxDim;
    const w = lx * scale;
    const h = ly * scale;
    const cx = w/2 + padding;
    const cy = h/2 + padding;

    // ✅ ใช้สีจาก THEME
    const mainRebarColor = isReport ? "#000" : THEME.COLORS.REBAR_MAIN;    // #ef4444
    const stirrupRebarColor = isReport ? "#000" : THEME.COLORS.REBAR_STIRRUP; // #3b82f6 (ใช้แทนเหล็กแกนรอง)
    
    const strokeColor = isReport ? "#000" : "#94a3b8";
    const fillColor = isReport ? "#fff" : "#1e293b";
    const hatchColor = isReport ? "#000" : "#64748b";
    const textColor = isReport ? "#000" : "#cbd5e1";

    const Hatch = ({ side }: { side: 'top'|'right'|'bottom'|'left' }) => {
        const depth = 10;
        let path = "";
        if (side === 'top') for(let x=padding; x<=padding+w; x+=8) path+=`M${x} ${padding} L${x-3} ${padding-depth} `;
        if (side === 'bottom') for(let x=padding; x<=padding+w; x+=8) path+=`M${x} ${padding+h} L${x+3} ${padding+h+depth} `;
        if (side === 'left') for(let y=padding; y<=padding+h; y+=8) path+=`M${padding} ${y} L${padding-depth} ${y-3} `;
        if (side === 'right') for(let y=padding; y<=padding+h; y+=8) path+=`M${padding+w} ${y} L${padding+w+depth} ${y+3} `;
        return <path d={path} stroke={hatchColor} strokeWidth="1" fill="none" />;
    };

    const ClickZone = ({ side }: { side: 'top'|'right'|'bottom'|'left' }) => {
        if (!onEdgeClick) return null;
        let props = {};
        const z = 30;
        if (side === 'top') props = { x: padding, y: padding - z/2, width: w, height: z };
        else if (side === 'bottom') props = { x: padding, y: padding + h - z/2, width: w, height: z };
        else if (side === 'left') props = { x: padding - z/2, y: padding, width: z, height: h };
        else if (side === 'right') props = { x: padding + w - z/2, y: padding, width: z, height: h };
        return <rect {...props} fill="transparent" className="cursor-pointer hover:fill-blue-500/20" onClick={() => onEdgeClick(side)} />;
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <svg width={w + padding*2} height={h + padding*2} className="overflow-visible">
                <rect x={padding} y={padding} width={w} height={h} fill={fillColor} stroke={strokeColor} strokeWidth="2" />
                {edges.top && <Hatch side="top" />}
                {edges.right && <Hatch side="right" />}
                {edges.bottom && <Hatch side="bottom" />}
                {edges.left && <Hatch side="left" />}
                
                <text x={cx} y={padding - 20} textAnchor="middle" fill={textColor} fontSize="10" fontWeight="bold">{lx.toFixed(2)} m</text>
                <text x={padding - 20} y={cy} textAnchor="middle" transform={`rotate(-90 ${padding-20},${cy})`} fill={textColor} fontSize="10" fontWeight="bold">{ly.toFixed(2)} m</text>
                
                {!isReport && rebarX && (
                    <>
                        <line x1={padding+15} y1={cy} x2={padding+w-15} y2={cy} stroke={mainRebarColor} strokeWidth="1.5" />
                        <path d={`M${padding+15} ${cy} L${padding+20} ${cy-3} M${padding+15} ${cy} L${padding+20} ${cy+3}`} stroke={mainRebarColor} strokeWidth="1.5" fill="none"/>
                        <path d={`M${padding+w-15} ${cy} L${padding+w-20} ${cy-3} M${padding+w-15} ${cy} L${padding+w-20} ${cy+3}`} stroke={mainRebarColor} strokeWidth="1.5" fill="none"/>
                        <text x={cx} y={cy - 5} textAnchor="middle" fill={mainRebarColor} fontSize="9" fontWeight="bold">{rebarX}</text>
                    </>
                )}
                {!isReport && rebarY && (
                    <>
                        <line x1={cx} y1={padding+15} x2={cx} y2={padding+h-15} stroke={stirrupRebarColor} strokeWidth="1.5" />
                        <path d={`M${cx} ${padding+15} L${cx-3} ${padding+20} M${cx} ${padding+15} L${cx+3} ${padding+20}`} stroke={stirrupRebarColor} strokeWidth="1.5" fill="none"/>
                        <path d={`M${cx} ${padding+h-15} L${cx-3} ${padding+h-20} M${cx} ${padding+h-15} L${cx+3} ${padding+h-20}`} stroke={stirrupRebarColor} strokeWidth="1.5" fill="none"/>
                        <text x={cx + 5} y={cy + 15} textAnchor="start" fill={stirrupRebarColor} fontSize="9" fontWeight="bold">{rebarY}</text>
                    </>
                )}
                {!isReport && (
                    <><ClickZone side="top" /><ClickZone side="right" /><ClickZone side="bottom" /><ClickZone side="left" /></>
                )}
            </svg>
        </div>
    );
};

export default SlabView;