'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'hod' | 'employee';
}

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    let mounted = true;

    async function getSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          if (mounted) setUser(session.user);
          
          // Fetch custom user profile (role, full_name)
          const { data: prof, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (!error && prof) {
            if (mounted) setProfile(prof as UserProfile);
          } else {
            console.error('Failed to load profile details:', error);
          }
        }
      } catch (err) {
        console.error('Auth error retrieving session:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    getSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (mounted) setUser(session.user);
        
        // Fetch profile details
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (prof) {
          if (mounted) setProfile(prof as UserProfile);
        }
      } else {
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Exclude login screen from getting blocked by auth context loading state to ensure visual responsiveness
  const isLoginPage = pathname === '/login';

  if (loading && !isLoginPage) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white gap-2">
        <div className="w-5 h-5 border-2 border-t-[#2563eb] border-slate-200 rounded-full animate-spin" />
        <span className="text-[11px] text-slate-500 font-medium tracking-wide">Validating session...</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
