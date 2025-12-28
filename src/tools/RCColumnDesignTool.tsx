import { useState, useMemo, useEffect } from 'react';
import { Settings, Layers, Box, Square, Calculator, Target, Eye, Activity, FileText, Plus, Trash2, AlertCircle, X } from 'lucide-react';
import { ColumnInput, calculateColumnDesign, calculateBasePlate, calculateShearStuds } from '../utils/rcColumnCalculation';
import { H_BEAM_STD, CONSTANTS, UI_TEXT, GRADE_PROPERTIES, MATERIAL_COSTS, TYPO, THEME, REBAR_GRADES, STRUCTURAL_STEEL_GRADES } from '../constants';
import ColumnSectionView from '../components/ColumnSectionView';
import { ToolHeader } from '../components/common/ToolHeader';
import { ReportTemplate } from '../components/common/ReportTemplate';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ZAxis } from 'recharts';
import { Standard, Language, SteelGrade } from '../types';

interface Props { onBack: () => void; isPro?: boolean; }
interface LoadCase { id: string; Pu: number; Mx_top: number; Mx_bot: number; My_top: number; My_bot: number; Vx: number; Vy: number; curvature: 'single' | 'double'; }

// ✅ Notification Component (เหมือนของ Beam)
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

const CustomScatterShape = (props: any) => {
    const { cx, cy, payload } = props;
    if (isNaN(cx) || isNaN(cy)) return null;
    return payload.status === 'fail' 
        ? <path d={`M${cx-4},${cy-4}L${cx+4},${cy+4}M${cx+4},${cy-4}L${cx-4},${cy+4}`} stroke={THEME.COLORS.FAIL} strokeWidth="2" />
        : <circle cx={cx} cy={cy} r={4} fill={THEME.COLORS.PASS} />;
};

const RCColumnDesignTool = ({ onBack, isPro = false }: Props) => {
    const [lang, setLang] = useState<Language>('th');
    const [std, setStd] = useState<Standard>('EIT-Thai');
    const [activeTab, setActiveTab] = useState(0); 
    const [considerSlenderness, setConsiderSlenderness] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);

    const [inputs, setInputs] = useState<ColumnInput>({
        bx: 50, by: 50, L: 3.5, fc: 240, covering: 3.0,
        mainBarGrade: 'SD40', mainBarSize: 12, nx: 4, ny: 3, 
        stirrupGrade: 'SR24', stirrupSize: 6, stirrupSpacing: 15,
        steelSectionKey: 'None', steelGrade: 'SS400',
        kx: 1.0, ky: 1.0, braced: false,
        standard: std,
        considerSlenderness: false, 
        loads: [ { id: 'L1', Pu: 50, Mx_top: 5, Mx_bot: 0, My_top: 2, My_bot: 0, Vx: 2, Vy: 1, curvature: 'single' } ]
    });

    const [bp, setBp] = useState({ B: 60, N: 60, fc: 240, fy: 2400 });
    const [stud, setStud] = useState({ dia: 19, fu: 4500 });

    const mainBarProp = GRADE_PROPERTIES[inputs.mainBarGrade as SteelGrade] || { type: 'DB', sizes: [] };
    const stirrupProp = GRADE_PROPERTIES[inputs.stirrupGrade as SteelGrade] || { type: 'RB', sizes: [] };
    
    // ✅ Logic Check: Force Reset when downgraded
    useEffect(() => {
        if (!isPro) {
            setLang('en');
            setStd('ACI318-19');
            setConsiderSlenderness(false);
            setInputs(p => ({ 
                ...p, 
                mainBarGrade: ['SD40', 'SD50'].includes(p.mainBarGrade) ? 'SD30' : p.mainBarGrade,
                stirrupGrade: p.stirrupGrade !== 'SR24' ? 'SR24' : p.stirrupGrade,
                steelSectionKey: 'None',
                loads: p.loads.slice(0, 5) // Limit to 5 cases
            }));
        }
    }, [isPro]);

    // ✅ Sync inputs.standard with state std
    useEffect(() => { setInputs(p => ({ ...p, standard: std })); }, [std]);

    const calcInputs = useMemo(() => ({ ...inputs, standard: std, considerSlenderness }), [inputs, std, considerSlenderness]);
    const res = useMemo(() => inputs.loads.length > 0 ? calculateColumnDesign(calcInputs, lang) : null, [calcInputs, lang]);
    
    const t = UI_TEXT[lang]?.rcColumn?.inputs || UI_TEXT['en'].rcColumn.inputs;
    const t_global = UI_TEXT[lang]?.rcColumn || UI_TEXT['en'].rcColumn;

    const chartData = useMemo(() => {
        if (!res) return { mxLoop:[], myLoop:[], loadPoints:[], limitCircle:[], ratioPoints:[] };
        const createLoopData = (curve: {M:number, P:number}[]) => [...curve.map(p => ({ x: p.M, y: p.P })), ...[...curve].reverse().map(p => ({ x: -p.M, y: p.P }))];
        const loadPoints = res.results.map((r, i) => {
            const load = inputs.loads[i];
            if (!load) return null;
            return { x: r.Mc_x * (load.Mx_top<0?-1:1), y: load.Pu, status: r.status, id: r.id };
        }).filter(Boolean);
        const limitCircle = [];
        for (let i = 0; i <= 360; i += 5) {
            const rad = i * Math.PI / 180;
            limitCircle.push({ x: Math.sign(Math.cos(rad))*Math.pow(Math.abs(Math.cos(rad)), 2/CONSTANTS.BRESLER_ALPHA), y: Math.sign(Math.sin(rad))*Math.pow(Math.abs(Math.sin(rad)), 2/CONSTANTS.BRESLER_ALPHA) });
        }
        const ratioPoints = res.results.map((r, i) => {
            const load = inputs.loads[i];
            if (!load) return null;
            return { id: r.id, x: (r.Mcap_x>0 ? r.Mc_x/r.Mcap_x : 0) * (load.Mx_top<0?-1:1), y: (r.Mcap_y>0 ? r.Mc_y/r.Mcap_y : 0) * (load.My_top<0?-1:1), status: r.status };
        }).filter(Boolean);
        return { mxLoop: createLoopData(res.curveX), myLoop: createLoopData(res.curveY), loadPoints, limitCircle, ratioPoints };
    }, [res, inputs.loads]);

    const critLoad = useMemo(() => res?.results.reduce((p, c) => (c.ratio_PM > p.ratio_PM ? c : p), res.results[0]), [res]);
    const maxShear = useMemo(() => Math.max(...inputs.loads.map(l => Math.sqrt(l.Vx**2 + l.Vy**2))), [inputs.loads]);
    const resBP = useMemo(() => calculateBasePlate(inputs.loads.find(l => l.id === critLoad?.id)?.Pu || 0, Math.max(Math.abs(inputs.loads[0].Mx_top), Math.abs(inputs.loads[0].My_top)), bp.B, bp.N, bp.fc, bp.fy, inputs.by, inputs.bx), [inputs, bp, critLoad]);
    const resStud = useMemo(() => calculateShearStuds(inputs.fc, stud.dia, stud.fu, maxShear, inputs.L), [inputs, stud, maxShear]);

    const isSRC = inputs.steelSectionKey !== 'None';
    const tabs = [ { id: 0, label: t_global.tabs[0], icon: Activity } ];
    if (isSRC) { tabs.push({ id: 1, label: t_global.tabs[2], icon: Square }, { id: 2, label: t_global.tabs[3], icon: Target }); }
    tabs.push({ id: 3, label: t_global.tabs[4], icon: FileText }, { id: 4, label: t_global.tabs[1], icon: Eye });

    const notifyLocked = (feature: string) => setNotification(`กรุณาอัปเกรดเป็น PRO เพื่อใช้งาน: ${feature}`);

    // ✅ Secure Handlers
    const handleSetLang = (l: Language) => {
        if (!isPro && l === 'th') { notifyLocked('ภาษาไทย (Thai Language)'); return; }
        setLang(l);
    };

    const handleSetStd = (s: Standard) => {
        if (!isPro && s === 'EIT-Thai') { notifyLocked('มาตรฐาน วสท. (EIT Standard)'); return; }
        setStd(s);
    };

    const handleSetSlenderness = (val: boolean) => {
        if (!isPro && val) { notifyLocked('ผลของความชะลูด (Slenderness Effect)'); return; }
        setConsiderSlenderness(val);
    };

    const updateInput = (key: keyof ColumnInput, val: any) => {
        if (!isPro) {
            if (key === 'steelSectionKey' && val !== 'None') { notifyLocked('เสาโครงสร้างเหล็ก (Composite Column)'); return; }
            if (key === 'mainBarGrade' && !['SR24', 'SD30'].includes(val)) { notifyLocked('เหล็กเกรดสูง (High Strength Steel)'); return; }
            if (key === 'stirrupGrade' && val !== 'SR24') { notifyLocked('เหล็กปลอกเกรดสูง (High Strength Stirrup)'); return; }
        }
        setInputs(p => ({ ...p, [key]: val }));
    };

    const handleAddLoadCase = () => {
        if (!isPro && inputs.loads.length >= 5) { notifyLocked('เพิ่ม Load Case เกิน 5 กรณี'); return; }
        setInputs(p=>({...p, loads:[...p.loads, {id:`L${p.loads.length+1}`, Pu:0, Mx_top:0, Mx_bot:0, My_top:0, My_bot:0, Vx:0, Vy:0, curvature:'single'}]}));
    };

    const updateLoad = (idx: number, k: keyof LoadCase, v: any) => { const n = [...inputs.loads]; /* @ts-ignore */ n[idx] = { ...n[idx], [k]: v }; setInputs(p => ({ ...p, loads: n })); };

    if (!res) return <div className="p-10 text-center text-white">Loading...</div>;

    const TAB_BTN_CLS = (isActive: boolean) => `px-5 py-3 text-base font-bold rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-2 ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`;

    return (
        <div className={`max-w-[1600px] mx-auto p-4 md:p-6 min-h-screen ${THEME.BG.MAIN} ${THEME.TEXT.PRIMARY} font-sans print:bg-white print:text-black print:p-0`}>
            
            {notification && <NotificationToast title="สิทธิพิเศษสำหรับสมาชิก PRO" message={notification} onClose={() => setNotification(null)} />}

            <ToolHeader title={t_global.reportTitle} onBack={onBack} std={std} setStd={handleSetStd} lang={lang} setLang={handleSetLang} isPro={isPro} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
                
                {/* Left Panel: Inputs */}
                <div className="lg:col-span-4 space-y-4 print:hidden">
                    <div className={`${THEME.BG.PANEL} p-5 rounded-xl border ${THEME.BORDER.DEFAULT}`}>
                        <h3 className={TYPO.SECTION_HEADER}><Settings size={18}/> {t_global.geo}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 flex gap-3">
                                <div className="flex-1"><label className={TYPO.LABEL}>{t.bx}</label><input type="number" value={inputs.bx} onChange={e=>updateInput('bx',+e.target.value)} className={TYPO.INPUT}/></div>
                                <div className="flex-1"><label className={TYPO.LABEL}>{t.by}</label><input type="number" value={inputs.by} onChange={e=>updateInput('by',+e.target.value)} className={TYPO.INPUT}/></div>
                                <div className="flex-1"><label className={TYPO.LABEL}>{t.l}</label><input type="number" value={inputs.L} onChange={e=>updateInput('L',+e.target.value)} className={TYPO.INPUT}/></div>
                            </div>
                            <div><label className={TYPO.LABEL}>{t.fc}</label><input type="number" value={inputs.fc} onChange={e=>updateInput('fc',+e.target.value)} className={TYPO.INPUT}/></div>
                            <div><label className={TYPO.LABEL}>{t.cov}</label><input type="number" value={inputs.covering} onChange={e=>updateInput('covering',+e.target.value)} className={TYPO.INPUT}/></div>
                            
                            <div className="col-span-2 flex items-center gap-2 mt-2 border-t border-slate-700 pt-2">
                                <input type="checkbox" checked={considerSlenderness} onChange={e=>handleSetSlenderness(e.target.checked)} className="accent-blue-500 w-4 h-4"/>
                                <label className="text-sm text-slate-400 cursor-pointer" onClick={()=>handleSetSlenderness(!considerSlenderness)}>{t.slenderness}</label>
                            </div>

                            <div className="col-span-2 border-t border-slate-700 pt-3 mt-1">
                                <label className={TYPO.LABEL}>{t.steelCore}</label>
                                <select value={inputs.steelSectionKey} onChange={e=>updateInput('steelSectionKey',e.target.value)} className={TYPO.INPUT}>
                                    <option value="None">None</option>{Object.keys(H_BEAM_STD).filter(k=>k!=='None').map(k=><option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                            {isSRC && (
                                <div className="col-span-2">
                                     <label className={TYPO.LABEL}>Steel Grade</label>
                                     <select value={inputs.steelGrade} onChange={e=>updateInput('steelGrade',e.target.value)} className={TYPO.INPUT}>{Object.keys(STRUCTURAL_STEEL_GRADES).map(k=><option key={k} value={k}>{k}</option>)}</select>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className={`${THEME.BG.PANEL} p-5 rounded-xl border ${THEME.BORDER.DEFAULT}`}>
                        <h3 className={TYPO.SECTION_HEADER}><Layers size={18}/> {t_global.rebar}</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={TYPO.LABEL}>{t.mainGrade}</label><select value={inputs.mainBarGrade} onChange={e=>updateInput('mainBarGrade',e.target.value)} className={TYPO.INPUT}>{Object.keys(REBAR_GRADES).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
                                <div><label className={TYPO.LABEL}>{t.size}</label><select value={inputs.mainBarSize} onChange={e=>updateInput('mainBarSize',+e.target.value)} className={TYPO.INPUT}>{[12,16,20,25,28,32].map(d=><option key={d} value={d}>DB{d}</option>)}</select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={TYPO.LABEL}>{t.nx}</label><input type="number" value={inputs.nx} onChange={e=>updateInput('nx',+e.target.value)} className={TYPO.INPUT}/></div>
                                <div><label className={TYPO.LABEL}>{t.ny}</label><input type="number" value={inputs.ny} onChange={e=>updateInput('ny',+e.target.value)} className={TYPO.INPUT}/></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className={TYPO.LABEL}>{t.stirrup}</label><select value={inputs.stirrupGrade} onChange={e=>updateInput('stirrupGrade',e.target.value)} className={TYPO.INPUT}>{Object.keys(REBAR_GRADES).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
                                <div><label className={TYPO.LABEL}>{t.size}</label><select value={inputs.stirrupSize} onChange={e=>updateInput('stirrupSize',+e.target.value)} className={TYPO.INPUT}>{[6,9,12].map(d=><option key={d} value={d}>RB{d}</option>)}</select></div>
                                <div><label className={TYPO.LABEL}>{t.spacing}</label><input type="number" value={inputs.stirrupSpacing} onChange={e=>updateInput('stirrupSpacing',+e.target.value)} className={TYPO.INPUT}/></div>
                            </div>
                        </div>
                    </div>

                    <div className={`${THEME.BG.PANEL} p-5 rounded-xl border ${THEME.BORDER.DEFAULT} flex-1`}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className={TYPO.SECTION_HEADER}><Box size={18}/> {t_global.loads}</h3>
                            <button onClick={handleAddLoadCase} className="bg-green-600/20 text-green-400 p-1.5 rounded hover:bg-green-600/40"><Plus size={16}/></button>
                        </div>
                        <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                            {inputs.loads.map((l, i) => (
                                <div key={i} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-sm relative group shadow-sm">
                                    <div className="flex justify-between font-bold text-slate-300 mb-3 border-b border-slate-800 pb-2">
                                        <span className="text-blue-400">CASE: {l.id}</span>
                                        {i > 0 && (
                                            <button onClick={() => setInputs(p => ({ ...p, loads: p.loads.filter((_, idx) => idx !== i) }))} className="text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                        <div><label className={TYPO.LABEL}>Pu (T)</label><input type="number" value={l.Pu} onChange={e=>updateLoad(i,'Pu',+e.target.value)} className={`${TYPO.INPUT} text-right`}/></div>
                                        <div><label className={TYPO.LABEL}>Vx (T)</label><input type="number" value={l.Vx} onChange={e=>updateLoad(i,'Vx',+e.target.value)} className={`${TYPO.INPUT} text-right`}/></div>
                                        <div><label className={TYPO.LABEL}>Vy (T)</label><input type="number" value={l.Vy} onChange={e=>updateLoad(i,'Vy',+e.target.value)} className={`${TYPO.INPUT} text-right`}/></div>
                                    </div>
                                    
                                    {considerSlenderness ? (
                                        <div className="bg-slate-950/50 p-3 rounded border border-slate-800">
                                            <div className="grid grid-cols-2 gap-3 mb-2">
                                                <div><label className={`${TYPO.LABEL} !text-blue-400`}>Mx Top</label><input type="number" value={l.Mx_top} onChange={e=>updateLoad(i,'Mx_top',+e.target.value)} className={`${TYPO.INPUT} text-right`}/></div>
                                                <div><label className={`${TYPO.LABEL} !text-blue-400`}>Mx Bot</label><input type="number" value={l.Mx_bot} onChange={e=>updateLoad(i,'Mx_bot',+e.target.value)} className={`${TYPO.INPUT} text-right`}/></div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div><label className={`${TYPO.LABEL} !text-green-400`}>My Top</label><input type="number" value={l.My_top} onChange={e=>updateLoad(i,'My_top',+e.target.value)} className={`${TYPO.INPUT} text-right`}/></div>
                                                <div><label className={`${TYPO.LABEL} !text-green-400`}>My Bot</label><input type="number" value={l.My_bot} onChange={e=>updateLoad(i,'My_bot',+e.target.value)} className={`${TYPO.INPUT} text-right`}/></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className={TYPO.LABEL}>Mx (T-m)</label><input type="number" value={l.Mx_top} onChange={e=>updateLoad(i,'Mx_top',+e.target.value)} className={`${TYPO.INPUT} text-right`}/></div>
                                            <div><label className={TYPO.LABEL}>My (T-m)</label><input type="number" value={l.My_top} onChange={e=>updateLoad(i,'My_top',+e.target.value)} className={`${TYPO.INPUT} text-right`}/></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Output */}
                <div className="lg:col-span-8 space-y-4 print:col-span-12">
                    <div className="flex gap-2 border-b border-slate-700 pb-2 overflow-x-auto print:hidden">
                        {tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={TAB_BTN_CLS(activeTab===tab.id)}><tab.icon size={18}/> {tab.label}</button>)}
                    </div>

                    {activeTab === 0 && (
                        <div className="space-y-6 animate-fade-in block print:hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px]">
                                <div className={`${THEME.BG.PANEL} p-4 rounded-xl border ${THEME.BORDER.DEFAULT} flex flex-col`}>
                                    <h4 className={TYPO.LABEL}>P-M Capacity</h4>
                                    <ResponsiveContainer>
                                        <ScatterChart margin={{top:20, right:20, bottom:20, left:20}}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={THEME.COLORS.GRID}/>
                                            <XAxis type="number" dataKey="x" stroke={THEME.COLORS.TEXT} fontSize={10} label={{ value: 'M (t-m)', position: 'bottom', offset: 0, fontSize:10 }}/>
                                            <YAxis type="number" dataKey="y" stroke={THEME.COLORS.TEXT} fontSize={10} label={{ value: 'P (t)', angle: -90, position: 'insideLeft', fontSize:10 }}/>
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{backgroundColor:THEME.COLORS.BG_TOOLTIP, borderColor:THEME.COLORS.GRID}}/>
                                            <Legend verticalAlign="top" height={36} iconSize={8}/>
                                            <ReferenceLine y={res.phiPn_max} stroke="white" strokeDasharray="3 3" label={{ value: 'Pmax', fill: 'white', fontSize: 10, position: 'insideTopRight' }} />
                                            <Scatter name="Mx Cap" data={chartData.mxLoop} fill="none" line={{stroke:THEME.COLORS.FAIL, strokeWidth: 2}} shape={<g/>} isAnimationActive={false}/>
                                            <Scatter name="My Cap" data={chartData.myLoop} fill="none" line={{stroke:THEME.COLORS.BLUE, strokeWidth: 2, strokeDasharray:'5 5'}} shape={<g/>} isAnimationActive={false}/>
                                            <Scatter name="Load Points" data={chartData.loadPoints} shape={<CustomScatterShape/>} legendType="circle" isAnimationActive={false}/>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className={`${THEME.BG.PANEL} p-4 rounded-xl border ${THEME.BORDER.DEFAULT} flex flex-col`}>
                                    <h4 className={TYPO.LABEL}>Interaction Ratio</h4>
                                    <ResponsiveContainer>
                                        <ScatterChart margin={{top:20, right:20, bottom:20, left:20}}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={THEME.COLORS.GRID}/>
                                            <XAxis type="number" dataKey="x" stroke={THEME.COLORS.TEXT} domain={[-1.2, 1.2]} fontSize={10} label={{ value: 'Ratio Mx', position: 'bottom', fontSize:10 }}/>
                                            <YAxis type="number" dataKey="y" stroke={THEME.COLORS.TEXT} domain={[-1.2, 1.2]} fontSize={10} label={{ value: 'Ratio My', angle: -90, position: 'insideLeft', fontSize:10 }}/>
                                            <ZAxis range={[60, 60]} />
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{backgroundColor:THEME.COLORS.BG_TOOLTIP, borderColor:THEME.COLORS.GRID}}/>
                                            <Legend verticalAlign="top" height={36} iconSize={8}/>
                                            <Scatter name="Limit 1.0" data={chartData.limitCircle} fill="none" line={{stroke:THEME.COLORS.TEXT}} shape={<g/>} isAnimationActive={false}/>
                                            <Scatter name="Ratio Point" data={chartData.ratioPoints} shape={<CustomScatterShape/>} isAnimationActive={false}/>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className={`${THEME.BG.PANEL} border ${THEME.BORDER.DEFAULT} rounded-xl overflow-hidden`}>
                                <div className="max-h-[250px] overflow-auto">
                                    <table className="w-full text-xs text-left text-slate-300">
                                        <thead className="bg-slate-900 sticky top-0"><tr><th className="p-3">ID</th><th className="p-3 text-right">Pu</th><th className="p-3 text-right">Mcx</th><th className="p-3 text-right">Mcy</th><th className="p-3 text-center">Ratio</th><th className="p-3 text-center">Shear</th><th className="p-3 text-center">As Req/Prov (cm²)</th><th className="p-3 text-center">Status</th></tr></thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {res.results.map(r => (
                                                <tr key={r.id} className="hover:bg-slate-800/50">
                                                    <td className="p-3 font-bold">{r.id}</td>
                                                    <td className="p-3 text-right">{inputs.loads.find(l=>l.id===r.id)?.Pu}</td>
                                                    <td className="p-3 text-right text-yellow-400">{r.Mc_x.toFixed(1)}</td>
                                                    <td className="p-3 text-right text-yellow-400">{r.Mc_y.toFixed(1)}</td>
                                                    <td className="p-3 text-center font-bold">{r.ratio_PM.toFixed(2)}</td>
                                                    <td className="p-3 text-center text-blue-400">{r.ratio_Shear.toFixed(2)}</td>
                                                    <td className="p-3 text-center text-orange-300 font-mono">{r.As_req.toFixed(2)} / {r.As_prov.toFixed(2)}</td>
                                                    <td className="p-3 text-center"><span className={r.status==='pass'?TYPO.STATUS.PASS:TYPO.STATUS.FAIL}>{r.status.toUpperCase()}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {isSRC && activeTab === 1 && (
                        <div className={`${THEME.BG.PANEL} p-6 rounded-xl border ${THEME.BORDER.DEFAULT} animate-fade-in`}>
                            <h3 className={TYPO.SECTION_HEADER}><Square size={18}/> Base Plate Design</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className={TYPO.LABEL}>Parameters</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><label className={TYPO.LABEL}>Plate B (cm)</label><input type="number" value={bp.B} onChange={e=>setBp({...bp, B:+e.target.value})} className={TYPO.INPUT}/></div>
                                        <div><label className={TYPO.LABEL}>Plate N (cm)</label><input type="number" value={bp.N} onChange={e=>setBp({...bp, N:+e.target.value})} className={TYPO.INPUT}/></div>
                                        <div><label className={TYPO.LABEL}>Pedestal fc'</label><input type="number" value={bp.fc} onChange={e=>setBp({...bp, fc:+e.target.value})} className={TYPO.INPUT}/></div>
                                        <div><label className={TYPO.LABEL}>Plate Fy</label><input type="number" value={bp.fy} onChange={e=>setBp({...bp, fy:+e.target.value})} className={TYPO.INPUT}/></div>
                                    </div>
                                </div>
                                <div className="bg-slate-900 p-5 rounded-lg space-y-4 text-base">
                                    <h4 className={TYPO.LABEL}>Results</h4>
                                    <div className="flex justify-between"><span>Bearing Stress:</span> <span className={resBP.bearing_stress > resBP.limit_stress ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>{resBP.bearing_stress.toFixed(1)} / {resBP.limit_stress.toFixed(1)} ksc</span></div>
                                    <div className="flex justify-between"><span>Required Thickness:</span> <span className="font-mono text-yellow-400 font-bold">{resBP.req_t.toFixed(2)} cm</span></div>
                                    <div className="mt-4 p-3 bg-slate-800 rounded text-center font-bold border border-slate-700">Status: <span className={resBP.status.includes('FAIL') ? 'text-red-500' : 'text-green-500'}>{resBP.status}</span></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {isSRC && activeTab === 2 && (
                        <div className={`${THEME.BG.PANEL} p-6 rounded-xl border ${THEME.BORDER.DEFAULT} animate-fade-in`}>
                            <h3 className={TYPO.SECTION_HEADER}><Target size={18}/> Composite Shear Studs</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className={TYPO.LABEL}>Parameters</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><label className={TYPO.LABEL}>Stud Dia (mm)</label><select value={stud.dia} onChange={e=>setStud({...stud, dia:+e.target.value})} className={TYPO.INPUT}><option value={10}>10</option><option value={13}>13</option><option value={16}>16</option><option value={19}>19</option><option value={22}>22</option></select></div>
                                        <div><label className={TYPO.LABEL}>Stud Fu (ksc)</label><input type="number" value={stud.fu} onChange={e=>setStud({...stud, fu:+e.target.value})} className={TYPO.INPUT}/></div>
                                    </div>
                                </div>
                                <div className="bg-slate-900 p-5 rounded-lg space-y-4 text-base">
                                    <h4 className={TYPO.LABEL}>Results</h4>
                                    <div className="flex justify-between"><span>Max Shear (Vu):</span> <span className="font-mono">{maxShear.toFixed(2)} Ton</span></div>
                                    <div className="flex justify-between"><span>Capacity (Qn):</span> <span className="font-mono text-blue-400">{resStud.Qn_ton.toFixed(2)} Ton/stud</span></div>
                                    <div className="flex justify-between text-lg font-bold"><span>Total Required:</span> <span className="text-green-400">{resStud.num_req} pcs</span></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 3 && (
                        <ReportTemplate title={t_global.reportTitle} subtitle={`Standard: ${std}`} onPrint={() => isPro ? window.print() : notifyLocked('พิมพ์รายงาน (Printing)')}>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 flex justify-center border border-slate-300 p-4 rounded bg-slate-50">
                                    <ColumnSectionView bx={inputs.bx} by={inputs.by} covering={inputs.covering} nx={inputs.nx} ny={inputs.ny} mainBarSize={inputs.mainBarSize} stirrupSize={inputs.stirrupSize} steelProp={H_BEAM_STD[inputs.steelSectionKey]} mainBarType={mainBarProp.type} stirrupText={`${stirrupProp.type}${inputs.stirrupSize} @ ${res.designStirrupSpacing}`} isReport={true} />
                                </div>
                                {res.reportSteps.map((step, i) => (
                                    <div key={i} className="border p-4 rounded bg-gray-50 break-inside-avoid">
                                        <h3 className={TYPO.RPT_SECTION}>{step.title}</h3>
                                        <div className="pl-2 space-y-1">
                                            {step.content.map((line, k) => <div key={k} className={TYPO.RPT_TEXT} dangerouslySetInnerHTML={{__html: line}} />)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ReportTemplate>
                    )}

                    {activeTab === 4 && (
                        <div className="space-y-6 animate-fade-in block print:hidden">
                            <div className={`${THEME.BG.PANEL} p-8 rounded-xl border ${THEME.BORDER.DEFAULT} flex flex-col items-center`}>
                                <ColumnSectionView bx={inputs.bx} by={inputs.by} covering={inputs.covering} nx={inputs.nx} ny={inputs.ny} mainBarSize={inputs.mainBarSize} stirrupSize={inputs.stirrupSize} steelProp={H_BEAM_STD[inputs.steelSectionKey]} mainBarType={mainBarProp.type} stirrupText={`${stirrupProp.type}${inputs.stirrupSize} @ ${res.designStirrupSpacing}`} />
                            </div>
                            <div className={`${THEME.BG.PANEL} p-6 rounded-xl border ${THEME.BORDER.DEFAULT}`}>
                                <h3 className={TYPO.SECTION_HEADER}><Calculator size={18}/> Estimated BOQ</h3>
                                <table className="w-full text-sm text-left text-slate-300">
                                    <thead className="bg-slate-900 text-white"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Unit Price</th><th className="p-3 text-right">Total</th></tr></thead>
                                    <tbody className="divide-y divide-slate-800">
                                        <tr><td className="p-3">Concrete</td><td className="p-3 text-right">{res.volConcrete.toFixed(2)} m³</td><td className="p-3 text-right">{MATERIAL_COSTS.CONCRETE_M3}</td><td className="p-3 text-right">{(res.volConcrete*MATERIAL_COSTS.CONCRETE_M3).toLocaleString()}</td></tr>
                                        <tr><td className="p-3">Rebar</td><td className="p-3 text-right">{res.weightRebar.toFixed(1)} kg</td><td className="p-3 text-right">{MATERIAL_COSTS.REBAR_KG}</td><td className="p-3 text-right">{(res.weightRebar*MATERIAL_COSTS.REBAR_KG).toLocaleString()}</td></tr>
                                        <tr><td className="p-3">Stirrup</td><td className="p-3 text-right">{res.weightStirrup.toFixed(1)} kg</td><td className="p-3 text-right">{MATERIAL_COSTS.REBAR_KG}</td><td className="p-3 text-right">{(res.weightStirrup*MATERIAL_COSTS.REBAR_KG).toLocaleString()}</td></tr>
                                        <tr><td className="p-3">Formwork</td><td className="p-3 text-right">{res.areaForm.toFixed(1)} m²</td><td className="p-3 text-right">{MATERIAL_COSTS.FORMWORK_M2}</td><td className="p-3 text-right">{(res.areaForm*MATERIAL_COSTS.FORMWORK_M2).toLocaleString()}</td></tr>
                                        <tr className="bg-slate-800 font-bold text-white"><td className="p-3" colSpan={3}>Grand Total</td><td className="p-3 text-right">{res.estCost.toLocaleString()} THB</td></tr>
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

export default RCColumnDesignTool;