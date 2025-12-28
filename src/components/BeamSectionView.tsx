interface BeamSectionViewProps {
    b: number; h: number; cover: number;
    topBarDia: number; topBarType: string;
    botBarDia: number; botBarType: string;
    stirrupDia: number; stirrupType: string;
    numBarsBot: number; numBarsTop: number;
    stirrupSpacing: number;
    barsPerLayerBot: number[]; barsPerLayerTop: number[];
    isReport?: boolean; // 🛠️ 1. เพิ่ม Prop เช็คว่าเป็น Report หรือไม่
}

export const BeamSectionView = ({
    b, h, cover, 
    topBarDia, topBarType, 
    botBarDia, botBarType, 
    stirrupDia, stirrupType, 
    numBarsBot, numBarsTop, stirrupSpacing,
    barsPerLayerBot, barsPerLayerTop,
    isReport = false // Default คือ false (Dark mode)
}: BeamSectionViewProps) => {

    const canvasW = 500;
    const canvasH = 450;
    const padding = 60;

    const scaleX = (canvasW - (padding * 2)) / b;
    const scaleY = (canvasH - (padding * 2)) / h;
    const scale = Math.min(scaleX, scaleY);

    const drawW = b * scale;
    const drawH = h * scale;
    const startX = (canvasW - drawW) / 2;
    const startY = (canvasH - drawH) / 2;

    const coverPx = cover * scale;
    const stirrupDiaPx = (stirrupDia / 10) * scale;
    const topBarDiaPx = (topBarDia / 10) * scale;
    const botBarDiaPx = (botBarDia / 10) * scale;
    const layerSpacingPx = 2.5 * scale; 

    // 🛠️ 2. กำหนดชุดสีตามโหมด (Dark UI vs Print Report)
    const theme = isReport ? {
        concreteFill: "#ffffff",      // ขาว
        concreteStroke: "#000000",    // ดำ
        stirrup: "#ef4444",           // แดงเข้ม
        barTop: "#dc2626",            // แดง
        barBot: "#16a34a",            // เขียว
        text: "#000000",              // ดำ
        line: "#64748b",              // เทาเข้ม
        callout: "#000000"            // ดำ
    } : {
        concreteFill: "#1e293b",      // Slate-800
        concreteStroke: "#475569",    // Slate-600
        stirrup: "#fca5a5",           // Rose-300
        barTop: "#ef4444",            // Red-500
        barBot: "#22c55e",            // Green-500
        text: "#94a3b8",              // Slate-400
        line: "#64748b",              // Slate-500
        callout: "#ffffff"            // White
    };

    const renderBars = (isTop: boolean, layers: number[], diaPx: number) => {
        const elements: JSX.Element[] = [];
        const radius = diaPx / 2;
        const offsetFromSurface = coverPx + stirrupDiaPx + radius;

        layers.forEach((count, layerIdx) => {
            if (count === 0) return;
            const layerOffset = layerIdx * (layerSpacingPx + diaPx);
            let cy = isTop ? startY + offsetFromSurface + layerOffset : (startY + drawH) - offsetFromSurface - layerOffset;
            const availableWidth = drawW - 2 * (coverPx + stirrupDiaPx + radius);
            const startBarX = startX + coverPx + stirrupDiaPx + radius;

            if (count === 1) {
                elements.push(<circle key={`${isTop?'t':'b'}-${layerIdx}-0`} cx={startX + drawW/2} cy={cy} r={radius} fill={isTop ? theme.barTop : theme.barBot} stroke={isReport ? "black" : "none"} strokeWidth={isReport ? 0.5 : 0} />);
            } else {
                const gap = availableWidth / (count - 1);
                for(let i=0; i<count; i++) {
                    elements.push(<circle key={`${isTop?'t':'b'}-${layerIdx}-${i}`} cx={startBarX + (i * gap)} cy={cy} r={radius} fill={isTop ? theme.barTop : theme.barBot} stroke={isReport ? "black" : "none"} strokeWidth={isReport ? 0.5 : 0} />);
                }
            }
        });
        return elements;
    };

    return (
        <svg viewBox={`0 0 ${canvasW} ${canvasH}`} className="w-full h-full font-sans" style={{overflow: 'visible'}}>
            {/* Concrete */}
            <rect x={startX} y={startY} width={drawW} height={drawH} fill={theme.concreteFill} stroke={theme.concreteStroke} strokeWidth="2" />
            
            {/* Stirrup */}
            <rect 
                x={startX + coverPx + (stirrupDiaPx/2)} 
                y={startY + coverPx + (stirrupDiaPx/2)} 
                width={drawW - 2*coverPx - stirrupDiaPx} 
                height={drawH - 2*coverPx - stirrupDiaPx} 
                fill="none" 
                stroke={theme.stirrup}
                strokeWidth={stirrupDiaPx} 
                rx={stirrupDiaPx * 2} 
            />

            {/* Main Bars */}
            {renderBars(true, barsPerLayerTop, topBarDiaPx)}
            {renderBars(false, barsPerLayerBot, botBarDiaPx)}

            {/* Dimensions */}
            <line x1={startX} y1={startY + drawH + 20} x2={startX + drawW} y2={startY + drawH + 20} stroke={theme.line} strokeWidth="1"/>
            <line x1={startX} y1={startY + drawH + 15} x2={startX} y2={startY + drawH + 25} stroke={theme.line} strokeWidth="1"/>
            <line x1={startX + drawW} y1={startY + drawH + 15} x2={startX + drawW} y2={startY + drawH + 25} stroke={theme.line} strokeWidth="1"/>
            <text x={startX + drawW/2} y={startY + drawH + 40} fill={theme.text} fontSize="14" textAnchor="middle" fontWeight="bold">{b} cm</text>

            <line x1={startX - 20} y1={startY} x2={startX - 20} y2={startY + drawH} stroke={theme.line} strokeWidth="1"/>
            <line x1={startX - 25} y1={startY} x2={startX - 15} y2={startY} stroke={theme.line} strokeWidth="1"/>
            <line x1={startX - 25} y1={startY + drawH} x2={startX - 15} y2={startY + drawH} stroke={theme.line} strokeWidth="1"/>
            <text x={startX - 35} y={startY + drawH/2} fill={theme.text} fontSize="14" textAnchor="middle" fontWeight="bold" transform={`rotate(-90, ${startX-35}, ${startY+drawH/2})`}>{h} cm</text>

            {/* Callouts */}
            <path d={`M ${startX + drawW - coverPx} ${startY + coverPx + stirrupDiaPx} L ${startX + drawW + 40} ${startY + 20} H ${startX + drawW + 80}`} stroke={theme.callout} fill="none" strokeWidth="1" />
            <text x={startX + drawW + 85} y={startY + 25} fill={theme.callout} fontSize="15" fontWeight="bold">{numBarsTop}-{topBarType}{topBarDia}</text>

            <path d={`M ${startX + drawW - coverPx} ${startY + drawH - coverPx - stirrupDiaPx} L ${startX + drawW + 40} ${startY + drawH - 20} H ${startX + drawW + 80}`} stroke={theme.callout} fill="none" strokeWidth="1" />
            <text x={startX + drawW + 85} y={startY + drawH - 15} fill={theme.callout} fontSize="15" fontWeight="bold">{numBarsBot}-{botBarType}{botBarDia}</text>

            <path d={`M ${startX + drawW - coverPx} ${startY + drawH/2} H ${startX + drawW + 50}`} stroke={theme.stirrup} fill="none" strokeWidth="1" strokeDasharray="4 2" />
            <text x={startX + drawW + 55} y={startY + drawH/2 + 5} fill={theme.stirrup} fontSize="14" fontWeight="bold">{stirrupType}{stirrupDia} @ {stirrupSpacing}</text>
        </svg>
    );
};