'use client';
 
import { useEffect, useState, useCallback } from 'react';
import { WifiOff, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { BACKEND_URL } from '@/lib/api';
 
interface StatusResponse {
  connected: boolean;
  botNumber: string | null;
}
 
export default function BotPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/bot/status`);
      if (!res.ok) throw new Error();
      setData(await res.json());
      setError(null);
    } catch {
      setError('Backend unreachable.');
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    fetchStatus();
    const i = setInterval(fetchStatus, 4000);
    return () => clearInterval(i);
  }, [fetchStatus]);
 
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
 
  const dot = !data ? 'bg-gray-300' : data.connected ? 'bg-green-500' : 'bg-red-500';
 
  return (
    <div className="flex-1 flex items-start justify-center p-8">
      <div className="w-full max-w-md space-y-5">
        {/* Title / Description */}
        <div className="space-y-1">
          <h2 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">
            WhatsApp Bot Settings
          </h2>
          <p className="text-[11px] text-slate-500 leading-normal">
            Configure and monitor your official Meta WhatsApp Business integration.
          </p>
        </div>
 
        {/* Status header row */}
        <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-2.5">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            <span className="text-[12px] font-medium text-slate-700 uppercase tracking-wider">
              {loading ? 'Checking status...' : (data?.connected ? 'Cloud API Active' : 'Cloud API Inactive')}
            </span>
          </div>
          {data?.connected && data.botNumber && (
            <span className="text-[11px] font-mono text-slate-500 font-bold">Phone ID: {data.botNumber}</span>
          )}
        </div>
 
        {/* Error message */}
        {error && (
          <p className="text-[12px] text-red-650 border border-red-200 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
 
        {/* Dynamic Status / Actions Panel */}
        {!error && data && (
          <div className="border border-[#e0e0e0] rounded-xl bg-[#fafafa] flex flex-col items-center py-8 px-6 gap-5 shadow-sm">
            {data.connected ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-green-500" />
                <div className="text-center space-y-1.5">
                  <p className="text-[13px] text-slate-850 font-bold">Official Meta Cloud API is Connected</p>
                  <p className="text-[11px] text-slate-500 max-w-[280px] leading-relaxed mx-auto">
                    The bot is registered to receive and send messages directly via Meta Webhooks. No QR scanning or browser sessions are required.
                  </p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="w-10 h-10 text-red-550" />
                <div className="text-center space-y-1.5">
                  <p className="text-[13px] text-slate-850 font-bold">Official Meta Cloud API is Disconnected</p>
                  <p className="text-[11px] text-slate-500 max-w-[280px] leading-relaxed mx-auto">
                    The Meta access token or phone number ID is missing or invalid. Please check your backend `.env` configuration variables.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
