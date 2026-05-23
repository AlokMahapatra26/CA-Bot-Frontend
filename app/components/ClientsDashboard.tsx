'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Download, FileText, Clock, CheckCircle2, HelpCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ClientNameCell from './ClientNameCell';
import DeleteButton from './DeleteButton';
import AccountApprovalButton from './AccountApprovalButton';

interface ClientsDashboardProps {
  clientsData: any[];
}

const getExtension = (url: string) => {
  try {
    return new URL(url).pathname.split('.').pop() || 'pdf';
  } catch { return 'pdf'; }
};

const renderDocLink = (url: string | null, clientName: string, docType: string) => {
  if (!url) return <span className="text-[#ccc]">—</span>;
  const ext = getExtension(url);
  const filename = `${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${docType}.${ext}`;
  const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  return (
    <a href={downloadUrl} className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline" title="Download">
      <FileText className="w-3 h-3" /> {docType}
    </a>
  );
};

const renderBotStatus = (botStatus: string | null) => {
  if (!botStatus) return <span className="text-[#ccc] text-[10px]">—</span>;
  const map: Record<string, string> = {
    REGISTERING_NAME: 'Name',
    REGISTERING_PHONE: 'Phone',
    REGISTERING_DOB: 'DOB',
    REGISTERING_EMAIL: 'Email',
    REGISTERING_PAN: 'PAN',
    REGISTERING_AADHAAR: 'Aadhaar',
    PENDING_APPROVAL: 'Docs Submitted',
    REGISTERED: 'Registered',
  };
  const label = map[botStatus] || botStatus;
  const isPending = botStatus === 'PENDING_APPROVAL';
  const isRegistered = botStatus === 'REGISTERED';

  if (isRegistered) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
        <CheckCircle2 className="w-3 h-3 text-green-600" /> {label}
      </span>
    );
  }

  if (isPending) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
        <Clock className="w-3 h-3 text-amber-600" /> {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
      <HelpCircle className="w-3 h-3 text-slate-500" /> {label}
    </span>
  );
};

export default function ClientsDashboard({ clientsData }: ClientsDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [activeMsgClient, setActiveMsgClient] = useState<{ id: string; name: string; jid: string } | null>(null);
  const [customMsgText, setCustomMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientsData;
    return clientsData.filter((c: any) =>
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.phone_number || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }, [clientsData, query]);

  const exportCSV = () => {
    const headers = ['Full Name', 'Phone Number', 'WhatsApp JID', 'Date of Birth', 'Email', 'Account Status', 'Bot Status', 'PAN Card', 'Aadhaar Card', 'Joined Date'];
    const rows = filtered.map((c: any) => [
      c.full_name || 'Anonymous',
      c.phone_number ? `+${c.phone_number}` : '',
      c.whatsapp_jid || '',
      c.date_of_birth || '',
      c.email || '',
      c.account_status || 'PENDING',
      c.bot_status || '',
      c.pan_media_url ? 'Uploaded' : '',
      c.aadhaar_media_url ? 'Uploaded' : '',
      c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`));

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client_profiles_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingCount = clientsData.filter(c => c.account_status === 'PENDING' && c.bot_status === 'PENDING_APPROVAL').length;

  return (
    <div className="flex-1 flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#e0e0e0] bg-[#fafafa] shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aaa] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search profiles..."
              className="pl-7 pr-7 py-1 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] w-52 placeholder:text-[#bbb]"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555]">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            title="Refresh Data"
            className="inline-flex items-center justify-center p-1.5 text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] hover:text-[#111] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin text-[#888]' : ''}`} />
          </button>
          <span className="text-[11px] text-[#999]">{filtered.length} profiles</span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3 text-amber-600" /> {pendingCount} pending approval
            </span>
          )}
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors"
        >
          <Download className="w-3 h-3" /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[1300px] text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#f5f5f5] border-b border-[#e0e0e0] text-[11px] font-semibold text-[#666] uppercase tracking-wide">
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[160px]">Name</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[120px]">Phone</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[90px]">DOB</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[170px]">Email</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[100px]">PAN Card</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[100px]">Aadhaar</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[90px]">Reg. Stage</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[220px]">Account Status</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[110px] text-right">Joined</th>
              <th className="px-3 py-2 w-[140px] text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-[12px] text-[#aaa]">
                  {query ? `No profiles matching "${query}"` : 'No client profiles found.'}
                </td>
              </tr>
            )}
            {filtered.map((client: any) => {
              const name = client.full_name || 'Anonymous';
              const phone = client.phone_number ? `+${client.phone_number}` : '—';
              const isPendingApproval = client.bot_status === 'PENDING_APPROVAL';

              return (
                <tr
                  key={client.id}
                  className={`border-b border-[#eee] hover:bg-[#fafafa] transition-colors text-[12px] text-[#333] ${isPendingApproval ? 'bg-amber-50/30' : ''}`}
                >
                  <td className="px-3 py-2 border-r border-[#eee] truncate font-medium">
                    <ClientNameCell client={client} />
                  </td>
                  <td className="px-3 py-2 border-r border-[#eee] font-mono text-[11px] text-[#555] truncate">{phone}</td>
                  <td className="px-3 py-2 border-r border-[#eee] font-mono text-[11px] text-[#555]">{client.date_of_birth || '—'}</td>
                  <td className="px-3 py-2 border-r border-[#eee] font-mono text-[11px] text-[#555] truncate" title={client.email || ''}>{client.email || '—'}</td>
                  <td className="px-3 py-2 border-r border-[#eee]">{renderDocLink(client.pan_media_url, name, 'PAN')}</td>
                  <td className="px-3 py-2 border-r border-[#eee]">{renderDocLink(client.aadhaar_media_url, name, 'Aadhaar')}</td>
                  <td className="px-3 py-2 border-r border-[#eee]">{renderBotStatus(client.bot_status)}</td>
                  <td className="px-3 py-2 border-r border-[#eee]">
                    <AccountApprovalButton
                      clientId={client.id}
                      clientName={name}
                      currentStatus={client.account_status || 'PENDING'}
                    />
                  </td>
                  <td className="px-3 py-2 border-r border-[#eee] text-right text-[10px] text-[#999] whitespace-nowrap">
                    {client.created_at ? formatDistanceToNow(new Date(client.created_at), { addSuffix: true }) : '—'}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setActiveMsgClient({ id: client.id, name, jid: client.whatsapp_jid || '' })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors"
                      >
                        Message
                      </button>
                      <DeleteButton clientId={client.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Message Modal */}
      {activeMsgClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[0.5px]">
          <div className="bg-white border border-[#e0e0e0] rounded-xl w-full max-w-md overflow-hidden">
            <div className="bg-[#fafafa] px-4 py-2.5 border-b border-[#e0e0e0] flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#111] uppercase tracking-wider">
                Direct WhatsApp — {activeMsgClient.name}
              </span>
              <button onClick={() => { setActiveMsgClient(null); setCustomMsgText(''); }} className="text-[#999] hover:text-[#555] text-xs font-semibold">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#555]">Message Content</label>
                <textarea
                  value={customMsgText}
                  onChange={e => setCustomMsgText(e.target.value)}
                  rows={4}
                  placeholder="Type your WhatsApp message..."
                  className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] placeholder:text-[#ccc]"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => { setActiveMsgClient(null); setCustomMsgText(''); }}
                  className="px-3 py-1.5 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa]"
                >Cancel</button>
                <button
                  onClick={async () => {
                    if (!customMsgText.trim()) return;
                    setSendingMsg(true);
                    try {
                      const res = await fetch('http://localhost:4000/api/send-message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ jid: activeMsgClient.jid, text: customMsgText }),
                      });
                      if (res.ok) { alert('Message sent!'); setActiveMsgClient(null); setCustomMsgText(''); }
                      else alert('Failed to send message.');
                    } catch { alert('Failed to connect to WhatsApp backend.'); }
                    finally { setSendingMsg(false); }
                  }}
                  disabled={sendingMsg || !customMsgText.trim()}
                  className="px-3 py-1.5 text-[11px] font-medium text-white bg-[#111] rounded-lg hover:bg-[#333] disabled:opacity-50"
                >{sendingMsg ? 'Sending...' : 'Send Message'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
