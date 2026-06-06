'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FileText, Wifi, PanelLeftClose, PanelLeft, Users, Landmark, Key, Keyboard, History, LogOut, Users2 } from 'lucide-react';
import { siteData } from '@/app/site-data';
import { useAuth } from '@/app/components/AuthProvider';

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [botNumber, setBotNumber] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelogData, setChangelogData] = useState<{ frontend: string; backend: string } | null>(null);
  const [loadingChangelog, setLoadingChangelog] = useState(false);
  const [activeChangelogTab, setActiveChangelogTab] = useState<'frontend' | 'backend'>('frontend');

  // Dynamic navItems based on role & department
  const navItems = [];
  const isAdmin = profile?.role === 'admin';
  const isHOD = profile?.role === 'hod';
  const userDept = profile?.department || 'ALL';

  if (isAdmin || isHOD) {
    navItems.push({ href: '/bot', label: 'WhatsApp Bot', icon: Wifi });
  }
  
  navItems.push({ href: '/clients', label: 'Client Profiles', icon: Users });
  
  // Show ITR Filing if admin, ITR department, or ALL department
  if (isAdmin || userDept === 'ITR' || userDept === 'ALL') {
    navItems.push({ href: '/itr', label: 'ITR Filing', icon: FileText });
  }
  
  // Show GST Filing if admin, GST department, or ALL department
  if (isAdmin || userDept === 'GST' || userDept === 'ALL') {
    navItems.push({ href: '/gst', label: 'GST Filing', icon: Landmark });
  }
  
  // Show DSC Management if admin, DSC department, or ALL department
  if (isAdmin || userDept === 'DSC' || userDept === 'ALL') {
    navItems.push({ href: '/dsc', label: 'DSC Management', icon: Key });
  }
  
  if (isAdmin) {
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

  const handleOpenChangelog = async () => {
    setShowChangelog(true);
    if (!changelogData) {
      setLoadingChangelog(true);
      try {
        const { getChangelogs } = await import('@/app/actions');
        const res = await getChangelogs();
        if (res.success && res.frontend && res.backend) {
          setChangelogData({ frontend: res.frontend, backend: res.backend });
        }
      } catch (err) {
        console.error('Failed to load changelogs:', err);
      } finally {
        setLoadingChangelog(false);
      }
    }
  };

  const renderMarkdown = (md: string) => {
    const lines = md.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-[16px] font-bold text-[#111] mt-4 mb-2 pb-1 border-b border-[#eee]">
            {trimmed.slice(2)}
          </h1>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-[13px] font-bold text-[#2563eb] mt-4 mb-2 flex items-center gap-1.5 bg-blue-50/50 px-2 py-0.5 rounded">
            {trimmed.slice(3)}
          </h2>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-[11px] font-bold text-[#555] uppercase tracking-wide mt-3 mb-1.5">
            {trimmed.slice(4)}
          </h3>
        );
      }
      if (trimmed.startsWith('- ')) {
        const content = trimmed.slice(2);
        const boldRegex = /\*\*(.*?)\*\*/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = boldRegex.exec(content)) !== null) {
          if (match.index > lastIndex) {
            parts.push(content.substring(lastIndex, match.index));
          }
          parts.push(<strong key={match.index} className="font-bold text-[#111]">{match[1]}</strong>);
          lastIndex = boldRegex.lastIndex;
        }

        if (lastIndex < content.length) {
          parts.push(content.substring(lastIndex));
        }

        return (
          <li key={idx} className="text-[12px] text-[#444] ml-4 list-disc pl-1 py-0.5 leading-relaxed">
            {parts.length > 0 ? parts : content}
          </li>
        );
      }
      if (trimmed === '') {
        return <div key={idx} className="h-1" />;
      }
      return (
        <p key={idx} className="text-[12px] text-[#666] leading-relaxed py-0.5">
          {trimmed}
        </p>
      );
    });
  };

  const dot = status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-amber-400' : 'bg-gray-300';

  return (
    <aside className={`${collapsed ? 'w-12' : 'w-52'} h-screen bg-[#fafafa] border-r border-[#e0e0e0] flex flex-col shrink-0 transition-all duration-200`}>
      {/* Toggle */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 border-b border-[#e0e0e0]`}>
        {!collapsed && (
          <span className="text-[12px] font-bold text-[#111] truncate pr-2" title={siteData.firmName}>
            {siteData.firmName}
          </span>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded-md hover:bg-[#eee] text-[#999] transition-colors shrink-0">
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-1.5 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                active ? 'bg-[#2563eb] text-white' : 'text-[#555] hover:bg-[#eee]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
        {/* Shortcuts Tab */}
        <button
          onClick={() => setShowShortcuts(true)}
          title={collapsed ? "Keyboard Shortcuts" : undefined}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors text-[#555] hover:bg-[#eee]"
        >
          <Keyboard className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="truncate text-left">Shortcuts</span>}
        </button>
        {/* Changelog Tab */}
        <button
          onClick={handleOpenChangelog}
          title={collapsed ? "Changelog" : undefined}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors text-[#555] hover:bg-[#eee]"
        >
          <History className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="truncate text-left">Changelog</span>}
        </button>
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

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
          <div className="bg-white border border-[#e0e0e0] rounded-xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#fafafa] px-4 py-3 border-b border-[#e0e0e0] flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#111] uppercase tracking-wider flex items-center gap-1.5">
                <Keyboard className="w-4 h-4 text-[#555]" /> Keyboard Shortcuts
              </span>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-[#999] hover:text-[#555] text-xs font-semibold p-1 hover:bg-[#eee] rounded transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-[11px] text-[#666] mb-1 font-medium">
                Boost your productivity inside CA-BOT with global shortcuts:
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[12px] text-[#333] border-b border-[#f5f5f5] pb-2">
                  <span className="font-medium">Focus/Select Search</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#f5f5f5] border border-[#ccc] rounded text-[#444] shadow-[0_1px_0_rgba(0,0,0,0.15)]">Ctrl + K</kbd>
                </div>
                <div className="flex items-center justify-between text-[12px] text-[#333] border-b border-[#f5f5f5] pb-2">
                  <span className="font-medium">Unfocus Input / Close Modals</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#f5f5f5] border border-[#ccc] rounded text-[#444] shadow-[0_1px_0_rgba(0,0,0,0.15)]">Esc</kbd>
                </div>
                <div className="flex items-center justify-between text-[12px] text-[#333] border-b border-[#f5f5f5] pb-2">
                  <span className="font-medium">Go to WhatsApp Bot</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#f5f5f5] border border-[#ccc] rounded text-[#444] shadow-[0_1px_0_rgba(0,0,0,0.15)]">Alt + 1</kbd>
                </div>
                <div className="flex items-center justify-between text-[12px] text-[#333] border-b border-[#f5f5f5] pb-2">
                  <span className="font-medium">Go to Client Profiles</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#f5f5f5] border border-[#ccc] rounded text-[#444] shadow-[0_1px_0_rgba(0,0,0,0.15)]">Alt + 2</kbd>
                </div>
                <div className="flex items-center justify-between text-[12px] text-[#333] border-b border-[#f5f5f5] pb-2">
                  <span className="font-medium">Go to ITR Filing</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#f5f5f5] border border-[#ccc] rounded text-[#444] shadow-[0_1px_0_rgba(0,0,0,0.15)]">Alt + 3</kbd>
                </div>
                <div className="flex items-center justify-between text-[12px] text-[#333] border-b border-[#f5f5f5] pb-2">
                  <span className="font-medium">Go to GST Filing</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#f5f5f5] border border-[#ccc] rounded text-[#444] shadow-[0_1px_0_rgba(0,0,0,0.15)]">Alt + 4</kbd>
                </div>
                <div className="flex items-center justify-between text-[12px] text-[#333] pb-1">
                  <span className="font-medium">Go to DSC Management</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#f5f5f5] border border-[#ccc] rounded text-[#444] shadow-[0_1px_0_rgba(0,0,0,0.15)]">Alt + 5</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Changelog Modal */}
      {showChangelog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
          <div className="bg-white border border-[#e0e0e0] rounded-xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-[#fafafa] px-4 py-3 border-b border-[#e0e0e0] flex items-center justify-between shrink-0">
              <span className="text-[12px] font-bold text-[#111] uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#555]" /> Release Changelogs
              </span>
              <button
                onClick={() => setShowChangelog(false)}
                className="text-[#999] hover:text-[#555] text-xs font-semibold p-1 hover:bg-[#eee] rounded transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Tab Controls */}
            <div className="flex border-b border-[#e0e0e0] bg-[#fdfdfd] shrink-0">
              <button
                onClick={() => setActiveChangelogTab('frontend')}
                className={`flex-1 py-2 text-[12px] font-bold border-r border-[#e0e0e0] transition-colors ${
                  activeChangelogTab === 'frontend'
                    ? 'bg-white text-[#2563eb] border-b border-[#2563eb]'
                    : 'text-[#666] hover:bg-[#eee]'
                }`}
              >
                Frontend Dashboard (wb-frontend)
              </button>
              <button
                onClick={() => setActiveChangelogTab('backend')}
                className={`flex-1 py-2 text-[12px] font-bold transition-colors ${
                  activeChangelogTab === 'backend'
                    ? 'bg-white text-[#2563eb] border-b border-[#2563eb]'
                    : 'text-[#666] hover:bg-[#eee]'
                }`}
              >
                WhatsApp Bot Backend (wb-backend)
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 min-h-0 bg-white">
              {loadingChangelog ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <div className="w-6 h-6 border-2 border-t-[#2563eb] border-[#ddd] rounded-full animate-spin" />
                  <span className="text-[11px] text-[#666] font-medium">Fetching active changelogs...</span>
                </div>
              ) : changelogData ? (
                <div className="space-y-4">
                  {activeChangelogTab === 'frontend'
                    ? renderMarkdown(changelogData.frontend)
                    : renderMarkdown(changelogData.backend)}
                </div>
              ) : (
                <div className="text-center text-[12px] text-red-500 font-semibold py-8">
                  ❌ Failed to retrieve changelog files from the server.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
