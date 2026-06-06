'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { createCompany } from '@/app/actions';
import { Building2, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user already has a company, redirect to dashboard
  if (profile?.company_id) {
    router.push('/');
    return null;
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setError(null);
    setLoading(true);

    try {
      const result = await createCompany(user.id, companyName);

      if (!result.success) {
        setError(result.error || 'Failed to create company.');
        return;
      }

      // Refresh the profile to pick up the new company_id and admin role
      await refreshProfile();

      // Hard redirect to force full session refresh (new JWT with company_id)
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white border border-[#e0e0e0] rounded-2xl mb-4 shadow-sm">
            <Building2 className="w-7 h-7 text-[#333]" />
          </div>
          <h1 className="text-[20px] font-bold text-[#111] tracking-tight">Set Up Your Firm</h1>
          <p className="text-[12px] text-[#888] mt-1.5 font-medium leading-relaxed max-w-sm mx-auto">
            Create your firm to start managing clients, filings, and your team — all from one dashboard.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateCompany} className="bg-white border border-[#e0e0e0] rounded-xl p-6 shadow-sm space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-[11px] text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Welcome text */}
          <div className="bg-[#fafafa] border border-[#eee] rounded-lg px-4 py-3">
            <p className="text-[11px] text-[#555] font-medium leading-relaxed">
              Welcome, <strong className="text-[#111]">{profile?.full_name || user?.email || 'there'}</strong>! 
              Enter your firm or company name below. You'll be set as the <strong className="text-[#111]">Admin</strong> with 
              full access to create team members, manage clients, and configure the system.
            </p>
          </div>

          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">
              Firm / Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. ABC & Associates, Chartered Accountants"
              required
              autoFocus
              className="w-full px-3 py-3 text-[13px] bg-[#fafafa] border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] focus:bg-white transition-all placeholder:text-[#bbb]"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !companyName.trim()}
            className="w-full py-3 bg-[#111] text-white text-[12px] font-bold rounded-lg hover:bg-[#333] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating Your Firm...</span>
              </>
            ) : (
              <>
                <span>Create Firm & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-[9px] text-[#aaa] mt-6 font-medium tracking-wide">
          You can change this name anytime from the settings.
        </p>
      </div>
    </div>
  );
}
