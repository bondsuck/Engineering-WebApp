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

    // 🛡️ ฟังก์ชันความปลอดภัย (แยกออกมาเพื่อให้ code อ่านง่าย)
    const validateUserIntegrity = async (currentSession: Session) => {
        try {
            console.log("Checking User Integrity...");
            // 1. เช็ค Auth User
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw new Error("Auth User missing");

            // 2. เช็ค Profile
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
            // ถ้าเช็คไม่ผ่าน ให้ Logout ทิ้ง
            await handleLogout();
            return null;
        }
    };

    const handleLogout = async () => {
        console.log("Logging out...");
        setSession(null);
        setIsPro(false);
        posthog.reset();
        await supabase.auth.signOut();
        // ไม่ต้อง set isLoading ที่นี่ เพราะจะจัดการใน useEffect หลัก
    };

    // 🚀 Effect หลัก: ทำงานครั้งเดียวตอนเข้าเว็บ
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

        // 2. ฟังก์ชันเริ่มระบบ
        const initializeApp = async () => {
            try {
                // เช็ค Session ในเครื่องก่อน
                const { data: { session: localSession } } = await supabase.auth.getSession();
                
                if (localSession && mounted) {
                    // ถ้ามี Session ให้ Validate กับ Server
                    const validData = await validateUserIntegrity(localSession);
                    
                    if (validData && mounted) {
                        setSession(localSession);
                        const isUserPro = validData.profile.subscription_plan === 'pro';
                        setIsPro(isUserPro);
                        
                        // Track User
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
                if (mounted) setIsLoading(false); // ✅ บรรทัดนี้สำคัญสุด: สั่งหยุดโหลดเสมอ
            }
        };

        initializeApp();

        // 3. 🚨 SAFETY VALVE: วาล์วนิรภัย
        // ถ้าผ่านไป 3 วินาทีแล้วยังหมุนอยู่ ให้บังคับหยุดหมุนทันที
        const safetyTimer = setTimeout(() => {
            if (mounted && isLoading) {
                console.warn("Forcing loading stop (Timeout)");
                setIsLoading(false);
            }
        }, 3000);

        // 4. Listener สำหรับการ Login/Logout ภายหลัง
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setIsPro(false);
            } else if (event === 'SIGNED_IN' && session) {
                setSession(session);
                // เช็ค Profile อีกรอบตอน Login สำเร็จ
                const validData = await validateUserIntegrity(session);
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
                <p className="text-slate-400 text-sm animate-pulse">Loading System...</p>
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
                    <Route path="/" element={session ? <Dashboard /> : <Login />} />
                    
                    {/* Tools Routes */}
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