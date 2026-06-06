'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Download, Search, X, FileText, RefreshCw, Briefcase, Building2, TrendingUp, Home, GitFork, Megaphone, Bell, Sliders, FlaskConical, Sparkles, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import DeleteButton from './DeleteButton';
import FilingStatusSelect from './FilingStatusSelect';
import DownloadDropdown from './DownloadDropdown';
import ClientNameCell from './ClientNameCell';
import DocPreviewModal from './DocPreviewModal';
import { useAuth } from '@/app/components/AuthProvider';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

function CopyButton({ text, title }: { text: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.warn('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer inline-flex items-center justify-center ml-1 shrink-0"
      title={title}
    >
      {copied ? (
        <Check className="w-2.5 h-2.5 text-green-600" />
      ) : (
        <Copy className="w-2.5 h-2.5" />
      )}
    </button>
  );
}

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
  const { profile } = useAuth();
  const supabase = createSupabaseBrowser();
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStaff() {
      let q = supabase
        .from('profiles')
        .select('id, full_name, email, role, department')
        .neq('role', 'admin'); // Don't assign to admins
      
      if (profile?.company_id) {
        q = q.eq('company_id', profile.company_id);
      }

      const { data } = await q.order('full_name', { ascending: true });
      if (data) {
        setStaff(data);
      }
    }
    if (profile) {
      fetchStaff();
    }
  }, [profile, supabase]);

  const handleAssignClient = async (clientId: string, staffId: string | null) => {
    try {
      const { error } = await supabase
        .from('itr_filings')
        .update({ assigned_to: staffId || null })
        .eq('client_id', clientId);
      if (error) {
        alert(`Failed to assign staff: ${error.message}`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      alert(`Error assigning staff: ${err.message}`);
    }
  };

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
  const [showDecisionTree, setShowDecisionTree] = useState(false);
  const [activePathFilter, setActivePathFilter] = useState<'SALARIED' | 'BUSINESS' | 'INVESTOR' | 'PROPERTY' | null>(null);
  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };
  const [sendingMsg, setSendingMsg] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMsgText, setBroadcastMsgText] = useState('');
  const [confirmBroadcastSafety, setConfirmBroadcastSafety] = useState(false);
  const [broadcastingMsg, setBroadcastingMsg] = useState(false);

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderInterval, setReminderInterval] = useState(24);
  const [reminderIsTesting, setReminderIsTesting] = useState(false);
  const [reminderLastRun, setReminderLastRun] = useState<string | null>(null);
  const [reminderNextRun, setReminderNextRun] = useState<string | null>(null);
  const [reminderActiveClients, setReminderActiveClients] = useState<any[]>([]);
  const [loadingReminderStatus, setLoadingReminderStatus] = useState(false);
  const [savingReminderSettings, setSavingReminderSettings] = useState(false);
  const [triggeringReminders, setTriggeringReminders] = useState(false);

  const fetchReminderStatus = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/reminders/status');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReminderEnabled(data.enabled);
          setReminderInterval(data.intervalHours);
          setReminderIsTesting(!!data.isTesting);
          setReminderLastRun(data.lastRun);
          setReminderNextRun(data.nextRun);
          setReminderActiveClients(data.activeClients || []);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch reminder status:', err);
    }
  };

  useEffect(() => {
    fetchReminderStatus();
  }, []);

  const [filterFilingStatus, setFilterFilingStatus] = useState<string>('ALL');
  const [filterIncomeSource, setFilterIncomeSource] = useState<string>('ALL');
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>('ALL');

  const filtered = useMemo(() => {
    let result = clientsData;

    // Search query filter
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((c: any) =>
        (c.full_name || '').toLowerCase().includes(q) ||
        (c.phone_number || '').includes(q)
      );
    }

    // Filing status filter
    if (filterFilingStatus !== 'ALL') {
      result = result.filter((c: any) => {
        const f = c.itr_filings?.[0] || null;
        return (f?.filing_status || 'AWAITING_DOCS') === filterFilingStatus;
      });
    }

    // Income source filter
    if (filterIncomeSource !== 'ALL') {
      result = result.filter((c: any) => {
        const f = c.itr_filings?.[0] || null;
        return f?.income_source === filterIncomeSource;
      });
    }

    // Assigned to filter
    if (filterAssignedTo !== 'ALL') {
      result = result.filter((c: any) => {
        const f = c.itr_filings?.[0] || null;
        if (filterAssignedTo === 'UNASSIGNED') {
          return !f || !f.assigned_to;
        }
        return f?.assigned_to === filterAssignedTo;
      });
    }

    return result;
  }, [clientsData, query, filterFilingStatus, filterIncomeSource, filterAssignedTo]);

  // Reset to first page when search query or any filter changes
  useMemo(() => {
    setCurrentPage(1);
  }, [query, filterFilingStatus, filterIncomeSource, filterAssignedTo]);

  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  }, [filtered, currentPage, pageSize]);

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
          <div className="relative flex items-center">
            <Search className="absolute left-2 w-3.5 h-3.5 text-[#aaa] pointer-events-none" />
            <input
              type="text"
              data-search-input="true"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              className="pl-7 pr-12 py-1 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] w-48 placeholder:text-[#bbb]"
            />
            {query ? (
              <button onClick={() => setQuery('')} className="absolute right-2 text-[#aaa] hover:text-[#555]">
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="absolute right-2 text-[9px] font-mono text-[#aaa] bg-[#f0f0f0] px-1 py-0.5 rounded pointer-events-none border border-[#e0e0e0]">
                Ctrl+K
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            title="Refresh Data"
            className="inline-flex items-center justify-center p-1.5 text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] hover:text-[#111] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin text-[#888]' : ''}`} />
          </button>
          <span className="text-[11px] text-[#999]">{filtered.length} records</span>
        </div>
        <div className="flex items-center gap-2">
          {(profile?.role === 'admin' || profile?.role === 'hod') && (
            <>
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-700 hover:border-indigo-800 rounded-lg hover:shadow-sm active:scale-[0.98] transition-all duration-150 cursor-pointer"
              >
                <Megaphone className="w-3.5 h-3.5 text-indigo-100" />
                <span>Broadcast Message</span>
              </button>
              <button
                onClick={() => {
                  fetchReminderStatus();
                  setShowReminderModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#444] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors relative cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-slate-500" />
                <span>Reminder Settings</span>
                <span className={`w-1.5 h-1.5 rounded-full ${reminderEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              </button>
            </>
          )}
          <button
            onClick={() => setShowDecisionTree(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors cursor-pointer"
          >
            <GitFork className="w-3.5 h-3.5 text-slate-500" />
            <span>Bot Flow Diagram</span>
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[#e0e0e0] bg-white shrink-0 flex-wrap text-[11px] font-medium text-[#555]">
        <div className="flex items-center gap-1.5">
          <span className="text-[#888]">Filing Status:</span>
          <select
            value={filterFilingStatus}
            onChange={e => setFilterFilingStatus(e.target.value)}
            className="px-2 py-1 bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] text-[11px] text-[#333] cursor-pointer font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="AWAITING_DOCS">Awaiting Docs</option>
            <option value="DOCS_SUBMITTED">Docs Submitted</option>
            <option value="DOCS_VERIFIED">Docs Verified</option>
            <option value="FILING_IN_PROGRESS">Filing In Progress</option>
            <option value="FILED">Filed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[#888]">Income Source:</span>
          <select
            value={filterIncomeSource}
            onChange={e => setFilterIncomeSource(e.target.value)}
            className="px-2 py-1 bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] text-[11px] text-[#333] cursor-pointer font-medium"
          >
            <option value="ALL">All Sources</option>
            <option value="SALARIED">Salaried</option>
            <option value="BUSINESS">Business</option>
            <option value="INVESTOR">Investor</option>
            <option value="PROPERTY">Property</option>
          </select>
        </div>

        {/* Assigned To filter (only visible to Admin & HOD) */}
        {(profile?.role === 'admin' || profile?.role === 'hod') && (
          <div className="flex items-center gap-1.5">
            <span className="text-[#888]">Assigned To:</span>
            <select
              value={filterAssignedTo}
              onChange={e => setFilterAssignedTo(e.target.value)}
              className="px-2 py-1 bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] text-[11px] text-[#333] cursor-pointer font-medium"
            >
              <option value="ALL">All Staff</option>
              <option value="UNASSIGNED">Unassigned</option>
              {staff
                .filter((s) => s.department === 'ITR' || s.department === 'ALL')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || s.email.split('@')[0]}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Clear Filters Button (only shows if any filter is active) */}
        {(filterFilingStatus !== 'ALL' || filterIncomeSource !== 'ALL' || filterAssignedTo !== 'ALL' || query) && (
          <button
            onClick={() => {
              setFilterFilingStatus('ALL');
              setFilterIncomeSource('ALL');
              setFilterAssignedTo('ALL');
              setQuery('');
            }}
            className="px-2 py-0.5 hover:bg-red-50 text-red-600 hover:text-red-700 font-semibold border border-dashed border-red-200 hover:border-red-300 rounded text-[10px] transition-all uppercase tracking-wider cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table — full bleed */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[1580px] text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#f5f5f5] border-b border-[#e0e0e0] text-[11px] font-semibold text-[#666] uppercase tracking-wide">
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[170px]">Name</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[120px]">Phone</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[70px]">FY</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[140px]">Bot Status</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[110px]">Income Source</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[180px]">Bank Details</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[260px]">ITR Documents</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[140px]">Filing Status</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[145px]">Assigned To</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[220px] text-center">Actions</th>
              <th className="px-3 py-2 w-[120px] text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={11} className="px-3 py-6 text-center text-[12px] text-[#aaa]">
                {query ? `No results for "${query}"` : 'No clients yet.'}
              </td></tr>
            )}
            {paginatedClients.map((client: any) => {
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
                  <td className="px-3 py-2 border-r border-[#eee]">
                    {f?.bank_name ? (
                      <div className="text-[11px] leading-tight space-y-0.5">
                        <div className="group/bank flex items-center justify-between gap-1 min-h-[16px]">
                          <span className="font-semibold text-slate-800 truncate">{f.bank_name}</span>
                          <span className="opacity-0 group-hover/bank:opacity-100 transition-opacity">
                            <CopyButton text={f.bank_name} title="Copy Bank Name" />
                          </span>
                        </div>
                        <div className="group/acc flex items-center justify-between gap-1 min-h-[16px]">
                          <span className="text-slate-600 font-mono">{f.bank_account_number}</span>
                          <span className="opacity-0 group-hover/acc:opacity-100 transition-opacity">
                            <CopyButton text={f.bank_account_number} title="Copy Account Number" />
                          </span>
                        </div>
                        <div className="group/ifsc flex items-center justify-between gap-1 min-h-[16px]">
                          <span className="text-[10px] text-slate-500 font-mono uppercase">{f.bank_ifsc}</span>
                          <span className="opacity-0 group-hover/ifsc:opacity-100 transition-opacity">
                            <CopyButton text={f.bank_ifsc} title="Copy IFSC Code" />
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[#ccc]">—</span>
                    )}
                  </td>
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
                  <td className="px-3 py-2 border-r border-[#eee]">
                    {f ? (
                      profile?.role === 'admin' || profile?.role === 'hod' ? (
                        <select
                          value={f.assigned_to || ''}
                          disabled={isPending}
                          onChange={(e) => handleAssignClient(client.id, e.target.value || null)}
                          className="px-1.5 py-0.5 text-[11px] bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] cursor-pointer font-medium text-slate-700 w-full truncate"
                        >
                          <option value="">Unassigned</option>
                          {staff
                            .filter((s) => s.department === 'ITR' || s.department === 'ALL')
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.full_name || s.email.split('@')[0]} ({s.role === 'hod' ? `HOD-${s.department}` : s.role})
                              </option>
                            ))}
                        </select>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-700">
                          {(() => {
                            const assigned = staff.find((s) => s.id === f.assigned_to);
                            return assigned ? (assigned.full_name || assigned.email.split('@')[0]) : 'Unassigned';
                          })()}
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium italic">No ITR Service</span>
                    )}
                  </td>
                  <td className="px-2 py-2 border-r border-[#eee] text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {f && (
                        <>
                          <DownloadDropdown
                            filingId={f.id}
                            clientName={name}
                            recipientJid={client.whatsapp_jid || ''}
                            clientPhone={client.phone_number || ''}
                            form16Url={f.form16_media_url}
                            bankStatementUrl={f.bank_statement_media_url}
                            capitalGainsUrl={f.capital_gains_media_url}
                            propertyDocsUrl={f.property_docs_media_url}
                            otherDocsUrl={f.other_docs_media_url}
                            filingStatus={f.filing_status}
                            onPreview={(previewData) => setActivePreviewDoc(previewData)}
                          />
                          {f.filing_status === 'DOCS_VERIFIED' && (
                            <span className="text-[9px] font-bold text-green-600 font-mono bg-green-50 border border-green-200 px-1 py-0.5 rounded" title="Documents fully verified">✓ Verified</span>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => setActiveMsgClient({ id: client.id, name, jid: client.whatsapp_jid || '' })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors"
                      >
                        Message
                      </button>
                      {profile?.role === 'admin' && (
                        <DeleteButton filingId={f?.id} clientId={client.id} />
                      )}
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

      {/* Pagination Controls */}
      <div className="h-[38px] bg-[#fafafa] border-t border-[#e0e0e0] px-4 flex items-center justify-between text-[11px] font-medium text-[#555] shrink-0">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-1.5 py-0.5 text-[11px] bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] cursor-pointer font-semibold"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <span>
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
          </span>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-[11px] font-semibold text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filtered.length / pageSize)))}
              disabled={currentPage >= Math.ceil(filtered.length / pageSize)}
              className="px-2.5 py-1 text-[11px] font-semibold text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
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
      
      {/* Broadcast Modal Dialog */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-700">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase">
                    Broadcast WhatsApp Message
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium normal-case mt-0.5">
                    Send updates to all {filtered.length} active ITR clients
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBroadcastModal(false);
                  setBroadcastMsgText('');
                  setConfirmBroadcastSafety(false);
                }}
                className="w-6 h-6 rounded-full hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Warnings box */}
              <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3.5 text-[11px] leading-relaxed text-amber-800 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  ⚠️ CRITICAL NOTICE
                </span>
                <p>
                  This action will broadcast this message to **every single person** currently filtered in your view ({filtered.length} recipients). Please ensure the message content is accurate before sending.
                </p>
              </div>

              {/* Text Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <label>Message Content</label>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {broadcastMsgText.length} characters
                  </span>
                </div>
                <textarea
                  value={broadcastMsgText}
                  onChange={(e) => setBroadcastMsgText(e.target.value)}
                  rows={5}
                  placeholder="Type your broadcast announcement..."
                  className="w-full px-3 py-2 text-[12px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-sans placeholder:text-slate-400 leading-normal"
                />
              </div>

              {/* Safety Checkbox */}
              <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100/50 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmBroadcastSafety}
                  onChange={(e) => setConfirmBroadcastSafety(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-700 font-medium select-none leading-normal">
                  I confirm that I want to send this broadcast message to all {filtered.length} active clients.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => {
                    setShowBroadcastModal(false);
                    setBroadcastMsgText('');
                    setConfirmBroadcastSafety(false);
                  }}
                  className="px-4 py-2 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!broadcastMsgText.trim()) {
                      alert('⚠️ Please type a message before broadcasting!');
                      return;
                    }
                    if (!confirmBroadcastSafety) {
                      alert('⚠️ Please check the safety confirmation box to proceed.');
                      return;
                    }
                    setBroadcastingMsg(true);
                    try {
                      const res = await fetch('http://localhost:4000/api/broadcast-message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: broadcastMsgText }),
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        alert(`🎉 Broadcast sent successfully!\nSuccessfully sent: ${data.count}\nFailed: ${data.failed}`);
                        setShowBroadcastModal(false);
                        setBroadcastMsgText('');
                        setConfirmBroadcastSafety(false);
                      } else {
                        alert(`❌ Failed to send broadcast message: ${data.error || 'Server error'}`);
                      }
                    } catch {
                      alert('❌ Failed to connect to WhatsApp backend server.');
                    } finally {
                      setBroadcastingMsg(false);
                    }
                  }}
                  disabled={broadcastingMsg}
                  className="px-4 py-2 text-[11px] font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1.5 shadow-sm hover:shadow cursor-pointer"
                >
                  {broadcastingMsg ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>Send Broadcast</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Reminder Settings Modal Dialog */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-200 rounded-lg text-slate-700">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase">
                    Auto Reminder Settings
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium normal-case mt-0.5">
                    WhatsApp document reminders scheduling
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReminderModal(false)}
                className="w-6 h-6 rounded-full hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Quick Status Info Banner */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-150 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Scheduler Status
                    </span>
                    <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed">
                      {reminderEnabled 
                        ? `Active • Runs every ${reminderInterval} ${reminderIsTesting ? 'seconds' : 'hours'}`
                        : 'Inactive • Automatic reminders are paused'}
                    </p>
                  </div>
                  
                  {/* Custom Toggle Switch */}
                  <button
                    onClick={async () => {
                      const newEnabled = !reminderEnabled;
                      setSavingReminderSettings(true);
                      try {
                        const res = await fetch('http://localhost:4000/api/reminders/toggle', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ enabled: newEnabled, intervalHours: reminderInterval, isTesting: reminderIsTesting }),
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          setReminderEnabled(data.enabled);
                          setReminderInterval(data.intervalHours);
                          setReminderIsTesting(!!data.isTesting);
                          setReminderLastRun(data.lastRun);
                          setReminderNextRun(data.nextRun);
                        } else {
                          alert(`Failed to save settings: ${data.error || 'Unknown error'}`);
                        }
                      } catch {
                        alert('Failed to connect to WhatsApp backend.');
                      } finally {
                        setSavingReminderSettings(false);
                      }
                    }}
                    disabled={savingReminderSettings}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-250 focus:outline-none flex items-center cursor-pointer ${
                      reminderEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow transform duration-250 ${
                        reminderEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Fast Testing Mode Switch */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50/50 border border-slate-150 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <FlaskConical className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Fast Testing Mode</span>
                    </span>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                      Treat interval in *seconds* for rapid cron loop testing.
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      const newTesting = !reminderIsTesting;
                      const newInterval = newTesting ? 10 : 24; // Default to 10s or 24h
                      setSavingReminderSettings(true);
                      try {
                        const res = await fetch('http://localhost:4000/api/reminders/toggle', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ enabled: reminderEnabled, intervalHours: newInterval, isTesting: newTesting }),
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          setReminderEnabled(data.enabled);
                          setReminderInterval(data.intervalHours);
                          setReminderIsTesting(!!data.isTesting);
                          setReminderLastRun(data.lastRun);
                          setReminderNextRun(data.nextRun);
                        } else {
                          alert(`Failed to save settings: ${data.error || 'Unknown error'}`);
                        }
                      } catch {
                        alert('Failed to connect to WhatsApp backend.');
                      } finally {
                        setSavingReminderSettings(false);
                      }
                    }}
                    disabled={savingReminderSettings}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-250 focus:outline-none flex items-center cursor-pointer ${
                      reminderIsTesting ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow transform duration-250 ${
                        reminderIsTesting ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Interval Selection Slider/Select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                  <label className="flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    <span>Interval Frequency</span>
                  </label>
                  <span className="text-[10.5px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                    Every {reminderInterval} {reminderIsTesting ? 'Seconds' : 'Hours'}
                  </span>
                </div>
                <input
                  type="range"
                  min={reminderIsTesting ? 5 : 1}
                  max={reminderIsTesting ? 60 : 48}
                  value={reminderInterval}
                  onChange={(e) => setReminderInterval(Number(e.target.value))}
                  onMouseUp={async () => {
                    setSavingReminderSettings(true);
                    try {
                      const res = await fetch('http://localhost:4000/api/reminders/toggle', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enabled: reminderEnabled, intervalHours: reminderInterval, isTesting: reminderIsTesting }),
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        setReminderEnabled(data.enabled);
                        setReminderInterval(data.intervalHours);
                        setReminderIsTesting(!!data.isTesting);
                        setReminderLastRun(data.lastRun);
                        setReminderNextRun(data.nextRun);
                      }
                    } catch (err) {
                      console.error('Failed to update interval:', err);
                    } finally {
                      setSavingReminderSettings(false);
                    }
                  }}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  {reminderIsTesting ? (
                    <>
                      <span>5 Seconds</span>
                      <span>15s</span>
                      <span>30s (Default)</span>
                      <span>45s</span>
                      <span>60 Seconds</span>
                    </>
                  ) : (
                    <>
                      <span>1 Hour</span>
                      <span>12h</span>
                      <span>24 Hours (Default)</span>
                      <span>36h</span>
                      <span>48 Hours</span>
                    </>
                  )}
                </div>
              </div>

              {/* Targets Summary List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                  <span>Active Targets ({reminderActiveClients.length})</span>
                  {reminderEnabled && reminderNextRun && (
                    <span className="text-[9.5px] text-slate-500 font-medium">
                      Next run: {new Date(reminderNextRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                
                {reminderActiveClients.length > 0 ? (
                  <div className="border border-slate-100 rounded-xl overflow-hidden max-h-36 overflow-y-auto divide-y divide-slate-50 bg-slate-50/50">
                    {reminderActiveClients.map((c, i) => (
                      <div key={i} className="px-3 py-2 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                          {c.clientName}
                        </span>
                        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/50">
                          {c.pendingDoc}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center space-y-1 bg-slate-50/20">
                    <span className="text-[11px] font-bold text-slate-650 flex justify-center gap-1.5 items-center">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>ALL CLEAR</span>
                    </span>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      No clients are currently stuck awaiting ITR documents!
                    </p>
                  </div>
                )}
              </div>

              {/* Log History Info */}
              {reminderLastRun && (
                <div className="flex items-center gap-1.5 text-[9.5px] font-medium text-slate-400 justify-center">
                  <span>Last Executed:</span>
                  <span className="font-mono text-slate-500">
                    {new Date(reminderLastRun).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                <button
                  onClick={async () => {
                    if (triggeringReminders) return;
                    setTriggeringReminders(true);
                    try {
                      const res = await fetch('http://localhost:4000/api/reminders/trigger', {
                        method: 'POST'
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        alert(`🎉 Reminders run executed successfully!\nTotal messages sent: ${data.count}\nFailed: ${data.failed}`);
                        fetchReminderStatus();
                      } else {
                        alert(`❌ Reminder run failed: ${data.error || 'Server error'}`);
                      }
                    } catch {
                      alert('❌ Failed to connect to WhatsApp backend.');
                    } finally {
                      setTriggeringReminders(false);
                    }
                  }}
                  disabled={triggeringReminders}
                  className="px-4 py-2 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 rounded-xl hover:bg-indigo-100 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {triggeringReminders ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                      <span>Sending Alerts...</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Send Reminders Now</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowReminderModal(false)}
                  className="px-4 py-2 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-sm cursor-pointer"
                >
                  Close Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bot Decision Tree Modal */}
      {showDecisionTree && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[0.5px] p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#d0d0d0] rounded-lg w-full max-w-4xl h-[82vh] overflow-hidden shadow-xl flex flex-col transition-all">
            {/* Minimalist Header */}
            <div className="bg-[#fcfcfc] px-4 py-2.5 border-b border-[#e5e5e5] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mt-0.5">
                  <span>CONVERSATION STATE TREE</span>
                </h3>
              </div>
              <button 
                onClick={() => setShowDecisionTree(false)}
                className="text-[10px] font-bold px-2 py-0.5 bg-white hover:bg-slate-50 border border-[#d0d0d0] rounded transition-all text-[#333]"
              >
                [Esc] Close
              </button>
            </div>

            {/* Content Container - Monotone Scrollable */}
            <div className="flex-1 overflow-auto p-5 space-y-5 bg-white text-[11px]">
              
              {/* Backtrack Banner - Minimal Box */}
              <div className="border border-[#e0e0e0] bg-slate-50/40 p-3 rounded text-[10.5px] leading-relaxed text-slate-700">
                <span className="font-bold">BACKTRACK INTERCEPTOR ACTIVE</span>
                <p className="mt-1">
                  At any stage, typing <strong className="bg-slate-100 px-1 rounded text-slate-850">back</strong> or <strong className="bg-slate-100 px-1 rounded text-slate-850">undo</strong> will instantly wipe the last entered column in Supabase, rollback the stage status, and dispatch the correct previous text prompt.
                </p>
              </div>

              {/* Main Two Column Monospace Trees */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* KYC Column */}
                <div className="border border-[#e0e0e0] p-4 bg-slate-50/40 rounded">
                  <div className="border-b border-[#e8e8e8] pb-1.5 mb-3 font-bold text-slate-700">
                    [PHASE 1: CLIENT REGISTRATION & KYC]
                  </div>
                  <pre className="text-[10.5px] leading-relaxed text-[#444] whitespace-pre-wrap select-text">
{`┌─ WELCOME & GREETING
│  └── Trigger: Client sends 'hi' / 'hello'
│
├─ CLIENT KYC ONBOARDING
│  ├── 1. Full Name     --> [client.full_name]
│  │   └── status: REGISTERING_NAME
│  ├── 2. Verify Mobile --> [client.phone_number]
│  │   └── status: REGISTERING_PHONE
│  ├── 3. Date of Birth --> [client.date_of_birth]
│  │   └── status: REGISTERING_DOB
│  ├── 4. Email Address --> [client.email]
│  │   └── status: REGISTERING_EMAIL
│  ├── 5. PAN Upload    --> [pan_media_url]
│  │   └── status: REGISTERING_PAN
│  └── 6. Aadhaar Upload--> [aadhaar_media_url]
│      └── status: REGISTERING_AADHAAR
│
└─ CA HOD REVIEW
   └── status: PENDING_APPROVAL
       └── Blocked until account_status === 'APPROVED'`}
                  </pre>
                </div>

                {/* ITR Column */}
                <div className="border border-[#e0e0e0] p-4 bg-slate-50/40 rounded">
                  <div className="border-b border-[#e8e8e8] pb-1.5 mb-3 font-bold text-slate-700">
                    [PHASE 2 & 3: ITR FILING DETAILS]
                  </div>
                  <pre className="text-[10.5px] leading-relaxed text-[#444] whitespace-pre-wrap select-text">
{`┌─ SERVICE MENU ROUTING
│  └── status: REGISTERED
│      └── Select '1' for ITR Filing (creates itr_filings)
│
├─ BANK INFORMATION COLLECTION
│  ├── 1. Bank Name       --> [filing.bank_name]
│  │   └── status: AWAITING_BANK_NAME
│  ├── 2. Account Number  --> [filing.bank_account_number]
│  │   └── status: AWAITING_BANK_ACC (6-18 digits)
│  └── 3. Bank IFSC Code  --> [filing.bank_ifsc]
│      └── status: AWAITING_BANK_IFSC (validation match)
│
└─ PRIMARY INCOME ROUTING
   └── status: AWAITING_INCOME_SOURCE
       └── User selects primary source of tax income`}
                  </pre>
                </div>

              </div>

              {/* Collapsible Decisional Branches Section */}
              <div className="space-y-2 pt-2">
                <div className="font-bold text-slate-700 border-b border-[#eee] pb-1">
                  [PHASE 4: DECISIONAL BRANCHES & COMPILING] (Click to expand)
                </div>

                <div className="space-y-1.5">
                  
                  {/* Branch A */}
                  <details className="group border border-[#e0e0e0] rounded bg-white hover:border-[#bbb] transition-all">
                    <summary className="cursor-pointer p-2 flex items-center justify-between font-bold text-slate-700 select-none">
                      <span>BRANCH 1: SALARIED EMPLOYEE PATHWAY</span>
                      <span className="text-[9px] text-[#999] group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-3 border-t border-[#f0f0f0] bg-slate-50/30 text-[10.5px] text-[#555] space-y-1.5 leading-relaxed">
                      <div>• <strong>Target Database State:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-850">AWAITING_FORM16</code></div>
                      <div>• <strong>System Query Prompt:</strong> Bot requests Form 16 (PDF or photo format).</div>
                      <div>• <strong>Database Storage Column:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-850">itr_filings.form16_media_url</code></div>
                      <div>• <strong>Subsequent Step:</strong> Redirects automatically to Property Sale Transaction check.</div>
                    </div>
                  </details>

                  {/* Branch B */}
                  <details className="group border border-[#e0e0e0] rounded bg-white hover:border-[#bbb] transition-all">
                    <summary className="cursor-pointer p-2 flex items-center justify-between font-bold text-slate-700 select-none">
                      <span>BRANCH 2: BUSINESS / PROFESSIONAL / FREELANCE PATHWAY</span>
                      <span className="text-[9px] text-[#999] group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-3 border-t border-[#f0f0f0] bg-slate-50/30 text-[10.5px] text-[#555] space-y-1.5 leading-relaxed">
                      <div>• <strong>Target Database State:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-850">AWAITING_BANK_STATEMENT</code></div>
                      <div>• <strong>System Query Prompt:</strong> Bot requests 12-month Bank Statement document.</div>
                      <div>• <strong>Database Storage Column:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-850">itr_filings.bank_statement_media_url</code></div>
                      <div>• <strong>Subsequent Step:</strong> Redirects automatically to Property Sale Transaction check.</div>
                    </div>
                  </details>

                  {/* Branch C */}
                  <details className="group border border-[#e0e0e0] rounded bg-white hover:border-[#bbb] transition-all">
                    <summary className="cursor-pointer p-2 flex items-center justify-between font-bold text-slate-700 select-none">
                      <span>BRANCH 3: STOCK MARKET / MUTUAL FUNDS INVESTOR PATHWAY</span>
                      <span className="text-[9px] text-[#999] group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-3 border-t border-[#f0f0f0] bg-slate-50/30 text-[10.5px] text-[#555] space-y-1.5 leading-relaxed">
                      <div>• <strong>Target Database State:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-850">AWAITING_CAPITAL_GAINS</code></div>
                      <div>• <strong>System Query Prompt:</strong> Bot requests Capital Gains statement or broker P&L report.</div>
                      <div>• <strong>Database Storage Column:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-850">itr_filings.capital_gains_media_url</code></div>
                      <div>• <strong>Subsequent Step:</strong> Redirects automatically to Property Sale Transaction check.</div>
                    </div>
                  </details>

                  {/* Branch D */}
                  <details className="group border border-[#e0e0e0] rounded bg-white hover:border-[#bbb] transition-all">
                    <summary className="cursor-pointer p-2 flex items-center justify-between font-bold text-slate-700 select-none">
                      <span>BRANCH 4: PROPERTY SALE TRANSACTIONS PATHWAY</span>
                      <span className="text-[9px] text-[#999] group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-3 border-t border-[#f0f0f0] bg-slate-50/30 text-[10.5px] text-[#555] space-y-1.5 leading-relaxed">
                      <div>• <strong>Target Database State:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-850">AWAITING_PROPERTY_DOCS</code></div>
                      <div>• <strong>System Query Prompt:</strong> Bot requests registered Purchase or Sale deeds.</div>
                      <div>• <strong>Database Storage Column:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-850">itr_filings.property_docs_media_url</code></div>
                      <div>• <strong>Subsequent Step:</strong> Redirects automatically to Other Documents decision loops.</div>
                    </div>
                  </details>

                  {/* Final Compilation Details */}
                  <details className="group border border-[#e0e0e0] rounded bg-white hover:border-[#bbb] transition-all">
                    <summary className="cursor-pointer p-2 flex items-center justify-between font-bold text-[#111] select-none">
                      <span>MULTI-DOCUMENT LOOPS & TRANSACTION FINISHING</span>
                      <span className="text-[9px] text-[#999] group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-3 border-t border-[#f0f0f0] bg-slate-50/30 text-[10.5px] text-[#555] space-y-1.5 leading-relaxed">
                      <div>• <strong>Real Estate Check (Q1):</strong> Requests property deeds only if capital gains were received.</div>
                      <div>• <strong>Other Document Loop (Q2):</strong> State: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-850">AWAITING_OTHER_DOCS</code>. Allows client to upload unlimited files in a consecutive message loop (accumulating comma-separated media URLs inside <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-850">other_docs_media_url</code>) until they explicitly type <strong className="text-black bg-slate-200 px-1 rounded">DONE</strong> to close the loop.</div>
                      <div>• <strong>ITR Session Compilation:</strong> Changes <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-850">filing_status</code> to <code className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">COMPLETED</code>, locking all uploads and alerting CA specialists on the dashboard.</div>
                    </div>
                  </details>

                </div>
              </div>

            </div>

            {/* Monospace Footer */}
            <div className="bg-[#fcfcfc] border-t border-[#e5e5e5] px-4 py-2 flex items-center justify-end text-[9px] text-slate-400 shrink-0">
              <span>© {new Date().getFullYear()} DAV Labs System Architecture</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
