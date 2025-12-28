import { ChevronLeft, Globe } from 'lucide-react';
import { THEME, TYPO } from '../../constants';
import { Standard, Language } from '../../types';

interface ToolHeaderProps {
    title: string;
    onBack: () => void;
    std: Standard;
    setStd: (s: Standard) => void;
    lang: Language;
    setLang: (l: Language) => void;
    isPro?: boolean;
}

export const ToolHeader = ({ title, onBack, std, setStd, lang, setLang, isPro = false }: ToolHeaderProps) => {
    return (
        <div className={`flex flex-col md:flex-row justify-between items-center p-4 rounded-xl ${THEME.BG.PANEL} border ${THEME.BORDER.DEFAULT} mb-6 shadow-lg gap-4 print:hidden`}>
            
            {/* Title Section */}
            <div className="flex items-center gap-3 w-full md:w-auto">
                <button onClick={onBack} className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors">
                    <ChevronLeft size={24} />
                </button>
                
                <div className="flex items-center flex-wrap gap-2">
                    <h1 className={TYPO.H1}>
                        {title}
                    </h1>
                    
                    {/* ✅ ปรับสี Badge ใหม่ตามคำขอ */}
                    {isPro ? (
                        // PRO = โทนเขียว (Premium Green)
                        <span className="text-[10px] bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black px-3 py-1 rounded-full tracking-widest shadow-lg shadow-green-500/30 flex items-center gap-1 transform scale-90 md:scale-100 border border-green-400/20">
                            <span>★</span> PRO
                        </span>
                    ) : (
                        // DEMO = โทนเหลือง (Warning Yellow)
                        <span className="text-[10px] bg-yellow-500/10 text-yellow-400 font-bold px-3 py-1 rounded-full tracking-widest border border-yellow-500/50 shadow-lg shadow-yellow-500/10 transform scale-90 md:scale-100 flex items-center gap-1">
                            <span>⚠</span> DEMO
                        </span>
                    )}
                </div>
            </div>

            {/* Controls Section */}
            <div className="flex gap-2 items-center">
                {/* Standard Switcher */}
                <div className={`flex ${THEME.BG.INPUT} p-1 rounded-lg border ${THEME.BORDER.INPUT}`}>
                    <button 
                        onClick={() => setStd('EIT-Thai')} 
                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${std === 'EIT-Thai' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        EIT
                    </button>
                    <button 
                        onClick={() => setStd('ACI318-19')} 
                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${std === 'ACI318-19' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        ACI
                    </button>
                </div>

                {/* Language Switcher */}
                <button 
                    onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
                    className={`flex items-center gap-2 ${THEME.BG.INPUT} border ${THEME.BORDER.INPUT} px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors`}
                >
                    <Globe size={14} className="text-slate-400"/>
                    <span className="text-xs font-bold text-slate-300 uppercase w-4 text-center">{lang}</span>
                </button>
            </div>
        </div>
    );
};