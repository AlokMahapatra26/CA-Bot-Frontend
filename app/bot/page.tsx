'use client';

import { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, Loader2, LogOut, CheckCircle2 } from 'lucide-react';

type BotStatus = 'disconnected' | 'connecting' | 'connected';

interface StatusResponse {
  status: BotStatus;
  qr: string | null;
  connected: boolean;
  botNumber: string | null;
}

export default function BotPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
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

  const dot = !data ? 'bg-gray-300' : data.status === 'connected' ? 'bg-green-500' : data.status === 'connecting' ? 'bg-amber-400' : 'bg-gray-300';

  return (
    <div className="flex-1 flex items-start justify-center p-8">
      <div className="w-full max-w-md space-y-4">
        {/* Status row */}
        <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            <span className="text-[13px] font-medium text-[#333] capitalize">
              {loading ? 'Checking...' : data?.status || 'unknown'}
            </span>
          </div>
          {data?.status === 'connected' && data.botNumber && (
            <span className="text-[12px] font-mono text-[#555]">+{data.botNumber}</span>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-[12px] text-red-600 border border-red-200 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Main panel */}
        {!error && data && (
          <div className="border border-[#e0e0e0] rounded-xl bg-[#fafafa] flex flex-col items-center py-8 px-6 gap-5">
            {data.status === 'connected' ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-green-500" />
                <p className="text-[13px] text-[#333] font-medium">Bot is active and receiving messages.</p>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center gap-2 px-4 py-1.5 text-[12px] font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  Disconnect
                </button>
              </>
            ) : data.qr ? (
              <>
                <p className="text-[13px] text-[#333] font-medium">Scan with WhatsApp → Linked Devices</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.qr} alt="QR Code" className="w-[200px] h-[200px] rounded-lg" />
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
          </div>
        )}
      </div>
    </div>
  );
}
