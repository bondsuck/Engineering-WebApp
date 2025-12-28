import { DxfWriter } from './dxfWriter';
import { StairInput, StairResult } from './rcStairCalculation';

export const generateStairDxf = (input: StairInput, res: StairResult): string => {
    const dxf = new DxfWriter();
    const to_mm = (val_m: number) => val_m * 1000;
    const cm_to_mm = (val_cm: number) => val_cm * 10;

    const R = cm_to_mm(input.riser);
    const G = cm_to_mm(input.going);
    const W = cm_to_mm(input.waist);
    const Cov = cm_to_mm(input.covering);
    const L_Top = to_mm(input.landingTop);
    const L_Bot = to_mm(input.landingBot);
    const numSteps = res.numSteps;

    // --- 1. LONGITUDINAL SECTION ---
    let startX = 0;
    let startY = W; 

    // Bot Landing Top
    dxf.addLine(startX, startY, startX + L_Bot, startY, "CONCRETE");
    
    // Steps (Top Surface)
    let stepX = startX + L_Bot;
    let stepY = startY;
    for (let i = 0; i < numSteps; i++) {
        dxf.addLine(stepX, stepY, stepX, stepY + R, "CONCRETE"); // Riser
        dxf.addLine(stepX, stepY + R, stepX + G, stepY + R, "CONCRETE"); // Going
        stepX += G;
        stepY += R;
    }

    // Top Landing Top
    dxf.addLine(stepX, stepY, stepX + L_Top, stepY, "CONCRETE");
    
    // Soffit (Bottom Surface)
    const endX = stepX + L_Top;
    const endY = stepY;
    
    // Top Landing End Face
    dxf.addLine(endX, endY, endX, endY - W, "CONCRETE");
    
    const cornerTopX = stepX; 
    const cornerTopY = endY - W;
    const cornerBotX = L_Bot;
    const cornerBotY = 0;

    // Top Landing Soffit
    dxf.addLine(endX, endY - W, cornerTopX, cornerTopY, "CONCRETE");

    // ✅ Advanced Soffit Logic
    if (input.structType === 'Slab' || input.structType === 'Spiral') {
        // Slab Type: Straight Line Soffit
        dxf.addLine(cornerTopX, cornerTopY, cornerBotX, cornerBotY, "CONCRETE");
        
        // Rebar (Slab)
        const barOff = Cov;
        dxf.addLine(cornerBotX, cornerBotY + barOff, cornerTopX, cornerTopY + barOff, "REBAR_MAIN");

    } else {
        // ✅ Zigzag Type: Stepped Soffit (Polyline effect)
        // We trace steps backwards from Top to Bot, shifted down by W (vertical approx)
        // Note: For true perpendicular W, geometry is complex. Vertical W is standard for drafting logic.
        
        let zigX = cornerTopX;
        let zigY = cornerTopY; // Already shifted by W from Top Surface
        
        // Connect Top Landing Corner to first step soffit
        // Actually, for Zigzag, the soffit follows the step profile.
        
        for (let i = 0; i < numSteps; i++) {
            // Draw Going (Backwards)
            dxf.addLine(zigX, zigY, zigX - G, zigY, "CONCRETE");
            zigX -= G;
            
            // Draw Riser (Downwards)
            dxf.addLine(zigX, zigY, zigX, zigY - R, "CONCRETE");
            zigY -= R;
        }
        // At this point zigX should equal cornerBotX (L_Bot) and zigY should equal cornerBotY (0)
        
        // Rebar (Zigzag) - Follows the steps (Bent bar)
        // Simplify: Just draw a straight line for schematic, or detailed bent bar?
        // Let's draw schematic straight line through centroid for clarity, or offset steps.
        // Simplified for DXF: Straight line (easier to read)
        dxf.addLine(cornerBotX, cornerBotY + Cov, cornerTopX, cornerTopY + Cov, "REBAR_MAIN");
    }

    // Bot Landing Soffit & End
    dxf.addLine(cornerBotX, cornerBotY, 0, 0, "CONCRETE");
    dxf.addLine(0, 0, 0, W, "CONCRETE");

    // Text & Dimensions
    dxf.addText(L_Bot + (numSteps*G)/2, (numSteps*R)/2 + 500, 150, `Main: DB${input.mainBarDia}@${input.spacing}`, "DIMENSION");

    // --- 2. ✅ SPIRAL PLAN VIEW (Added to the right) ---
    if (input.structType === 'Spiral' && input.spiralRadius && input.spiralSweep) {
        const cx = endX + 2000; // Shift Plan View to right
        const cy = (endY / 2);  // Center Y
        const R_out = to_mm(input.spiralRadius);
        const R_in = to_mm(input.spiralRadius - input.width);
        
        // Circles
        dxf.addCircle(cx, cy, R_in, "CONCRETE");
        dxf.addCircle(cx, cy, R_out, "CONCRETE"); // If sweep < 360, should be Arc? 
        // For standard plan, we usually draw full circles or arcs. 
        // Let's use ARCs if sweep is defined.
        // Note: DXF Arc angles are counter-clockwise from X-axis.
        // We'll just draw circles for boundary to be safe/simple, and arcs for sweep.
        
        // Steps (Radial Lines)
        const angleStep = input.spiralSweep / numSteps;
        for(let i=0; i<=numSteps; i++) {
            const angleDeg = 90 - (i * angleStep); // Start from top (90 deg) going CW?
            const angleRad = angleDeg * (Math.PI / 180);
            
            const x1 = cx + R_in * Math.cos(angleRad);
            const y1 = cy + R_in * Math.sin(angleRad);
            const x2 = cx + R_out * Math.cos(angleRad);
            const y2 = cy + R_out * Math.sin(angleRad);
            
            dxf.addLine(x1, y1, x2, y2, "CONCRETE");
        }
        
        // Walking Line (Dashed) - Layer REBAR_TEMP (Yellow)
        const R_walk = R_in + 0.6 * (R_out - R_in);
        dxf.addCircle(cx, cy, R_walk, "REBAR_TEMP");
        dxf.addText(cx, cy - R_out - 200, 150, "Spiral Plan View", "DIMENSION");
    }

    return dxf.getContent();
};