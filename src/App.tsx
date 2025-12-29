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

    // 🔒 ฟังก์ชันความปลอดภัย: เช็ค User + Profile
    const validateUserIntegrity = async () => {
        try {
            // 1. เช็ค Auth
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw new Error("Auth missing");

            // 2. เช็ค Profile
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('subscription_plan')
                .eq('id', user.id)
                .single();

            if (profileError || !profile) throw new Error("Profile missing");

            return { user, profile };
        } catch (error) {
            console.warn("User validation failed:", error);
            await handleLogout(); // สั่ง Logout ทันทีถ้ามีปัญหา
            return null;
        }
    };

    const handleLogout = async () => {
        // Clear session ก่อนสั่ง signOut เพื่อป้องกัน UI ค้าง
        setSession(null);
        setIsPro(false);
        posthog.reset();
        await supabase.auth.signOut();
    };

    const identifyPostHogUser = (user: any, isProStatus: boolean) => {
        // เช็คก่อนว่ามี Key ไหม เพื่อกันแอปพัง
        if (user && import.meta.env.VITE_POSTHOG_KEY) {
            posthog.identify(user.id, {
                email: user.email,
                is_pro: isProStatus
            });
        }
    };

    useEffect(() => {
        // 1. Init PostHog (Safe Mode)
        if (import.meta.env.VITE_POSTHOG_KEY) {
            try {
                posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
                    api_host: import.meta.env.VITE_POSTHOG_HOST,
                    person_profiles: 'identified_only',
                    capture_pageview: false 
                });
            } catch (e) {
                console.error("PostHog Init Error:", e);
            }
        }

        // 2. Start Session Check
        const initSession = async () => {
            setIsLoading(true);
            try {
                // เช็ค Local Session ก่อน
                const { data: { session: localSession } } = await supabase.auth.getSession();
                
                if (localSession) {
                    // ถ้ามี Local ให้เช็ค Server ต่อ
                    const validData = await validateUserIntegrity();
                    
                    if (validData) {
                        setSession(localSession);
                        const isUserPro = validData.profile.subscription_plan === 'pro';
                        setIsPro(isUserPro);
                        identifyPostHogUser(validData.user, isUserPro);
                    } else {
                        // ถ้าไม่ผ่าน validateUserIntegrity มันจะสั่ง Logout ไปแล้ว
                        // แต่เรา setSession null ซ้ำอีกทีเพื่อความชัวร์
                        setSession(null);
                    }
                }
            } catch (error) {
                console.error("Session Init Error:", error);
                setSession(null);
            } finally {
                // ✅ สำคัญมาก: ไม่ว่าจะเกิดอะไรขึ้น ต้องสั่งให้หยุดโหลดเสมอ!
                setIsLoading(false);
            }
        };

        initSession();

        // 3. Auth Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setIsPro(false);
                setIsLoading(false);
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                 if (session) {
                    // ถ้า User Login เข้ามาใหม่ ให้ validate อีกรอบ
                    const validData = await validateUserIntegrity();
                    if (validData) {
                        setSession(session);
                        const isUserPro = validData.profile.subscription_plan === 'pro';
                        setIsPro(isUserPro);
                    }
                 }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
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