'use client';

import { useState, useMemo } from 'react';
import { Search, X, Download, FileText, MessageSquare, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ClientNameCell from './ClientNameCell';
import DeleteButton from './DeleteButton';

interface ClientsDashboardProps {
  clientsData: any[];
}

const getExtension = (url: string) => {
  try {
    const u = new URL(url);
    const pathname = u.pathname;
    return pathname.split('.').pop() || 'pdf';
  } catch {
    return 'pdf';
  }
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

export default function ClientsDashboard({ clientsData }: ClientsDashboardProps) {
  const [query, setQuery] = useState('');
  const [activeMsgClient, setActiveMsgClient] = useState<{ id: string; name: string; jid: string } | null>(null);
  const [customMsgText, setCustomMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

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
    const headers = [
      'Full Name',
      'Phone Number',
      'WhatsApp JID',
      'Date of Birth',
      'Email',
      'PAN Card URL',
      'Aadhaar Card URL',
      'Joined Date'
    ];
    
    const rows = filtered.map((c: any) => {
      return [
        c.full_name || 'Anonymous',
        c.phone_number ? `+${c.phone_number}` : '',
        c.whatsapp_jid || '',
        c.date_of_birth || '',
        c.email || '',
        c.pan_media_url || '',
        c.aadhaar_media_url || '',
        c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client_profiles_${new Date().toISOString().slice(0, 10)}.csv`;
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
              placeholder="Search profiles..."
              className="pl-7 pr-7 py-1 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] w-52 placeholder:text-[#bbb]"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555]">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <span className="text-[11px] text-[#999]">{filtered.length} profiles</span>
        </div>
        
        <div>
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
        <table className="w-full min-w-[1200px] text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#f5f5f5] border-b border-[#e0e0e0] text-[11px] font-semibold text-[#666] uppercase tracking-wide">
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[180px]">Name</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[130px]">Phone Number</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[200px]">WhatsApp JID</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[100px]">DOB</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[180px]">Email</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[110px]">PAN Card</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[110px]">Aadhaar Card</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[130px] text-right">Joined</th>
              <th className="px-3 py-2 w-[185px] text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-[12px] text-[#aaa]">
                  {query ? `No profiles matching "${query}"` : 'No client profiles found.'}
                </td>
              </tr>
            )}
            {filtered.map((client: any) => {
              const name = client.full_name || 'Anonymous';
              const phone = client.phone_number ? `+${client.phone_number}` : '—';
              const email = client.email || '—';
              const dob = client.date_of_birth || '—';

              return (
                <tr key={client.id} className="border-b border-[#eee] hover:bg-[#fafafa] transition-colors text-[12px] text-[#333]">
                  {/* Name cell with details pop-up modal built-in */}
                  <td className="px-3 py-2 border-r border-[#eee] truncate font-medium">
                    <ClientNameCell client={client} />
                  </td>
                  
                  {/* Phone */}
                  <td className="px-3 py-2 border-r border-[#eee] font-mono text-[11px] text-[#555] truncate">
                    {phone}
                  </td>
                  
                  {/* WhatsApp JID */}
                  <td className="px-3 py-2 border-r border-[#eee] font-mono text-[10px] text-[#777] truncate" title={client.whatsapp_jid || ''}>
                    {client.whatsapp_jid || '—'}
                  </td>
                  
                  {/* DOB */}
                  <td className="px-3 py-2 border-r border-[#eee] font-mono text-[11px] text-[#555]">
                    {dob}
                  </td>
                  
                  {/* Email */}
                  <td className="px-3 py-2 border-r border-[#eee] font-mono text-[11px] text-[#555] truncate" title={email}>
                    {email}
                  </td>
                  
                  {/* PAN Card */}
                  <td className="px-3 py-2 border-r border-[#eee]">
                    {renderDocLink(client.pan_media_url, name, 'PAN')}
                  </td>
                  
                  {/* Aadhaar Card */}
                  <td className="px-3 py-2 border-r border-[#eee]">
                    {renderDocLink(client.aadhaar_media_url, name, 'Aadhaar')}
                  </td>
                  
                  {/* Joined Date */}
                  <td className="px-3 py-2 border-r border-[#eee] text-right text-[10px] text-[#999] whitespace-nowrap">
                    {client.created_at ? formatDistanceToNow(new Date(client.created_at), { addSuffix: true }) : '—'}
                  </td>
                  
                  {/* Actions (Message and Delete) */}
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

      {/* Message Modal Dialog */}
      {activeMsgClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[0.5px]">
          <div className="bg-white border border-[#e0e0e0] rounded-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-100">
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
