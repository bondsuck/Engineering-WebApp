import { useState, useMemo, useEffect } from 'react';
// ✅ Fix 3: ลบ AlertTriangle ออก
import { Calculator, Printer, FileText, Settings, Layers, Box, Grid, MousePointerClick, Minus, Plus } from 'lucide-react';
import { SlabInput, calculateSlab } from '../utils/rcSlabCalculation';
import { MATERIAL_COSTS, THEME, REBAR_GRADES, GRADE_PROPERTIES, UI_TEXT } from '../constants';
import SlabView from '../components/SlabView';
import { ToolHeader } from '../components/common/ToolHeader';
import { ReportTemplate } from '../components/common/ReportTemplate';
import { Standard, Language, SteelGrade } from '../types';

interface Props { onBack: () => void; isPro?: boolean; }

const InputWrapper = ({ label, children }: any) => (
    <div className="flex flex-col gap-1 w-full relative group">
        <div className="flex justify-between items-center">
            <label className="text-xs text-slate-400 block mb-1 truncate">{label}</label>
        </div>
        <div className="h-9 w-full relative">
            <div className="w-full h-full">{children}</div>
        </div>
    </div>
);

const NumberControl = ({ value, onChange, step = 1, min = 0 }: any) => (
    <div className={`flex items-center h-full ${THEME.BG.INPUT} border ${THEME.BORDER.INPUT} rounded w-full overflow-hidden`}>
        <button onClick={() => onChange(Math.max(min, parseFloat((value - step).toFixed(2))))} className="px-3 h-full text-slate-500 hover:text-white hover:bg-slate-700 border-r border-slate-700"><Minus size={12}/></button>
        <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} className="bg-transparent border-none w-full text-center text-white text-sm focus:outline-none appearance-none h-full" />
        <button onClick={() => onChange(parseFloat((value + step).toFixed(2)))} className="px-3 h-full text-slate-500 hover:text-white hover:bg-slate-700 border-l border-slate-700"><Plus size={12}/></button>
    </div>
);

const RCSlabDesignTool = ({ onBack, isPro = true }: Props) => {
    const [lang, setLang] = useState<Language>('th');
    const [std, setStd] = useState<Standard>('EIT-Thai');
    const [activeTab, setActiveTab] = useState(0);

    const [inputs, setInputs] = useState<SlabInput>({
        sdl: 150, ll: 200, lx: 2.0, ly: 5.0,
        thickness: 12, covering: 2.5,
        fc: 240, fy: 3000,
        steelType: 'SD30',
        mainBarDia: 12,
        standard: 'EIT-Thai',
        isCantilever: false,
        edges: { top: false, right: false, bottom: false, left: false }
    });

    useEffect(() => { setInputs(p => ({...p, standard: std})); }, [std]);

    const updateInput = (key: keyof SlabInput, val: any) => setInputs(p => ({ ...p, [key]: val }));
    const toggleEdge = (edge: 'top'|'right'|'bottom'|'left') => !inputs.isCantilever && setInputs(p => ({...p, edges: { ...p.edges, [edge]: !p.edges[edge] }}));

    useEffect(() => {
        // ✅ Fix 1: Cast inputs.steelType as SteelGrade
        const newFy = REBAR_GRADES[inputs.steelType] || 3000;
        
        // ✅ Fix 1: Cast inputs.steelType as SteelGrade
        const availableSizes = GRADE_PROPERTIES[inputs.steelType as SteelGrade]?.sizes || [];
        const isSizeValid = availableSizes.includes(inputs.mainBarDia);
        
        setInputs(p => ({ 
            ...p, 
            fy: newFy,
            mainBarDia: isSizeValid ? p.mainBarDia : availableSizes[0]
        }));
    }, [inputs.steelType]);

    const res = useMemo(() => calculateSlab(inputs, lang), [inputs, lang, std]);
    const t = UI_TEXT[lang]?.rcSlab || UI_TEXT['en'].rcSlab;
    const SELECT_CLS = `w-full h-full ${THEME.BG.INPUT} border ${THEME.BORDER.INPUT} rounded px-3 text-white text-sm focus:outline-none focus:border-blue-500`;
    
    const visualEdges = inputs.isCantilever 
        ? { top: false, right: false, bottom: false, left: true } 
        : inputs.edges;

    const gradeOptions = Object.keys(REBAR_GRADES);
    
    // ✅ Fix 1: Cast inputs.steelType as SteelGrade
    const sizeOptions = GRADE_PROPERTIES[inputs.steelType as SteelGrade]?.sizes || [];

    const RPT_TXT = "text-[10px] text-slate-700 leading-tight";
    const RPT_HEAD = "text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded border-b border-slate-200 mb-1";
    const ReportBox = ({ title, steps }: { title: string, steps: string[] }) => (
        <div className="border border-gray-300 rounded p-2 h-full bg-white shadow-sm">
            <h3 className={RPT_HEAD}>{title}</h3>
            <div className="px-2 space-y-0.5">{steps.map((line, k) => <div key={k} className={RPT_TXT} dangerouslySetInnerHTML={{__html: line}} />)}</div>
        </div>
    );

    return (
        <div className={`max-w-[1600px] mx-auto p-4 md:p-6 min-h-screen ${THEME.BG.MAIN} ${THEME.TEXT.PRIMARY} font-sans print:bg-white print:text-black print:p-0`}>
            <ToolHeader title={t.title} onBack={onBack} std={std} setStd={setStd} lang={lang} setLang={setLang} isPro={isPro} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
                <div className="lg:col-span-4 space-y-4 print:hidden">
                    <div className="bg-[#151F32] p-5 rounded-xl border border-slate-800">
                        <h3 className="text-sm font-bold text-blue-400 uppercase mb-3 flex items-center gap-2"><Box size={16}/> {t.geo}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-900 p-2 rounded border border-slate-700 hover:border-blue-500 transition">
                                    <input type="checkbox" checked={inputs.isCantilever} onChange={e=>updateInput('isCantilever', e.target.checked)} className="w-4 h-4 accent-blue-500"/>
                                    <span className="text-sm font-bold text-slate-200">{t.inputs.cantilever}</span>
                                </label>
                            </div>
                            <InputWrapper label={t.inputs.lx + " (m)"}><NumberControl value={inputs.lx} onChange={(v:number)=>updateInput('lx', v)} step={0.5}/></InputWrapper>
                            <InputWrapper label={t.inputs.ly + " (m)"}><NumberControl value={inputs.ly} onChange={(v:number)=>updateInput('ly', v)} step={0.5}/></InputWrapper>
                            <InputWrapper label={t.inputs.t + " (cm)"}><NumberControl value={inputs.thickness} onChange={(v:number)=>updateInput('thickness', v)} step={1}/></InputWrapper>
                            <InputWrapper label={t.inputs.cov + " (cm)"}><NumberControl value={inputs.covering} onChange={(v:number)=>updateInput('covering', v)} step={0.5}/></InputWrapper>
                            <InputWrapper label={t.inputs.sdl + " (kg/m²)"}><NumberControl value={inputs.sdl} onChange={(v:number)=>updateInput('sdl', v)} step={50}/></InputWrapper>
                            <InputWrapper label={t.inputs.ll + " (kg/m²)"}><NumberControl value={inputs.ll} onChange={(v:number)=>updateInput('ll', v)} step={50}/></InputWrapper>
                        </div>
                    </div>

                    <div className="bg-[#151F32] p-5 rounded-xl border border-slate-800">
                        <h3 className="text-sm font-bold text-blue-400 uppercase mb-3 flex items-center gap-2"><Layers size={16}/> {t.mat}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <InputWrapper label="fc' (ksc)"><NumberControl value={inputs.fc} onChange={(v:number)=>updateInput('fc', v)} step={10}/></InputWrapper>
                            <InputWrapper label="Grade">
                                <select value={inputs.steelType} onChange={e=>updateInput('steelType', e.target.value)} className={SELECT_CLS}>
                                    {gradeOptions.map(g=><option key={g} value={g}>{g}</option>)}
                                </select>
                            </InputWrapper>
                            <InputWrapper label="Bar Size">
                                <select value={inputs.mainBarDia} onChange={e=>updateInput('mainBarDia', +e.target.value)} className={SELECT_CLS}>
                                    {/* ✅ Fix 2: Explicitly type 'd' as number */}
                                    {sizeOptions.map((d: number) => <option key={d} value={d}>Ø{d}</option>)}
                                </select>
                            </InputWrapper>
                        </div>
                    </div>

                    <div className={`bg-[#151F32] p-5 rounded-xl border border-slate-800 relative group transition-opacity ${inputs.isCantilever ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex justify-between"><h3 className="text-sm font-bold text-blue-400 uppercase mb-3 flex items-center gap-2"><Grid size={16}/> {t.inputs.case}</h3></div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(inputs.edges).map(([key, val]) => (
                                <button key={key} onClick={() => toggleEdge(key as any)} className={`p-2 rounded border capitalize ${val ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>{key}: {val ? 'Cont.' : 'Discont.'}</button>
                            ))}
                        </div>
                        {inputs.isCantilever && <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-bold text-sm">Cantilever Mode</div>}
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-4 print:col-span-12">
                    <div className="flex gap-2 border-b border-slate-700 pb-2 print:hidden">
                        <button onClick={() => setActiveTab(0)} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab===0 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Calculator size={16} className="inline mr-2"/> Analysis</button>
                        <button onClick={() => setActiveTab(1)} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab===1 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><FileText size={16} className="inline mr-2"/> Report</button>
                        <button onClick={() => setActiveTab(2)} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab===2 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Settings size={16} className="inline mr-2"/> BOQ</button>
                    </div>

                    {activeTab === 0 && (
                        <div className="space-y-6 block print:hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#151F32] p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[300px] relative">
                                    <SlabView 
                                        lx={inputs.lx} ly={inputs.ly} 
                                        edges={visualEdges} 
                                        onEdgeClick={toggleEdge} 
                                        rebarX={`Ø${inputs.mainBarDia}@${res.spacing_req_x}cm`} 
                                        rebarY={`Ø${inputs.mainBarDia}@${res.spacing_req_y}cm`} 
                                    />
                                    <div className="mt-4 text-center">
                                        <div className="text-xl font-bold text-blue-400">{res.note}</div>
                                        <div className="text-sm text-slate-400">Total Load: {res.w_total.toFixed(0)} kg/m² ({std})</div>
                                        {inputs.isCantilever && <div className="text-red-400 font-bold mt-1 text-sm bg-red-900/30 px-2 py-1 rounded">⚠️ TOP REINFORCEMENT REQUIRED</div>}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className={`bg-[#151F32] border border-slate-800 rounded-xl overflow-hidden p-4 flex justify-between items-center ${res.h_status==='FAIL'?'border-red-500 bg-red-900/20':''}`}>
                                        <span className="text-sm text-slate-300">Min. Thickness (Deflection)</span>
                                        <div className="text-right">
                                            <span className={`font-bold ${res.h_status==='PASS'?'text-green-400':'text-red-400'}`}>{inputs.thickness} cm {res.h_status==='PASS'?'>':'<'} {res.h_min.toFixed(2)} cm</span>
                                        </div>
                                    </div>

                                    {[
                                        { label: 'X-Direction (Short/Overhang)', color: 'text-red-400', res: res.momentX, req: res.As_req_x, spa: res.spacing_req_x },
                                        { label: 'Y-Direction (Long/Binder)', color: 'text-blue-400', res: res.momentY, req: res.As_req_y, spa: res.spacing_req_y }
                                    ].map((d, i) => (
                                        <div key={i} className="bg-[#151F32] border border-slate-800 rounded-xl overflow-hidden">
                                            <div className={`bg-slate-900 px-4 py-2 border-b border-slate-800 font-bold text-sm ${d.color}`}>{d.label}</div>
                                            <div className="p-4 space-y-2 text-sm">
                                                <div className="flex justify-between"><span>Design Moment</span><span className="font-mono">{d.res.design.toFixed(2)} kg-m</span></div>
                                                <div className="flex justify-between"><span>As Required</span><span className="font-mono">{d.req.toFixed(2)} cm²/m</span></div>
                                                <div className="flex justify-between border-t border-slate-700 pt-2 font-bold text-white"><span>Use Rebar</span><span className="text-green-400">Ø{inputs.mainBarDia} @ {d.spa} cm</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 1 && (
                        <div className="bg-white text-black p-6 rounded-lg shadow-lg min-h-[600px] print:shadow-none print:p-0">
                            <div className="flex justify-end mb-6 print:hidden"><button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold"><Printer size={16}/> Print</button></div>
                            <ReportTemplate title={t.title} subtitle={`Standard: ${std} | Method: ${inputs.isCantilever?'Cantilever Analysis':'Coefficient Method'}`} onPrint={()=>{}}>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-12 gap-4">
                                        <div className="col-span-7 flex items-center justify-center border border-gray-300 p-2 rounded bg-white">
                                            <SlabView lx={inputs.lx} ly={inputs.ly} edges={visualEdges} isReport={true} rebarX={`Ø${inputs.mainBarDia}@${res.spacing_req_x}`} rebarY={`Ø${inputs.mainBarDia}@${res.spacing_req_y}`} />
                                        </div>
                                        <div className="col-span-5 space-y-2">
                                            <ReportBox title={res.reportSteps[0].title} steps={res.reportSteps[0].content} />
                                            <ReportBox title={res.reportSteps[1].title} steps={res.reportSteps[1].content} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <ReportBox title={res.reportSteps[2].title} steps={res.reportSteps[2].content} />
                                        <ReportBox title={res.reportSteps[3].title} steps={res.reportSteps[3].content} />
                                    </div>
                                    <ReportBox title={res.reportSteps[4].title} steps={res.reportSteps[4].content} />
                                </div>
                            </ReportTemplate>
                        </div>
                    )}

                    {activeTab === 2 && (
                        <div className={`${THEME.BG.PANEL} p-6 rounded-xl border ${THEME.BORDER.DEFAULT} animate-fade-in block print:hidden`}>
                            <h3 className="text-lg font-bold text-blue-400 uppercase mb-4 flex items-center gap-2"><Calculator size={18}/> Bill of Quantities</h3>
                            <table className="w-full text-sm text-left text-slate-300">
                                <thead className="bg-slate-900 text-white text-base"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Unit Price</th><th className="p-3 text-right">Total</th></tr></thead>
                                <tbody className="divide-y divide-slate-800 text-sm">
                                    {(() => {
                                        return (
                                            <>
                                                <tr><td className="p-3">Concrete</td><td className="p-3 text-right">{res.volConcrete.toFixed(2)} m³</td><td className="p-3 text-right">{MATERIAL_COSTS.CONCRETE_M3.toLocaleString()}</td><td className="p-3 text-right">{(res.volConcrete*MATERIAL_COSTS.CONCRETE_M3).toLocaleString()}</td></tr>
                                                <tr><td className="p-3">Rebar</td><td className="p-3 text-right">{res.weightSteel.toFixed(1)} kg</td><td className="p-3 text-right">{MATERIAL_COSTS.REBAR_KG.toLocaleString()}</td><td className="p-3 text-right">{(res.weightSteel*MATERIAL_COSTS.REBAR_KG).toLocaleString()}</td></tr>
                                                <tr><td className="p-3">Formwork</td><td className="p-3 text-right">{res.areaForm.toFixed(1)} m²</td><td className="p-3 text-right">{MATERIAL_COSTS.FORMWORK_M2.toLocaleString()}</td><td className="p-3 text-right">{(res.areaForm*MATERIAL_COSTS.FORMWORK_M2).toLocaleString()}</td></tr>
                                                <tr className="bg-slate-800 font-bold text-white"><td className="p-3" colSpan={3}>Grand Total</td><td className="p-3 text-right">{res.estCost.toLocaleString()} THB</td></tr>
                                            </>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RCSlabDesignTool;