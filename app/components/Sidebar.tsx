'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FileText, Wifi, PanelLeftClose, PanelLeft, Users } from 'lucide-react';
import { siteData } from '@/app/site-data';

const navItems = [
  { href: '/bot', label: 'WhatsApp Bot', icon: Wifi },
  { href: '/', label: 'ITR Filing', icon: FileText },
  { href: '/clients', label: 'Client Profiles', icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [botNumber, setBotNumber] = useState<string | null>(null);

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
      </nav>

      {/* Status */}
      <div className={`px-2 py-2 border-t border-[#e0e0e0] ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <span className={`w-2 h-2 rounded-full ${dot} block`} title={status} />
        ) : (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <span className="text-[11px] text-[#888] capitalize">{status}</span>
            </div>
            {botNumber && <p className="text-[11px] font-mono text-[#555] truncate">+{botNumber}</p>}
          </div>
        )}
      </div>
    </aside>
  );
}
