'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { getMyProfile } from '@/app/actions';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'hod' | 'employee';
  department: 'ITR' | 'GST' | 'DSC' | 'ALL';
  company_id: string | null;
}

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createSupabaseBrowser();
  const hasResolved = useRef(false);

  // Helper: fetch profile via server action (bypasses RLS completely)
  async function fetchProfile(userId: string): Promise<UserProfile | null> {
    try {
      const result = await getMyProfile(userId);
      if (result.success && result.profile) {
        return result.profile as UserProfile;
      }
      console.error('Profile fetch failed:', result.error);
      return null;
    } catch (err) {
      console.error('Profile fetch error:', err);
      return null;
    }
  }

  // Expose a way to re-fetch the profile (e.g., after onboarding)
  const refreshProfile = async () => {
    if (user?.id) {
      const prof = await fetchProfile(user.id);
      if (prof) setProfile(prof);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Hard safety timeout — never stay on "Validating session..." forever
    const safetyTimeout = setTimeout(() => {
      if (mounted && !hasResolved.current) {
        console.warn('Auth session check timed out — forcing redirect to login');
        hasResolved.current = true;
        setLoading(false);
        setUser(null);
        setProfile(null);
      }
    }, 4000);

    async function getSession() {
      try {
        // 1. Check if a local session exists first
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          // No local session or invalid session format. Just clear state.
          if (mounted && !hasResolved.current) {
            hasResolved.current = true;
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        // 2. Local session exists! Now verify the user still exists on the server
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          // The server rejected the session (ghost session / user deleted)
          console.warn('Ghost session detected or user deleted:', userError?.message);
          try { await signOut(); } catch {}
          return;
        }

        // 3. Session and User are both valid!
        if (mounted) setUser(user);

        // Fetch profile via server action (bypasses RLS)
        const prof = await fetchProfile(user.id);
        if (prof) {
          if (mounted) setProfile(prof);
        } else {
          // Profile missing and auto-healing failed — user is likely deleted from backend
          console.warn('No profile found for user — forcing signout');
          try { await signOut(); } catch {}
        }
      } catch (err) {
        console.error('Auth error:', err);
        try { await supabase.auth.signOut(); } catch {}
      } finally {
        if (mounted && !hasResolved.current) {
          hasResolved.current = true;
          setLoading(false);
        }
      }
    }

    getSession();

    // Listen for auth state changes (login / logout from other tabs, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      try {
        if (session?.user) {
          if (mounted) setUser(session.user);

          const prof = await fetchProfile(session.user.id);
          if (prof && mounted) {
            setProfile(prof);
          }
        } else {
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Auth state change error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signOut = async () => {
    // 1. Clear all Supabase auth keys from localStorage
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }

    // 2. Clear cookies by expiring them
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach(c => {
        const name = c.split('=')[0].trim();
        if (name.startsWith('sb-') || name.includes('supabase')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
        }
      });
    }

    // 3. Try Supabase network signout (don't block on it)
    try { await supabase.auth.signOut(); } catch {}

    // 4. Hard redirect — forces full page reload, middleware sees no session
    window.location.href = '/login';
  };

  // Public pages that don't require company_id
  const isLoginPage = pathname === '/login';
  const isOnboardingPage = pathname === '/onboarding';

  // Redirect to onboarding if user is authenticated but has no company
  useEffect(() => {
    if (!loading && user && profile && !profile.company_id && !isOnboardingPage && !isLoginPage) {
      router.push('/onboarding');
    }
  }, [loading, user, profile, isOnboardingPage, isLoginPage, router]);

  if (loading && !isLoginPage && !isOnboardingPage) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white gap-2">
        <div className="w-5 h-5 border-2 border-t-[#2563eb] border-slate-200 rounded-full animate-spin" />
        <span className="text-[11px] text-slate-500 font-medium tracking-wide">Validating session...</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
