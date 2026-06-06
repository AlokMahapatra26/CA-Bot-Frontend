'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { FileText, Lock, Mail, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

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

      // Auto-sign in after signup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        // If auto-signin fails, show success message
        setSignupSuccess(true);
        return;
      }

      // Redirect to onboarding to create company
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#eff6ff] rounded-full mb-6">
            <UserPlus className="w-8 h-8 text-[#1d4ed8]" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">Account Created</h1>
          <p className="text-[14px] text-[#475569] mt-3 leading-relaxed">
            Your account has been created successfully. You can now sign in to set up your firm profile.
          </p>
          <button
            onClick={() => { setSignupSuccess(false); setMode('login'); }}
            className="mt-8 w-full py-3 bg-[#0f172a] text-white text-[13px] font-bold rounded-xl hover:bg-[#1e293b] transition-all shadow-md cursor-pointer"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Left Panel: Corporate Imagery (Hidden on Mobile) */}
      <div className="hidden lg:flex relative w-1/2 bg-[#050f24] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/login-bg.png" 
            alt="Corporate Environment" 
            className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050f24] via-[#0a192f]/80 to-transparent" />
        </div>
        <div className="relative z-10 p-16 text-white max-w-2xl w-full">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl mb-8 shadow-2xl">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-[40px] leading-[1.1] font-bold tracking-tight mb-6">
            Elevate your practice with CA-BOT.
          </h2>
          <p className="text-lg text-blue-100/70 leading-relaxed font-light max-w-md">
            The enterprise-grade platform for modern firms. Manage clients, automate complex filings, and scale your operations securely.
          </p>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile Branding */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-[#0f172a] rounded-xl mb-4 shadow-md">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">CA-BOT</h1>
          </div>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#0f172a] tracking-tight mb-2">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-[14px] text-[#475569]">
              {mode === 'login' ? 'Enter your credentials to access your firm.' : 'Register your firm and start automating today.'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-[#f1f5f9] p-1 rounded-xl mb-8">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                mode === 'login' 
                  ? 'bg-white text-[#0f172a] shadow-sm' 
                  : 'text-[#64748b] hover:text-[#334155]'
              }`}
            >
              <LogIn className="w-4 h-4" /> Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                mode === 'signup' 
                  ? 'bg-white text-[#0f172a] shadow-sm' 
                  : 'text-[#64748b] hover:text-[#334155]'
              }`}
            >
              <UserPlus className="w-4 h-4" /> Sign Up
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={mode === 'login' ? handleLogin : handleSignUp}
            className="space-y-5"
          >
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg px-4 py-3 text-[12px] text-red-800 font-medium shadow-sm">
                {error}
              </div>
            )}

            {/* Full Name (Sign Up only) */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-[#334155]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alok Mahapatra"
                  required
                  className="w-full px-4 py-3 text-[13px] bg-white border border-[#cbd5e1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f172a]/20 focus:border-[#0f172a] transition-all placeholder:text-[#94a3b8] shadow-sm"
                />
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-[#334155]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 text-[13px] bg-white border border-[#cbd5e1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f172a]/20 focus:border-[#0f172a] transition-all placeholder:text-[#94a3b8] shadow-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-[#334155]">
                  Password
                </label>
                {mode === 'login' && (
                  <span className="text-[11px] font-medium text-[#1d4ed8] cursor-pointer hover:underline">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8] pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
                  required
                  minLength={mode === 'signup' ? 6 : undefined}
                  className="w-full pl-11 pr-11 py-3 text-[13px] bg-white border border-[#cbd5e1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f172a]/20 focus:border-[#0f172a] transition-all placeholder:text-[#94a3b8] shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#334155] transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-[#0f172a] text-white text-[13px] font-bold rounded-xl hover:bg-[#1e293b] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{mode === 'login' ? 'Authenticating...' : 'Setting up account...'}</span>
                </>
              ) : (
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
