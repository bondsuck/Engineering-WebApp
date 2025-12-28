import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient'; 
import posthog from 'posthog-js'; // ✅ 1. อย่าลืม Import PostHog

// Pages
import Dashboard from './pages/Dashboard'; 
import Login from './pages/Login'; 

// Tools
import RCBeamDesignTool from './tools/RCBeamDesignTool'; 
import RCColumnDesignTool from './tools/RCColumnDesignTool';
import PileCapDesignTool from './tools/PileCapDesignTool';

const App = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [isPro, setIsPro] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        // ✅ 2. Initialize PostHog (โค้ดส่วนนี้หายไปครับ ผมเติมให้แล้ว)
        posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
            api_host: import.meta.env.VITE_POSTHOG_HOST,
            person_profiles: 'identified_only',
            capture_pageview: false 
        });

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                checkProStatus(session.user.id);
                identifyPostHogUser(session.user); // ✅ Identify User
            } else {
                setIsLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                checkProStatus(session.user.id);
                identifyPostHogUser(session.user); // ✅ Identify User
            } else {
                setIsPro(false);
                setIsLoading(false);
                posthog.reset(); // ✅ Reset PostHog เมื่อ Logout
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // ✅ ฟังก์ชันช่วยส่งข้อมูลให้ PostHog
    const identifyPostHogUser = (user: any) => {
        if (user) {
            posthog.identify(user.id, {
                email: user.email,
                is_pro: isPro // ส่งสถานะ Pro ไปด้วย
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
                
            // ❌ แบบเก่า (ที่ Error):
            //const isUserPro = data && data.subscription_plan === 'pro'; 

            // ✅ แบบใหม่ (แก้แล้ว): ใช้ ?. จะได้ค่า true/false เสมอ ไม่หลุด null
            const isUserPro = data?.subscription_plan === 'pro';

            setIsPro(isUserPro);
            
            // อัปเดตสถานะใน PostHog
            posthog.people.set({ plan: isUserPro ? 'pro' : 'free' });

        } catch (error) {
            console.error("Error fetching pro status:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsPro(false);
        posthog.reset();
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
                    
                    {/* RC Beam Route */}
                    <Route 
                        path="/rc-beam" 
                        element={session ? <RCBeamDesignTool isPro={isPro} onBack={() => window.history.back()} /> : <Navigate to="/" replace />} 
                    />

                    {/* RC Column Route */}
                    <Route 
                        path="/rc-column" 
                        element={session ? <RCColumnDesignTool isPro={isPro} onBack={() => window.history.back()} /> : <Navigate to="/" replace />} 
                    />

                    {/* Pile Cap Route */}
                    <Route 
                        path="/pile-cap" 
                        element={
                            session ? (
                                <PileCapDesignTool 
                                    onBack={() => window.history.back()} 
                                    isPro={isPro} 
                                />
                            ) : (
                                <Navigate to="/" replace />
                            )
                        } 
                    />
                </Routes>
            </div>
        </BrowserRouter>
    );
};

export default App;