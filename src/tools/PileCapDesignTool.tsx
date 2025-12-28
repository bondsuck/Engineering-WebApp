import { useState, useMemo, useEffect } from 'react';
import { Settings, Calculator, AlertCircle, X, FileText, Layers, Box, Grid, AlertTriangle, Minus, Plus, Lock } from 'lucide-react';
import { PileCapInput, calculatePileCap } from '../utils/rcPileCapCalculation';
import { MATERIAL_COSTS, TYPO, THEME, UI_TEXT, REBAR_GRADES, GRADE_PROPERTIES } from '../constants';
import { ToolHeader } from '../components/common/ToolHeader';
import { ReportTemplate } from '../components/common/ReportTemplate';
import PileCapSectionView from '../components/PileCapSectionView';
import { Standard, Language, SteelGrade } from '../types';

interface Props { onBack: () => void; isPro?: boolean; }

const NotificationToast = ({ title, message, onClose }: { title: string, message: string, onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl border border-yellow-500/50 flex items-center gap-3 animate-bounce-up z-[9999]">
            <AlertCircle className="text-yellow-500 min-w-[24px]" size={24} />
            <div>
                <h4 className="font-bold text-yellow-500 text-sm">{title}</h4>
                <p className="text-xs text-slate-300 mt-1">{message}</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white ml-2"><X size={16}/></button>
        </div>
    );
};

const InputWrapper = ({ label, children, isLocked = false, onLockClick }: { label: string, children: React.ReactNode, isLocked?: boolean, onLockClick?: () => void }) => (
    <div className="flex flex-col gap-1 w-full relative group">
        <div className="flex justify-between items-center">
            <label className={`${TYPO.LABEL} truncate ${isLocked ? 'text-slate-500' : ''}`}>{label}</label>
            {isLocked && <Lock size={10} className="text-slate-500" />}
        </div>
        <div className="h-9 w-full relative">
            <div className={`w-full h-full transition-opacity ${isLocked ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                {children}
            </div>
            {isLocked && (
                <div 
                    onClick={(e) => { e.stopPropagation(); onLockClick && onLockClick(); }}
                    className="absolute inset-0 z-20 cursor-not-allowed"
                />
            )}
        </div>
    </div>
);

const NumberControl = ({ value, onChange, step = 1, min = 0, disabled = false }: { value: number, onChange: (v: number) => void, step?: number, min?: number, disabled?: boolean }) => (
    <div className={`flex items-center h-full ${THEME.BG.INPUT} border ${THEME.BORDER.INPUT} rounded w-full overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <button onClick={() => !disabled && onChange(Math.max(min, parseFloat((value - step).toFixed(2))))} className="px-3 h-full text-slate-500 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center border-r border-slate-700" disabled={disabled}><Minus size={12}/></button>
        <input 
            type="number" 
            value={value} 
            onChange={e => !disabled && onChange(parseFloat(e.target.value) || 0)} 
            className="bg-transparent border-none w-full text-center text-white text-sm focus:outline-none appearance-none h-full"
            disabled={disabled} 
        />
        <button onClick={() => !disabled && onChange(parseFloat((value + step).toFixed(2)))} className="px-3 h-full text-slate-500 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center border-l border-slate-700" disabled={disabled}><Plus size={12}/></button>
    </div>
);

const PileCapDesignTool = ({ onBack, isPro = false }: Props) => {
    const [lang, setLang] = useState<Language>('th');
    const [std, setStd] = useState<Standard>('EIT-Thai');
    const [activeTab, setActiveTab] = useState(0); 
    const [notification, setNotification] = useState<string | null>(null);

    const [inputs, setInputs] = useState<PileCapInput & { 
        mainGrade: string, stirrupGrade: string, 
        topBarGrade: string, isTempBar: boolean, topBarSize: number, topBarSpacing: number 
    }>({
        Pu: 50, Mx: 0, My: 0, includeSelfWeight: true,
        fc: 240, fy: 3000, // Default SD30
        col_x: 50, col_y: 50, h: 70, covering: 7.5,
        pileDia: 40, pileSafeLoad: 40, pileFS: 2.5,
        numPiles: 2, 
        spacingFactor: 3.0, edgeFactor: 1.5, pileEmbedment: 10,
        deviations: Array(2).fill({ dx: 0, dy: 0 }),
        autoExpand: false,
        isDeepBeamAnalysis: false,
        barDiaX: 20, spacingX: 15,
        barDiaY: 20, spacingY: 15,
        stirrupDia: 9, 
        hasTopBar: false,
        standard: 'EIT-Thai',
        mainGrade: 'SD30',
        stirrupGrade: 'SR24',
        topBarGrade: 'SD30',
        topBarSize: 12,
        topBarSpacing: 20,
        isTempBar: false
    });

    // 🔒 LOCK LOGIC 🔒
    useEffect(() => {
        if (!isPro) {
            setLang('en'); // Lock 5: Force EN
            setStd('ACI318-19'); // Lock 5: Force ACI
            setInputs(prev => ({
                ...prev,
                mainGrade: 'SD30', // Lock 1: Force SD30
                topBarGrade: 'SD30',
                numPiles: Math.min(prev.numPiles, 4), // Lock 2: Max 4
                spacingFactor: 3.0, // Lock 3: Fixed
                edgeFactor: 1.5,    // Lock 3: Fixed
                isDeepBeamAnalysis: false, // Lock 4: Force False
                autoExpand: false, // Lock Deviation Option
                deviations: prev.deviations.map(() => ({ dx: 0, dy: 0 })) // Reset Deviations
            }));
        }
    }, [isPro, inputs.numPiles]);

    useEffect(() => {
        const newFy = REBAR_GRADES[inputs.mainGrade] || 3000;
        setInputs(p => ({ ...p, fy: newFy }));
    }, [inputs.mainGrade]);

    useEffect(() => { setInputs(p => ({ ...p, standard: std })); }, [std]);

    useEffect(() => {
        setInputs(prev => {
            const currentDevs = prev.deviations;
            let newDevs = [...currentDevs];
            if (prev.numPiles > currentDevs.length) {
                const addCount = prev.numPiles - currentDevs.length;
                newDevs = [...newDevs, ...Array(addCount).fill({ dx: 0, dy: 0 })];
            } else {
                newDevs = newDevs.slice(0, prev.numPiles);
            }
            return { ...prev, deviations: newDevs };
        });
    }, [inputs.numPiles]);

    const res = useMemo(() => calculatePileCap(inputs, lang), [inputs, lang]);
    const t = UI_TEXT[lang]?.rcPileCap || UI_TEXT['en'].rcPileCap;

    const notifyLocked = (feature: string) => setNotification(`กรุณาอัปเกรดเป็น PRO เพื่อปลดล็อก: ${feature}`);
    
    const handleSetLang = (l: Language) => { if(!isPro && l==='th') { notifyLocked('ภาษาไทย'); return; } setLang(l); };
    const handleSetStd = (s: Standard) => { if(!isPro && s==='EIT-Thai') { notifyLocked('มาตรฐาน วสท. (EIT)'); return; } setStd(s); };
    
    const updateInput = (key: any, val: any) => {
        if (!isPro) {
            if (key === 'mainGrade' && val !== 'SD30') { notifyLocked('เหล็กกำลังสูง (SD40+)'); return; }
            if (key === 'numPiles' && val > 4) { notifyLocked('ออกแบบเข็ม 5 ต้นขึ้นไป'); return; }
        }
        setInputs(p => ({ ...p, [key]: val }));
    };

    const updateDeviation = (idx: number, field: 'dx'|'dy', val: number) => {
        const newDevs = [...inputs.deviations];
        newDevs[idx] = { ...newDevs[idx], [field]: val };
        setInputs(p => ({ ...p, deviations: newDevs }));
    };

    const TAB_BTN_CLS = (isActive: boolean) => `px-4 py-2 text-sm font-bold rounded-t-lg transition-colors flex items-center gap-2 ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`;
    const SELECT_CLS = `w-full h-full ${THEME.BG.INPUT} border ${THEME.BORDER.INPUT} rounded px-3 text-white text-sm focus:outline-none focus:border-blue-500`;
    
    const mainGrades = isPro ? Object.keys(REBAR_GRADES).filter(g => g !== 'SR24') : ['SD30']; 
    const pileOptions = isPro ? [2,3,4,5,6] : [2,3,4]; 
    
    const allGrades = Object.keys(REBAR_GRADES);
    const mainBarSizes = GRADE_PROPERTIES[inputs.mainGrade as SteelGrade]?.sizes || [12,16,20,25];
    const topBarSizes = GRADE_PROPERTIES[inputs.topBarGrade as SteelGrade]?.sizes || [12,16,20,25];
    const stirrupSizes = GRADE_PROPERTIES[inputs.stirrupGrade as SteelGrade]?.sizes || [6,9];

    // Report Styles
    const RPT_TXT = "text-[10px] text-slate-700 leading-tight";
    const RPT_HEAD = "text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded border-b border-slate-200 mb-1";

    const ReportBox = ({ title, steps }: { title: string, steps: string[] }) => (
        <div className="border border-gray-300 rounded p-2 h-full bg-white shadow-sm">
            <h3 className={RPT_HEAD}>{title}</h3>
            <div className="px-2 space-y-0.5">
                {steps.map((line, k) => <div key={k} className={RPT_TXT} dangerouslySetInnerHTML={{__html: line}} />)}
            </div>
        </div>
    );

    return (
        <div className={`max-w-[1600px] mx-auto p-4 md:p-6 min-h-screen ${THEME.BG.MAIN} ${THEME.TEXT.PRIMARY} font-sans print:bg-white print:text-black print:p-0`}>
            {notification && <NotificationToast title="จำกัดเฉพาะรุ่น PRO" message={notification} onClose={() => setNotification(null)} />}
            
            <ToolHeader title={t.title} onBack={onBack} std={std} setStd={handleSetStd} lang={lang} setLang={handleSetLang} isPro={isPro} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
                <div className="lg:col-span-4 space-y-4 print:hidden">
                    {/* MATERIALS */}
                    <div className={`${THEME.BG.PANEL} p-5 rounded-xl border ${THEME.BORDER.DEFAULT}`}>
                        <h3 className={TYPO.SECTION_HEADER}><Layers size={16}/> {t.mat}</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <InputWrapper label="FC' (ksc)"><NumberControl value={inputs.fc} onChange={v => updateInput('fc', v)} step={10} min={180} /></InputWrapper>
                                {/* Lock 1 */}
                                <InputWrapper label="Main Grade" isLocked={!isPro} onLockClick={() => notifyLocked('เหล็กกำลังสูง (SD40+)')}>
                                    <select value={inputs.mainGrade} onChange={e => updateInput('mainGrade', e.target.value)} className={SELECT_CLS}>
                                        {mainGrades.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </InputWrapper>
                            </div>
                            <div className="grid grid-cols-2 gap-3 bg-slate-900/50 p-3 rounded border border-slate-700"><InputWrapper label={t.inputs.barX}><select value={inputs.barDiaX} onChange={e=>updateInput('barDiaX', +e.target.value)} className={SELECT_CLS}>{mainBarSizes.map(d=><option key={d} value={d}>DB{d}</option>)}</select></InputWrapper><InputWrapper label={t.inputs.sx + " (cm)"}><NumberControl value={inputs.spacingX} onChange={v => updateInput('spacingX', v)} step={2.5} min={5} /></InputWrapper></div>
                            <div className="grid grid-cols-2 gap-3 bg-slate-900/50 p-3 rounded border border-slate-700"><InputWrapper label={t.inputs.barY}><select value={inputs.barDiaY} onChange={e=>updateInput('barDiaY', +e.target.value)} className={SELECT_CLS}>{mainBarSizes.map(d=><option key={d} value={d}>DB{d}</option>)}</select></InputWrapper><InputWrapper label={t.inputs.sy + " (cm)"}><NumberControl value={inputs.spacingY} onChange={v => updateInput('spacingY', v)} step={2.5} min={5} /></InputWrapper></div>
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700"><InputWrapper label="Stirrup Grade"><select value={inputs.stirrupGrade} onChange={e => updateInput('stirrupGrade', e.target.value)} className={SELECT_CLS}>{allGrades.map(g => <option key={g} value={g}>{g}</option>)}</select></InputWrapper><InputWrapper label={t.inputs.stirrup + " Size"}><select value={inputs.stirrupDia} onChange={e=>updateInput('stirrupDia', +e.target.value)} className={SELECT_CLS}>{stirrupSizes.map(d=><option key={d} value={d}>{inputs.stirrupGrade.startsWith('SR')?'RB':'DB'}{d}</option>)}</select></InputWrapper></div>
                            <div className="pt-2"><label className="flex items-center gap-3 cursor-pointer bg-slate-800 p-3 rounded-lg border border-slate-700 hover:bg-slate-700 transition"><input type="checkbox" checked={inputs.hasTopBar} onChange={e=>updateInput('hasTopBar', e.target.checked)} className="accent-blue-500 w-5 h-5"/><span className="text-sm font-bold text-slate-200">{t.inputs.topBar}</span></label></div>
                            {inputs.hasTopBar && (<div className="bg-slate-800/80 p-3 rounded border border-blue-900/50 animate-fade-in space-y-3"><div className="flex justify-between items-center border-b border-slate-700 pb-2"><label className="text-xs font-bold text-blue-400">TOP REINFORCEMENT</label><label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={inputs.isTempBar} onChange={e=>updateInput('isTempBar', e.target.checked)} className="accent-yellow-500 w-3 h-3"/><span className="text-[10px] text-yellow-400">Temperature Bar</span></label></div><div className="grid grid-cols-2 gap-3"><InputWrapper label="Grade" isLocked={!isPro} onLockClick={()=>notifyLocked('เหล็กบนกำลังสูง')}><select value={inputs.topBarGrade} onChange={e => updateInput('topBarGrade', e.target.value)} disabled={inputs.isTempBar} className={`${SELECT_CLS} ${inputs.isTempBar ? 'opacity-50 cursor-not-allowed' : ''}`}>{mainGrades.map(g => <option key={g} value={g}>{g}</option>)}</select></InputWrapper><InputWrapper label="Size"><select value={inputs.topBarSize} onChange={e => updateInput('topBarSize', +e.target.value)} disabled={inputs.isTempBar} className={`${SELECT_CLS} ${inputs.isTempBar ? 'opacity-50 cursor-not-allowed' : ''}`}>{topBarSizes.map(d => <option key={d} value={d}>DB{d}</option>)}</select></InputWrapper><div className="col-span-2"><InputWrapper label="@ Spacing (cm)">{inputs.isTempBar ? <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 italic bg-slate-900/50 rounded border border-slate-700">Auto-calculate (Min. Steel)</div> : <NumberControl value={inputs.topBarSpacing} onChange={v => updateInput('topBarSpacing', v)} step={2.5} min={5} />}</InputWrapper></div></div></div>)}
                        </div>
                    </div>

                    {/* GEOMETRY */}
                    <div className={`${THEME.BG.PANEL} p-5 rounded-xl border ${THEME.BORDER.DEFAULT}`}>
                        <h3 className={TYPO.SECTION_HEADER}><Grid size={16}/> {t.geo}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Lock 2 */}
                            <InputWrapper label={t.inputs.num}>
                                <select value={inputs.numPiles} onChange={e=>updateInput('numPiles', +e.target.value)} className={SELECT_CLS}>
                                    {pileOptions.map(n=><option key={n} value={n}>{n}</option>)}
                                </select>
                            </InputWrapper>
                            <InputWrapper label={t.inputs.dia + " (cm)"}><NumberControl value={inputs.pileDia} onChange={v => updateInput('pileDia', v)} step={5} /></InputWrapper>
                            
                            {/* Lock 3 */}
                            <InputWrapper label={t.inputs.spacing} isLocked={!isPro} onLockClick={() => notifyLocked('ปรับระยะห่างเข็ม')}>
                                <NumberControl value={inputs.spacingFactor} onChange={v => updateInput('spacingFactor', v)} step={0.5} min={2.5} />
                            </InputWrapper>
                            <InputWrapper label={t.inputs.edge} isLocked={!isPro} onLockClick={() => notifyLocked('ปรับระยะขอบฐานราก')}>
                                <NumberControl value={inputs.edgeFactor} onChange={v => updateInput('edgeFactor', v)} step={0.5} min={1.0} />
                            </InputWrapper>

                            <InputWrapper label={t.inputs.embed + " (cm)"}><NumberControl value={inputs.pileEmbedment} onChange={v => updateInput('pileEmbedment', v)} step={2.5} min={0} /></InputWrapper>
                            <InputWrapper label={t.inputs.fs}><NumberControl value={inputs.pileFS} onChange={v => updateInput('pileFS', v)} step={0.1} /></InputWrapper>
                            <div className="col-span-2"><InputWrapper label={t.inputs.safe + " (T)"}><NumberControl value={inputs.pileSafeLoad} onChange={v => updateInput('pileSafeLoad', v)} step={5} /></InputWrapper></div>
                            <div className="col-span-2 divider border-t border-slate-700 my-1"></div>
                            <InputWrapper label={t.inputs.cx + " (cm)"}><NumberControl value={inputs.col_x} onChange={v => updateInput('col_x', v)} step={5} /></InputWrapper>
                            <InputWrapper label={t.inputs.cy + " (cm)"}><NumberControl value={inputs.col_y} onChange={v => updateInput('col_y', v)} step={5} /></InputWrapper>
                            <InputWrapper label={t.inputs.thk + " (cm)"}><NumberControl value={inputs.h} onChange={v => updateInput('h', v)} step={5} /></InputWrapper>
                            <InputWrapper label={t.inputs.cov + " (cm)"}><NumberControl value={inputs.covering} onChange={v => updateInput('covering', v)} step={0.5} /></InputWrapper>
                            
                            {/* Lock 4 */}
                            <div className="col-span-2 mt-2 relative group">
                                <label className={`flex items-center gap-2 cursor-pointer bg-slate-900 p-2 rounded border border-slate-700 hover:border-slate-500 transition ${!isPro ? 'opacity-50' : ''}`}>
                                    <input type="checkbox" checked={inputs.isDeepBeamAnalysis} onChange={e=>updateInput('isDeepBeamAnalysis', e.target.checked)} className="accent-green-500 w-4 h-4" disabled={!isPro} />
                                    <span className="text-xs text-slate-300">{t.inputs.deepOption} {!isPro && '(Pro)'}</span>
                                    {!isPro && <Lock size={12} className="text-slate-500 ml-auto"/>}
                                </label>
                                {!isPro && <div className="absolute inset-0 z-20 cursor-pointer" onClick={() => notifyLocked('วิเคราะห์คานลึก (Deep Beam)')} />}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-4 print:col-span-12">
                    {/* ... Loads Panel (Unchanged) ... */}
                    <div className={`${THEME.BG.PANEL} p-5 rounded-xl border ${THEME.BORDER.DEFAULT} print:hidden`}>
                        <h3 className={TYPO.SECTION_HEADER}><Box size={16}/> {t.loads}</h3>
                        <div className="grid grid-cols-4 gap-4 items-end">
                            <InputWrapper label={t.inputs.pu + " (T)"}><NumberControl value={inputs.Pu} onChange={v => updateInput('Pu', v)} step={1} /></InputWrapper>
                            <InputWrapper label={t.inputs.mx + " (T-m)"}><NumberControl value={inputs.Mx} onChange={v => updateInput('Mx', v)} step={0.5} /></InputWrapper>
                            <InputWrapper label={t.inputs.my + " (T-m)"}><NumberControl value={inputs.My} onChange={v => updateInput('My', v)} step={0.5} /></InputWrapper>
                            <div className="h-9 flex items-center justify-center bg-slate-800 rounded border border-slate-700"><label className="flex items-center gap-2 cursor-pointer px-3 w-full h-full"><input type="checkbox" checked={inputs.includeSelfWeight} onChange={e=>updateInput('includeSelfWeight', e.target.checked)} className="accent-blue-500 w-4 h-4"/><span className="text-xs font-bold text-slate-300 truncate">{t.inputs.sw}</span></label></div>
                        </div>
                    </div>

                    <div className="flex gap-2 border-b border-slate-700 pb-2 print:hidden">
                        <button onClick={() => setActiveTab(0)} className={TAB_BTN_CLS(activeTab===0)}><Calculator size={16}/> {t.res}</button>
                        <button onClick={() => setActiveTab(1)} className={TAB_BTN_CLS(activeTab===1)}><FileText size={16}/> Report</button>
                        <button onClick={() => setActiveTab(2)} className={TAB_BTN_CLS(activeTab===2)}><Settings size={16}/> BOQ</button>
                    </div>

                    {activeTab === 0 && (
                        <div className="space-y-6 animate-fade-in block print:hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className={`${THEME.BG.PANEL} p-6 rounded-xl border ${THEME.BORDER.DEFAULT} flex flex-col items-center justify-center`}>
                                    <PileCapSectionView width_X={res.Lx*100} width_Y={res.Ly*100} thickness={inputs.h} col_bx={inputs.col_x} col_by={inputs.col_y} coords={res.reactions} pileDia={inputs.pileDia} barDiaX={inputs.barDiaX} barDiaY={inputs.barDiaY} hasTopBar={inputs.hasTopBar} stirrupDia={inputs.stirrupDia} spacingX={inputs.spacingX} spacingY={inputs.spacingY} covering={inputs.covering} pileEmbedment={inputs.pileEmbedment} />
                                    <div className="mt-4 text-center"><div className={`text-2xl font-bold ${res.status === 'PASS' ? 'text-green-500' : 'text-red-500'}`}>STATUS: {res.status}</div><p className="text-xs text-slate-500 mt-1">Size: {res.Lx.toFixed(2)} x {res.Ly.toFixed(2)} x {(inputs.h/100).toFixed(2)} m</p></div>
                                </div>
                                <div className="space-y-4">
                                    <div className={`${THEME.BG.PANEL} border ${THEME.BORDER.DEFAULT} rounded-xl overflow-hidden`}>
                                        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 font-bold text-sm text-slate-300">Pile Reactions</div>
                                        <div className="max-h-[150px] overflow-auto"><table className="w-full text-sm text-left text-slate-300"><thead className="bg-slate-800 text-xs"><tr><th className="p-2 pl-4">ID</th><th className="p-2 text-right">R (Tons)</th><th className="p-2 text-center">Status</th></tr></thead><tbody className="divide-y divide-slate-800">{res.reactions.map(r => (<tr key={r.id} className={r.status==='FAIL' ? 'bg-red-900/20' : ''}><td className="p-2 pl-4 font-bold">P{r.id}</td><td className="p-2 text-right font-mono">{r.R.toFixed(2)}</td><td className={`p-2 text-center font-bold ${r.status==='PASS'?'text-green-400':'text-red-400'}`}>{r.status}</td></tr>))}</tbody></table></div>
                                    </div>
                                    <div className={`${THEME.BG.PANEL} p-4 rounded-xl border ${THEME.BORDER.DEFAULT} text-sm space-y-2`}>
                                        <div className="flex justify-between border-b border-slate-700 pb-1"><span>{t.report.chkPunch}</span><span className={res.punching.status==='PASS'?'text-green-400':'text-red-400'}>{res.punching.status} (Ratio: {res.punching.ratio.toFixed(2)})</span></div>
                                        <div className="flex justify-between border-b border-slate-700 pb-1"><span>{t.report.chkFlexX}</span><span className={res.designX.statusMoment==='PASS'?'text-green-400':'text-red-400'}>{res.designX.statusMoment}</span></div>
                                        <div className="flex justify-between border-b border-slate-700 pb-1"><span>{t.report.chkShearX}</span><span className={res.designX.statusShear==='PASS'?'text-green-400':'text-red-400'}>{res.designX.statusShear}</span></div>
                                        <div className="flex justify-between border-b border-slate-700 pb-1"><span>{t.report.chkFlexY}</span><span className={res.designY.statusMoment==='PASS'?'text-green-400':'text-red-400'}>{res.designY.statusMoment}</span></div>
                                        <div className="flex justify-between border-b border-slate-700 pb-1"><span>{t.report.chkShearY}</span><span className={res.designY.statusShear==='PASS'?'text-green-400':'text-red-400'}>{res.designY.statusShear}</span></div>
                                    </div>
                                    <div className={`${THEME.BG.PANEL} p-5 rounded-xl border ${THEME.BORDER.DEFAULT}`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className={TYPO.SECTION_HEADER}><AlertTriangle size={16}/> Deviation</h3>
                                            <div className="flex items-center gap-1">
                                                {/* Lock Auto-Expand */}
                                                <div className="relative group">
                                                    <label className={`flex items-center gap-1 ${!isPro ? 'opacity-50' : ''}`}>
                                                        <input type="checkbox" checked={inputs.autoExpand} onChange={e=>updateInput('autoExpand', e.target.checked)} className="w-3 h-3 accent-blue-500" disabled={!isPro}/>
                                                        <span className="text-[10px] text-slate-400">{t.inputs.expand}</span>
                                                        {!isPro && <Lock size={8} className="text-slate-500"/>}
                                                    </label>
                                                    {!isPro && <div className="absolute inset-0 z-20 cursor-pointer" onClick={() => notifyLocked('ขยายฐานอัตโนมัติ')} />}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="max-h-[150px] overflow-auto custom-scrollbar relative">
                                            {/* Table Overlay Lock */}
                                            {!isPro && <div className="absolute inset-0 z-20 bg-slate-900/10 cursor-pointer" onClick={() => notifyLocked('การกำหนดค่าเยื้องศูนย์ (Deviation)')} />}
                                            <table className={`w-full text-xs text-left text-slate-300 ${!isPro ? 'opacity-50' : ''}`}>
                                                <thead className="bg-slate-900 sticky top-0"><tr><th className="p-2">Pile</th><th className="p-2">dx</th><th className="p-2">dy</th></tr></thead>
                                                <tbody className="divide-y divide-slate-700">
                                                    {inputs.deviations.map((dev, i) => (
                                                        <tr key={i}>
                                                            <td className="p-2 text-center font-bold text-blue-400">P{i+1}</td>
                                                            <td className="p-1"><input type="number" value={dev.dx} onChange={e=>updateDeviation(i, 'dx', +e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-center text-white" disabled={!isPro}/></td>
                                                            <td className="p-1"><input type="number" value={dev.dy} onChange={e=>updateDeviation(i, 'dy', +e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-center text-white" disabled={!isPro}/></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 1 && (
                        <ReportTemplate title={t.title} subtitle={`Standard: ${std} | Method: Rigid`} onPrint={() => isPro ? window.print() : notifyLocked('พิมพ์รายงาน')}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-7 flex items-center justify-center border border-gray-300 p-2 rounded bg-white">
                                        <div className="scale-60 origin-center">
                                            <PileCapSectionView width_X={res.Lx*100} width_Y={res.Ly*100} thickness={inputs.h} col_bx={inputs.col_x} col_by={inputs.col_y} coords={res.reactions} pileDia={inputs.pileDia} barDiaX={inputs.barDiaX} barDiaY={inputs.barDiaY} hasTopBar={inputs.hasTopBar} stirrupDia={inputs.stirrupDia} spacingX={inputs.spacingX} spacingY={inputs.spacingY} covering={inputs.covering} pileEmbedment={inputs.pileEmbedment} isReport={true} />
                                        </div>
                                    </div>

                                    <div className="col-span-5 space-y-2">
                                        <div className="border border-gray-300 p-2 rounded bg-white">
                                            <h3 className={RPT_HEAD}>{t.report.step1}</h3>
                                            <div className="space-y-1">
                                                <div className={RPT_TXT}><b>Conc:</b> {inputs.fc} ksc | <b>Steel:</b> {inputs.fy} ksc</div>
                                                <div className={RPT_TXT}><b>Col:</b> {inputs.col_x}x{inputs.col_y} cm</div>
                                                <div className={RPT_TXT}><b>Cap:</b> {res.Lx.toFixed(2)}x{res.Ly.toFixed(2)}x{inputs.h/100}m</div>
                                                <div className={RPT_TXT}><b>Pile:</b> {inputs.numPiles}xØ{inputs.pileDia} | <b>Safe:</b> {inputs.pileSafeLoad} T</div>
                                                <div className={RPT_TXT}><b>Load:</b> Pu={inputs.Pu} T, Mx={inputs.Mx}, My={inputs.My}</div>
                                            </div>
                                        </div>
                                        <div className="border border-gray-300 p-2 rounded bg-white">
                                            <h3 className={RPT_HEAD}>Reactions</h3>
                                            <div className="space-y-1">
                                                {res.reactions.map(r => (
                                                    <div key={r.id} className={`${RPT_TXT} flex justify-between`}>
                                                        <span>P{r.id}:</span>
                                                        <span className={r.status==='FAIL'?'text-red-600 font-bold':''}>{r.R.toFixed(2)} T</span>
                                                    </div>
                                                ))}
                                                <div className="border-t pt-1 mt-1 text-[9px] text-gray-500">Max Allow: {res.pileCapacityUlt} T</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <ReportBox title={`X-Axis (${res.designX.mode})`} steps={res.designX.steps} />
                                    <ReportBox title={`Y-Axis (${res.designY.mode})`} steps={res.designY.steps} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <ReportBox title={t.report.step5} steps={res.punching.steps} />
                                    <div className="border border-gray-300 rounded p-2 bg-white flex flex-col justify-between">
                                        <div>
                                            <h3 className={RPT_HEAD}>Summary</h3>
                                            <div className={`grid grid-cols-2 gap-2 ${RPT_TXT}`}>
                                                <div><div className="font-bold">Concrete:</div><div>{res.volConcrete.toFixed(2)} m³</div></div>
                                                <div><div className="font-bold">Steel:</div><div>{res.weightSteel.toFixed(1)} kg</div></div>
                                            </div>
                                        </div>
                                        <div className="mt-2 pt-2 border-t text-center">
                                            <div className="font-bold text-xl">STATUS: <span className={res.status==='PASS'?'text-green-600':'text-red-600'}>{res.status}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ReportTemplate>
                    )}

                    {activeTab === 2 && (
                        <div className={`${THEME.BG.PANEL} p-6 rounded-xl border ${THEME.BORDER.DEFAULT} animate-fade-in block print:hidden`}>
                            <h3 className={TYPO.SECTION_HEADER}><Calculator size={18}/> Bill of Quantities</h3>
                            <table className="w-full text-sm text-left text-slate-300">
                                <thead className="bg-slate-900 text-white text-base"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Unit Price</th><th className="p-3 text-right">Total Cost</th></tr></thead>
                                <tbody className="divide-y divide-slate-800 text-sm">
                                    <tr><td className="p-3">Concrete</td><td className="p-3 text-right">{res.volConcrete.toFixed(2)} m³</td><td className="p-3 text-right">{MATERIAL_COSTS.CONCRETE_M3.toLocaleString()}</td><td className="p-3 text-right">{(res.volConcrete*MATERIAL_COSTS.CONCRETE_M3).toLocaleString()}</td></tr>
                                    <tr><td className="p-3">Rebar</td><td className="p-3 text-right">{res.weightSteel.toFixed(1)} kg</td><td className="p-3 text-right">{MATERIAL_COSTS.REBAR_KG}</td><td className="p-3 text-right">{(res.weightSteel*MATERIAL_COSTS.REBAR_KG).toLocaleString()}</td></tr>
                                    <tr><td className="p-3">Formwork</td><td className="p-3 text-right">{res.areaForm.toFixed(1)} m²</td><td className="p-3 text-right">{MATERIAL_COSTS.FORMWORK_M2}</td><td className="p-3 text-right">{(res.areaForm*MATERIAL_COSTS.FORMWORK_M2).toLocaleString()}</td></tr>
                                    <tr className="bg-slate-800 font-bold text-white"><td className="p-3" colSpan={3}>Grand Total</td><td className="p-3 text-right">{res.estCost.toLocaleString()} THB</td></tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PileCapDesignTool;