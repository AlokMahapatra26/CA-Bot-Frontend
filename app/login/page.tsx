'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { Lock, Mail, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [ctrlAPressCount, setCtrlAPressCount] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setCtrlAPressCount(prev => prev + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowser();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowser();
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setSignupSuccess(true);
        return;
      }

      router.push('/onboarding');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-full max-w-md p-8 bg-white border border-[#e2e8f0] rounded-2xl shadow-xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#eef2ff] rounded-full mb-6">
            <UserPlus className="w-8 h-8 text-[#1a3a5c]" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">Account Created</h1>
          <p className="text-[14px] text-[#475569] mt-3 leading-relaxed">
            Your account has been created successfully. You can now sign in.
          </p>
          <button
            onClick={() => { setSignupSuccess(false); setMode('login'); }}
            className="mt-8 w-full py-3 bg-[#1a3a5c] text-white text-[13px] font-bold rounded-xl hover:bg-[#0f2a44] transition-all shadow-md cursor-pointer"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-white font-sans antialiased">
      {/* Left Panel: Background Image with Company Branding */}
      <div className="hidden lg:flex relative w-[55%] items-center justify-center overflow-hidden">
        {/* Background Image */}
        <img
          src="/login-bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-[#0a1628]/80" />

        {/* Content */}
        <div className="relative z-10 text-center px-12">
          {/* Firm Name as styled text */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-4">
              <div className="w-16 h-16 border-2 border-white/80 rounded-lg flex items-center justify-center">
                <span className="text-white text-2xl font-bold tracking-tight">CA</span>
              </div>
              <div className="text-left">
                <h1 className="text-white text-[28px] font-bold tracking-tight leading-tight">
                  G.B. LADDHA & Co. LLP
                </h1>
                <p className="text-white/60 text-[14px] tracking-[0.3em] font-light">
                  Chartered Accountants
                </p>
              </div>
            </div>
          </div>

          <div className="w-20 h-[1px] bg-white/20 mx-auto mt-6 mb-8" />

          {/* What this portal does */}
          <div className="max-w-md mx-auto space-y-4 text-left">
            <p className="text-white/80 text-[14px] leading-relaxed text-center">
              Manage your entire CA practice from one dashboard
            </p>
            <div className="space-y-3 mt-6">
              <div className="flex items-start gap-3">
                <span className="text-white/60 text-[13px] mt-0.5">•</span>
                <p className="text-white/60 text-[13px] leading-relaxed">Collect client documents via WhatsApp automatically</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-white/60 text-[13px] mt-0.5">•</span>
                <p className="text-white/60 text-[13px] leading-relaxed">Track ITR filings, DSC applications & compliance status</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-white/60 text-[13px] mt-0.5">•</span>
                <p className="text-white/60 text-[13px] leading-relaxed">Send automated reminders for pending documents & deadlines</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-white/60 text-[13px] mt-0.5">•</span>
                <p className="text-white/60 text-[13px] leading-relaxed">Broadcast messages to all clients in one click</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[360px]">
          {/* Mobile Branding */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="w-10 h-10 border-2 border-[#1a3a5c] rounded-md flex items-center justify-center">
                <span className="text-[#1a3a5c] text-sm font-bold">CA</span>
              </div>
              <div className="text-left">
                <h1 className="text-[#0f172a] text-[16px] font-bold tracking-tight leading-tight">
                  G.B. LADDHA & Co. LLP
                </h1>
                <p className="text-slate-500 text-[10px] tracking-[0.2em]">
                  Chartered Accountants
                </p>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight mb-2">
              {mode === 'login' ? 'Welcome back' : 'Create Account'}
            </h1>
            <p className="text-[13px] text-slate-500">
              {mode === 'login'
                ? 'Sign in to access your dashboard.'
                : 'Set up your account to get started.'}
            </p>
          </div>

          {/* Mode Tabs */}
          {ctrlAPressCount >= 5 && (
            <div className="flex bg-slate-100 p-0.5 rounded-lg mb-6 border border-slate-200">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 py-2 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); }}
                className={`flex-1 py-2 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Sign Up
              </button>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={mode === 'login' ? handleLogin : handleSignUp}
            className="space-y-5"
          >
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[12px] text-red-800 font-medium">
                {error}
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alok Mahapatra"
                  required
                  className="w-full px-4 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#1a3a5c] focus:ring-1 focus:ring-[#1a3a5c]/20 transition-all placeholder:text-slate-400"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gbladdha.com"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#1a3a5c] focus:ring-1 focus:ring-[#1a3a5c]/20 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
                  required
                  minLength={mode === 'signup' ? 6 : undefined}
                  className="w-full pl-10 pr-10 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#1a3a5c] focus:ring-1 focus:ring-[#1a3a5c]/20 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 bg-[#1a3a5c] hover:bg-[#0f2a44] text-white text-[12px] font-bold uppercase tracking-wider rounded-xl active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#1a3a5c]/20"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{mode === 'login' ? 'Signing in...' : 'Registering...'}</span>
                </>
              ) : (
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-10 text-center">
            <p className="text-[10px] text-slate-400">
              G.B. Laddha & Co. LLP · Chartered Accountants
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
