'use client';

import { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, Loader2, LogOut, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';

type BotStatus = 'disconnected' | 'connecting' | 'connected';

interface StatusResponse {
  status: BotStatus;
  qr: string | null;
  connected: boolean;
  botNumber: string | null;
  provider: 'baileys' | 'cloud';
}

export default function BotPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [switchingProvider, setSwitchingProvider] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:4000/api/bot/status');
      if (!res.ok) throw new Error();
      setData(await res.json());
      setError(null);
    } catch {
      setError('Backend unreachable on port 4000.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const i = setInterval(fetchStatus, 4000);
    return () => clearInterval(i);
  }, [fetchStatus]);

  const handleLogout = async () => {
    if (!confirm('Disconnect the bot? You will need to re-scan.')) return;
    setLoggingOut(true);
    try {
      const res = await fetch('http://localhost:4000/api/bot/logout', { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await fetchStatus();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleProviderChange = async (newProvider: 'baileys' | 'cloud') => {
    if (data?.provider === newProvider) return;
    if (!confirm(`Are you sure you want to switch to the ${newProvider === 'cloud' ? 'Meta Cloud API' : 'Baileys Direct Connection'}?`)) return;

    setSwitchingProvider(true);
    try {
      const res = await fetch('http://localhost:4000/api/bot/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: newProvider }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await fetchStatus();
    } catch (e: any) {
      alert(`Failed to switch provider: ${e.message || 'Unknown error'}`);
    } finally {
      setSwitchingProvider(false);
    }
  };

  if (profile && profile.role !== 'admin') {
    return (
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-6 text-center h-full">
        <div className="max-w-md space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-[16px] font-bold text-slate-900 uppercase tracking-wider">Access Restricted</h2>
          <p className="text-[12px] text-slate-500 max-w-xs mx-auto leading-relaxed">
            The WhatsApp Bot Client module is restricted to system administrators only.
          </p>
        </div>
      </div>
    );
  }

  const dot = !data ? 'bg-gray-300' : (data.provider === 'cloud' || data.status === 'connected') ? 'bg-green-500' : data.status === 'connecting' ? 'bg-amber-400' : 'bg-gray-300';

  return (
    <div className="flex-1 flex items-start justify-center p-8">
      <div className="w-full max-w-md space-y-5">
        {/* Title / Description */}
        <div className="space-y-1">
          <h2 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">
            WhatsApp Bot Settings
          </h2>
          <p className="text-[11px] text-slate-500 leading-normal">
            Configure the active messaging engine and manage connection credentials.
          </p>
        </div>

        {/* Dynamic Provider Selector Tab */}
        <div className="bg-[#fafafa] border border-[#e0e0e0] rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Active Messaging Provider
            </span>
            {switchingProvider && (
              <span className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Updating Engine...</span>
              </span>
            )}
          </div>
          <div className="flex bg-slate-100/80 p-1 rounded-lg border border-[#e5e5e5]">
            <button
              onClick={() => handleProviderChange('baileys')}
              disabled={switchingProvider || loading}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                data?.provider === 'baileys'
                  ? 'bg-white text-slate-800 shadow-sm border border-[#d5d5d5] font-bold'
                  : 'text-slate-500 hover:text-slate-700 disabled:opacity-40'
              }`}
            >
              Baileys (Web Scan)
            </button>
            <button
              onClick={() => handleProviderChange('cloud')}
              disabled={switchingProvider || loading}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                data?.provider === 'cloud'
                  ? 'bg-white text-slate-800 shadow-sm border border-[#d5d5d5] font-bold'
                  : 'text-slate-500 hover:text-slate-700 disabled:opacity-40'
              }`}
            >
              Meta Cloud API
            </button>
          </div>
        </div>

        {/* Status header row */}
        <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-2.5">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            <span className="text-[12px] font-medium text-slate-700 uppercase tracking-wider">
              {loading ? 'Checking status...' : (data?.provider === 'cloud' ? 'Cloud Provider Active' : `Baileys: ${data?.status || 'unknown'}`)}
            </span>
          </div>
          {data?.status === 'connected' && data.botNumber && (
            <span className="text-[11px] font-mono text-slate-500 font-bold">+{data.botNumber}</span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-[12px] text-red-600 border border-red-200 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Dynamic Status / Actions Panel */}
        {!error && data && (
          <div className="border border-[#e0e0e0] rounded-xl bg-[#fafafa] flex flex-col items-center py-8 px-6 gap-5 shadow-sm">
            {data.provider === 'cloud' ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-green-500" />
                <div className="text-center space-y-1.5">
                  <p className="text-[13px] text-slate-850 font-bold">Official Meta Cloud API is Active</p>
                  <p className="text-[11px] text-slate-500 max-w-[280px] leading-relaxed mx-auto">
                    The bot is registered to receive and send messages directly via Meta Webhooks. No QR scanning or browser sessions are required.
                  </p>
                </div>
              </>
            ) : (
              <>
                {data.status === 'connected' ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                    <p className="text-[13px] text-[#333] font-medium">Bot is active and receiving messages.</p>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="inline-flex items-center gap-2 px-4 py-1.5 text-[12px] font-medium text-red-650 border border-red-200 rounded-lg hover:bg-red-55 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                      Disconnect Bot
                    </button>
                  </>
                ) : data.qr ? (
                  <>
                    <p className="text-[13px] text-[#333] font-medium">Scan with WhatsApp → Linked Devices</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={data.qr} alt="QR Code" className="w-[200px] h-[200px] rounded-lg shadow-sm border border-[#e5e5e5]" />
                    <p className="text-[11px] text-[#aaa] flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Auto-refreshing
                    </p>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-6 h-6 text-[#aaa] animate-spin" />
                    <p className="text-[12px] text-[#888]">Generating QR...</p>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
