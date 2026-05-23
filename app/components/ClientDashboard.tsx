'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Download, Search, X, FileText, RefreshCw, Briefcase, Building2, TrendingUp, Home } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import DeleteButton from './DeleteButton';
import FilingStatusSelect from './FilingStatusSelect';
import DownloadDropdown from './DownloadDropdown';
import ClientNameCell from './ClientNameCell';
import DocPreviewModal from './DocPreviewModal';

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
  if (status === 'SERVICE_MENU') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600">
        <Clock className="w-3 h-3" /> Service Selection
      </span>
    );
  }
  // Clean up status label: AWAITING_BANK_NAME → "Bank Name"
  const label = status
    .replace('AWAITING_', '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
      <Clock className="w-3 h-3" /> {label}
    </span>
  );
};


const renderIncomeSource = (source: string | null) => {
  if (!source) return <span className="text-[#ccc]">—</span>;
  
  const map: Record<string, { label: string; icon: React.ComponentType<any>; colorClass: string; bgClass: string; borderClass: string }> = {
    SALARIED: {
      label: 'Salaried',
      icon: Briefcase,
      colorClass: 'text-indigo-700',
      bgClass: 'bg-indigo-50/50',
      borderClass: 'border-indigo-100',
    },
    BUSINESS: {
      label: 'Business',
      icon: Building2,
      colorClass: 'text-emerald-700',
      bgClass: 'bg-emerald-50/50',
      borderClass: 'border-emerald-100',
    },
    INVESTOR: {
      label: 'Investor',
      icon: TrendingUp,
      colorClass: 'text-blue-700',
      bgClass: 'bg-blue-50/50',
      borderClass: 'border-blue-100',
    },
    PROPERTY: {
      label: 'Property',
      icon: Home,
      colorClass: 'text-amber-700',
      bgClass: 'bg-amber-50/50',
      borderClass: 'border-amber-100',
    },
  };

  const item = map[source];
  if (!item) return <span className="font-semibold text-slate-700 text-[11px]">{source}</span>;

  const IconComponent = item.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10.5px] font-semibold tracking-wide uppercase ${item.colorClass} ${item.bgClass} ${item.borderClass}`}>
      <IconComponent className="w-3 h-3" />
      {item.label}
    </span>
  );
};

const renderFilingDocs = (
  f: any,
  clientName: string,
  filingId: string,
  whatsappJid: string,
  onPreview: (doc: any) => void
) => {
  if (!f) return <span className="text-[#ccc]">—</span>;
  const docs = [];
  if (f.form16_media_url) docs.push({ url: f.form16_media_url, label: 'Form 16', type: 'Form16' });
  if (f.bank_statement_media_url) docs.push({ url: f.bank_statement_media_url, label: 'Bank Statement', type: 'BankStatement' });
  if (f.capital_gains_media_url) docs.push({ url: f.capital_gains_media_url, label: 'Capital Gains', type: 'CapitalGains' });
  if (f.property_docs_media_url) docs.push({ url: f.property_docs_media_url, label: 'Property Deeds', type: 'PropertyDocs' });
  
  if (f.other_docs_media_url) {
    const urls = f.other_docs_media_url.split(',');
    urls.forEach((url: string, idx: number) => {
      docs.push({
        url: url.trim(),
        label: urls.length > 1 ? `Other Doc ${idx + 1}` : 'Other Doc',
        type: 'OtherDocs'
      });
    });
  }

  if (docs.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded font-semibold uppercase tracking-wider">
        <Clock className="w-2.5 h-2.5" /> Awaiting Documents
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {docs.map((doc, idx) => {
        return (
          <button
            key={idx}
            onClick={() => onPreview({
              url: doc.url,
              label: doc.label,
              type: doc.type,
              clientName,
              filingId,
              whatsappJid,
              filingStatus: f.filing_status
            })}
            className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 hover:text-blue-800 transition-all rounded font-medium"
            title={`Review ${doc.label}`}
          >
            <FileText className="w-3 h-3 text-blue-500" /> {doc.label}
          </button>
        );
      })}
    </div>
  );
};

export default function ClientDashboard({ clientsData }: ClientDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [activeMsgClient, setActiveMsgClient] = useState<{ id: string; name: string; jid: string } | null>(null);
  const [customMsgText, setCustomMsgText] = useState('');
  const [activePreviewDoc, setActivePreviewDoc] = useState<{
    url: string;
    label: string;
    type: 'Form16' | 'BankStatement' | 'CapitalGains' | 'PropertyDocs' | 'OtherDocs';
    clientName: string;
    filingId: string;
    whatsappJid: string;
    filingStatus?: string;
  } | null>(null);

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };
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
      return [c.full_name||'', c.phone_number?`+${c.phone_number}`:'', c.date_of_birth||'', c.email||'', f?.bank_name||'', f?.bank_account_number||'', f?.bank_ifsc||'', f?.fy_year||'', c.pan_media_url?'Yes':'No', c.aadhaar_media_url?'Yes':'No', f?.form16_media_url?'Yes':'No', f?.filing_status||'', f?.updated_at?new Date(f.updated_at).toLocaleDateString('en-IN'):''].map(v => `"${String(v).replace(/"/g,'""')}"`);
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
          <button
            onClick={handleRefresh}
            disabled={isPending}
            title="Refresh Data"
            className="inline-flex items-center justify-center p-1.5 text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] hover:text-[#111] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin text-[#888]' : ''}`} />
          </button>
          <span className="text-[11px] text-[#999]">{filtered.length} records</span>
        </div>
        <div className="flex items-center gap-2">
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
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[120px]">Phone</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[70px]">FY</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[140px]">Bot Status</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[110px]">Income Source</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[260px]">ITR Documents</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[140px]">Filing Status</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[220px] text-center">Actions</th>
              <th className="px-3 py-2 w-[120px] text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-[12px] text-[#aaa]">
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
                  <td className="px-3 py-2 border-r border-[#eee]">{phone}</td>
                  <td className="px-3 py-2 border-r border-[#eee] font-mono text-[11px] text-[#555]">{f?.fy_year || '—'}</td>
                  <td className="px-3 py-2 border-r border-[#eee]">{f ? renderStatus(f.status) : <span className="text-[#ccc]">—</span>}</td>
                  <td className="px-3 py-2 border-r border-[#eee]">{f ? renderIncomeSource(f.income_source) : <span className="text-[#ccc]">—</span>}</td>
                  <td className="px-3 py-2 border-r border-[#eee]">{f ? renderFilingDocs(f, name, f.id, client.whatsapp_jid || '', (previewData) => setActivePreviewDoc(previewData)) : <span className="text-[#ccc]">—</span>}</td>
                  <td className="px-3 py-2 border-r border-[#eee]">
                    {f ? (
                      <FilingStatusSelect 
                        id={f.id} 
                        currentStatus={f.filing_status} 
                        notes={f.notes}
                        clientName={name}
                        whatsappJid={client.whatsapp_jid || ''}
                        onPreview={(previewData) => setActivePreviewDoc(previewData)}
                      />
                    ) : (
                      <span className="text-[#ccc]">—</span>
                    )}
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
                            form16Url={f.form16_media_url}
                            bankStatementUrl={f.bank_statement_media_url}
                            capitalGainsUrl={f.capital_gains_media_url}
                            propertyDocsUrl={f.property_docs_media_url}
                            otherDocsUrl={f.other_docs_media_url}
                            onPreview={(previewData) => setActivePreviewDoc(previewData)}
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
      {activePreviewDoc && (
        <DocPreviewModal
          isOpen={!!activePreviewDoc}
          onClose={() => setActivePreviewDoc(null)}
          doc={activePreviewDoc}
        />
      )}
    </div>
  );
}
