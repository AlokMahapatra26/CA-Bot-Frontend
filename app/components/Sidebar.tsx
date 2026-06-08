'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FileText, Wifi, PanelLeftClose, PanelLeft, Users, Landmark, Key, LogOut, Users2, LayoutDashboard } from 'lucide-react';
import { siteData } from '@/app/site-data';
import { useAuth } from '@/app/components/AuthProvider';
import { useFeatureToggles } from '@/app/components/FeatureToggleContext';


export default function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [companyName, setCompanyName] = useState<string>(siteData.firmName);
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [botNumber, setBotNumber] = useState<string | null>(null);
  const [clickedPath, setClickedPath] = useState<string | null>(null);

  // Sync / reset clicked path when navigation completes
  useEffect(() => {
    setClickedPath(null);
  }, [pathname]);


  // Fetch company name
  useEffect(() => {
    async function fetchCompanyName() {
      if (profile?.company_id) {
        try {
          const { getCompanyName } = await import('@/app/actions');
          const result = await getCompanyName(profile.company_id);
          if (result.success && result.name) {
            setCompanyName(result.name);
          }
        } catch {}
      }
    }
    fetchCompanyName();
  }, [profile?.company_id]);

  const { features, isMounted } = useFeatureToggles();

  // Dynamic navItems based on role & department
  const navItems = [];
  const isAdmin = profile?.role === 'admin';
  const isHOD = profile?.role === 'hod';
  const userDept = profile?.department || 'ALL';

  // Always show Dashboard
  navItems.push({ href: '/', label: 'Dashboard', icon: LayoutDashboard });

  if (isAdmin && (!isMounted || features.bot)) {
    navItems.push({ href: '/bot', label: 'WhatsApp Bot', icon: Wifi });
  }


  if ((isAdmin || isHOD) && (!isMounted || features.clients)) {
    navItems.push({ href: '/clients', label: 'Client Profiles', icon: Users });
  }
  
  // Show ITR Filing if admin, ITR department, or ALL department
  if ((isAdmin || userDept === 'ITR' || userDept === 'ALL') && (!isMounted || features.itr)) {
    navItems.push({ href: '/itr', label: 'ITR Filing', icon: FileText });
  }
  
  // Show GST Filing if admin, GST department, or ALL department
  if ((isAdmin || userDept === 'GST' || userDept === 'ALL') && (!isMounted || features.gst)) {
    navItems.push({ href: '/gst', label: 'GST Filing', icon: Landmark });
  }
  
  // Show DSC Management if admin, DSC department, or ALL department
  if ((isAdmin || userDept === 'DSC' || userDept === 'ALL') && (!isMounted || features.dsc)) {
    navItems.push({ href: '/dsc', label: 'DSC Management', icon: Key });
  }
  
  if (isAdmin && (!isMounted || features.team)) {
    navItems.push({ href: '/team', label: 'Team Members', icon: Users2 });
  }

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/bot/status');
        if (res.ok) {
          const d = await res.json();
          setStatus(d.status);
          setBotNumber(d.status === 'connected' ? d.botNumber : null);
        }
      } catch { setStatus('disconnected'); setBotNumber(null); }
    };
    poll();
    const i = setInterval(poll, 5000);
    return () => clearInterval(i);
  }, []);



  const dot = status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-amber-400' : 'bg-gray-300';

  return (
    <aside className={`${collapsed ? 'w-12' : 'w-52'} h-screen bg-[#fafafa] border-r border-[#e0e0e0] flex flex-col shrink-0 transition-all duration-200`}>
      {/* Toggle */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 border-b border-[#e0e0e0]`}>
        {!collapsed && (
          <span className="text-[12px] font-bold text-[#111] truncate pr-2" title={companyName}>
            {companyName}
          </span>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded-md hover:bg-[#eee] text-[#999] transition-colors shrink-0">
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-1.5 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = clickedPath ? clickedPath === href : pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              onClick={() => {
                if (href !== pathname) {
                  setClickedPath(href);
                }
              }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                active ? 'bg-[#2563eb] text-white' : 'text-[#555] hover:bg-[#eee]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Session Profile & Sign Out */}
      <div className="border-t border-[#e0e0e0] p-2 bg-[#fafafa]">
        {collapsed ? (
          <button
            onClick={signOut}
            title={`Sign Out (${profile?.email})`}
            className="w-8 h-8 mx-auto flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex flex-col gap-2 p-1.5">
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-slate-800 truncate" title={profile?.full_name || 'User Profile'}>
                {profile?.full_name || profile?.email?.split('@')[0]}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">
                  {profile?.role || 'employee'}
                </span>
              </div>
            </div>
            
            <button
              onClick={signOut}
              className="flex items-center justify-center gap-1.5 w-full py-1 px-2 border border-slate-200 hover:border-red-200 hover:bg-red-50/50 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-red-600 transition-all cursor-pointer mt-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

      {/* Status */}
      <div className={`h-[38px] px-3 border-t border-[#e0e0e0] flex items-center shrink-0 ${collapsed ? 'justify-center' : ''}`}>
        {collapsed ? (
          <span className={`w-2 h-2 rounded-full ${dot} block`} title={status} />
        ) : (
          <div className="flex items-center justify-between w-full min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
              <span className="text-[11px] text-[#888] capitalize truncate">{status}</span>
            </div>
            {botNumber && <span className="text-[11px] font-mono text-[#555] shrink-0">+{botNumber}</span>}
          </div>
        )}
      </div>
    </aside>
  );
}
