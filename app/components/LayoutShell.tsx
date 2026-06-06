'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from './AuthProvider';
import Sidebar from './Sidebar';
import ShortcutHandler from './ShortcutHandler';
import { FeatureToggleProvider, useFeatureToggles } from './FeatureToggleContext';
import { ShieldAlert } from 'lucide-react';

function LayoutShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { features, isMounted } = useFeatureToggles();
  const isLoginPage = pathname === '/login';
  const isOnboardingPage = pathname === '/onboarding';

  // Determine if current path belongs to a disabled feature
  let isBlocked = false;
  let blockedFeatureName = '';

  if (isMounted) {
    if (pathname.startsWith('/bot') && !features.bot) {
      isBlocked = true;
      blockedFeatureName = 'WhatsApp Bot';
    } else if (pathname.startsWith('/chat') && !features.chat) {
      isBlocked = true;
      blockedFeatureName = 'Internal Chat';
    } else if (pathname.startsWith('/clients') && !features.clients) {
      isBlocked = true;
      blockedFeatureName = 'Client Profiles';
    } else if (pathname.startsWith('/itr') && !features.itr) {
      isBlocked = true;
      blockedFeatureName = 'ITR Filing';
    } else if (pathname.startsWith('/gst') && !features.gst) {
      isBlocked = true;
      blockedFeatureName = 'GST Filing';
    } else if (pathname.startsWith('/dsc') && !features.dsc) {
      isBlocked = true;
      blockedFeatureName = 'DSC Management';
    } else if (pathname.startsWith('/team') && !features.team) {
      isBlocked = true;
      blockedFeatureName = 'Team Members';
    }
  }

  // Login and onboarding pages: no sidebar, full screen
  if (isLoginPage || isOnboardingPage) {
    return (
      <main className="flex-1 min-h-screen w-screen overflow-hidden">
        {children}
      </main>
    );
  }

  return (
    <>
      <ShortcutHandler />
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
        {isBlocked ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#fafafa]">
            <div className="max-w-md w-full bg-white border border-[#e5e5e5] rounded-2xl p-8 shadow-sm flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4 border border-amber-100">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">System Access Restriction</span>
              <h1 className="text-[18px] font-bold text-slate-800 tracking-tight mt-1">Module Temporarily Disabled</h1>
              <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">
                The <strong className="font-semibold text-slate-700">{blockedFeatureName}</strong> module has been disabled by the system administrator. 
                If you believe this is an error, please contact support or re-enable the feature in the administration console.
              </p>
              <div className="mt-6 border-t border-[#f0f0f0] pt-4 w-full flex justify-center">
                <a 
                  href="/"
                  className="px-4 py-2 bg-[#111] hover:bg-[#222] text-white rounded-lg text-[11px] font-bold tracking-wide transition-colors"
                >
                  Return to Dashboard
                </a>
              </div>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </>
  );
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FeatureToggleProvider>
        <LayoutShellContent>{children}</LayoutShellContent>
      </FeatureToggleProvider>
    </AuthProvider>
  );
}
