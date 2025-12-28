import { useState, useMemo } from 'react';
import { ChevronLeft, Calculator, Printer, FileText, Settings, Layers, Box, Grid, ArrowDownToLine, AlertTriangle, Zap } from 'lucide-react';
import { FootingInput, calculateFooting, optimizeFooting } from '../utils/rcFootingCalculation';
import { MATERIAL_COSTS } from '../constants';
import FootingView from '../components/FootingView';
import FootingSectionView from '../components/FootingSectionView';

interface Props {
    onBack: () => void;
    isPro?: boolean;
}

const IsolatedFootingTool = ({ onBack, isPro = false }: Props) => {
    const [activeTab, setActiveTab] = useState(0);
    const [viewMode, setViewMode] = useState<'plan' | 'section'>('plan');
    const [isOptimizing, setIsOptimizing] = useState(false);

    const [inputs, setInputs] = useState<FootingInput>({
        P_dl: 20, P_ll: 10,
        Mx_dl: 0, Mx_ll: 0, 
        My_dl: 0, My_ll: 0,
        qa: 15,
        bx: 1.5, by: 1.5, thickness: 35,
        col_x: 30, col_y: 30,
        depth_df: 1.5, soil_density: 1800,
        fc: 240, fy: 4000, covering: 7.5,
        mainBarDia: 16, spacingX: 20, spacingY: 20
    });

    const updateInput = <K extends keyof FootingInput>(key: K, val: FootingInput[K]) => {
        setInputs(p => ({ ...p, [key]: val }));
    };
    
    const res = useMemo(() => calculateFooting(inputs), [inputs]);

    const handleAutoDesign = () => {
        setIsOptimizing(true);
        setTimeout(() => {
            const optimized = optimizeFooting(inputs);
            if (optimized) {
                setInputs(optimized);
            } else {
                alert("Could not find a suitable design within limits (Max 5.0m). Try increasing soil capacity or reducing loads.");
            }
            setIsOptimizing(false);
        }, 500);
    };

    // UI Helpers
    const INPUT_CLS = "w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none";
    const LABEL_CLS = "text-xs text-slate-400 block mb-1";
    const HEADER_CLS = "text-sm font-bold text-blue-400 uppercase mb-3 flex items-center gap-2";
    const TAB_BTN_CLS = (isActive: boolean) => `px-4 py-2 text-sm font-bold rounded-t-lg transition-colors flex items-center gap-2 ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`;
    const PASS_FAIL = (status: string) => <span className={`font-bold ${status === 'PASS' ? 'text-green-400' : 'text-red-400'}`}>{status}</span>;

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 min-h-screen bg-[#0B1120] text-slate-100 font-sans print:bg-white print:text-black print:p-0">
            {/* Header */}
            <div className="flex justify-between items-center p-4 rounded-xl bg-[#151F32] border border-slate-800 mb-6 shadow-lg print:hidden">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg"><ChevronLeft size={24} /></button>
                    <h1 className="text-xl font-bold">Isolated Footing Design <span className="text-xs bg-blue-600 px-2 rounded ml-2 align-middle">PRO</span></h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
                
                {/* LEFT: INPUTS */}
                <div className="lg:col-span-4 space-y-4 print:hidden">
                    <div className="bg-[#151F32] p-5 rounded-xl border border-slate-800">
                        <h3 className={HEADER_CLS}><Box size={16}/> Loads & Soil</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={LABEL_CLS}>P Dead (T)</label><input type="number" value={inputs.P_dl} onChange={e=>updateInput('P_dl', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>P Live (T)</label><input type="number" value={inputs.P_ll} onChange={e=>updateInput('P_ll', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>Mx Service (T-m)</label><input type="number" value={inputs.Mx_dl} onChange={e=>updateInput('Mx_dl', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>My Service (T-m)</label><input type="number" value={inputs.My_dl} onChange={e=>updateInput('My_dl', +e.target.value)} className={INPUT_CLS}/></div>
                            <div className="col-span-2"><label className={LABEL_CLS}>Allowable Soil (Qa) T/m²</label><input type="number" value={inputs.qa} onChange={e=>updateInput('qa', +e.target.value)} className={INPUT_CLS}/></div>
                        </div>
                    </div>

                    <div className="bg-[#151F32] p-5 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className={HEADER_CLS}><Grid size={16}/> Geometry</h3>
                            <button 
                                onClick={handleAutoDesign}
                                disabled={isOptimizing}
                                className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isOptimizing ? <span className="animate-spin">⚡</span> : <Zap size={14} fill="currentColor"/>}
                                {isOptimizing ? 'Designing...' : 'Auto Size'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={LABEL_CLS}>Bx (m)</label><input type="number" value={inputs.bx} onChange={e=>updateInput('bx', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>By (m)</label><input type="number" value={inputs.by} onChange={e=>updateInput('by', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>Thickness (cm)</label><input type="number" value={inputs.thickness} onChange={e=>updateInput('thickness', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>Foundation Depth (m)</label><input type="number" value={inputs.depth_df} onChange={e=>updateInput('depth_df', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>Col X (cm)</label><input type="number" value={inputs.col_x} onChange={e=>updateInput('col_x', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>Col Y (cm)</label><input type="number" value={inputs.col_y} onChange={e=>updateInput('col_y', +e.target.value)} className={INPUT_CLS}/></div>
                        </div>
                    </div>

                    <div className="bg-[#151F32] p-5 rounded-xl border border-slate-800">
                        <h3 className={HEADER_CLS}><Layers size={16}/> Rebar & Material</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={LABEL_CLS}>fc' (ksc)</label><input type="number" value={inputs.fc} onChange={e=>updateInput('fc', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>fy (ksc)</label><input type="number" value={inputs.fy} onChange={e=>updateInput('fy', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>Main Bar</label><select value={inputs.mainBarDia} onChange={e=>updateInput('mainBarDia', +e.target.value)} className={INPUT_CLS}>{[12,16,20,25].map(d=><option key={d} value={d}>DB{d}</option>)}</select></div>
                            <div><label className={LABEL_CLS}>Covering (cm)</label><input type="number" value={inputs.covering} onChange={e=>updateInput('covering', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>@ X (cm)</label><input type="number" value={inputs.spacingX} onChange={e=>updateInput('spacingX', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>@ Y (cm)</label><input type="number" value={inputs.spacingY} onChange={e=>updateInput('spacingY', +e.target.value)} className={INPUT_CLS}/></div>
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

                    {/* ANALYSIS TAB */}
                    {activeTab === 0 && (
                        <div className="space-y-6 block print:hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Visual Container */}
                                <div className="bg-[#151F32] p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[350px] relative">
                                    
                                    {/* Toggle Switch */}
                                    <div className="absolute top-4 right-4 flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                                        <button 
                                            onClick={() => setViewMode('plan')}
                                            className={`px-3 py-1 rounded text-xs font-bold ${viewMode==='plan' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                        >Plan</button>
                                        <button 
                                            onClick={() => setViewMode('section')}
                                            className={`px-3 py-1 rounded text-xs font-bold ${viewMode==='section' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                        >Section</button>
                                    </div>

                                    {/* Eccentricity Warning */}
                                    {res.eccentricityStatus === 'WARNING' && (
                                        <div className="absolute top-4 left-4 flex items-center gap-2 bg-yellow-900/40 text-yellow-200 px-3 py-1.5 rounded border border-yellow-500/50 animate-pulse shadow-lg">
                                            <AlertTriangle size={16}/>
                                            <span className="text-xs font-bold">Eccentricity &gt; B/6</span>
                                        </div>
                                    )}

                                    {/* Component Rendering */}
                                    {viewMode === 'plan' ? (
                                        <FootingView bx={inputs.bx} by={inputs.by} cx={inputs.col_x} cy={inputs.col_y} />
                                    ) : (
                                        <FootingSectionView 
                                            bx={inputs.bx} 
                                            thickness={inputs.thickness} 
                                            col_x={inputs.col_x}
                                            df={inputs.depth_df}
                                            q_max={res.q_max_x} 
                                            q_min={res.q_min_x}
                                            rebarX={`DB${inputs.mainBarDia}`}
                                        />
                                    )}
                                    
                                    <div className="mt-6 text-center">
                                        <div className={`text-2xl font-bold ${res.overallStatus === 'PASS' ? 'text-green-500' : 'text-red-500'}`}>
                                            STATUS: {res.overallStatus}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Soil Pressure: {res.q_gross_max.toFixed(2)} T/m² 
                                            ({res.q_gross_max <= inputs.qa ? 'OK' : 'FAIL'})
                                        </p>
                                    </div>
                                </div>

                                {/* Results Grid */}
                                <div className="space-y-4">
                                    {/* 1. Soil */}
                                    <div className="bg-[#151F32] border border-slate-800 rounded-xl p-4">
                                        <h4 className="font-bold text-sm text-blue-400 mb-2 border-b border-slate-700 pb-1">1. Soil Bearing & Eccentricity</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                                            <span>Max Pressure:</span><span className="text-right font-mono">{res.q_gross_max.toFixed(2)} T/m²</span>
                                            <span>Allowable (Qa):</span><span className="text-right font-mono">{inputs.qa.toFixed(2)} T/m²</span>
                                            <span>Eccentricity:</span><span className={`text-right font-bold ${res.eccentricityStatus==='OK'?'text-green-400':'text-yellow-400'}`}>{res.eccentricityStatus}</span>
                                            <span>Status:</span><span className="text-right">{PASS_FAIL(res.q_status)}</span>
                                        </div>
                                    </div>

                                    {/* 2. Shear */}
                                    <div className="bg-[#151F32] border border-slate-800 rounded-xl p-4">
                                        <h4 className="font-bold text-sm text-blue-400 mb-2 border-b border-slate-700 pb-1">2. Shear Check (d = {res.d.toFixed(1)} cm)</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                                            <span>1-Way Shear X:</span><span className="text-right">{PASS_FAIL(res.OneWayX.status)}</span>
                                            <span>1-Way Shear Y:</span><span className="text-right">{PASS_FAIL(res.OneWayY.status)}</span>
                                            <span>Punching Shear:</span><span className="text-right">{PASS_FAIL(res.Punching.status)}</span>
                                            <span className="col-span-2 text-xs text-slate-500 text-right mt-1">
                                                Punching Vu: {res.Punching.Vu.toFixed(2)} T | φVn: {res.Punching.PhiVn.toFixed(2)} T
                                            </span>
                                        </div>
                                    </div>

                                    {/* 3. Rebar */}
                                    <div className="bg-[#151F32] border border-slate-800 rounded-xl p-4">
                                        <h4 className="font-bold text-sm text-blue-400 mb-2 border-b border-slate-700 pb-1">3. Flexural Design</h4>
                                        <div className="space-y-2 text-sm text-slate-300">
                                            <div className="flex justify-between">
                                                <span>Dir X (Req/Prov):</span>
                                                <span className="font-mono">{res.DesignX.As_req.toFixed(2)} / {res.DesignX.As_prov.toFixed(2)} cm²</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>Use: DB{inputs.mainBarDia}@{inputs.spacingX}cm</span>
                                                <span>{PASS_FAIL(res.DesignX.status)}</span>
                                            </div>
                                            <div className="border-t border-slate-700 my-1"></div>
                                            <div className="flex justify-between">
                                                <span>Dir Y (Req/Prov):</span>
                                                <span className="font-mono">{res.DesignY.As_req.toFixed(2)} / {res.DesignY.As_prov.toFixed(2)} cm²</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>Use: DB{inputs.mainBarDia}@{inputs.spacingY}cm</span>
                                                <span>{PASS_FAIL(res.DesignY.status)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* REPORT TAB */}
                    {activeTab === 1 && (
                        <div className="bg-white text-black p-8 shadow-xl mx-auto min-h-[1000px] w-full max-w-[210mm] print:shadow-none print:p-0 print:m-0 print:w-full print:min-h-0 print:h-auto print:overflow-hidden text-sm">
                            <div className="flex justify-end mb-6 print:hidden">
                                <button onClick={()=>window.print()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold"><Printer size={18}/> Print Report</button>
                            </div>
                            <div className="border-b-2 border-black pb-4 mb-6">
                                <h1 className="text-2xl font-bold uppercase tracking-wider">Isolated Footing Design</h1>
                                <p className="text-sm text-gray-600">Method: USD (Ultimate Strength Design) w/ Trapezoidal Moment Integration</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-bold text-blue-800 mb-2 border-b">1. Design Data</h3>
                                    <div className="text-xs space-y-1">
                                        <div>Size: {inputs.bx.toFixed(2)}x{inputs.by.toFixed(2)} m, Thk: {inputs.thickness} cm</div>
                                        <div>Col: {inputs.col_x}x{inputs.col_y} cm, Depth Df: {inputs.depth_df} m</div>
                                        <div>Allowable Soil (Qa): {inputs.qa} T/m²</div>
                                        <div>Loads: P_serv={res.P_service.toFixed(2)} T, P_ult={res.P_ultimate.toFixed(2)} T</div>
                                        <div>Moment: Mx={inputs.Mx_dl+inputs.Mx_ll} T-m, My={inputs.My_dl+inputs.My_ll} T-m</div>
                                        <div>Material: fc'={inputs.fc} ksc, fy={inputs.fy} ksc</div>
                                    </div>
                                    <h3 className="font-bold text-blue-800 mt-6 mb-2 border-b">2. Soil Check</h3>
                                    <div className="text-xs space-y-1">
                                        <div>Max Pressure: {res.q_gross_max.toFixed(2)} T/m²</div>
                                        <div>Check: {res.q_gross_max} {'<='} {inputs.qa} ... <b>{res.q_status}</b></div>
                                        {res.eccentricityStatus === 'WARNING' && <div className="text-red-600 font-bold">Warning: Eccentricity &gt; B/6 !</div>}
                                    </div>
                                </div>
                                <div>
                                    <div className="border p-4 flex justify-center mb-4"><FootingView bx={inputs.bx} by={inputs.by} cx={inputs.col_x} cy={inputs.col_y} isReport={true}/></div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <h3 className="font-bold text-blue-800 mb-2 border-b">3. Structural Capacity</h3>
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-100"><tr><th className="p-1">Check</th><th className="p-1">Demand (Vu/Mu)</th><th className="p-1">Capacity (φVn/φMn)</th><th className="p-1">Status</th></tr></thead>
                                    <tbody className="divide-y">
                                        <tr><td className="p-1">One-Way Shear X</td><td className="p-1">{res.OneWayX.Vu.toFixed(2)} T</td><td className="p-1">{res.OneWayX.PhiVn.toFixed(2)} T</td><td className="p-1 font-bold">{res.OneWayX.status}</td></tr>
                                        <tr><td className="p-1">One-Way Shear Y</td><td className="p-1">{res.OneWayY.Vu.toFixed(2)} T</td><td className="p-1">{res.OneWayY.PhiVn.toFixed(2)} T</td><td className="p-1 font-bold">{res.OneWayY.status}</td></tr>
                                        <tr><td className="p-1">Punching Shear</td><td className="p-1">{res.Punching.Vu.toFixed(2)} T</td><td className="p-1">{res.Punching.PhiVn.toFixed(2)} T</td><td className="p-1 font-bold">{res.Punching.status}</td></tr>
                                        <tr><td className="p-1">Flexure X</td><td className="p-1">{res.DesignX.Mu.toFixed(2)} T-m</td><td className="p-1">As Req: {res.DesignX.As_req.toFixed(2)} cm²</td><td className="p-1 font-bold">{res.DesignX.status}</td></tr>
                                        <tr><td className="p-1">Flexure Y</td><td className="p-1">{res.DesignY.Mu.toFixed(2)} T-m</td><td className="p-1">As Req: {res.DesignY.As_req.toFixed(2)} cm²</td><td className="p-1 font-bold">{res.DesignY.status}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* BOQ TAB */}
                    {activeTab === 2 && (
                         <div className="bg-[#151F32] p-6 rounded-xl border border-slate-800 block print:hidden">
                            <h3 className="text-lg font-bold text-blue-400 uppercase mb-4 flex items-center gap-2"><ArrowDownToLine size={18}/> Bill of Quantities</h3>
                            <table className="w-full text-sm text-left text-slate-300">
                                <thead className="bg-slate-900 text-white text-base"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Unit Price</th><th className="p-3 text-right">Total</th></tr></thead>
                                <tbody className="divide-y divide-slate-800 text-sm">
                                    <tr><td className="p-3">Concrete</td><td className="p-3 text-right">{res.volConcrete.toFixed(2)} m³</td><td className="p-3 text-right">{MATERIAL_COSTS.CONCRETE_M3}</td><td className="p-3 text-right">{(res.volConcrete*MATERIAL_COSTS.CONCRETE_M3).toLocaleString()}</td></tr>
                                    <tr><td className="p-3">Rebar</td><td className="p-3 text-right">{res.weightSteel.toFixed(1)} kg</td><td className="p-3 text-right">{MATERIAL_COSTS.REBAR_KG}</td><td className="p-3 text-right">{(res.weightSteel*MATERIAL_COSTS.REBAR_KG).toLocaleString()}</td></tr>
                                    <tr><td className="p-3">Formwork</td><td className="p-3 text-right">{res.areaForm.toFixed(1)} m²</td><td className="p-3 text-right">{MATERIAL_COSTS.FORMWORK_M2}</td><td className="p-3 text-right">{(res.areaForm*MATERIAL_COSTS.FORMWORK_M2).toLocaleString()}</td></tr>
                                    <tr><td className="p-3 text-slate-500">Excavation (Approx)</td><td className="p-3 text-right text-slate-500">{res.volExcavate.toFixed(1)} m³</td><td className="p-3 text-right text-slate-500">150</td><td className="p-3 text-right text-slate-500">{(res.volExcavate*150).toLocaleString()}</td></tr>
                                    <tr className="bg-slate-800 font-bold text-white"><td className="p-3" colSpan={3}>Grand Total (Excl. Excavation)</td><td className="p-3 text-right">{((res.volConcrete*MATERIAL_COSTS.CONCRETE_M3) + (res.weightSteel*MATERIAL_COSTS.REBAR_KG) + (res.areaForm*MATERIAL_COSTS.FORMWORK_M2)).toLocaleString()} THB</td></tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IsolatedFootingTool;