import { ReactNode } from 'react';
import { Printer } from 'lucide-react';
import { TYPO } from '../../constants';

interface ReportTemplateProps {
    title: string;
    subtitle?: string;
    onPrint?: () => void;
    children: ReactNode;
}

export const ReportTemplate = ({ title, subtitle, onPrint, children }: ReportTemplateProps) => {
    return (
        <div className="bg-slate-500 min-h-screen p-4 flex justify-center items-start print:bg-white print:p-0 print:block">
            {/* A4 Paper Container */}
            <div className="bg-white text-black shadow-2xl mx-auto w-[210mm] min-h-[297mm] p-[15mm] relative print:shadow-none print:w-full print:h-auto print:p-0 print:m-0 print:mx-0">
                
                {/* Toolbar (Hidden on Print) */}
                <div className="absolute top-4 right-4 print:hidden flex gap-2">
                    <button 
                        onClick={onPrint || (() => window.print())} 
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all"
                    >
                        <Printer size={16}/> Print
                    </button>
                </div>

                {/* Header */}
                <header className="border-b-2 border-black pb-2 mb-4 flex justify-between items-end">
                    <div>
                        <h1 className={TYPO.RPT_TITLE}>{title}</h1>
                        {subtitle && <p className={TYPO.RPT_SUBTITLE}>{subtitle}</p>}
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-mono text-slate-500">Structural Calc Tool</p>
                        <p className="text-[9px] font-mono text-slate-900 font-bold">{new Date().toLocaleDateString('th-TH')}</p>
                    </div>
                </header>

                {/* Content - Compact Mode for Print */}
                <main className="text-xs print:text-[10px]">
                    {children}
                </main>

                {/* Footer */}
                <footer className="mt-6 pt-4 border-t border-slate-300 break-inside-avoid print:mt-4 print:pt-2">
                    <div className="grid grid-cols-2 gap-20">
                        <div className="text-center">
                            <div className="border-b border-black w-3/4 mx-auto mb-1 h-6"></div>
                            <p className="text-[9px] font-bold uppercase">Designed By</p>
                        </div>
                        <div className="text-center">
                            <div className="border-b border-black w-3/4 mx-auto mb-1 h-6"></div>
                            <p className="text-[9px] font-bold uppercase">Approved By</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};