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

    // 🔒 ฟังก์ชันความปลอดภัย: เช็คว่า User ยังมีตัวตนจริงๆ ใน Server ไหม?
    const validateUserSession = async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            console.warn("Security Alert: User not found or token invalid. Forcing logout.");
            await supabase.auth.signOut();
            setSession(null);
            setIsPro(false);
            return null;
        }
        return user;
    };

    useEffect(() => {
        // 1. Initialize PostHog
        posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
            api_host: import.meta.env.VITE_POSTHOG_HOST,
            person_profiles: 'identified_only',
            capture_pageview: false 
        });

        // 2. Start Session Check
        const initSession = async () => {
            setIsLoading(true);
            
            // เช็ค Session ในเครื่องก่อน (เร็ว)
            const { data: { session: localSession } } = await supabase.auth.getSession();
            
            if (localSession) {
                // ถ้ามี Session -> ยิงไปเช็คกับ Server อีกที (ช้ากว่านิดนึงแต่ชัวร์)
                const validUser = await validateUserSession();
                
                if (validUser) {
                    setSession(localSession);
                    checkProStatus(validUser.id);
                    identifyPostHogUser(validUser);
                }
            } else {
                setIsLoading(false); // ไม่มี Session เลิกโหลดเลย
            }
            
            // จบการโหลด (กรณีมี validUser จะไปจบใน checkProStatus หรือจบตรงนี้ถ้าไม่มี)
            if (!localSession) setIsLoading(false);
        };

        initSession();

        // 3. Listen for Auth Changes (Login/Logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setIsPro(false);
                posthog.reset();
                setIsLoading(false);
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                 if (session) {
                    setSession(session);
                    checkProStatus(session.user.id);
                    identifyPostHogUser(session.user);
                 }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const identifyPostHogUser = (user: any) => {
        if (user) {
            posthog.identify(user.id, {
                email: user.email,
                is_pro: isPro
            });
        }
    };

    const checkProStatus = async (userId: string) => {
        try {
            const { data } = await supabase
                .from('user_profiles')
                .select('subscription_plan')
                .eq('id', userId)
                .single();
            
            const isUserPro = data?.subscription_plan === 'pro';
            setIsPro(isUserPro);
            posthog.people.set({ plan: isUserPro ? 'pro' : 'free' });
        } catch (error) {
            console.error("Error fetching pro status:", error);
        } finally {
            setIsLoading(false); // โหลดเสร็จแน่นอน
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

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