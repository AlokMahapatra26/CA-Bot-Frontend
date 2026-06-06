'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Wifi, MessageSquare, Users, FileText, Landmark, Key, Users2, Shield, X, Sliders } from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';


export interface FeatureToggles {
  bot: boolean;      // WhatsApp Bot
  chat: boolean;     // Internal Chat
  clients: boolean;  // Client Profiles
  itr: boolean;      // ITR Filing
  gst: boolean;      // GST Filing
  dsc: boolean;      // DSC Management
  team: boolean;     // Team Members
}

interface FeatureToggleContextType {
  features: FeatureToggles;
  isMounted: boolean;
  setFeature: (key: keyof FeatureToggles, value: boolean) => void;
  setAllFeatures: (value: boolean) => void;
  openConsole: () => void;
  closeConsole: () => void;
}

const FeatureToggleContext = createContext<FeatureToggleContextType>({
  features: {
    bot: true,
    chat: true,
    clients: true,
    itr: true,
    gst: true,
    dsc: true,
    team: true,
  },
  isMounted: false,
  setFeature: () => {},
  setAllFeatures: () => {},
  openConsole: () => {},
  closeConsole: () => {},
});

const defaultFeatures: FeatureToggles = {
  bot: true,
  chat: true,
  clients: true,
  itr: true,
  gst: true,
  dsc: true,
  team: true,
};

export function FeatureToggleProvider({ children }: { children: React.ReactNode }) {
  const [features, setFeatures] = useState<FeatureToggles>(defaultFeatures);
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { profile } = useAuth();

  const countRef = useRef(0);
  const lastPressRef = useRef(0);

  // Read initial states from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ca_bot_feature_toggles');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFeatures({ ...defaultFeatures, ...parsed });
        } catch (e) {
          console.error('Failed to parse feature toggles from localStorage:', e);
        }
      }
      setIsMounted(true);
    }
  }, []);

  // Set up global keyboard listener for Ctrl + X (5 times within 3 seconds)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only listen to shortcut for admin role
      if (profile?.role !== 'admin') return;

      if (e.ctrlKey && e.key.toLowerCase() === 'x') {
        const now = Date.now();
        if (now - lastPressRef.current > 3000) {
          countRef.current = 1;
        } else {
          countRef.current += 1;
        }
        lastPressRef.current = now;

        if (countRef.current === 5) {
          countRef.current = 0; // reset counter
          setIsOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile]);

  const setFeature = (key: keyof FeatureToggles, value: boolean) => {
    setFeatures((prev) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('ca_bot_feature_toggles', JSON.stringify(updated));
      return updated;
    });
  };

  const setAllFeatures = (value: boolean) => {
    const updated = {
      bot: value,
      chat: value,
      clients: value,
      itr: value,
      gst: value,
      dsc: value,
      team: value,
    };
    setFeatures(updated);
    localStorage.setItem('ca_bot_feature_toggles', JSON.stringify(updated));
  };

  const openConsole = () => setIsOpen(true);
  const closeConsole = () => setIsOpen(false);

  const featureMetadata = [
    { key: 'bot' as const, label: 'WhatsApp Bot', icon: Wifi, desc: 'Bot controller & stream metrics' },
    { key: 'chat' as const, label: 'Internal Chat', icon: MessageSquare, desc: 'Staff channels & communication' },
    { key: 'clients' as const, label: 'Client Profiles', icon: Users, desc: 'Account assignments & KYC' },
    { key: 'itr' as const, label: 'ITR Filing', icon: FileText, desc: 'Filing statuses & receipt uploads' },
    { key: 'gst' as const, label: 'GST Filing', icon: Landmark, desc: 'Sales sheet & invoice pipelines' },
    { key: 'dsc' as const, label: 'DSC Management', icon: Key, desc: 'Signature keys & certificate logs' },
    { key: 'team' as const, label: 'Team Members', icon: Users2, desc: 'Staff registration & RBAC panel' },
  ];

  return (
    <FeatureToggleContext.Provider value={{ features, isMounted, setFeature, setAllFeatures, openConsole, closeConsole }}>
      {children}

      {/* Minimalist, Clean, Serious Admin Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
          <div className="bg-white border border-[#e0e0e0] rounded-xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="bg-[#fafafa] px-4 py-3 border-b border-[#e0e0e0] flex items-center justify-between shrink-0">
              <span className="text-[12px] font-bold text-[#111] uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#555]" /> Feature Toggle Console
              </span>
              <button 
                onClick={closeConsole}
                className="text-[#999] hover:text-[#555] text-xs font-semibold p-1 hover:bg-[#eee] rounded transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* List of Feature Controls */}
            <div className="p-4 space-y-2.5 overflow-y-auto max-h-[60vh]">
              <div className="text-[11px] text-[#666] font-medium mb-1 leading-normal">
                Enable or disable application modules globally. Disabled modules will be hidden and restricted from navigation:
              </div>

              <div className="space-y-1.5">
                {featureMetadata.map(({ key, label, icon: Icon, desc }) => {
                  const isEnabled = features[key];
                  return (
                    <div 
                      key={key} 
                      className="flex items-center justify-between py-2 border-b border-[#f5f5f5] last:border-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded transition-colors ${isEnabled ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-50'}`}>
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[12px] font-medium text-[#111] leading-none">{label}</h4>
                          <p className="text-[10px] text-[#666] mt-1 leading-normal truncate" title={desc}>{desc}</p>
                        </div>
                      </div>

                      {/* Clean Minimalist Toggle Switch */}
                      <button
                        onClick={() => setFeature(key, !isEnabled)}
                        className={`relative w-7 h-4 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${isEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                      >
                        <div 
                          className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${isEnabled ? 'translate-x-3' : 'translate-x-0'}`} 
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="bg-[#fafafa] px-4 py-3 border-t border-[#e0e0e0] flex items-center justify-between shrink-0">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setAllFeatures(true)}
                  className="px-2 py-1 border border-slate-200 hover:bg-[#eee] rounded text-[10px] font-semibold text-[#555] transition-colors cursor-pointer"
                >
                  Enable All
                </button>
                <button
                  onClick={() => setAllFeatures(false)}
                  className="px-2 py-1 border border-slate-200 hover:bg-[#eee] rounded text-[10px] font-semibold text-[#555] transition-colors cursor-pointer"
                >
                  Disable All
                </button>
              </div>
              <button
                onClick={closeConsole}
                className="px-3 py-1 bg-[#111] hover:bg-[#222] text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Close Console
              </button>
            </div>

          </div>
        </div>
      )}
    </FeatureToggleContext.Provider>
  );
}

export const useFeatureToggles = () => useContext(FeatureToggleContext);
