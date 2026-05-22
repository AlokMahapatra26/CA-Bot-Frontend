'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Download, Search, X, FileText, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import DeleteButton from './DeleteButton';
import FilingStatusSelect from './FilingStatusSelect';
import DownloadDropdown from './DownloadDropdown';
import ClientNameCell from './ClientNameCell';

interface ClientDashboardProps {
  clientsData: any[];
}

const getExtension = (url: string) => {
  try {
    const parts = url.split('?')[0].split('.');
    return parts.length > 1 ? parts.pop() : 'jpg';
  } catch { return 'jpg'; }
};

const renderStatus = (status: string) => {
  if (status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
        <CheckCircle2 className="w-3 h-3" /> Complete
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
      <Clock className="w-3 h-3" /> {status.replace('AWAITING_', '').replace('_', ' ')}
    </span>
  );
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

export default function ClientDashboard({ clientsData }: ClientDashboardProps) {
  const [query, setQuery] = useState('');
  const [activeMsgClient, setActiveMsgClient] = useState<{ id: string; name: string; jid: string } | null>(null);
  const [customMsgText, setCustomMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientsData;
    return clientsData.filter((c: any) =>
      (c.full_name || '').toLowerCase().includes(q) || (c.phone_number || '').includes(q)
    );
  }, [clientsData, query]);

  const exportCSV = () => {
    const headers = ['Full Name','Phone Number','Date of Birth','Email','Bank Name','Bank Account Number','Bank IFSC','FY Year','PAN Uploaded','Aadhaar Uploaded','Form 16 Uploaded','Filing Status','Last Updated'];
    const rows = filtered.map((c: any) => {
      const f = c.itr_filings?.[0] || null;
      return [c.full_name||'', c.phone_number?`+${c.phone_number}`:'', c.date_of_birth||'', c.email||'', c.bank_name||'', c.bank_account_number||'', c.bank_ifsc||'', f?.fy_year||'', f?.pan_media_url?'Yes':'No', f?.aadhaar_media_url?'Yes':'No', f?.form16_media_url?'Yes':'No', f?.filing_status||'', f?.updated_at?new Date(f.updated_at).toLocaleDateString('en-IN'):''].map(v => `"${String(v).replace(/"/g,'""')}"`);
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `itr_clients_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full">
      {/* Toolbar — thin strip */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#e0e0e0] bg-[#fafafa] shrink-0">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aaa] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              className="pl-7 pr-7 py-1 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] w-48 placeholder:text-[#bbb]"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555]">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <span className="text-[11px] text-[#999]">{filtered.length} records</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/reminders"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors"
          >
            <Bell className="w-3.5 h-3.5 text-[#888]" /> Reminders
          </Link>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors"
          >
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>
      </div>

      {/* Table — full bleed */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[1400px] text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#f5f5f5] border-b border-[#e0e0e0] text-[11px] font-semibold text-[#666] uppercase tracking-wide">
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[170px]">Name</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[130px]">Phone</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[80px]">FY</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[150px]">Bot Status</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[100px]">PAN</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[100px]">Aadhaar</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[100px]">Form 16</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[140px]">Filing Status</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[240px] text-center">Actions</th>
              <th className="px-3 py-2 w-[120px] text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-[12px] text-[#aaa]">
                {query ? `No results for "${query}"` : 'No clients yet.'}
              </td></tr>
            )}
            {filtered.map((client: any) => {
              const f = client.itr_filings?.[0] || null;
              const name = client.full_name || 'Anonymous';
              const phone = client.phone_number ? `+${client.phone_number}` : '—';

              return (
                <tr key={client.id} className="border-b border-[#eee] hover:bg-[#fafafa] transition-colors text-[12px] text-[#333]">
                  <td className="px-3 py-2 border-r border-[#eee] truncate font-medium">
                    <ClientNameCell client={client} />
                  </td>
                  <td className="px-3 py-2 border-r border-[#eee] font-mono text-[11px] text-[#555] truncate">{phone}</td>
                  <td className="px-3 py-2 border-r border-[#eee] font-mono text-[11px] text-[#555]">{f?.fy_year || '—'}</td>
                  <td className="px-3 py-2 border-r border-[#eee]">{f ? renderStatus(f.status) : <span className="text-[#ccc]">—</span>}</td>
                  <td className="px-3 py-2 border-r border-[#eee]">{f ? renderDocLink(f.pan_media_url, name, 'PAN') : <span className="text-[#ccc]">—</span>}</td>
                  <td className="px-3 py-2 border-r border-[#eee]">{f ? renderDocLink(f.aadhaar_media_url, name, 'Aadhaar') : <span className="text-[#ccc]">—</span>}</td>
                  <td className="px-3 py-2 border-r border-[#eee]">{f ? renderDocLink(f.form16_media_url, name, 'Form16') : <span className="text-[#ccc]">—</span>}</td>
                  <td className="px-3 py-2 border-r border-[#eee]">
                    {f ? <FilingStatusSelect id={f.id} currentStatus={f.filing_status} /> : <span className="text-[#ccc]">—</span>}
                  </td>
                  <td className="px-2 py-2 border-r border-[#eee] text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {f && (
                        f.filing_status === 'DOCS_VERIFIED' ? (
                          <span className="text-[10px] font-medium text-green-600 font-mono">✓ Docs Verified</span>
                        ) : (
                          <DownloadDropdown
                            filingId={f.id}
                            clientName={name}
                            recipientJid={client.whatsapp_jid || ''}
                            panUrl={f.pan_media_url}
                            aadhaarUrl={f.aadhaar_media_url}
                            form16Url={f.form16_media_url}
                          />
                        )
                      )}
                      <button
                        onClick={() => setActiveMsgClient({ id: client.id, name, jid: client.whatsapp_jid || '' })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors"
                      >
                        Message
                      </button>
                      <DeleteButton filingId={f?.id} clientId={client.id} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-[10px] text-[#999] whitespace-nowrap">
                    {f?.updated_at ? formatDistanceToNow(new Date(f.updated_at), { addSuffix: true }) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog */}
      {activeMsgClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[0.5px]">
          <div className="bg-white border border-[#e0e0e0] rounded-xl w-full max-w-md overflow-hidden">
            <div className="bg-[#fafafa] px-4 py-2.5 border-b border-[#e0e0e0] flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#111] uppercase tracking-wider">
                Direct WhatsApp : {activeMsgClient.name}
              </span>
              <button
                onClick={() => {
                  setActiveMsgClient(null);
                  setCustomMsgText('');
                }}
                className="text-[#999] hover:text-[#555] text-xs font-semibold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#555]">Message Content</label>
                <textarea
                  value={customMsgText}
                  onChange={(e) => setCustomMsgText(e.target.value)}
                  rows={4}
                  placeholder="Type your WhatsApp message..."
                  className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] font-sans placeholder:text-[#ccc]"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setActiveMsgClient(null);
                    setCustomMsgText('');
                  }}
                  className="px-3 py-1.5 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa]"
                >
                  Cancel
                </button>
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
                      if (res.ok) {
                        alert('Message sent successfully!');
                        setActiveMsgClient(null);
                        setCustomMsgText('');
                      } else {
                        alert('Failed to send message.');
                      }
                    } catch {
                      alert('Failed to connect to WhatsApp backend.');
                    } finally {
                      setSendingMsg(false);
                    }
                  }}
                  disabled={sendingMsg || !customMsgText.trim()}
                  className="px-3 py-1.5 text-[11px] font-medium text-white bg-[#111] rounded-lg hover:bg-[#333] disabled:opacity-50"
                >
                  {sendingMsg ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
