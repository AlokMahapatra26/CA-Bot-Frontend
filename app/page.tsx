'use client';

import Link from 'next/link';
import { Wifi, Users, FileText, Landmark, Key } from 'lucide-react';
import { useFeatureToggles } from '@/app/components/FeatureToggleContext';
import { useAuth } from '@/app/components/AuthProvider';

export default function RootDashboardPage() {
  const { features, isMounted } = useFeatureToggles();
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin';
  const isHOD = profile?.role === 'hod';

  const allModules = [
    { key: 'bot', href: '/bot', label: 'WhatsApp Bot Client', desc: 'Real-time message streams, chat control, and live status metrics.', icon: Wifi },
    { key: 'clients', href: '/clients', label: 'Client Profiles', desc: 'Manage master accountant assignments, approvals, and KYC status.', icon: Users },
    { key: 'itr', href: '/itr', label: 'ITR Filing Dashboard', desc: 'High-density client filings tracking, filtering, and custom doc preview.', icon: FileText },
    { key: 'gst', href: '/gst', label: 'GST Filing (Inactive)', desc: 'Goods and Services Tax document flow and returns verification.', icon: Landmark, disabled: true },
    { key: 'dsc', href: '/dsc', label: 'DSC Management (Inactive)', desc: 'Digital Signature Certificate keys tracking and logs.', icon: Key, disabled: true },
  ];

  const modules = isMounted
    ? allModules
        .filter((m) => features[m.key as keyof typeof features] !== false)
        .filter((m) => {
          if (m.key === 'clients' && !isAdmin && !isHOD) return false;
          return true;
        })
    : allModules;

  return (
    <div className="flex-1 bg-white flex flex-col overflow-hidden p-6">
      {/* Monotone Header */}
      <div className="border-b border-[#e5e5e5] pb-4 mb-6 shrink-0">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">DAV LABS SYSTEM ARCHITECTURE</span>
        <h1 className="text-[18px] font-bold text-slate-900 tracking-tight mt-0.5">Firm Command Dashboard</h1>
        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
          Welcome to the CA-BOT administrative control system. Select an active service module from the overview or sidebar navigation to get started.
        </p>
      </div>

      {/* Grid of Modules */}
      <div className="flex-1 overflow-auto max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map(({ href, label, desc, icon: Icon, disabled }) => {
            if (disabled) {
              return (
                <div 
                  key={label}
                  className="border border-[#e5e5e5] bg-[#fafafa]/50 p-4 rounded-xl opacity-60 flex flex-col justify-between h-[120px]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">{label}</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{desc}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider select-none">Coming Soon</span>
                </div>
              );
            }

            return (
              <Link 
                key={label}
                href={href}
                className="border border-[#e5e5e5] bg-white hover:border-[#aaa] p-4 rounded-xl flex flex-col justify-between h-[120px] transition-all group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-700" />
                    <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wider group-hover:text-blue-600 transition-colors">{label}</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
                </div>
                <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1 select-none">
                  Open Module &rarr;
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Monotone Footer */}
      <div className="border-t border-[#e5e5e5] pt-4 mt-6 flex items-center justify-end text-[9px] text-slate-400 font-medium tracking-wide shrink-0">
        <span>© {new Date().getFullYear()} DAV Labs All Rights Reserved</span>
      </div>
    </div>
  );
}
