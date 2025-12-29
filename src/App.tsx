import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient'; 
import posthog from 'posthog-js';

// Pages
import Dashboard from './pages/Dashboard'; 
import Login from './pages/Login'; 

// Tools
import RCBeamDesignTool from './tools/RCBeamDesignTool'; 
import RCColumnDesignTool from './tools/RCColumnDesignTool';
import PileCapDesignTool from './tools/PileCapDesignTool';
import RCSlabDesignTool from './tools/RCSlabDesignTool';
import IsolatedFootingTool from './tools/IsolatedFootingTool';
import StaircaseDesignTool from './tools/StaircaseDesignTool';
import RetainingWallTool from './tools/RetainingWallTool';

const App = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [isPro, setIsPro] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // 🛡️ ฟังก์ชันความปลอดภัยที่เสถียรขึ้น
    const validateUserIntegrity = async (currentSession: Session) => {
        try {
            console.log("Checking User Integrity...");
            // 1. เช็ค Auth User จาก Server โดยตรง (ไม่ผ่าน cache)
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw new Error("Auth User missing");

            // 2. เช็ค Profile ว่ายังไม่โดนลบ
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('subscription_plan')
                .eq('id', user.id)
                .single();

            if (profileError || !profile) throw new Error("Profile missing");

            console.log("User Validated:", user.email);
            return { user, profile };

        } catch (error) {
            console.warn("Validation Failed:", error);
            // ถ้าเช็คแล้ว "ไม่มีตัวตนจริง" ถึงค่อยสั่ง Logout
            await handleLogout();
            return null;
        }
    };

    // 🔥 ปรับ handleLogout ให้ "สุภาพ" ขึ้น ไม่ล้าง localStorage ทั้งหมด 
    // เพื่อให้ Browser ยังพอจำ session สำคัญตอน Refresh ได้
    const handleLogout = async () => {
        console.log("Logging out...");
        setSession(null);
        setIsPro(false);
        posthog.reset();
        
        // ลบเฉพาะกุญแจของ Supabase (ถ้ามี)
        await supabase.auth.signOut();
        
        // ไม่ต้องใช้ window.location.replace('/') เพื่อกันหน้าจอวูบวาบตอน Refresh
    };

    // 🚀 Effect หลัก
    useEffect(() => {
        let mounted = true;

        // 1. Init PostHog (Safe Mode)
        if (import.meta.env.VITE_POSTHOG_KEY) {
            try {
                posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
                    api_host: import.meta.env.VITE_POSTHOG_HOST,
                    person_profiles: 'identified_only',
                    capture_pageview: false 
                });
            } catch (e) { console.error("PostHog Init Error", e); }
        }

        const initializeApp = async () => {
            try {
                // 🔍 จุดสำคัญ: ใช้ getSession เพื่อดึงสถานะเดิมกลับมาให้ไวที่สุดตอน F5
                const { data: { session: localSession } } = await supabase.auth.getSession();
                
                if (localSession && mounted) {
                    // ตั้งค่า session เบื้องต้นทันทีเพื่อไม่ให้หน้าจอเด้งไปหน้า Login
                    setSession(localSession);
                    
                    // แล้วค่อยตรวจสอบความถูกต้องเบื้องหลัง
                    const validData = await validateUserIntegrity(localSession);
                    
                    if (validData && mounted) {
                        const isUserPro = validData.profile.subscription_plan === 'pro';
                        setIsPro(isUserPro);
                        
                        if (import.meta.env.VITE_POSTHOG_KEY) {
                            posthog.identify(validData.user.id, { 
                                email: validData.user.email, 
                                is_pro: isUserPro 
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("App Init Error:", error);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        initializeApp();

        // 🚨 SAFETY VALVE: บังคับหยุดโหลด
        const safetyTimer = setTimeout(() => {
            if (mounted && isLoading) {
                setIsLoading(false);
            }
        }, 3000);

        // 4. Listener สำหรับดักจับการ Login/Logout
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setIsPro(false);
            } else if (event === 'SIGNED_IN' && newSession) {
                setSession(newSession);
                const validData = await validateUserIntegrity(newSession);
                if (validData) {
                    setIsPro(validData.profile.subscription_plan === 'pro');
                }
            }
        });

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                <p className="text-slate-400 text-sm animate-pulse">Checking access...</p>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <div className="font-sans">
                {session && (
                    <div className="fixed bottom-5 left-5 z-[9999] flex gap-2 print:hidden">
                        <div className={`px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 ${isPro ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-white'}`}>
                            {isPro ? '👑 PRO MEMBER' : '👤 FREE MEMBER'}
                        </div>
                        <button onClick={handleLogout} className="px-4 py-2 rounded-full text-xs font-bold shadow-lg bg-red-600 text-white hover:bg-red-700">LOGOUT</button>
                    </div>
                )}

                <Routes>
                    {/* ใช้ session เป็นตัวตัดสินหลักเพื่อความนิ่งตอน Refresh */}
                    <Route path="/" element={session ? <Dashboard /> : <Login />} />
                    
                    <Route path="/rc-beam" element={session ? <RCBeamDesignTool isPro={isPro} onBack={() => window.history.back()} /> : <Navigate to="/" replace />} />
                    <Route path="/rc-column" element={session ? <RCColumnDesignTool isPro={isPro} onBack={() => window.history.back()} /> : <Navigate to="/" replace />} />
                    <Route path="/pile-cap" element={session ? <PileCapDesignTool onBack={() => window.history.back()} isPro={isPro} /> : <Navigate to="/" replace />} />
                    <Route path="/rc-slab" element={session ? <RCSlabDesignTool isPro={isPro} onBack={() => window.history.back()} /> : <Navigate to="/" replace />} />
                    <Route path="/isolated-footing" element={session ? <IsolatedFootingTool isPro={isPro} onBack={() => window.history.back()} /> : <Navigate to="/" replace />} />
                    <Route path="/staircase" element={session ? <StaircaseDesignTool isPro={isPro} onBack={() => window.history.back()} /> : <Navigate to="/" replace />} />
                    <Route path="/retaining-wall" element={session ? <RetainingWallTool isPro={isPro} onBack={() => window.history.back()} /> : <Navigate to="/" replace />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
};

export default App;