import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, Calculator, Printer, FileText, Settings, 
    Layers, Box, Grid, ArrowUpRight, AlertTriangle, 
    GitFork, Anchor, Activity, ArrowRightLeft, FastForward, Download, Scale
} from 'lucide-react';
import { StairInput, calculateStair } from '../utils/rcStairCalculation';
import { generateStairDxf } from '../utils/stairDxfLogic';
import { MATERIAL_COSTS } from '../constants';
import StairView from '../components/StairView';
import { DesignStandard } from '../utils/stairStandards';

interface Props { onBack: () => void; isPro?: boolean; }

const StaircaseDesignTool = ({ onBack, isPro = false }: Props) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(0);

    const [inputs, setInputs] = useState<StairInput>({
        structType: 'Slab', supportType: 'Longitudinal', layoutType: 'DogLegged', landingSupport: 'Supported',
        standard: 'Thai_MR55', 
        floorHeight: 3.0, width: 1.2, riser: 17.5, going: 25, waist: 15,
        landingTop: 1.2, landingBot: 1.2, upperFloorThk: 20,
        spiralRadius: 2.0, spiralSweep: 270,
        sdl: 100, ll: 300, fc: 240, fy: 4000, covering: 2.5, mainBarDia: 12, spacing: 15
    });

    const updateInput = <K extends keyof StairInput>(key: K, val: StairInput[K]) => setInputs(p => ({ ...p, [key]: val }));
    const res = useMemo(() => calculateStair(inputs), [inputs]);

    const handleDesignBeam = () => {
        navigate('/rc-beam', { state: { presetLoads: { w_total: res.beamLoad_Factored, torsion: res.beamTorsion_Factored }, presetName: "Landing Beam" } });
    };

    const handleExportDXF = () => {
        const dxfContent = generateStairDxf(inputs, res);
        const blob = new Blob([dxfContent], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Staircase_${inputs.layoutType}.dxf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const INPUT_CLS = "w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none";
    const LABEL_CLS = "text-xs text-slate-400 block mb-1";
    const HEADER_CLS = "text-sm font-bold text-blue-400 uppercase mb-3 flex items-center gap-2";
    const TAB_BTN_CLS = (isActive: boolean) => `px-4 py-2 text-sm font-bold rounded-t-lg transition-colors flex items-center gap-2 ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`;
    const PASS_FAIL = (status: string) => <span className={`font-bold ${status === 'PASS' ? 'text-green-400' : 'text-red-400'}`}>{status}</span>;

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 min-h-screen bg-[#0B1120] text-slate-100 font-sans print:bg-white print:text-black print:p-0">
            <div className="flex justify-between items-center p-4 rounded-xl bg-[#151F32] border border-slate-800 mb-6 shadow-lg print:hidden">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg"><ChevronLeft size={24} /></button>
                    <h1 className="text-xl font-bold">RC Staircase Design</h1>
                </div>
                <div className="flex gap-2 bg-slate-900 rounded p-1">
                    <button onClick={()=>updateInput('structType', 'Slab')} className={`px-3 py-1 rounded text-xs font-bold ${inputs.structType==='Slab'?'bg-blue-600 text-white':'text-slate-400'}`}>Slab</button>
                    <button onClick={()=>updateInput('structType', 'Zigzag')} className={`px-3 py-1 rounded text-xs font-bold ${inputs.structType==='Zigzag'?'bg-blue-600 text-white':'text-slate-400'}`}>Zigzag</button>
                    <button onClick={()=>updateInput('structType', 'Spiral')} className={`px-3 py-1 rounded text-xs font-bold ${inputs.structType==='Spiral'?'bg-purple-600 text-white':'text-slate-400'}`}>Spiral</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
                <div className="lg:col-span-4 space-y-4 print:hidden">
                    {/* Code Check */}
                    <div className="bg-[#151F32] p-5 rounded-xl border border-slate-800">
                        <h3 className={HEADER_CLS}><Scale size={16}/> Standard & Code</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <div><label className={LABEL_CLS}>Design Standard</label><select value={inputs.standard} onChange={e=>updateInput('standard', e.target.value as any)} className={INPUT_CLS}><option value="Thai_MR55">🇹🇭 Thai MR.55</option><option value="NFPA_101">🇺🇸 NFPA 101</option><option value="IBC_2021">🌐 IBC 2021</option></select></div>
                            <div className={`p-3 rounded border text-xs ${res.codeCheck.status==='PASS'?'bg-green-900/30 border-green-700 text-green-300':'bg-red-900/30 border-red-700 text-red-300'}`}>
                                <div className="font-bold flex items-center gap-2 mb-1">{res.codeCheck.status==='PASS' ? '✓ Compliance OK' : '⚠ Code Violation'}</div>
                                {res.codeCheck.messages.map((m,i)=><div key={i}>• {m}</div>)}
                            </div>
                        </div>
                    </div>
                    {/* Config */}
                    <div className="bg-[#151F32] p-5 rounded-xl border border-slate-800">
                        <h3 className={HEADER_CLS}><GitFork size={16}/> Configuration</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={LABEL_CLS}>Layout</label><select value={inputs.layoutType} onChange={e=>updateInput('layoutType', e.target.value as any)} className={INPUT_CLS}><option value="Straight">Straight</option><option value="DogLegged">Dog-Legged</option></select></div>
                            <div><label className={LABEL_CLS}>Support</label><select value={inputs.supportType} onChange={e=>updateInput('supportType', e.target.value as any)} className={INPUT_CLS}><option value="Longitudinal">Span</option><option value="Cantilever">Cantilever</option></select></div>
                            {inputs.supportType === 'Longitudinal' && (
                                <div className="col-span-2 flex bg-slate-900 rounded p-1 border border-slate-700">
                                    <button onClick={()=>updateInput('landingSupport', 'Supported')} className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 ${inputs.landingSupport==='Supported'?'bg-green-600 text-white':'text-slate-400'}`}><Anchor size={12}/> Beams</button>
                                    <button onClick={()=>updateInput('landingSupport', 'Free')} className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 ${inputs.landingSupport==='Free'?'bg-orange-600 text-white':'text-slate-400'}`}><GitFork size={12}/> Cranked</button>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Geometry */}
                    <div className="bg-[#151F32] p-5 rounded-xl border border-slate-800">
                        <h3 className={HEADER_CLS}><Grid size={16}/> Geometry</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {inputs.structType === 'Spiral' ? (
                                <>
                                    <div className="col-span-2"><label className={LABEL_CLS}>Height (m)</label><input type="number" value={inputs.floorHeight} onChange={e=>updateInput('floorHeight', +e.target.value)} className={INPUT_CLS}/></div>
                                    <div><label className={LABEL_CLS}>Outer Radius (m)</label><input type="number" value={inputs.spiralRadius} onChange={e=>updateInput('spiralRadius', +e.target.value)} className={INPUT_CLS}/></div>
                                    <div><label className={LABEL_CLS}>Sweep Angle (°)</label><input type="number" value={inputs.spiralSweep} onChange={e=>updateInput('spiralSweep', +e.target.value)} className={INPUT_CLS}/></div>
                                    <div><label className={LABEL_CLS}>Width (m)</label><input type="number" value={inputs.width} onChange={e=>updateInput('width', +e.target.value)} className={INPUT_CLS}/></div>
                                </>
                            ) : (
                                <>
                                    <div className="col-span-2"><label className={LABEL_CLS}>Height (m)</label><input type="number" value={inputs.floorHeight} onChange={e=>updateInput('floorHeight', +e.target.value)} className={INPUT_CLS}/></div>
                                    <div><label className={LABEL_CLS}>Riser (cm)</label><input type="number" value={inputs.riser} onChange={e=>updateInput('riser', +e.target.value)} className={INPUT_CLS}/></div>
                                    <div><label className={LABEL_CLS}>Going (cm)</label><input type="number" value={inputs.going} onChange={e=>updateInput('going', +e.target.value)} className={INPUT_CLS}/></div>
                                    <div><label className={LABEL_CLS}>Width (m)</label><input type="number" value={inputs.width} onChange={e=>updateInput('width', +e.target.value)} className={INPUT_CLS}/></div>
                                    <div><label className={LABEL_CLS}>Waist (cm)</label><input type="number" value={inputs.waist} onChange={e=>updateInput('waist', +e.target.value)} className={INPUT_CLS}/></div>
                                    {inputs.supportType === 'Longitudinal' && (<><div><label className={LABEL_CLS}>Top Land</label><input type="number" value={inputs.landingTop} onChange={e=>updateInput('landingTop', +e.target.value)} className={INPUT_CLS}/></div><div><label className={LABEL_CLS}>Bot Land</label><input type="number" value={inputs.landingBot} onChange={e=>updateInput('landingBot', +e.target.value)} className={INPUT_CLS}/></div></>)}
                                    <div className="col-span-2 pt-2 border-t border-slate-700"><label className={LABEL_CLS}>Upper Slab Thk (cm)</label><input type="number" value={inputs.upperFloorThk} onChange={e=>updateInput('upperFloorThk', +e.target.value)} className={INPUT_CLS}/></div>
                                </>
                            )}
                        </div>
                    </div>
                    {/* Material */}
                    <div className="bg-[#151F32] p-5 rounded-xl border border-slate-800">
                        <h3 className={HEADER_CLS}><Box size={16}/> Loads & Material</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={LABEL_CLS}>SDL</label><input type="number" value={inputs.sdl} onChange={e=>updateInput('sdl', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>LL</label><input type="number" value={inputs.ll} onChange={e=>updateInput('ll', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>fc'</label><input type="number" value={inputs.fc} onChange={e=>updateInput('fc', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>fy</label><input type="number" value={inputs.fy} onChange={e=>updateInput('fy', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>Bar</label><select value={inputs.mainBarDia} onChange={e=>updateInput('mainBarDia', +e.target.value)} className={INPUT_CLS}>{[10,12,16,20].map(d=><option key={d} value={d}>DB{d}</option>)}</select></div>
                            <div><label className={LABEL_CLS}>Spacing</label><input type="number" value={inputs.spacing} onChange={e=>updateInput('spacing', +e.target.value)} className={INPUT_CLS}/></div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: OUTPUTS */}
                <div className="lg:col-span-8 space-y-4 print:col-span-12">
                    <div className="flex gap-2 border-b border-slate-700 pb-2 print:hidden">
                        <button onClick={() => setActiveTab(0)} className={TAB_BTN_CLS(activeTab===0)}><Calculator size={16}/> Analysis</button>
                        <button onClick={() => setActiveTab(1)} className={TAB_BTN_CLS(activeTab===1)}><FileText size={16}/> Report</button>
                        <button onClick={() => setActiveTab(2)} className={TAB_BTN_CLS(activeTab===2)}><Settings size={16}/> BOQ</button>
                    </div>

                    {activeTab === 0 && (
                        <div className="space-y-6 block print:hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#151F32] p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[350px]">
                                    <StairView {...inputs} numSteps={res.numSteps} />
                                    {res.warnings.map((msg, i) => (<div key={i} className="mt-2 w-full flex gap-2 text-xs text-yellow-200"><AlertTriangle size={12} className="shrink-0"/><span>{msg}</span></div>))}
                                    <div className="mt-4 text-center"><div className={`text-2xl font-bold ${res.status === 'PASS' ? 'text-green-500' : 'text-red-500'}`}>STATUS: {res.status}</div></div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-[#151F32] border border-slate-800 rounded-xl p-4">
                                        <h4 className="font-bold text-sm text-blue-400 mb-2 border-b border-slate-700 pb-1">1. Structural Capacity</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                                            <span>Load Factors:</span><span className="text-right text-gray-400">{res.loadFactorText}</span>
                                            <span>Moment (Mu):</span><span className="text-right font-mono">{res.Mu_max.toFixed(2)} kg-m</span>
                                            <span>Check:</span><span className="text-right font-bold">{PASS_FAIL(res.status)}</span>
                                        </div>
                                    </div>
                                    <div className="bg-[#151F32] border border-slate-800 rounded-xl p-4">
                                        <h4 className="font-bold text-sm text-blue-400 mb-2 border-b border-slate-700 pb-1 flex items-center gap-2"><Activity size={14}/> 2. Serviceability</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                                            <span>Deflection:</span><span className="text-right">{PASS_FAIL(res.deflectionStatus)} ({res.delta_longterm.toFixed(2)}cm)</span>
                                            <span>Headroom:</span><span className="text-right">{PASS_FAIL(res.headroomStatus)} ({res.headroom.toFixed(2)}m)</span>
                                            <span className="text-purple-300">Vibration:</span><span className={`text-right font-bold ${res.vibrationStatus==='COMFORT'?'text-green-400':'text-red-400'}`}>{res.vibrationStatus}</span>
                                        </div>
                                    </div>
                                    {inputs.landingSupport === 'Supported' && (
                                        <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-4 shadow-inner">
                                            <h4 className="font-bold text-sm text-orange-400 mb-2 border-b border-slate-600 pb-1 flex items-center gap-2"><ArrowRightLeft size={14}/> Beam Load Data</h4>
                                            <div className="grid grid-cols-2 gap-2 text-sm text-slate-300 mb-3">
                                                <span>Wu (Factored):</span><span className="text-right font-mono text-white">{res.beamLoad_Factored.toFixed(0)} kg/m</span>
                                                {res.beamTorsion_Factored > 0 && <><span className="text-red-400">Torsion (Tu):</span><span className="text-right font-mono text-red-400">{res.beamTorsion_Factored.toFixed(2)}</span></>}
                                            </div>
                                            <button onClick={handleDesignBeam} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-xs font-bold py-2 rounded shadow-lg transition-all active:scale-95"><FastForward size={14}/> Design Landing Beam</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 1 && (
                        <div className="bg-white text-black p-10 shadow-xl mx-auto min-h-[1123px] w-[794px] text-sm relative print:w-full print:h-auto print:shadow-none print:p-0">
                            <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-8">
                                <div><h1 className="text-3xl font-bold uppercase">Calculation Sheet</h1><p>RC Staircase Design</p></div>
                                <div className="text-right text-xs text-slate-500"><div>{new Date().toLocaleDateString()}</div><div>{inputs.standard}</div></div>
                            </div>
                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <section><h3 className="font-bold text-lg text-blue-800 border-b mb-2">1. Parameters</h3><div className="grid grid-cols-2 gap-y-1 text-sm"><span className="text-slate-600">Type:</span><span>{inputs.structType}</span><span className="text-slate-600">Step:</span><span>{inputs.riser}x{inputs.going} cm</span></div></section>
                                    <section><h3 className="font-bold text-lg text-blue-800 border-b mb-2">2. Loads ({res.loadFactorText})</h3><div className="grid grid-cols-2 gap-y-1 text-sm"><span className="text-slate-600">Factored Load:</span><span className="font-bold">{res.w_total.toFixed(0)} kg/m²</span></div></section>
                                </div>
                                <div><div className="border p-4 mb-6 flex justify-center bg-slate-50"><div className="scale-75 origin-top"><StairView {...inputs} numSteps={res.numSteps} /></div></div></div>
                            </div>
                            <section className="mt-8">
                                <h3 className="font-bold text-lg text-blue-800 border-b mb-4">3. Results</h3>
                                <table className="w-full text-sm text-left border-collapse"><thead><tr className="bg-slate-100 border-b"><th className="p-2">Item</th><th className="p-2">Value</th><th className="p-2">Result</th></tr></thead><tbody>
                                    <tr><td className="p-2">Moment (Mu)</td><td className="p-2">{res.Mu_max.toFixed(2)} kg-m</td><td className="p-2 font-bold">{res.status}</td></tr>
                                    <tr><td className="p-2">Deflection</td><td className="p-2">{res.delta_longterm.toFixed(2)} cm</td><td className="p-2 font-bold">{res.deflectionStatus}</td></tr>
                                    <tr><td className="p-2">Code Check</td><td className="p-2">{res.codeCheck.messages.length} Issues</td><td className="p-2 font-bold">{res.codeCheck.status}</td></tr>
                                </tbody></table>
                            </section>
                            <div className="absolute bottom-10 left-10 right-10 flex justify-between mt-20 pt-10 border-t border-slate-300">
                                <div className="text-center w-1/3"><div className="h-10 border-b border-dotted border-slate-400 mb-2"></div><p className="text-xs font-bold">Designed By</p></div>
                                <div className="text-center w-1/3"><div className="h-10 border-b border-dotted border-slate-400 mb-2"></div><p className="text-xs font-bold">Approved By</p></div>
                            </div>
                            <div className="absolute top-10 right-10 flex gap-2 print:hidden">
                                <button onClick={handleExportDXF} className="bg-green-600 text-white px-3 py-1 rounded text-xs flex gap-1"><Download size={12}/> DXF</button>
                                <button onClick={()=>window.print()} className="bg-blue-600 text-white px-3 py-1 rounded text-xs flex gap-1"><Printer size={12}/> Print</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 2 && (
                        <div className="bg-[#151F32] p-6 rounded-xl border border-slate-800 block print:hidden">
                            <h3 className="text-lg font-bold text-blue-400 uppercase mb-4 flex items-center gap-2"><ArrowUpRight size={18}/> Bill of Quantities</h3>
                            <table className="w-full text-sm text-left text-slate-300"><thead className="bg-slate-900 text-white text-base"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Unit</th><th className="p-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-800 text-sm">
                                <tr><td className="p-3">Concrete</td><td className="p-3 text-right">{res.volConcrete.toFixed(2)}</td><td className="p-3 text-right">{MATERIAL_COSTS.CONCRETE_M3}</td><td className="p-3 text-right">{(res.volConcrete*MATERIAL_COSTS.CONCRETE_M3).toLocaleString()}</td></tr>
                                <tr><td className="p-3">Rebar</td><td className="p-3 text-right">{res.weightSteel.toFixed(1)}</td><td className="p-3 text-right">{MATERIAL_COSTS.REBAR_KG}</td><td className="p-3 text-right">{(res.weightSteel*MATERIAL_COSTS.REBAR_KG).toLocaleString()}</td></tr>
                                <tr className="bg-slate-800 font-bold text-white"><td className="p-3" colSpan={3}>Grand Total</td><td className="p-3 text-right">{((res.volConcrete*MATERIAL_COSTS.CONCRETE_M3) + (res.weightSteel*MATERIAL_COSTS.REBAR_KG) + (res.areaForm*MATERIAL_COSTS.FORMWORK_M2)).toLocaleString()}</td></tr>
                            </tbody></table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StaircaseDesignTool;