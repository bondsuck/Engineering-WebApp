import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Eye, Plus, Minus, AlertCircle, X, FileText } from 'lucide-react';
import { BeamInput } from '../types';
import { GRADE_PROPERTIES, UI_TEXT, TYPO, THEME, FREE_USER_CONFIG } from '../constants';
import { calculateBeamDesign } from '../utils/rcBeamCalculation';
import { BeamSectionView } from '../components/BeamSectionView';
import { ToolHeader } from '../components/common/ToolHeader';
import { ReportTemplate } from '../components/common/ReportTemplate';
import { Standard, Language, SteelGrade } from '../types';

interface RCBeamDesignToolProps { isPro: boolean; onBack: () => void; }

const NotificationToast = ({ title, message, onClose }: { title: string, message: string, onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl border border-yellow-500/50 flex items-center gap-3 animate-bounce-up z-[9999]">
            <AlertCircle className="text-yellow-500 min-w-[24px]" size={24} />
            <div>
                <h4 className="font-bold text-yellow-500 text-sm uppercase">{title}</h4>
                <p className="text-xs text-slate-300 mt-1">{message}</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white ml-2"><X size={16}/></button>
        </div>
    );
};

const NumberControl = ({ label, name, value, step, onChange }: any) => {
    const handleStep = (direction: 1 | -1) => {
        let newVal = parseFloat((value + (step * direction)).toFixed(2));
        if (newVal < 0) newVal = 0;
        onChange({ target: { name, value: newVal } });
    };
    return (
        <div>
            <label className={TYPO.LABEL}>{label}</label>
            <div className={`flex items-center ${THEME.BG.INPUT} border ${THEME.BORDER.INPUT} rounded w-full overflow-hidden`}>
                <button onClick={() => handleStep(-1)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"><Minus size={14}/></button>
                <input type="number" name={name} value={value} onChange={onChange} className="bg-transparent border-none w-full text-center p-1 text-white text-sm focus:outline-none appearance-none" />
                <button onClick={() => handleStep(1)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"><Plus size={14}/></button>
            </div>
        </div>
    );
};

const RCBeamDesignTool = ({ isPro, onBack }: RCBeamDesignToolProps) => {
    const [viewMode, setViewMode] = useState<'design' | 'report'>('design');
    const [standard, setStandard] = useState<Standard>('ACI318-19');
    const [lang, setLang] = useState<Language>(isPro ? 'th' : 'en');
    const [notification, setNotification] = useState<string | null>(null);

    const [inputs, setInputs] = useState<BeamInput>({
        fc: 240, mainBarGrade: isPro ? 'SD40' : 'SD30', stirrupGrade: 'SR24',
        bw: 25, h: 50, covering: 3, Mu_pos: 8000, Mu_neg: 6000, Vu: 4500, Tu: 200,
        topBarSize: 16, botBarSize: 16, stirrupSize: 9, 
        providedTopBars: 0, providedBotBars: 0, providedStirrupSpacing: 0, isManual: false
    });

    // ✅ Logic Check 1: Force Reset (เพิ่ม setStandard ACI)
    useEffect(() => {
        if (!isPro) {
            setLang('en');
            setStandard('ACI318-19'); // ✅ Force ACI for Demo
            setInputs(prev => ({ 
                ...prev, 
                mainBarGrade: FREE_USER_CONFIG.ALLOWED_MAIN_GRADES[0], 
                stirrupGrade: FREE_USER_CONFIG.ALLOWED_STIRRUP_GRADES[0], 
                isManual: false 
            }));
        }
    }, [isPro]);

    const results = useMemo(() => calculateBeamDesign(inputs, standard, lang), [inputs, standard, lang]);
    const t = UI_TEXT[lang];

    const notifyLocked = (feature: string) => {
        setNotification(`กรุณาอัปเกรดเป็น PRO เพื่อใช้งาน: ${feature}`);
    };

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        if (!isPro) {
            if (name === 'mainBarGrade' && !FREE_USER_CONFIG.ALLOWED_MAIN_GRADES.includes(value)) { 
                notifyLocked('เหล็กกำลังสูง (High Strength Steel)'); 
                return; 
            }
            if (name === 'stirrupGrade' && !FREE_USER_CONFIG.ALLOWED_STIRRUP_GRADES.includes(value)) { 
                notifyLocked('เหล็กปลอกกำลังสูง (High Strength Stirrup)'); 
                return; 
            }
        }
        const numVal = parseFloat(value);
        if (name.startsWith('provided')) setInputs(prev => ({ ...prev, [name]: isNaN(numVal) ? 0 : numVal }));
        else setInputs(prev => ({ ...prev, [name]: isNaN(numVal) ? value : numVal }));
    };

    const toggleAuto = () => {
        if (!isPro) { 
            notifyLocked('โหมดกำหนดเอง (Manual Mode)'); 
            return; 
        }
        setInputs(prev => ({ 
            ...prev, isManual: !prev.isManual,
            providedBotBars: !prev.isManual ? results.actualNumBarsBot : prev.providedBotBars, 
            providedTopBars: !prev.isManual ? results.actualNumBarsTop : prev.providedTopBars,
            providedStirrupSpacing: !prev.isManual ? results.actualStirrupSpacing : prev.providedStirrupSpacing
        }));
    };

    // ✅ Secure Language Switching
    const handleSetLang = (l: Language) => {
        if (!isPro && l === 'th') {
            notifyLocked('ภาษาไทย (Thai Language)');
            return;
        }
        setLang(l);
    };

    // ✅ Secure Standard Switching (New Added)
    const handleSetStd = (s: Standard) => {
        if (!isPro && s === 'EIT-Thai') {
            notifyLocked('มาตรฐาน วสท. (EIT Standard)');
            return;
        }
        setStandard(s);
    };

    const renderDetailingControl = (name: string, manualValue: number, autoValue: number, isStirrup = false) => {
        if (inputs.isManual) {
            if (isStirrup) {
                return (
                    <div className="flex items-center justify-between px-2 w-full">
                        <button onClick={() => handleInputChange({ target: { name, value: manualValue - 2.5 < 0 ? 0 : manualValue - 2.5 }})}><Minus size={12} className="text-slate-500"/></button>
                        <input type="number" name={name} value={manualValue} onChange={handleInputChange} className={TYPO.INPUT_LARGE} />
                        <button onClick={() => handleInputChange({ target: { name, value: manualValue + 2.5 }})}><Plus size={12} className="text-slate-500"/></button>
                    </div>
                );
            }
            return <input type="number" name={name} value={manualValue} onChange={handleInputChange} className={TYPO.INPUT_LARGE} />;
        }
        return <span className={TYPO.INPUT_LARGE}>{autoValue}</span>;
    };

    return (
        <div className={`relative font-sans text-slate-100 ${THEME.BG.MAIN} min-h-screen`}>
             {notification && (
                <NotificationToast 
                    title="สิทธิพิเศษสำหรับสมาชิก PRO" 
                    message={notification} 
                    onClose={() => setNotification(null)} 
                />
             )}

             {viewMode === 'report' ? (
                <ReportTemplate 
                    title={t.beam.title} 
                    subtitle={`Standard: ${standard} | Method: USD`} 
                    onPrint={() => isPro ? window.print() : notifyLocked('พิมพ์รายงาน (Printing)')}
                >
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-5">
                            <h2 className={TYPO.RPT_SECTION}>{t.common.parameters}</h2>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
                                <div><span className={TYPO.RPT_LABEL}>{t.beam.fc}:</span> <span className={TYPO.RPT_VALUE}>{inputs.fc} ksc</span></div>
                                <div><span className={TYPO.RPT_LABEL}>Fy:</span> <span className={TYPO.RPT_VALUE}>{results.fy_main} ksc</span></div>
                                <div><span className={TYPO.RPT_LABEL}>{t.beam.width}:</span> <span className={TYPO.RPT_VALUE}>{inputs.bw} cm</span></div>
                                <div><span className={TYPO.RPT_LABEL}>{t.beam.depth}:</span> <span className={TYPO.RPT_VALUE}>{inputs.h} cm</span></div>
                                <div><span className={TYPO.RPT_LABEL}>{t.beam.cover}:</span> <span className={TYPO.RPT_VALUE}>{inputs.covering} cm</span></div>
                            </div>

                            <h2 className={TYPO.RPT_SECTION}>{t.common.summary}</h2>
                            <table className="w-full text-left mt-2 border-collapse">
                                <thead className="border-b border-slate-300">
                                    <tr>
                                        <th className="py-1 text-[9px] font-bold text-slate-500 uppercase">Item</th>
                                        <th className="py-1 text-[9px] font-bold text-slate-500 uppercase text-right">Req.</th>
                                        <th className="py-1 text-[9px] font-bold text-slate-500 uppercase text-right">Prov.</th>
                                        <th className="py-1 text-[9px] font-bold text-slate-500 uppercase text-center">Chk</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px] font-mono text-slate-800">
                                    <tr className="border-b border-slate-100">
                                        <td className="py-1 font-bold">Bot</td>
                                        <td className="py-1 text-right">{results.Total_As_bot_req.toFixed(2)} cm²</td>
                                        <td className="py-1 text-right">{results.actualNumBarsBot}-DB{inputs.botBarSize}</td>
                                        <td className="py-1 text-center"><span className={results.statusBot==='pass'?TYPO.STATUS.PASS_RPT:TYPO.STATUS.FAIL_RPT}>{results.statusBot.toUpperCase()}</span></td>
                                    </tr>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-1 font-bold">Top</td>
                                        <td className="py-1 text-right">{results.Total_As_top_req.toFixed(2)} cm²</td>
                                        <td className="py-1 text-right">{results.actualNumBarsTop}-DB{inputs.topBarSize}</td>
                                        <td className="py-1 text-center"><span className={results.statusTop==='pass'?TYPO.STATUS.PASS_RPT:TYPO.STATUS.FAIL_RPT}>{results.statusTop.toUpperCase()}</span></td>
                                    </tr>
                                    <tr>
                                        <td className="py-1 font-bold">Shear</td>
                                        <td className="py-1 text-right">{results.Total_Av_s_req.toFixed(3)} cm²/cm</td>
                                        <td className="py-1 text-right">@{results.actualStirrupSpacing} cm</td>
                                        <td className="py-1 text-center"><span className={results.statusShear==='pass'?TYPO.STATUS.PASS_RPT:TYPO.STATUS.FAIL_RPT}>{results.statusShear.toUpperCase()}</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="col-span-7 flex justify-center items-start pt-4">
                            <div className="border border-slate-200 p-2 rounded w-full flex justify-center bg-slate-50/50">
                                <BeamSectionView b={inputs.bw} h={inputs.h} cover={inputs.covering} topBarDia={inputs.topBarSize} topBarType={GRADE_PROPERTIES[inputs.mainBarGrade as SteelGrade].type} botBarDia={inputs.botBarSize} botBarType={GRADE_PROPERTIES[inputs.mainBarGrade as SteelGrade].type} stirrupDia={inputs.stirrupSize} stirrupType={GRADE_PROPERTIES[inputs.stirrupGrade as SteelGrade].type} numBarsBot={inputs.isManual ? inputs.providedBotBars : results.actualNumBarsBot} numBarsTop={inputs.isManual ? inputs.providedTopBars : results.actualNumBarsTop} stirrupSpacing={inputs.isManual ? inputs.providedStirrupSpacing : results.actualStirrupSpacing} barsPerLayerBot={results.bot.layers.barsPerLayer} barsPerLayerTop={results.top.layers.barsPerLayer} isReport={true} />
                            </div>
                        </div>

                        <div className="col-span-12">
                            <h2 className={TYPO.RPT_SECTION}>{t.common.details}</h2>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                {results.reportSteps.map((step, i) => (
                                    <div key={i} className="border border-slate-200 p-2 rounded bg-slate-50/30 break-inside-avoid">
                                        <h3 className="font-bold text-blue-800 text-[10px] mb-1 border-b border-slate-200 pb-0.5">{step.title}</h3>
                                        <div className="space-y-0.5">
                                            {step.content.map((line, k) => (
                                                <div key={k} className={TYPO.RPT_TEXT} dangerouslySetInnerHTML={{__html: line}} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-center print:hidden">
                        <button onClick={() => setViewMode('design')} className="px-6 py-2 bg-slate-200 text-slate-700 rounded font-bold hover:bg-slate-300 transition-colors">{t.common.back}</button>
                    </div>
                </ReportTemplate>
             ) : (
                <div className="max-w-[1400px] mx-auto p-4 md:p-6">
                    <ToolHeader 
                        title={t.beam.title} 
                        onBack={onBack} 
                        std={standard} 
                        setStd={handleSetStd} // ✅ Use Locked Handler
                        lang={lang} 
                        setLang={handleSetLang} // ✅ Use Locked Handler
                        isPro={isPro} 
                    />

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                        <div className="xl:col-span-3 space-y-4">
                            <div className={`${THEME.BG.PANEL} p-5 rounded-xl border ${THEME.BORDER.DEFAULT}`}>
                                <h3 className={TYPO.SECTION_HEADER}><Settings size={18}/> {t.common.parameters}</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className={TYPO.LABEL}>{t.beam.mainBar}</label>
                                        <select name="mainBarGrade" value={inputs.mainBarGrade} onChange={handleInputChange} className={TYPO.INPUT}>{(Object.keys(GRADE_PROPERTIES) as SteelGrade[]).map(g => <option key={g} value={g}>{g}</option>)}</select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className={TYPO.LABEL}>{t.beam.topDB}</label><select name="topBarSize" value={inputs.topBarSize} onChange={handleInputChange} className={TYPO.INPUT}>{GRADE_PROPERTIES[inputs.mainBarGrade as SteelGrade].sizes.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                        <div><label className={TYPO.LABEL}>{t.beam.botDB}</label><select name="botBarSize" value={inputs.botBarSize} onChange={handleInputChange} className={TYPO.INPUT}>{GRADE_PROPERTIES[inputs.mainBarGrade as SteelGrade].sizes.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                    </div>
                                    <div><label className={TYPO.LABEL}>{t.beam.stirrup}</label><div className="flex gap-2"><select name="stirrupGrade" value={inputs.stirrupGrade} onChange={handleInputChange} className={TYPO.INPUT}>{(Object.keys(GRADE_PROPERTIES) as SteelGrade[]).map(g => <option key={g} value={g}>{g}</option>)}</select><select name="stirrupSize" value={inputs.stirrupSize} onChange={handleInputChange} className={TYPO.INPUT}>{GRADE_PROPERTIES[inputs.stirrupGrade as SteelGrade].sizes.map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <NumberControl label={`${t.beam.width} (cm)`} name="bw" value={inputs.bw} step={5} onChange={handleInputChange} />
                                        <NumberControl label={`${t.beam.depth} (cm)`} name="h" value={inputs.h} step={5} onChange={handleInputChange} />
                                        <NumberControl label={`${t.beam.fc} (ksc)`} name="fc" value={inputs.fc} step={10} onChange={handleInputChange} />
                                        <NumberControl label={`${t.beam.cover} (cm)`} name="covering" value={inputs.covering} step={0.5} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>
                            <div className={`${THEME.BG.PANEL} p-5 rounded-xl border ${THEME.BORDER.DEFAULT}`}>
                                <h3 className={TYPO.SECTION_HEADER}>{t.common.loads}</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className={TYPO.LABEL}>Mu+ (kg-m)</label><input name="Mu_pos" value={inputs.Mu_pos} onChange={handleInputChange} className={TYPO.INPUT} type="number"/></div>
                                    <div><label className={TYPO.LABEL}>Mu- (kg-m)</label><input name="Mu_neg" value={inputs.Mu_neg} onChange={handleInputChange} className={TYPO.INPUT} type="number"/></div>
                                    <div><label className={TYPO.LABEL}>Vu (kg)</label><input name="Vu" value={inputs.Vu} onChange={handleInputChange} className={TYPO.INPUT} type="number"/></div>
                                    <div><label className={TYPO.LABEL}>Tu (kg-m)</label><input name="Tu" value={inputs.Tu} onChange={handleInputChange} className={TYPO.INPUT} type="number"/></div>
                                </div>
                            </div>
                        </div>

                        <div className="xl:col-span-5">
                            <div className={`${THEME.BG.PANEL} p-6 rounded-xl border ${THEME.BORDER.DEFAULT} h-full flex flex-col items-center justify-center min-h-[500px]`}>
                                <h3 className={TYPO.SECTION_HEADER}><Eye size={18}/> Section Preview</h3>
                                <BeamSectionView b={inputs.bw} h={inputs.h} cover={inputs.covering} topBarDia={inputs.topBarSize} topBarType={GRADE_PROPERTIES[inputs.mainBarGrade as SteelGrade].type} botBarDia={inputs.botBarSize} botBarType={GRADE_PROPERTIES[inputs.mainBarGrade as SteelGrade].type} stirrupDia={inputs.stirrupSize} stirrupType={GRADE_PROPERTIES[inputs.stirrupGrade as SteelGrade].type} numBarsBot={inputs.isManual ? inputs.providedBotBars : results.actualNumBarsBot} numBarsTop={inputs.isManual ? inputs.providedTopBars : results.actualNumBarsTop} stirrupSpacing={inputs.isManual ? inputs.providedStirrupSpacing : results.actualStirrupSpacing} barsPerLayerBot={results.bot.layers.barsPerLayer} barsPerLayerTop={results.top.layers.barsPerLayer} />
                            </div>
                        </div>

                        <div className="xl:col-span-4 space-y-4">
                            <div className={`${THEME.BG.PANEL} p-6 rounded-xl border ${THEME.BORDER.DEFAULT} h-full flex flex-col`}>
                                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
                                    <h3 className="text-lg font-bold text-yellow-500 uppercase italic">{t.beam.detailing}</h3>
                                    <button onClick={toggleAuto} className={`px-3 py-1 rounded text-xs font-bold uppercase border ${!inputs.isManual ? 'text-green-400 border-green-600 bg-green-900/30' : 'text-orange-400 border-orange-600 bg-orange-900/30'}`}>{!inputs.isManual ? t.common.auto : t.common.manual}</button>
                                </div>
                                <div className="space-y-8 flex-1">
                                    <div>
                                        <p className={TYPO.LABEL}>{t.beam.topSteel}</p>
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="bg-[#0B1120] border border-slate-700 rounded-lg w-24 h-12 flex items-center justify-center">{renderDetailingControl('providedTopBars', inputs.providedTopBars, results.actualNumBarsTop)}</div>
                                            <span className="text-xl font-bold text-red-500">- {GRADE_PROPERTIES[inputs.mainBarGrade as SteelGrade].type}{inputs.topBarSize}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-400 bg-[#0B1120] p-2 rounded">
                                            <div>REQ: <span className="text-white font-bold">{results.Total_As_top_req.toFixed(2)}</span></div>
                                            <div>PROV: <span className="text-blue-400 font-bold">{results.As_top_prov.toFixed(2)}</span></div>
                                            <div><span className={results.statusTop === 'pass' ? TYPO.STATUS.PASS : TYPO.STATUS.FAIL}>{results.statusTop.toUpperCase()}</span></div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className={TYPO.LABEL}>{t.beam.botSteel}</p>
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="bg-[#0B1120] border border-slate-700 rounded-lg w-24 h-12 flex items-center justify-center">{renderDetailingControl('providedBotBars', inputs.providedBotBars, results.actualNumBarsBot)}</div>
                                            <span className="text-xl font-bold text-green-500">- {GRADE_PROPERTIES[inputs.mainBarGrade as SteelGrade].type}{inputs.botBarSize}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-400 bg-[#0B1120] p-2 rounded">
                                            <div>REQ: <span className="text-white font-bold">{results.Total_As_bot_req.toFixed(2)}</span></div>
                                            <div>PROV: <span className="text-blue-400 font-bold">{results.As_bot_prov.toFixed(2)}</span></div>
                                            <div><span className={results.statusBot === 'pass' ? TYPO.STATUS.PASS : TYPO.STATUS.FAIL}>{results.statusBot.toUpperCase()}</span></div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className={TYPO.LABEL}>{t.beam.stirrupSpace}</p>
                                        <div className="flex items-center gap-4 mb-2">
                                            <span className="text-xl font-bold text-yellow-500">{GRADE_PROPERTIES[inputs.stirrupGrade as SteelGrade].type}{inputs.stirrupSize} @</span>
                                            <div className="bg-[#0B1120] border border-slate-700 rounded-lg w-32 h-12 flex items-center justify-center">{renderDetailingControl('providedStirrupSpacing', inputs.providedStirrupSpacing, results.actualStirrupSpacing, true)}</div>
                                            <span className="text-sm font-bold text-slate-500">cm</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-400 bg-[#0B1120] p-2 rounded">
                                            <div>REQ: <span className="text-white font-bold">{results.Total_Av_s_req.toFixed(3)}</span></div>
                                            <div>PROV: <span className="text-blue-400 font-bold">{results.Av_s_prov.toFixed(3)}</span></div>
                                            <div><span className={results.statusShear === 'pass' ? TYPO.STATUS.PASS : TYPO.STATUS.FAIL}>{results.statusShear.toUpperCase()}</span></div>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setViewMode('report')} className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"><FileText size={18}/> {t.common.generateReport}</button>
                            </div>
                        </div>
                    </div>
                </div>
             )}
        </div>
    );
};

export default RCBeamDesignTool;