import { useState, useMemo, useEffect } from 'react';
// ✅ Fix: Clean imports
import { Calculator, FileText, Settings, Layers, Box, Grid, Minus, Plus } from 'lucide-react';
import { SlabInput, calculateSlab } from '../utils/rcSlabCalculation';
import { MATERIAL_COSTS, THEME, REBAR_GRADES, GRADE_PROPERTIES, UI_TEXT } from '../constants';
import SlabView from '../components/SlabView';
import { ToolHeader } from '../components/common/ToolHeader';
import { ReportTemplate } from '../components/common/ReportTemplate';
import { Standard, Language, SteelGrade } from '../types';

interface Props { onBack: () => void; isPro?: boolean; }

// ✅ Fix: Define strict types for InputWrapper props
interface InputWrapperProps {
    label: string;
    children: React.ReactNode;
}

const InputWrapper = ({ label, children }: InputWrapperProps) => (
    <div className="flex flex-col gap-1 w-full relative group">
        <div className="flex justify-between items-center">
            <label className="text-xs text-slate-400 block mb-1 truncate">{label}</label>
        </div>
        <div className="h-9 w-full relative">
            <div className="w-full h-full">{children}</div>
        </div>
    </div>
);

// ✅ Fix: Define strict types for NumberControl props
interface NumberControlProps {
    value: number;
    onChange: (val: number) => void;
    step?: number;
    min?: number;
}

const NumberControl = ({ value, onChange, step = 1, min = 0 }: NumberControlProps) => (
    <div className={`flex items-center h-full ${THEME.BG.INPUT} border ${THEME.BORDER.INPUT} rounded w-full overflow-hidden`}>
        <button 
            onClick={() => onChange(Math.max(min, parseFloat((value - step).toFixed(2))))} 
            className="px-3 h-full text-slate-500 hover:text-white hover:bg-slate-700 border-r border-slate-700 transition-colors"
        >
            <Minus size={12}/>
        </button>
        <input 
            type="number" 
            value={value} 
            onChange={e => onChange(parseFloat(e.target.value) || 0)} 
            className="bg-transparent border-none w-full text-center text-white text-sm focus:outline-none appearance-none h-full" 
        />
        <button 
            onClick={() => onChange(parseFloat((value + step).toFixed(2)))} 
            className="px-3 h-full text-slate-500 hover:text-white hover:bg-slate-700 border-l border-slate-700 transition-colors"
        >
            <Plus size={12}/>
        </button>
    </div>
);

const RCSlabDesignTool = ({ onBack, isPro = true }: Props) => {
    const [lang, setLang] = useState<Language>('th');
    const [std, setStd] = useState<Standard>('EIT-Thai');
    const [activeTab, setActiveTab] = useState(0);

    const [inputs, setInputs] = useState<SlabInput>({
        sdl: 150, ll: 200, lx: 4.0, ly: 5.0, // Default lx/ly adjusted for realism
        thickness: 12, covering: 2.5,
        fc: 240, fy: 3000,
        steelType: 'SD30',
        mainBarDia: 12,
        standard: 'EIT-Thai',
        isCantilever: false,
        edges: { top: false, right: false, bottom: false, left: false }
    });

    // Update standard in inputs when std state changes
    useEffect(() => { 
        setInputs(p => ({...p, standard: std})); 
    }, [std]);

    const updateInput = (key: keyof SlabInput, val: any) => setInputs(p => ({ ...p, [key]: val }));
    
    const toggleEdge = (edge: 'top'|'right'|'bottom'|'left') => {
        if (!inputs.isCantilever) {
            setInputs(p => ({...p, edges: { ...p.edges, [edge]: !p.edges[edge] }}));
        }
    };

    // Update fy and check bar diameter when steel type changes
    useEffect(() => {
        const grade = inputs.steelType as SteelGrade;
        const newFy = REBAR_GRADES[grade] || 3000;
        const availableSizes = GRADE_PROPERTIES[grade]?.sizes || [];
        
        // If current diameter is not available in new grade, switch to default (first available)
        const isSizeValid = availableSizes.includes(inputs.mainBarDia);
        
        setInputs(p => ({ 
            ...p, 
            fy: newFy,
            mainBarDia: isSizeValid ? p.mainBarDia : (availableSizes[0] || 12)
        }));
    }, [inputs.steelType]);

    // Calculate Results
    const res = useMemo(() => calculateSlab(inputs, lang), [inputs, lang]);
    
    // UI Helpers
    const t = UI_TEXT[lang]?.rcSlab || UI_TEXT['en'].rcSlab;
    const SELECT_CLS = `w-full h-full ${THEME.BG.INPUT} border ${THEME.BORDER.INPUT} rounded px-3 text-white text-sm focus:outline-none focus:border-blue-500 appearance-none bg-[#1e293b]`;
    
    // Visual logic: Force 1 edge continuous for visual representation of Cantilever
    const visualEdges = inputs.isCantilever 
        ? { top: false, right: false, bottom: false, left: true } 
        : inputs.edges;

    const gradeOptions = Object.keys(REBAR_GRADES);
    const sizeOptions = GRADE_PROPERTIES[inputs.steelType as SteelGrade]?.sizes || [];

    const ReportBox = ({ title, steps }: { title: string, steps: string[] }) => (
        <div className="border border-gray-300 rounded p-2 h-full bg-white shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded border-b border-slate-200 mb-1">{title}</h3>
            <div className="px-2 space-y-0.5">
                {steps.map((line, k) => <div key={k} className="text-[10px] text-slate-700 leading-tight" dangerouslySetInnerHTML={{__html: line}} />)}
            </div>
        </div>
    );

    return (
        <div className={`max-w-[1600px] mx-auto p-4 md:p-6 min-h-screen ${THEME.BG.MAIN} ${THEME.TEXT.PRIMARY} font-sans print:bg-white print:text-black print:p-0`}>
            <ToolHeader title={t.title} onBack={onBack} std={std} setStd={setStd} lang={lang} setLang={setLang} isPro={isPro} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
                
                {/* LEFT: INPUTS */}
                <div className="lg:col-span-4 space-y-4 print:hidden">
                    
                    {/* GEOMETRY */}
                    <div className="bg-[#151F32] p-5 rounded-xl border border-slate-800 shadow-sm">
                        <h3 className="text-sm font-bold text-blue-400 uppercase mb-3 flex items-center gap-2"><Box size={16}/> {t.geo}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className={`flex items-center gap-2 cursor-pointer bg-slate-900 p-2 rounded border ${inputs.isCantilever ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700 hover:border-slate-500'} transition-all`}>
                                    <input type="checkbox" checked={inputs.isCantilever} onChange={e=>updateInput('isCantilever', e.target.checked)} className="w-4 h-4 accent-blue-500"/>
                                    <span className="text-sm font-bold text-slate-200">{t.inputs.cantilever}</span>
                                </label>
                            </div>
                            <InputWrapper label={`${t.inputs.lx} (m)`}><NumberControl value={inputs.lx} onChange={(v:number)=>updateInput('lx', v)} step={0.1}/></InputWrapper>
                            <InputWrapper label={`${t.inputs.ly} (m)`}><NumberControl value={inputs.ly} onChange={(v:number)=>updateInput('ly', v)} step={0.1}/></InputWrapper>
                            <InputWrapper label={`${t.inputs.t} (cm)`}><NumberControl value={inputs.thickness} onChange={(v:number)=>updateInput('thickness', v)} step={1}/></InputWrapper>
                            <InputWrapper label={`${t.inputs.cov} (cm)`}><NumberControl value={inputs.covering} onChange={(v:number)=>updateInput('covering', v)} step={0.5}/></InputWrapper>
                            <InputWrapper label={`${t.inputs.sdl} (kg/m²)`}><NumberControl value={inputs.sdl} onChange={(v:number)=>updateInput('sdl', v)} step={50}/></InputWrapper>
                            <InputWrapper label={`${t.inputs.ll} (kg/m²)`}><NumberControl value={inputs.ll} onChange={(v:number)=>updateInput('ll', v)} step={50}/></InputWrapper>
                        </div>
                    </div>

                    {/* MATERIAL */}
                    <div className="bg-[#151F32] p-5 rounded-xl border border-slate-800 shadow-sm">
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
                                    {sizeOptions.map((d: number) => <option key={d} value={d}>Ø{d}</option>)}
                                </select>
                            </InputWrapper>
                        </div>
                    </div>

                    {/* EDGES */}
                    <div className={`bg-[#151F32] p-5 rounded-xl border border-slate-800 relative group transition-all ${inputs.isCantilever ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <div className="flex justify-between"><h3 className="text-sm font-bold text-blue-400 uppercase mb-3 flex items-center gap-2"><Grid size={16}/> {t.inputs.case}</h3></div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(inputs.edges).map(([key, val]) => (
                                <button 
                                    key={key} 
                                    onClick={() => toggleEdge(key as any)} 
                                    className={`p-2 rounded border capitalize transition-colors ${val ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                >
                                    {key}: {val ? 'Cont.' : 'Discont.'}
                                </button>
                            ))}
                        </div>
                        {inputs.isCantilever && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/60 backdrop-blur-[1px] border border-slate-700">
                                <span className="text-white font-bold text-sm bg-slate-800 px-3 py-1 rounded-full shadow-lg border border-slate-600">Cantilever Mode Active</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: OUTPUTS */}
                <div className="lg:col-span-8 space-y-4 print:col-span-12">
                    {/* TABS */}
                    <div className="flex gap-2 border-b border-slate-700 pb-2 print:hidden">
                        {[
                            { id: 0, icon: Calculator, label: 'Analysis' },
                            { id: 1, icon: FileText, label: 'Report' },
                            { id: 2, icon: Settings, label: 'BOQ' }
                        ].map((tab) => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)} 
                                className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors flex items-center gap-2 ${activeTab===tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                            >
                                <tab.icon size={16}/> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* TAB 0: ANALYSIS */}
                    {activeTab === 0 && (
                        <div className="space-y-6 block print:hidden animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Visual */}
                                <div className="bg-[#151F32] p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[350px] relative shadow-lg">
                                    <SlabView 
                                        lx={inputs.lx} ly={inputs.ly} 
                                        edges={visualEdges} 
                                        onEdgeClick={toggleEdge} 
                                        rebarX={`Ø${inputs.mainBarDia}@${res.spacing_req_x}cm`} 
                                        rebarY={`Ø${inputs.mainBarDia}@${res.spacing_req_y}cm`} 
                                    />
                                    <div className="mt-6 text-center w-full">
                                        <div className="text-xl font-bold text-blue-400 mb-1">{res.note}</div>
                                        <div className="text-sm text-slate-400 flex justify-center gap-4">
                                            <span>Wu: <strong className="text-slate-200">{res.w_total.toFixed(0)}</strong> kg/m²</span>
                                            <span>Std: <span className="text-slate-300">{std}</span></span>
                                        </div>
                                        {inputs.isCantilever && (
                                            <div className="mt-3 inline-block bg-orange-900/30 border border-orange-500/50 text-orange-300 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                                                ⚠️ CHECK DEFLECTION & TOP STEEL
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Results */}
                                <div className="space-y-4">
                                    {/* Thickness Check */}
                                    <div className={`bg-[#151F32] border border-slate-800 rounded-xl overflow-hidden p-4 flex justify-between items-center shadow-sm ${res.h_status==='FAIL'?'border-red-500 bg-red-900/10':''}`}>
                                        <span className="text-sm text-slate-300 font-medium">Min. Thickness (Deflection)</span>
                                        <div className="text-right">
                                            <span className={`font-mono font-bold text-lg ${res.h_status==='PASS'?'text-green-400':'text-red-400'}`}>
                                                {inputs.thickness} cm {res.h_status==='PASS' ? '≥' : '<'} {res.h_min.toFixed(2)} cm
                                            </span>
                                        </div>
                                    </div>

                                    {/* Moment & Rebar Results */}
                                    {[
                                        { label: inputs.isCantilever ? 'Main Direction (Top Steel)' : 'X-Direction (Short Span)', color: 'text-red-400 border-red-400/30', bg: 'bg-red-900/10', res: res.momentX, req: res.As_req_x, spa: res.spacing_req_x },
                                        { label: inputs.isCantilever ? 'Distribution Steel' : 'Y-Direction (Long Span)', color: 'text-blue-400 border-blue-400/30', bg: 'bg-blue-900/10', res: res.momentY, req: res.As_req_y, spa: res.spacing_req_y }
                                    ].map((d, i) => (
                                        <div key={i} className="bg-[#151F32] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                            <div className={`bg-slate-900/50 px-4 py-3 border-b border-slate-800 font-bold text-sm flex justify-between items-center ${d.color}`}>
                                                {d.label}
                                                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-normal">Design</span>
                                            </div>
                                            <div className="p-4 space-y-3 text-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">Design Moment (Mu)</span>
                                                    <span className="font-mono text-white text-base">{d.res.design.toFixed(2)} <span className="text-xs text-slate-500">kg-m</span></span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">As Required</span>
                                                    <span className="font-mono text-yellow-400">{d.req.toFixed(2)} <span className="text-xs text-slate-500">cm²/m</span></span>
                                                </div>
                                                <div className="pt-3 border-t border-slate-700/50 flex justify-between items-center">
                                                    <span className="font-bold text-slate-200">Provide Rebar</span>
                                                    <span className="font-mono font-bold text-green-400 bg-green-900/20 px-2 py-1 rounded border border-green-500/30">
                                                        Ø{inputs.mainBarDia} @ {d.spa} cm
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 1: REPORT */}
                    {activeTab === 1 && (
                        <div className="bg-white text-black p-8 rounded-lg shadow-lg min-h-[800px] print:shadow-none print:p-0 animate-fade-in">
                            <ReportTemplate title={t.title} subtitle={`Standard: ${std} | Method: ${inputs.isCantilever?'Cantilever Analysis':'Coefficient Method'}`} onPrint={()=>{}}>
                                <div className="space-y-6">
                                    {/* Visual & Summary */}
                                    <div className="grid grid-cols-12 gap-6">
                                        <div className="col-span-7 flex flex-col items-center justify-center border border-gray-200 p-4 rounded-lg bg-gray-50">
                                            <SlabView lx={inputs.lx} ly={inputs.ly} edges={visualEdges} isReport={true} rebarX={`Ø${inputs.mainBarDia}@${res.spacing_req_x}`} rebarY={`Ø${inputs.mainBarDia}@${res.spacing_req_y}`} />
                                            <div className="mt-2 text-xs text-gray-500 font-mono">Plan View - Reinforcement Detail</div>
                                        </div>
                                        <div className="col-span-5 space-y-4">
                                            <ReportBox title={res.reportSteps[0].title} steps={res.reportSteps[0].content} />
                                            <ReportBox title={res.reportSteps[1].title} steps={res.reportSteps[1].content} />
                                        </div>
                                    </div>
                                    
                                    {/* Calculations */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <ReportBox title={res.reportSteps[2].title} steps={res.reportSteps[2].content} />
                                        <ReportBox title={res.reportSteps[3].title} steps={res.reportSteps[3].content} />
                                    </div>
                                    
                                    {/* Conclusion */}
                                    <ReportBox title={res.reportSteps[4].title} steps={res.reportSteps[4].content} />
                                </div>
                            </ReportTemplate>
                        </div>
                    )}

                    {/* TAB 2: BOQ */}
                    {activeTab === 2 && (
                        <div className={`${THEME.BG.PANEL} p-6 rounded-xl border ${THEME.BORDER.DEFAULT} animate-fade-in block print:hidden shadow-lg`}>
                            <h3 className="text-lg font-bold text-blue-400 uppercase mb-4 flex items-center gap-2"><Settings size={18}/> Bill of Quantities</h3>
                            <div className="overflow-hidden rounded-lg border border-slate-700">
                                <table className="w-full text-sm text-left text-slate-300">
                                    <thead className="bg-slate-900 text-white text-base">
                                        <tr>
                                            <th className="p-4 font-semibold">Item</th>
                                            <th className="p-4 text-right font-semibold">Qty</th>
                                            <th className="p-4 text-right font-semibold">Unit Price</th>
                                            <th className="p-4 text-right font-semibold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 text-sm bg-[#151F32]">
                                        <tr>
                                            <td className="p-4">Concrete (Strength {inputs.fc} ksc)</td>
                                            <td className="p-4 text-right font-mono">{res.volConcrete.toFixed(2)} m³</td>
                                            <td className="p-4 text-right font-mono">{MATERIAL_COSTS.CONCRETE_M3.toLocaleString()}</td>
                                            <td className="p-4 text-right font-mono text-white">{(res.volConcrete*MATERIAL_COSTS.CONCRETE_M3).toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-4">Rebar ({inputs.steelType})</td>
                                            <td className="p-4 text-right font-mono">{res.weightSteel.toFixed(1)} kg</td>
                                            <td className="p-4 text-right font-mono">{MATERIAL_COSTS.REBAR_KG.toLocaleString()}</td>
                                            <td className="p-4 text-right font-mono text-white">{(res.weightSteel*MATERIAL_COSTS.REBAR_KG).toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-4">Formwork</td>
                                            <td className="p-4 text-right font-mono">{res.areaForm.toFixed(1)} m²</td>
                                            <td className="p-4 text-right font-mono">{MATERIAL_COSTS.FORMWORK_M2.toLocaleString()}</td>
                                            <td className="p-4 text-right font-mono text-white">{(res.areaForm*MATERIAL_COSTS.FORMWORK_M2).toLocaleString()}</td>
                                        </tr>
                                        <tr className="bg-slate-800/80 font-bold text-white text-base">
                                            <td className="p-4" colSpan={3}>Grand Total</td>
                                            <td className="p-4 text-right text-green-400">{res.estCost.toLocaleString()} THB</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RCSlabDesignTool;