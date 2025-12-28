import { useState, useMemo } from 'react';
import { ChevronLeft, Calculator, Printer, FileText, Settings, Layers, Box, Grid, ArrowDownToLine, Zap, Anchor, ShieldCheck, Activity } from 'lucide-react';
import { WallInput, calculateRetainingWall, autoGeometry } from '../utils/rcRetainingWallCalculation';
import { MATERIAL_COSTS, TYPO, THEME } from '../constants';
import RetainingWallView from '../components/RetainingWallView';
import { ToolHeader } from '../components/common/ToolHeader';
import { ReportTemplate } from '../components/common/ReportTemplate';

interface Props { onBack: () => void; isPro?: boolean; }

const RetainingWallTool = ({ onBack, isPro = false }: Props) => {
    const [activeTab, setActiveTab] = useState(0);

    const [inputs, setInputs] = useState<WallInput>({
        type: 'Cantilever',
        h_total: 3.0, t_stem: 30, t_base: 30, l_toe: 0.8, l_heel: 1.2,
        cf_spacing: 3.0, cf_thick: 30, 
        hasKey: false, keyDepth: 30, keyThk: 30,
        gamma_soil: 1800, phi: 30, beta: 0, mu: 0.45, qa: 15, surcharge: 0, waterDepth: 10,
        useSeismic: false, kh: 0.18, kv: 0, 
        fc: 240, fy: 4000, covering: 5.0, mainBarDia: 16, spacing: 20
    });

    const updateInput = <K extends keyof WallInput>(key: K, val: WallInput[K]) => setInputs(p => ({ ...p, [key]: val }));
    const res = useMemo(() => calculateRetainingWall(inputs), [inputs]);

    const handleAutoSize = () => { setInputs(p => ({ ...p, ...autoGeometry(inputs.h_total) })); };

    const INPUT_CLS = "w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none";
    const LABEL_CLS = "text-xs text-slate-400 block mb-1";
    const HEADER_CLS = "text-sm font-bold text-blue-400 uppercase mb-3 flex items-center gap-2";
    const TAB_BTN_CLS = (isActive: boolean) => `px-4 py-2 text-sm font-bold rounded-t-lg transition-colors flex items-center gap-2 ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`;
    const PASS_FAIL = (status: string) => <span className={`font-bold ${status === 'PASS' ? 'text-green-400' : 'text-red-400'}`}>{status}</span>;

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 min-h-screen bg-[#0B1120] text-slate-100 font-sans print:bg-white print:text-black print:p-0">
            <ToolHeader title="Retaining Wall Design" onBack={onBack} std="EIT-Thai" setStd={()=>{}} lang="th" setLang={()=>{}} isPro={isPro} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
                
                {/* LEFT: INPUTS */}
                <div className="lg:col-span-4 space-y-4 print:hidden">
                    <div className="bg-[#151F32] p-5 rounded-xl border border-slate-800 relative">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className={HEADER_CLS}><Grid size={16}/> Geometry</h3>
                            <button onClick={handleAutoSize} className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow hover:scale-105 transition"><Zap size={12}/> Auto</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2"><label className={LABEL_CLS}>Height (m)</label><input type="number" value={inputs.h_total} onChange={e=>updateInput('h_total', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>Stem Thk (cm)</label><input type="number" value={inputs.t_stem} onChange={e=>updateInput('t_stem', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>Base Thk (cm)</label><input type="number" value={inputs.t_base} onChange={e=>updateInput('t_base', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>Toe (m)</label><input type="number" value={inputs.l_toe} onChange={e=>updateInput('l_toe', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>Heel (m)</label><input type="number" value={inputs.l_heel} onChange={e=>updateInput('l_heel', +e.target.value)} className={INPUT_CLS}/></div>
                            
                            {inputs.type === 'Counterfort' && (
                                <div className="col-span-2 grid grid-cols-2 gap-3 p-2 border border-slate-600 rounded bg-slate-800/50 mt-2">
                                    <div><label className={LABEL_CLS}>CF Spacing (m)</label><input type="number" value={inputs.cf_spacing} onChange={e=>updateInput('cf_spacing', +e.target.value)} className={INPUT_CLS}/></div>
                                    <div><label className={LABEL_CLS}>CF Thick (cm)</label><input type="number" value={inputs.cf_thick} onChange={e=>updateInput('cf_thick', +e.target.value)} className={INPUT_CLS}/></div>
                                </div>
                            )}

                            <div className="col-span-2 flex items-center gap-2 mt-2 pt-2 border-t border-slate-700">
                                <input type="checkbox" checked={inputs.hasKey} onChange={e=>updateInput('hasKey', e.target.checked)} className="accent-blue-500"/>
                                <span className="text-sm">Use Shear Key</span>
                            </div>
                            {inputs.hasKey && (<>
                                <div><label className={LABEL_CLS}>Key Depth</label><input type="number" value={inputs.keyDepth} onChange={e=>updateInput('keyDepth', +e.target.value)} className={INPUT_CLS}/></div>
                                <div><label className={LABEL_CLS}>Key Thk</label><input type="number" value={inputs.keyThk} onChange={e=>updateInput('keyThk', +e.target.value)} className={INPUT_CLS}/></div>
                            </>)}
                        </div>
                    </div>

                    <div className="bg-[#151F32] p-5 rounded-xl border border-slate-800">
                        <h3 className={HEADER_CLS}><Activity size={16}/> Load Conditions</h3>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="col-span-2 flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-700">
                                <input type="checkbox" checked={inputs.useSeismic} onChange={e=>updateInput('useSeismic', e.target.checked)} className="accent-orange-500 w-4 h-4"/>
                                <span className={`text-sm font-bold ${inputs.useSeismic?'text-orange-400':'text-slate-400'}`}>Seismic (Mononobe-Okabe)</span>
                            </div>
                            {inputs.useSeismic && (
                                <div className="col-span-2 grid grid-cols-2 gap-3 p-2 bg-orange-900/20 border border-orange-800 rounded">
                                    <div><label className={LABEL_CLS}>kh (Horiz)</label><input type="number" value={inputs.kh} onChange={e=>updateInput('kh', +e.target.value)} className={INPUT_CLS}/></div>
                                    <div><label className={LABEL_CLS}>kv (Vert)</label><input type="number" value={inputs.kv} onChange={e=>updateInput('kv', +e.target.value)} className={INPUT_CLS}/></div>
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={LABEL_CLS}>Soil Density</label><input type="number" value={inputs.gamma_soil} onChange={e=>updateInput('gamma_soil', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>Phi (Deg)</label><input type="number" value={inputs.phi} onChange={e=>updateInput('phi', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>Allowable Qa</label><input type="number" value={inputs.qa} onChange={e=>updateInput('qa', +e.target.value)} className={INPUT_CLS}/></div>
                            <div><label className={LABEL_CLS}>Water Depth</label><input type="number" value={inputs.waterDepth} onChange={e=>updateInput('waterDepth', +e.target.value)} className={INPUT_CLS}/></div>
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

                    {/* ANALYSIS */}
                    {activeTab === 0 && (
                        <div className="space-y-6 block print:hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#151F32] p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[350px]">
                                    <RetainingWallView {...inputs} q_max={res.q_max} />
                                    {res.warnings.map((msg, i) => (<div key={i} className="mt-2 w-full flex gap-2 text-xs text-yellow-200 bg-yellow-900/20 p-2 rounded"><ShieldCheck size={12} className="shrink-0"/><span>{msg}</span></div>))}
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-[#151F32] border border-slate-800 rounded-xl p-4">
                                        <h4 className="font-bold text-sm text-blue-400 mb-2 border-b border-slate-700 pb-1 flex items-center gap-2"><ShieldCheck size={14}/> 1. Stability Checks</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                                            {/* ✅ แก้ JSX Syntax ตรงนี้ */}
                                            <span>Overturning:</span><span className="text-right font-mono">{res.FS_overturn.toFixed(2)} {'>'} {inputs.useSeismic?'1.1':'2.0'}</span>
                                            <span>Status:</span><span className="text-right">{PASS_FAIL(res.status_overturn)}</span>
                                            
                                            <span className="col-span-2 border-t border-slate-700 my-1"></span>
                                            {/* ✅ แก้ JSX Syntax ตรงนี้ */}
                                            <span>Sliding:</span><span className="text-right font-mono">{res.FS_sliding.toFixed(2)} {'>'} {inputs.useSeismic?'1.1':'1.5'}</span>
                                            <span>Status:</span><span className="text-right">{PASS_FAIL(res.status_sliding)}</span>
                                            
                                            <span className="col-span-2 border-t border-slate-700 my-1"></span>
                                            <span>Bearing:</span><span className="text-right font-mono">{res.q_max.toFixed(2)} T/m²</span>
                                            <span>Status:</span><span className="text-right">{PASS_FAIL(res.status_bearing)}</span>
                                        </div>
                                    </div>

                                    <div className="bg-[#151F32] border border-slate-800 rounded-xl p-4">
                                        <h4 className="font-bold text-sm text-blue-400 mb-2 border-b border-slate-700 pb-1 flex items-center gap-2"><Anchor size={14}/> 2. Structural Design</h4>
                                        <div className="space-y-2 text-sm text-slate-300">
                                            <div className="text-xs text-center bg-slate-800 rounded p-1 mb-2 text-blue-300">{res.designMode}</div>
                                            <div className="flex justify-between"><span>Stem (Main):</span><span className="text-green-400">{res.As_req_stem.toFixed(2)} cm² ({PASS_FAIL(res.status_stem)})</span></div>
                                            <div className="flex justify-between"><span>Toe (Bot):</span><span className="text-green-400">{res.Mu_toe.toFixed(2)} kg-m ({PASS_FAIL(res.status_toe)})</span></div>
                                            <div className="flex justify-between"><span>Heel (Top):</span><span className="text-green-400">{res.Mu_heel.toFixed(2)} kg-m ({PASS_FAIL(res.status_heel)})</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* REPORT */}
                    {activeTab === 1 && (
                        <ReportTemplate title="Retaining Wall Calculation" subtitle={`Type: ${inputs.type} Wall | Seismic: ${inputs.useSeismic ? 'Yes' : 'No'}`} onPrint={() => isPro ? window.print() : alert('Pro Feature')}>
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-8 mb-6">
                                    <div><h3 className="font-bold text-blue-800 mb-2 border-b">1. Design Parameters</h3><div className="text-xs space-y-1"><div>Height: {inputs.h_total}m, Base: {res.B.toFixed(2)}m</div><div>Soil: Gamma={inputs.gamma_soil}, Phi={inputs.phi}°</div><div>Materials: fc'={inputs.fc}, fy={inputs.fy}</div></div></div>
                                    <div><div className="border p-4 flex justify-center"><div className="scale-75 origin-top"><RetainingWallView {...inputs} q_max={res.q_max} /></div></div></div>
                                </div>
                                <h3 className="font-bold text-blue-800 mb-2 border-b">2. Stability Analysis</h3>
                                <table className="w-full text-xs text-left mb-6">
                                    <thead className="bg-gray-100"><tr><th className="p-1">Check</th><th className="p-1">Driving Force/Moment</th><th className="p-1">Resisting</th><th className="p-1">FS / Value</th><th className="p-1">Status</th></tr></thead>
                                    <tbody className="divide-y">
                                        {/* ✅ ตอนนี้ M_overturn และ M_resist มีค่าแล้ว ไม่ Error แน่นอน */}
                                        <tr><td className="p-1">Overturning</td><td className="p-1">{res.M_overturn.toFixed(0)} kg-m</td><td className="p-1">{res.M_resist.toFixed(0)} kg-m</td><td className="p-1">{res.FS_overturn.toFixed(2)}</td><td className="p-1 font-bold">{res.status_overturn}</td></tr>
                                        <tr><td className="p-1">Sliding</td><td className="p-1">{res.P_total_horiz.toFixed(0)} kg</td><td className="p-1">{(res.FS_sliding*res.P_total_horiz).toFixed(0)} kg</td><td className="p-1">{res.FS_sliding.toFixed(2)}</td><td className="p-1 font-bold">{res.status_sliding}</td></tr>
                                        <tr><td className="p-1">Bearing</td><td className="p-1">Max q = {res.q_max.toFixed(2)}</td><td className="p-1">Allow = {inputs.qa}</td><td className="p-1">e={res.eccentricity.toFixed(2)}</td><td className="p-1 font-bold">{res.status_bearing}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </ReportTemplate>
                    )}
                    
                    {activeTab === 2 && (
                        <div className="bg-[#151F32] p-6 rounded-xl border border-slate-800 block print:hidden">
                            <h3 className="text-lg font-bold text-blue-400 uppercase mb-4 flex items-center gap-2"><ArrowDownToLine size={18}/> Bill of Quantities</h3>
                            <table className="w-full text-sm text-left text-slate-300"><thead className="bg-slate-900 text-white text-base"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Unit</th><th className="p-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-800 text-sm">
                                <tr><td className="p-3">Concrete</td><td className="p-3 text-right">{res.volConcrete.toFixed(2)} m³</td><td className="p-3 text-right">{MATERIAL_COSTS.CONCRETE_M3}</td><td className="p-3 text-right">{(res.volConcrete*MATERIAL_COSTS.CONCRETE_M3).toLocaleString()}</td></tr>
                                <tr><td className="p-3">Rebar</td><td className="p-3 text-right">{res.weightSteel.toFixed(1)} kg</td><td className="p-3 text-right">{MATERIAL_COSTS.REBAR_KG}</td><td className="p-3 text-right">{(res.weightSteel*MATERIAL_COSTS.REBAR_KG).toLocaleString()}</td></tr>
                                <tr><td className="p-3">Formwork</td><td className="p-3 text-right">{res.areaForm.toFixed(1)} m²</td><td className="p-3 text-right">{MATERIAL_COSTS.FORMWORK_M2}</td><td className="p-3 text-right">{(res.areaForm*MATERIAL_COSTS.FORMWORK_M2).toLocaleString()}</td></tr>
                                <tr className="bg-slate-800 font-bold text-white"><td className="p-3" colSpan={3}>Grand Total</td><td className="p-3 text-right">{((res.volConcrete*MATERIAL_COSTS.CONCRETE_M3) + (res.weightSteel*MATERIAL_COSTS.REBAR_KG) + (res.areaForm*MATERIAL_COSTS.FORMWORK_M2)).toLocaleString()} THB</td></tr>
                            </tbody></table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RetainingWallTool;