interface Props {
    structType: 'Slab' | 'Zigzag' | 'Spiral';
    supportType: 'Longitudinal' | 'Cantilever';
    landingSupport: 'Supported' | 'Free';
    numSteps: number; riser: number; going: number; waist: number;
    landingTop: number; landingBot: number; width: number; floorHeight: number;
    spiralRadius?: number; spiralSweep?: number;
}

const StairView = ({ structType, supportType, landingSupport, numSteps, riser, going, waist, landingTop, landingBot, width, floorHeight, spiralRadius, spiralSweep }: Props) => {
    
    const padding = 40;
    const viewWidth = 500;

    // --- SPIRAL VIEW ---
    if (structType === 'Spiral' && spiralRadius && spiralSweep) {
        const cx = viewWidth / 2;
        const cy = viewWidth / 2;
        const scale = (viewWidth - 100) / (spiralRadius * 200); 
        const R_out = spiralRadius * 100 * scale;
        const R_in = (spiralRadius - width) * 100 * scale;
        const steps = [];
        const angleStep = spiralSweep / numSteps;
        for(let i=0; i<=numSteps; i++) {
            const angle = (i * angleStep) * (Math.PI / 180) - Math.PI/2; 
            const x1 = cx + R_in * Math.cos(angle);
            const y1 = cy + R_in * Math.sin(angle);
            const x2 = cx + R_out * Math.cos(angle);
            const y2 = cy + R_out * Math.sin(angle);
            steps.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth="1" />);
        }
        return (
            <div className="flex flex-col items-center justify-center p-4">
                <svg width={viewWidth} height={viewWidth} className="overflow-visible">
                    <circle cx={cx} cy={cy} r={R_in} fill="none" stroke="#334155" strokeWidth="2" />
                    <path d={`M ${cx} ${cy-R_out} A ${R_out} ${R_out} 0 ${spiralSweep>180?1:0} 1 ${cx + R_out*Math.sin(spiralSweep*Math.PI/180)} ${cy - R_out*Math.cos(spiralSweep*Math.PI/180)}`} fill="none" stroke="#334155" strokeWidth="2" />
                    {steps}
                    <circle cx={cx} cy={cy} r={R_in + (R_out-R_in)*0.6} fill="none" stroke="#ef4444" strokeDasharray="4 2" />
                    <text x={cx} y={cy} textAnchor="middle" fill="#64748b" fontSize="12" dy={5}>Spiral Plan View</text>
                </svg>
            </div>
        );
    }

    // --- CANTILEVER VIEW ---
    if (supportType === 'Cantilever') {
        const W_cm = width * 100;
        const T = waist;
        const scale = (viewWidth - 100) / W_cm;
        const wallX = padding;
        const tipX = padding + W_cm * scale;
        const startY = 150;
        return (
            <div className="flex flex-col items-center justify-center p-4">
                <svg width={viewWidth} height={300} className="overflow-visible">
                    <rect x={wallX - 30} y={50} width={30} height={200} fill="#cbd5e1" stroke="#334155" />
                    <line x1={wallX} y1={50} x2={wallX} y2={250} stroke="#334155" strokeWidth="3" />
                    <path d={`M${wallX},${startY} L${tipX},${startY} L${tipX},${startY + T*scale} L${wallX},${startY + T*scale} Z`} fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
                    <line x1={wallX - 20} y1={startY + 10} x2={tipX - 10} y2={startY + 10} stroke="#ef4444" strokeWidth="3" />
                    <text x={(wallX+tipX)/2} y={startY - 10} textAnchor="middle" fill="#64748b" fontSize="12">Width = {width.toFixed(2)}m</text>
                    <text x={tipX + 10} y={startY + T*scale/2} textAnchor="start" fill="#64748b" fontSize="12">t={waist}cm</text>
                </svg>
            </div>
        );
    }

    // --- STANDARD VIEW ---
    const R = riser;
    const G = going;
    const W = waist;
    const L_Top = landingTop * 100;
    const L_Bot = landingBot * 100;
    const totalRun = L_Bot + (numSteps * G) + L_Top;
    const totalRise = numSteps * R;
    const scaleX = (viewWidth - padding * 2) / totalRun;
    const scaleY = scaleX;
    const sx = (val: number) => padding + val * scaleX;
    const sy = (val: number) => padding + (totalRise - val) * scaleY;

    let pathTop = `M ${sx(0)} ${sy(L_Bot > 0 ? 0 : 0)}`; 
    if (L_Bot > 0) pathTop = `M ${sx(0)} ${sy(0)} L ${sx(L_Bot)} ${sy(0)}`;
    for (let i = 0; i < numSteps; i++) {
        const startX = L_Bot + (i * G);
        const startY = i * R;
        pathTop += ` L ${sx(startX)} ${sy(startY + R)} L ${sx(startX + G)} ${sy(startY + R)}`;
    }
    pathTop += ` L ${sx(L_Bot + numSteps*G + L_Top)} ${sy(numSteps*R)}`;

    let pathBot = "";
    if (structType === 'Slab') {
        pathBot += `L ${sx(L_Bot + numSteps*G + L_Top)} ${sy(numSteps*R - W)} L ${sx(L_Bot + numSteps*G)} ${sy(numSteps*R - W)}`;
        pathBot += ` L ${sx(L_Bot)} ${sy(0 - W)} L ${sx(0)} ${sy(0 - W)} L ${sx(0)} ${sy(0)} Z`; 
    } else {
        pathBot += ` L ${sx(L_Bot + numSteps*G)} ${sy(numSteps*R - W)}`;
        for (let i = numSteps - 1; i >= 0; i--) {
            const stepX = L_Bot + (i * G);
            const stepY = i * R;
            pathBot += ` L ${sx(stepX + G)} ${sy(stepY + R - W)} L ${sx(stepX + G)} ${sy(stepY - W)} L ${sx(stepX)} ${sy(stepY - W)}`;
        }
        pathBot += ` L ${sx(L_Bot)} ${sy(0 - W)} L ${sx(0)} ${sy(0 - W)} L ${sx(0)} ${sy(0)} Z`;
    }

    const DrawBeam = ({ x, y }: { x: number, y: number }) => (<rect x={x - 10} y={y} width={20} height={30} fill="#94a3b8" stroke="#475569" strokeWidth="1" />);
    const FH_cm = floorHeight * 100;
    const startSlopeX = L_Bot;
    const startSlopeY = 0 - W;
    const endSlopeX = L_Bot + (numSteps * G);
    const endSlopeY = numSteps * R - W;
    const upperY1 = startSlopeY + FH_cm;
    const upperY2 = endSlopeY + FH_cm;

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <svg width={viewWidth} height={viewWidth * scaleY * 1.5 + 50} className="overflow-visible">
                <path d={pathTop + pathBot} fill={structType==='Slab' ? "#e2e8f0" : "#f1f5f9"} stroke="#334155" strokeWidth="2" />
                {landingSupport === 'Supported' && (<><DrawBeam x={sx(0)} y={sy(0 - W)} /><DrawBeam x={sx(L_Bot + numSteps * G + L_Top)} y={sy(numSteps * R - W)} /></>)}
                <line x1={sx(startSlopeX)} y1={sy(upperY1)} x2={sx(endSlopeX)} y2={sy(upperY2)} stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
                <line x1={sx(startSlopeX)} y1={sy(0)} x2={sx(startSlopeX)} y2={sy(upperY1)} stroke="#f59e0b" markerEnd="url(#arrow)" markerStart="url(#arrow)"/>
                <text x={sx(startSlopeX) + 5} y={sy(upperY1/2)} fill="#f59e0b" fontSize="10">Headroom</text>
                <line x1={sx(0)-10} y1={sy(0)} x2={sx(0)-10} y2={sy(numSteps*R)} stroke="#64748b" markerStart="url(#tick)" markerEnd="url(#tick)" />
                <text x={sx(0)-15} y={sy(numSteps*R/2)} fill="#64748b" fontSize="10" textAnchor="end">H={(numSteps*R/100).toFixed(2)}m</text>
                <defs><marker id="tick" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><circle cx="3" cy="3" r="2" fill="#64748b" /></marker><marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto" fill="#f59e0b"><path d="M0,0 L0,6 L6,3 z"/></marker></defs>
            </svg>
        </div>
    );
};

export default StairView;