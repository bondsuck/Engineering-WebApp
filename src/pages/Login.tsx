import React, { useState } from 'react';
// ✅ แก้ Import ให้ตรง
import { supabase } from '../lib/supabaseClient'; 
import { Lock, Mail, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

// ข้อความยินยอม (Consent)
const CONSENT_TEXT = `ข้อกำหนดและเงื่อนไขการให้บริการ (Terms of Service)
ฉบับปรับปรุงล่าสุด: 23 ธันวาคม 2568

1. บทนำ
ยินดีต้อนรับสู่ Structural Calculation Tool ("แพลตฟอร์ม") 

2. การรักษาความปลอดภัยบัญชี
ผู้ใช้งานมีหน้าที่รักษาความลับของรหัสผ่านและข้อมูลบัญชีของตน

3. ข้อจำกัดความรับผิด (Disclaimer)
แพลตฟอร์มนี้เป็นเพียงเครื่องมือช่วยอำนวยความสะดวกในการคำนวณทางวิศวกรรมเท่านั้น ผู้ใช้งานต้องตรวจสอบความถูกต้องก่อนนำไปใช้งานจริงเสมอ

4. การสื่อสารและการประชาสัมพันธ์ (Marketing Consent)
ผู้ใช้งานยินยอมให้ทางผู้พัฒนาจัดเก็บข้อมูล "อีเมล" และข้อมูลการติดต่อ เพื่อนำเสนอข้อมูลข่าวสาร อัปเดตซอฟต์แวร์ หรือสิทธิพิเศษต่างๆ ในอนาคต
`;

export default function Login() {
    const [isLoginView, setIsLoginView] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Form States
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fname, setFname] = useState("");
    const [lname, setLname] = useState("");
    const [phone, setPhone] = useState("");
    const [agreed, setAgreed] = useState(false);

    const switchTab = (toLogin: boolean) => {
        setIsLoginView(toLogin);
        setErrorMsg(null);
        setSuccessMsg(null);
    };

    // 🔑 ฟังก์ชัน Login (ผสาน Logic เดิม + Supabase)
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setErrorMsg(null); setSuccessMsg(null);
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            
            if (data.user) {
                // ตรวจสอบการอนุมัติ (Check Approval Status)
                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('is_approved, subscription_plan')
                    .eq('id', data.user.id)
                    .single();
                
                // ถ้าไม่เจอ Profile (อาจเป็นเคสเก่า) ให้ถือว่ายังไม่อนุมัติ หรือให้ผ่านถ้าไม่มีระบบนี้
                if (profileError && profileError.code !== 'PGRST116') throw profileError;

                if (profile) {
                    if (profile.is_approved) {
                        // ผ่าน! App.tsx จะจับ Session เอง
                    } else {
                        // ยังไม่อนุมัติ -> Sign Out ทันที
                        await supabase.auth.signOut();
                        throw new Error("⏳ บัญชีของคุณอยู่ระหว่างการรออนุมัติจากแอดมิน");
                    }
                }
            }
        } catch (err: any) { 
            setErrorMsg(err.message || "การเข้าสู่ระบบล้มเหลว"); 
        } finally { 
            setLoading(false); 
        }
    };

    // 📝 ฟังก์ชันลงทะเบียน (Register)
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreed) { setErrorMsg("กรุณายอมรับเงื่อนไขการใช้บริการ"); return; }
        
        setLoading(true); setErrorMsg(null); setSuccessMsg(null);
        
        try {
            // 1. สร้าง User Auth
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;

            if (data.user) {
                // 2. บันทึก Profile ลง Database
                const { error: insertError } = await supabase.from('user_profiles').insert([{
                    id: data.user.id,
                    email: email,
                    first_name: fname,
                    last_name: lname,
                    phone_number: phone,
                    consent_agreed: true,
                    is_approved: false, // Default รออนุมัติ
                    subscription_plan: 'demo'
                }]);

                if (insertError) throw insertError;
                
                setSuccessMsg("✅ ลงทะเบียนสำเร็จ! ข้อมูลของคุณถูกส่งไปรอการอนุมัติแล้ว");
                setPassword(""); 
                // ไม่ต้อง Login อัตโนมัติ เพราะต้องรออนุมัติ
            }
        } catch (err: any) { 
            setErrorMsg(err.message || "การลงทะเบียนล้มเหลว"); 
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 font-sans">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-8 text-center border-b border-slate-100 dark:border-slate-800">
                    <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-2xl shadow-lg mb-4 text-white">
                        <Lock size={28} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Structural Calc Tool</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Professional Engineering Suite</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <button onClick={() => switchTab(true)} className={`flex-1 py-4 text-sm font-bold transition-all ${isLoginView ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30 dark:bg-blue-900/10' : 'text-slate-400 hover:text-slate-600'}`}>เข้าสู่ระบบ</button>
                    <button onClick={() => switchTab(false)} className={`flex-1 py-4 text-sm font-bold transition-all ${!isLoginView ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30 dark:bg-blue-900/10' : 'text-slate-400 hover:text-slate-600'}`}>ลงทะเบียนใหม่</button>
                </div>

                <div className="p-8">
                    {/* Alerts */}
                    {errorMsg && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-3 text-sm text-red-600 dark:text-red-400"><AlertTriangle size={18} className="shrink-0 mt-0.5"/><span>{errorMsg}</span></div>}
                    {successMsg && <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl flex items-start gap-3 text-sm text-green-600 dark:text-green-400"><CheckCircle size={18} className="shrink-0 mt-0.5"/><span>{successMsg}</span></div>}

                    {isLoginView ? (
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">อีเมล</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                                    <input type="email" required placeholder="your@email.com" className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">รหัสผ่าน</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                                    <input type="password" required placeholder="••••••••" className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]">
                                {loading ? <Loader2 className="animate-spin" size={22}/> : "เข้าสู่ระบบ"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">ชื่อจริง</label><input type="text" className="w-full px-4 py-3 border dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-white" value={fname} onChange={e => setFname(e.target.value)} required /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">นามสกุล</label><input type="text" className="w-full px-4 py-3 border dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-white" value={lname} onChange={e => setLname(e.target.value)} required /></div>
                            </div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">เบอร์โทรศัพท์</label><input type="tel" className="w-full px-4 py-3 border dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-white" value={phone} onChange={e => setPhone(e.target.value)} required /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">อีเมลสมาชิก</label><input type="email" className="w-full px-4 py-3 border dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-white" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">ตั้งรหัสผ่าน</label><input type="password" placeholder="Min. 6 characters" className="w-full px-4 py-3 border dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-white" value={password} onChange={e => setPassword(e.target.value)} required /></div>
                            
                            <div className="h-32 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-[11px] text-slate-500 leading-relaxed shadow-inner"><pre className="whitespace-pre-wrap font-sans">{CONSENT_TEXT}</pre></div>
                            <label className="flex items-start gap-3 cursor-pointer p-1"><input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span className="text-xs text-slate-600 dark:text-slate-400 font-medium">ข้าพเจ้ายอมรับข้อตกลงและเงื่อนไข และยินยอมให้จัดเก็บอีเมลเพื่อการสื่อสาร</span></label>
                            
                            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl mt-2 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-[0.98]">
                                {loading ? <Loader2 className="animate-spin" size={22}/> : "ยืนยันการสมัครสมาชิก"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};