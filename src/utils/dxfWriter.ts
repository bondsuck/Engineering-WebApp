export class DxfWriter {
    private content: string[] = [];

    constructor() {
        this.content.push("0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC");
        this.content.push("0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n2");
        this.addLayerDef("CONCRETE", 7); // White
        this.addLayerDef("REBAR_MAIN", 1); // Red
        this.addLayerDef("REBAR_TEMP", 2); // Yellow
        this.addLayerDef("DIMENSION", 3); // Green
        this.content.push("0\nENDTAB\n0\nENDSEC");
        this.content.push("0\nSECTION\n2\nENTITIES");
    }

    private addLayerDef(name: string, color: number) {
        this.content.push(`0\nLAYER\n2\n${name}\n70\n0\n62\n${color}\n6\nCONTINUOUS`);
    }

    public addLine(x1: number, y1: number, x2: number, y2: number, layer: string) {
        this.content.push(`0\nLINE\n8\n${layer}\n10\n${x1}\n20\n${y1}\n11\n${x2}\n21\n${y2}`);
    }

    public addCircle(cx: number, cy: number, r: number, layer: string) {
        this.content.push(`0\nCIRCLE\n8\n${layer}\n10\n${cx}\n20\n${cy}\n40\n${r}`);
    }

    public addText(x: number, y: number, height: number, text: string, layer: string, rotation: number = 0) {
        this.content.push(`0\nTEXT\n8\n${layer}\n10\n${x}\n20\n${y}\n40\n${height}\n1\n${text}\n50\n${rotation}`);
    }

    public getContent(): string {
        return this.content.join("\n") + "\n0\nENDSEC\n0\nEOF";
    }
}