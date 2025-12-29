import React, { useState, useEffect } from 'react'; // ✅ เพิ่ม useEffect
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    Cuboid as ConcreteCatIcon, 
    Construction as SteelCatIcon, 
    Wind as WindCatIcon, 
    Calculator as QTOCatIcon, 
    Brain as AICatIcon,
    Phone as ContactCatIcon, 
    Columns, Grid3x3, SquareStack, StepForward, Fence, Link, Anchor, 
    TableProperties, Scale, ScanText, Lock, ChevronRight, Hammer, 
    Activity, Wind, Mail, MessageCircle, Bug, Phone, 
    X, Send, RotateCcw,
    PartyPopper 
} from 'lucide-react';

// --- Custom Icons --- (คงเดิมตามต้นฉบับ)
const IBeamIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 4h16 M4 20h16 M12 4v16 M9 4v2 M15 4v2 M9 20v-2 M15 20v-2" /></svg>
);
const PileCapIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="4" y="4" width="16" height="8" rx="2" /><path d="M7 12v8 M12 12v8 M17 12v8 M6 20h2 M11 20h2 M16 20h2" /></svg>
);
const RCBeamIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="5" y="4" width="14" height="16" rx="2" /><circle cx="9" cy="16" r="1.5" fill="currentColor" className="opacity-50"/><circle cx="15" cy="16" r="1.5" fill="currentColor" className="opacity-50"/><circle cx="9" cy="8" r="1.5" fill="currentColor" className="opacity-50"/><circle cx="15" cy="8" r="1.5" fill="currentColor" className="opacity-50"/><path d="M7 13h10" strokeWidth="1" strokeDasharray="2 2" className="opacity-50"/></svg>
);
const ActivityGraphIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);

// --- Types & toolsData --- (คงเดิมตามต้นฉบับ 100%)
type ToolCategory = 'concrete' | 'steel' | 'analysis' | 'qto' | 'ai' | 'contact';

interface ToolCardProps {
    id?: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    path?: string; 
    isPro?: boolean;
    isNew?: boolean;
    status?: 'available' | 'coming_soon' | 'porting';
    actionType?: 'link' | 'modal';
}

const toolsData: Record<ToolCategory, ToolCardProps[]> = {
    concrete: [
        { title: "RC Beam Design", description: "ออกแบบคาน คสล. วิธี USD (ACI/วสท.)", icon: <RCBeamIcon size={42} className="text-blue-600 dark:text-blue-400" />, path: "/rc-beam", status: 'available' },
        { title: "RC Column Design", description: "ออกแบบเสา คสล. (P-M Interaction)", icon: <Columns size={40} className="text-slate-500 dark:text-slate-400" />, path: "/rc-column", isNew: true, status: 'available' },
        { title: "RC Slab Design", description: "ออกแบบพื้น คสล. ทางเดียวและสองทาง", icon: <Grid3x3 size={40} className="text-slate-500 dark:text-slate-400" />, path: "/rc-slab", status: 'available' },
        { title: "Pile Cap Design", description: "ออกแบบฐานรากเสาเข็ม (2-6 ต้น)", icon: <PileCapIcon size={42} className="text-slate-500 dark:text-slate-400" />, path: "/pile-cap", isNew: true, status: 'available' },
        { title: "Isolated Footing", description: "ออกแบบฐานรากแผ่เดี่ยว", icon: <SquareStack size={40} className="text-slate-500 dark:text-slate-400" />, path: "/isolated-footing", status: 'available' },
        { title: "Staircase Design", description: "ออกแบบบันได คสล.", icon: <StepForward size={40} className="text-slate-500 dark:text-slate-400" />, path: "/staircase", status: 'available' },
        { title: "Retaining Wall", description: "ออกแบบกำแพงกันดิน", icon: <Fence size={40} className="text-slate-500 dark:text-slate-400" />, path: "/retaining-wall", status: 'available' }
    ],
    steel: [
        { title: "Steel Beam Check", description: "ตรวจสอบหน้าตัดคานเหล็กรูปพรรณ", icon: <IBeamIcon size={42} className="text-slate-500 dark:text-slate-400" />, isPro: true, status: 'coming_soon' },
        { title: "Steel Column Check", description: "ตรวจสอบกำลังรับแรงอัดเสาเหล็ก", icon: <IBeamIcon size={42} className="text-slate-500 dark:text-slate-400 transform rotate-90" />, isPro: true, status: 'coming_soon' },
        { title: "Connection Design", description: "ออกแบบจุดต่อเหล็กเบื้องต้น", icon: <Link size={40} className="text-slate-500 dark:text-slate-400" />, isPro: true, status: 'coming_soon' },
        { title: "Base Plate Design", description: "ออกแบบแผ่นรองฐานเสาเหล็ก", icon: <Anchor size={40} className="text-slate-500 dark:text-slate-400" />, isPro: true, status: 'coming_soon' }
    ],
    analysis: [
        { title: "Response Spectrum (RSA)", description: "วิเคราะห์แรงแผ่นดินไหววิธี RSA", icon: <ActivityGraphIcon size={40} className="text-orange-500 dark:text-orange-400" />, isPro: true, status: 'porting' },
        { title: "Modal Response (MRSA)", description: "วิเคราะห์โครงสร้าง 3 มิติ", icon: <ActivityGraphIcon size={40} className="text-orange-500 dark:text-orange-400" />, isPro: true, status: 'porting' },
        { title: "Seismic Load (Equivalent)", description: "คำนวณแรงแผ่นดินไหววิธีแรงสถิต", icon: <Activity size={40} className="text-slate-500 dark:text-slate-400" />, isPro: true, status: 'coming_soon' },
        { title: "Wind Load (Building)", description: "แรงลมอาคารทั่วไปและอาคารสูง", icon: <Wind size={40} className="text-slate-500 dark:text-slate-400" />, isPro: true, status: 'coming_soon' },
        { title: "Wind Load (Factory)", description: "แรงลมสำหรับโรงงานและหลังคาเปิด", icon: <Wind size={40} className="text-slate-500 dark:text-slate-400" />, isPro: true, status: 'coming_soon' },
        { title: "Load Combinations", description: "สร้าง Load Combination Generator", icon: <TableProperties size={40} className="text-slate-500 dark:text-slate-400" />, isNew: true, status: 'coming_soon' },
    ],
    qto: [
        { title: "RC Beam QTO", description: "ถอดปริมาณคอนกรีต ไม้แบบ เหล็กเสริม", icon: <RCBeamIcon size={42} className="text-green-600 dark:text-green-400" />, status: 'coming_soon' },
        { title: "RC Column QTO", description: "ถอดปริมาณงานเสา", icon: <Columns size={40} className="text-green-600 dark:text-green-400" />, status: 'coming_soon' },
        { title: "RC Slab QTO", description: "ถอดปริมาณงานพื้น", icon: <Grid3x3 size={40} className="text-green-600 dark:text-green-400" />, status: 'coming_soon' },
        { title: "Footing QTO", description: "ถอดปริมาณงานฐานราก", icon: <SquareStack size={40} className="text-green-600 dark:text-green-400" />, status: 'coming_soon' },
        { title: "Staircase QTO", description: "ถอดปริมาณงานบันได", icon: <StepForward size={40} className="text-green-600 dark:text-green-400" />, status: 'coming_soon' },
        { title: "Steel Structure QTO", description: "ถอดน้ำหนักเหล็กรูปพรรณ", icon: <IBeamIcon size={42} className="text-green-600 dark:text-green-400" />, status: 'coming_soon' },
        { title: "Rebar Weight Calc", description: "เครื่องมือแปลงน้ำหนักเหล็กเสริม", icon: <Scale size={40} className="text-slate-500 dark:text-slate-400" />, status: 'coming_soon' },
    ],
    ai: [
        { title: "AI Scan to QTO (Beta)", description: "อัปโหลด PDF เพื่อสแกนหา Text เหล็ก", icon: <ScanText size={40} className="text-purple-600 dark:text-purple-400" />, isPro: true, isNew: true, status: 'coming_soon' },
    ],
    contact: [
        { id: 'hotline', title: "Hotline (Admin)", description: "ติดต่อ Admin ด่วน: 095-953-2511", icon: <Phone size={40} className="text-blue-600 dark:text-blue-400" />, status: 'available', actionType: 'modal' },
        { id: 'support', title: "Technical Support", description: "แจ้งปัญหาการใช้งาน หรือขอความช่วยเหลือ", icon: <Mail size={40} className="text-pink-600 dark:text-pink-400" />, status: 'available', actionType: 'modal' },
        { id: 'line', title: "Line Official", description: "สอบถามข้อมูลผ่าน Line OA", icon: <MessageCircle size={40} className="text-green-600 dark:text-green-400" />, status: 'available', path: "https://lin.ee/AhrrZLg", actionType: 'link' },
        { id: 'bug', title: "Report a Bug", description: "พบข้อผิดพลาดในโปรแกรม? แจ้งเราที่นี่", icon: <Bug size={40} className="text-red-600 dark:text-red-400" />, status: 'available', actionType: 'modal' }
    ]
};

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState<ToolCategory>('concrete');
    const navigate = useNavigate();

    // --- State: Welcome Modal (New Year) ---
    // ✅ แก้ไข: เริ่มต้นด้วยการเช็ค sessionStorage เพื่อป้องกันการแสดงซ้ำเมื่อกด Back
    const [showWelcome, setShowWelcome] = useState(() => {
        return !sessionStorage.getItem('hasSeenNY2026');
    });

    // --- Modal State ---
    const [modalType, setModalType] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        subject: '', name: '', phone: '', email: '', details: ''
    });

    const tabs: { id: ToolCategory; label: string; icon: React.ReactNode }[] = [
        { id: 'concrete', label: 'Concrete', icon: <ConcreteCatIcon size={16}/> },
        { id: 'steel', label: 'Steel', icon: <SteelCatIcon size={16}/> },
        { id: 'analysis', label: 'Analysis', icon: <WindCatIcon size={16}/> },
        { id: 'qto', label: 'Takeoff (QTO)', icon: <QTOCatIcon size={16}/> },
        { id: 'ai', label: 'AI Tools', icon: <AICatIcon size={16}/> },
        { id: 'contact', label: 'Contact', icon: <ContactCatIcon size={16}/> },
    ];

    // ✅ เพิ่มฟังก์ชันสำหรับปิด Welcome Modal และบันทึกลง Session
    const handleCloseWelcome = () => {
        setShowWelcome(false);
        sessionStorage.setItem('hasSeenNY2026', 'true');
    };

    // --- Action Handlers --- (คงเดิมตามต้นฉบับ)
    const handleCardClick = (tool: ToolCardProps) => {
        if (tool.status !== 'available') return;
        if (tool.actionType === 'modal' && tool.id) {
            setModalType(tool.id);
            setFormData({ subject: '', name: '', phone: '', email: '', details: '' });
        } else if (tool.path) {
            if (tool.path.startsWith('http')) {
                window.open(tool.path, '_blank');
            } else {
                navigate(tool.path);
            }
        }
    };

    const closeModal = () => setModalType(null);
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    const handleResetForm = () => setFormData({ subject: '', name: '', phone: '', email: '', details: '' });

    const handleSendEmail = (type: 'support' | 'bug') => {
        const recipient = "kittipong_n@applicadthai.com";
        let subject = "";
        let body = "";
        if (type === 'support') {
            subject = formData.subject || "Technical Support Request";
            body = `Name: ${formData.name}\nPhone: ${formData.phone}\nEmail: ${formData.email}\n\nDetails:\n${formData.details}`;
        } else if (type === 'bug') {
            subject = "Report Bug";
            body = `Name: ${formData.name}\nPhone: ${formData.phone}\nEmail: ${formData.email}\n\nBug Details:\n${formData.details}`;
        }
        window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        closeModal();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 p-4 md:p-8 font-sans relative transition-colors duration-300">
            
            {/* --- 🎉 Welcome Modal (Happy New Year) --- */}
            {showWelcome && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-[#1e293b] border-2 border-yellow-500 rounded-2xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(234,179,8,0.3)] relative text-center overflow-hidden">
                        
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500" />
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl" />

                        <div className="relative z-10">
                            <div className="mx-auto w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-6 text-yellow-600 dark:text-yellow-400 animate-bounce">
                                <PartyPopper size={40} />
                            </div>
                            
                            <h2 className="text-3xl font-black mb-2 text-slate-800 dark:text-white">Happy New Year 2026!</h2>
                            <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed text-sm">
                                สวัสดีปีใหม่ครับ! ขอให้ปีนี้เป็นปีแห่งความสำเร็จ<br/>
                                การออกแบบโครงสร้างที่มั่นคง และงานก่อสร้างที่ราบรื่น<br/>
                                เพื่อเป็นของขวัญปีใหม่ ให้กับเพื่อนๆ <br/>
                                ทีมงานจะให้ user ทั้งหมด ใช้งาน function Pro<br/>
                                ได้ไปถึงวันที่ 31 มกราคม 2569 เลยครับ<br/>
                                ถ้าอย่างไร เพื่อนๆสมาชิก สามารถช่วยกัน report bug ได้<br/>
                                เพื่อสิทธิประโยชน์ในการต่ออายุตัว Pro นะครับ<br/>
                            </p>

                            <button 
                                onClick={handleCloseWelcome} // ✅ เรียกใช้ฟังก์ชันใหม่ที่บันทึก Session
                                className="w-full py-3 px-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-white font-bold rounded-xl shadow-lg hover:shadow-yellow-500/25 transition-all transform hover:-translate-y-1"
                            >
                                เข้าสู่ Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Modals / Content อื่นๆ คงเดิมตามต้นฉบับ 100% --- */}
            {modalType && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
                        <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                            <X size={24} />
                        </button>

                        {modalType === 'hotline' && (
                            <div className="text-center py-8">
                                <div className="bg-blue-100 dark:bg-blue-500/20 p-6 rounded-full w-fit mx-auto mb-6 text-blue-600 dark:text-blue-400">
                                    <Phone size={64} />
                                </div>
                                <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Hotline (Admin)</h2>
                                <p className="text-slate-500 dark:text-slate-400 mb-6">กดที่เบอร์ด้านล่างเพื่อโทรออก</p>
                                <a href="tel:0959532511" className="text-4xl font-black text-slate-800 dark:text-white hover:text-blue-500 transition-colors block bg-slate-100 dark:bg-slate-800 py-4 rounded-xl border border-slate-200">095-953-2511</a>
                            </div>
                        )}

                        {modalType === 'support' && (
                            <div>
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-pink-600 dark:text-pink-400"><Mail size={24} /> Technical Support</h2>
                                <div className="space-y-3">
                                    <input name="subject" value={formData.subject} onChange={handleFormChange} placeholder="หัวข้อเรื่อง (Subject)" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded p-3 text-sm focus:border-pink-500 outline-none" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input name="name" value={formData.name} onChange={handleFormChange} placeholder="ชื่อผู้ติดต่อ" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded p-3 text-sm focus:border-pink-500 outline-none" />
                                        <input name="phone" value={formData.phone} onChange={handleFormChange} placeholder="เบอร์ติดต่อ" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded p-3 text-sm focus:border-pink-500 outline-none" />
                                    </div>
                                    <input name="email" value={formData.email} onChange={handleFormChange} placeholder="Email" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded p-3 text-sm focus:border-pink-500 outline-none" />
                                    <textarea name="details" value={formData.details} onChange={handleFormChange} placeholder="รายละเอียดปัญหา..." rows={4} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded p-3 text-sm focus:border-pink-500 outline-none" />
                                    <div className="flex gap-2 pt-2">
                                        <button onClick={handleResetForm} className="flex-1 py-2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex justify-center gap-2 items-center"><RotateCcw size={16}/> Reset</button>
                                        <button onClick={() => handleSendEmail('support')} className="flex-[2] py-2 rounded bg-pink-600 hover:bg-pink-700 text-white font-bold flex justify-center gap-2 items-center"><Send size={16}/> Send Email</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {modalType === 'bug' && (
                            <div>
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600 dark:text-red-400"><Bug size={24} /> Report a Bug</h2>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <input name="name" value={formData.name} onChange={handleFormChange} placeholder="ชื่อผู้ติดต่อ" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded p-3 text-sm focus:border-red-500 outline-none" />
                                        <input name="phone" value={formData.phone} onChange={handleFormChange} placeholder="เบอร์ติดต่อ" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded p-3 text-sm focus:border-red-500 outline-none" />
                                    </div>
                                    <input name="email" value={formData.email} onChange={handleFormChange} placeholder="Email" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded p-3 text-sm focus:border-red-500 outline-none" />
                                    <textarea name="details" value={formData.details} onChange={handleFormChange} placeholder="รายละเอียด Bug ที่เจอ..." rows={4} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded p-3 text-sm focus:border-red-500 outline-none" />
                                    <div className="flex gap-2 pt-2">
                                        <button onClick={handleResetForm} className="flex-1 py-2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex justify-center gap-2 items-center"><RotateCcw size={16}/> Reset</button>
                                        <button onClick={() => handleSendEmail('bug')} className="flex-[2] py-2 rounded bg-red-600 hover:bg-red-700 text-white font-bold flex justify-center gap-2 items-center"><Send size={16}/> Send Report</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
                    <div className="p-3 bg-blue-100 dark:bg-blue-600/20 rounded-xl text-blue-600 dark:text-blue-400 w-fit"><LayoutDashboard size={32} /></div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">Engineering Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Select a tool to begin your design or analysis.</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-8 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-hide">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition-all whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'bg-white dark:bg-[#151F32] text-blue-600 dark:text-blue-400 border-blue-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border-transparent'}`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in pb-10">
                    {toolsData[activeTab].map((tool, index) => (
                        <div key={index} onClick={() => handleCardClick(tool)} className={`group relative bg-white dark:bg-[#151F32] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all duration-300 flex flex-col h-full ${tool.status === 'available' ? 'hover:border-blue-400 hover:shadow-md cursor-pointer hover:-translate-y-1' : 'opacity-70 cursor-not-allowed'}`}>
                            <div className={`h-32 bg-gradient-to-br ${tool.status === 'available' ? 'from-blue-50 to-slate-50 dark:from-blue-900/20 dark:to-[#0B1120]' : 'from-slate-100 to-slate-200 dark:from-slate-800/40'} flex items-center justify-center relative overflow-hidden shrink-0`}>
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-400 to-transparent"></div>
                                <div className={`transition-transform duration-300 ${tool.status === 'available' ? 'group-hover:scale-110' : ''}`}>{tool.icon}</div>
                                <div className="absolute top-3 right-3 flex gap-2">
                                    {tool.status === 'porting' && <span className="bg-orange-100 dark:bg-orange-600 text-orange-600 dark:text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase animate-pulse">Porting Code</span>}
                                    {tool.isNew && <span className="bg-green-100 dark:bg-green-600 text-green-600 dark:text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase animate-pulse">New</span>}
                                    {tool.isPro && <span className="bg-yellow-100 dark:bg-yellow-600 text-yellow-700 dark:text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase flex items-center gap-1"><Lock size={10}/> Pro</span>}
                                    {tool.status === 'coming_soon' && <span className="bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Soon</span>}
                                </div>
                            </div>
                            <div className="p-5 flex flex-col flex-1">
                                <h3 className={`text-lg font-bold mb-2 transition-colors ${tool.status === 'available' ? 'text-slate-800 dark:text-slate-100 group-hover:text-blue-600' : 'text-slate-400'}`}>{tool.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 line-clamp-3 leading-relaxed flex-1">{tool.description}</p>
                                <div className={`flex items-center text-xs font-bold mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/50 ${tool.status === 'available' ? 'text-blue-600 dark:text-blue-500' : 'text-slate-400'}`}>
                                    {tool.status === 'available' ? <>Open <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform"/></> : tool.status === 'porting' ? <><Hammer size={12}/> In Progress</> : <><Lock size={12}/> Development</>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;