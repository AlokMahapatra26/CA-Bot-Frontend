'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, Clock, Search, X, RefreshCw, Key, 
  DollarSign, MapPin, Calendar, User, Briefcase, Building2, 
  Copy, Check, Send, AlertTriangle, MessageSquare, Download,
  Megaphone
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/app/components/AuthProvider';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import ClientNameCell from './ClientNameCell';
import { updateDscApplicationAction, sendDscWhatsAppMessage } from '../actions';

interface DscDashboardProps {
  clientsData: any[];
}

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

const renderDscStatusStatus = (status: string) => {
  if (status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
        <CheckCircle2 className="w-3 h-3" /> Complete
      </span>
    );
  }
  if (status === 'AWAITING_TYPE') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600">
        <Clock className="w-3 h-3" /> Awaiting Type
      </span>
    );
  }
  if (status === 'AWAITING_VIDEO_VERIFICATION') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
        <Clock className="w-3 h-3" /> Video KYC
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
      <Clock className="w-3 h-3" /> Not Started
    </span>
  );
};

export default function DscDashboard({ clientsData }: DscDashboardProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = createSupabaseBrowser();
  const [staff, setStaff] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');

  // Modal States
  const [activeMsgClient, setActiveMsgClient] = useState<{
    id: string;
    name: string;
    jid: string;
    dscId: string;
  } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [customMsgText, setCustomMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [kycLinkInput, setKycLinkInput] = useState('');

  // Broadcast Modal States
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMsgText, setBroadcastMsgText] = useState('');
  const [confirmBroadcastSafety, setConfirmBroadcastSafety] = useState(false);
  const [broadcastingMsg, setBroadcastingMsg] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Load Staff for assignment dropdown
  useEffect(() => {
    async function fetchStaff() {
      let q = supabase
        .from('profiles')
        .select('id, email, full_name, role, department')
        .eq('company_id', profile?.company_id);

      if (profile?.role === 'hod' && profile.department && profile.department !== 'ALL') {
        q = q.eq('department', profile.department);
      }

      const { data } = await q.order('full_name', { ascending: true });
      if (data) setStaff(data);
    }
    if (profile) {
      fetchStaff();
    }
  }, [profile, supabase]);

  // Initialize DSC record if it doesn't exist
  const getOrInitializeDscId = async (client: any) => {
    if (client.dsc_applications && client.dsc_applications.length > 0) {
      return client.dsc_applications[0].id;
    }
    const { data, error } = await supabase
      .from('dsc_applications')
      .insert([{ 
        client_id: client.id, 
        company_id: client.company_id, 
        status: 'AWAITING_TYPE' 
      }])
      .select()
      .single();

    if (error) {
      alert('Failed to initialize DSC session: ' + error.message);
      return null;
    }
    router.refresh();
    return data.id;
  };

  // Inline Handlers
  const handleUpdateField = async (client: any, field: string, value: any) => {
    startTransition(async () => {
      const dscId = await getOrInitializeDscId(client);
      if (!dscId) return;

      const res = await updateDscApplicationAction(dscId, { [field]: value });
      if (res.success) {
        router.refresh();
      } else {
        alert('Failed to update: ' + res.error);
      }
    });
  };

  // Filtered Clients list
  const filteredClients = useMemo(() => {
    return clientsData.filter((client) => {
      const dsc = client.dsc_applications?.[0] || {};
      const status = dsc.status || 'UNINITIALIZED';
      const paymentStatus = dsc.payment_status || 'PENDING';
      const userType = dsc.user_type || 'INDIVIDUAL';
      const assignedTo = dsc.assigned_to || 'UNASSIGNED';

      // Search matching
      const nameMatch = (client.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const phoneMatch = (client.phone_number || '').includes(searchQuery);
      const locMatch = (dsc.token_location || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = nameMatch || phoneMatch || locMatch;

      // Filter matching
      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
      const matchesPayment = paymentFilter === 'ALL' || paymentStatus === paymentFilter;
      const matchesType = typeFilter === 'ALL' || userType === typeFilter;
      const matchesStaff = staffFilter === 'ALL' || assignedTo === staffFilter;

      return matchesSearch && matchesStatus && matchesPayment && matchesType && matchesStaff;
    });
  }, [clientsData, searchQuery, statusFilter, paymentFilter, typeFilter, staffFilter]);

  // Paginated List
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredClients.length / pageSize);

  // Expiry styling
  const renderExpiry = (dateString: string | null) => {
    if (!dateString) return null;
    const expiryDate = new Date(dateString);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Expired
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded" title={`${diffDays} days left`}>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> {diffDays}d left
        </span>
      );
    }
    return null;
  };

  // Export CSV
  const exportCSV = () => {
    const headers = [
      'Client Name',
      'Phone',
      'Email',
      'DOB',
      'DSC Type',
      'Provider',
      'Status',
      'Payment Status',
      'Token PIN',
      'Token Location',
      'Expiry Date',
      'Updated At'
    ];
    const rows = filteredClients.map((client) => {
      const dsc = client.dsc_applications?.[0] || {};
      return [
        client.full_name || '',
        client.phone_number ? `+${client.phone_number}` : '',
        client.email || '',
        client.date_of_birth || '',
        dsc.user_type || 'INDIVIDUAL',
        dsc.provider || 'eMudhra',
        dsc.status || 'UNINITIALIZED',
        dsc.payment_status || 'PENDING',
        dsc.token_pin || '',
        dsc.token_location || '',
        dsc.expiry_date || '',
        dsc.updated_at ? new Date(dsc.updated_at).toLocaleDateString('en-IN') : ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dsc_clients_${new Date().toISOString().slice(0, 10)}.csv`;
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
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search..."
              className="pl-7 pr-12 py-1 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] w-48 placeholder:text-[#bbb]"
            />
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 text-[#aaa] hover:text-[#555] cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="absolute right-2 text-[9px] font-mono text-[#aaa] bg-[#f0f0f0] px-1 py-0.5 rounded pointer-events-none border border-[#e0e0e0]">
                Ctrl+K
              </span>
            )}
          </div>
          <button
            onClick={() => {
              startTransition(() => {
                router.refresh();
              });
            }}
            disabled={isPending}
            title="Refresh Data"
            className="inline-flex items-center justify-center p-1.5 text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] hover:text-[#111] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin text-[#888]' : ''}`} />
          </button>
          <span className="text-[11px] text-[#999]">{filteredClients.length} records</span>
        </div>
        <div className="flex items-center gap-2">
          {filteredClients.length > 0 && (
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5" /> Broadcast Message
            </button>
          )}
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[#e0e0e0] bg-white shrink-0 flex-wrap text-[11px] font-medium text-[#555]">
        <div className="flex items-center gap-1.5">
          <span className="text-[#888]">DSC Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] text-[11px] text-[#333] cursor-pointer font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="UNINITIALIZED">Not Started</option>
            <option value="AWAITING_TYPE">Awaiting Type</option>
            <option value="AWAITING_VIDEO_VERIFICATION">Awaiting Video KYC</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[#888]">DSC Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] text-[11px] text-[#333] cursor-pointer font-medium"
          >
            <option value="ALL">All Types</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="ORGANIZATION">Organization</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[#888]">Payment Status:</span>
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] text-[11px] text-[#333] cursor-pointer font-medium"
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
          </select>
        </div>

        {/* Assigned To filter (only visible to Admin & HOD) */}
        {(profile?.role === 'admin' || profile?.role === 'hod') && (
          <div className="flex items-center gap-1.5">
            <span className="text-[#888]">Assigned To:</span>
            <select
              value={staffFilter}
              onChange={(e) => {
                setStaffFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] text-[11px] text-[#333] cursor-pointer font-medium"
            >
              <option value="ALL">All Staff</option>
              <option value="UNASSIGNED">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email.split('@')[0]}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clear Filters Button */}
        {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || paymentFilter !== 'ALL' || staffFilter !== 'ALL' || searchQuery) && (
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setTypeFilter('ALL');
              setPaymentFilter('ALL');
              setStaffFilter('ALL');
              setSearchQuery('');
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
            <tr className="bg-[#f5f5f5] border-b border-[#e0e0e0] text-[11px] font-semibold text-[#666] uppercase tracking-wide select-none">
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[170px]">Name</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[120px]">Phone</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[120px]">DSC Type</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[130px]">Provider</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[140px] text-center">Video KYC</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[110px] text-center">Token PIN</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[130px]">Token Location</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[160px]">Expiry Date</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[160px]">Filing Status</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[100px]">Payment</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[145px]">Assigned To</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[180px] text-center">Actions</th>
              <th className="px-3 py-2 w-[120px] text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-6 text-center text-[12px] text-[#aaa]">
                  {searchQuery ? `No results for "${searchQuery}"` : 'No DSC clients found.'}
                </td>
              </tr>
            ) : (
              paginatedClients.map((client) => {
                const dsc = client.dsc_applications?.[0] || {};
                const dscId = dsc.id || '';
                const isDscActive = !!dsc.id;
                const phone = client.phone_number ? `+${client.phone_number}` : '—';
                const updatedDate = dsc.updated_at ? formatDistanceToNow(new Date(dsc.updated_at), { addSuffix: true }) : '—';

                return (
                  <tr key={client.id} className="border-b border-[#eee] hover:bg-[#fafafa] transition-colors text-[12px] text-[#333]">
                    {/* Name Column */}
                    <td className="px-3 py-2 border-r border-[#eee] truncate font-medium">
                      <ClientNameCell client={client} />
                    </td>

                    {/* Phone Column */}
                    <td className="px-3 py-2 border-r border-[#eee] font-mono text-[11px]">{phone}</td>

                    {/* DSC Type Column */}
                    <td className="px-3 py-2 border-r border-[#eee]">
                      <select
                        value={dsc.user_type || 'INDIVIDUAL'}
                        onChange={(e) => handleUpdateField(client, 'user_type', e.target.value)}
                        className="px-1.5 py-0.5 text-[11px] bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] cursor-pointer font-medium text-slate-700 w-full truncate"
                      >
                        <option value="INDIVIDUAL">Individual</option>
                        <option value="ORGANIZATION">Organization</option>
                      </select>
                    </td>

                    {/* Provider Column */}
                    <td className="px-3 py-2 border-r border-[#eee]">
                      <select
                        value={dsc.provider || 'eMudhra'}
                        onChange={(e) => handleUpdateField(client, 'provider', e.target.value)}
                        className="px-1.5 py-0.5 text-[11px] bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] cursor-pointer font-medium text-slate-700 w-full truncate"
                      >
                        <option value="eMudhra">eMudhra</option>
                        <option value="Capricorn">Capricorn</option>
                        <option value="VSign">VSign</option>
                        <option value="Capricorn SG">Capricorn SG</option>
                      </select>
                    </td>

                    {/* Video KYC Link Column */}
                    <td className="px-3 py-2 border-r border-[#eee] text-center">
                      {isDscActive ? (
                        <button
                          onClick={() => {
                            setActiveMsgClient({
                              id: client.id,
                              name: client.full_name || 'there',
                              jid: client.whatsapp_jid || `${client.phone_number}@s.whatsapp.net`,
                              dscId: dscId
                            });
                            setSelectedTemplate('video_kyc');
                            setCustomMsgText(`Dear *${client.full_name}*,\n\nPlease record your video verification to complete your DSC registration.\n\nVerify here: Capricorn portal.`);
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-700 font-semibold uppercase tracking-wider rounded transition-colors cursor-pointer text-[10px]"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send Link</span>
                        </button>
                      ) : (
                        <span className="text-[#ccc]">—</span>
                      )}
                    </td>

                    {/* Token PIN Column */}
                    <td className="px-3 py-2 border-r border-[#eee]">
                      <input
                        type="text"
                        placeholder="PIN"
                        defaultValue={dsc.token_pin || ''}
                        onBlur={(e) => handleUpdateField(client, 'token_pin', e.target.value || null)}
                        className="px-1.5 py-0.5 text-[11px] bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] font-mono w-full text-center placeholder:text-[#ccc]"
                      />
                    </td>

                    {/* Token Location Column */}
                    <td className="px-3 py-2 border-r border-[#eee]">
                      <input
                        type="text"
                        placeholder="Cabinet location"
                        defaultValue={dsc.token_location || ''}
                        onBlur={(e) => handleUpdateField(client, 'token_location', e.target.value || null)}
                        className="px-1.5 py-0.5 text-[11px] bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] w-full placeholder:text-[#ccc]"
                      />
                    </td>

                    {/* Expiry Date Column */}
                    <td className="px-3 py-2 border-r border-[#eee] text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <input
                          type="date"
                          defaultValue={dsc.expiry_date || ''}
                          onChange={(e) => handleUpdateField(client, 'expiry_date', e.target.value || null)}
                          className="px-1 py-0.5 bg-white border border-[#ddd] rounded-md focus:outline-none text-[10px] cursor-pointer w-28 text-center"
                        />
                        {dsc.expiry_date && (
                          <div className="shrink-0">{renderExpiry(dsc.expiry_date)}</div>
                        )}
                      </div>
                    </td>

                    {/* Filing Status Column */}
                    <td className="px-3 py-2 border-r border-[#eee]">
                      <div className="flex flex-col gap-1 items-start">
                        <div className="inline-flex items-center gap-1">
                          <select
                            value={dsc.status || 'UNINITIALIZED'}
                            onChange={(e) => handleUpdateField(client, 'status', e.target.value)}
                            className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200 focus:outline-none cursor-pointer rounded"
                          >
                            <option value="UNINITIALIZED" disabled>Not Started</option>
                            <option value="AWAITING_TYPE">Awaiting Type</option>
                            <option value="AWAITING_VIDEO_VERIFICATION">Video KYC</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        </div>
                        <div>{dsc.status ? renderDscStatusStatus(dsc.status) : <span className="text-[#ccc]">—</span>}</div>
                      </div>
                    </td>

                    {/* Payment Column */}
                    <td className="px-3 py-2 border-r border-[#eee]">
                      <select
                        value={dsc.payment_status || 'PENDING'}
                        onChange={(e) => handleUpdateField(client, 'payment_status', e.target.value)}
                        className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded cursor-pointer focus:outline-none ${
                          dsc.payment_status === 'PAID' ? 'text-green-700 border-green-200 bg-green-50' : 'text-amber-700 border-amber-200 bg-amber-50'
                        }`}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="PAID">Paid</option>
                      </select>
                    </td>

                    {/* Assigned To Column */}
                    <td className="px-3 py-2 border-r border-[#eee]">
                      <select
                        value={dsc.assigned_to || ''}
                        onChange={(e) => handleUpdateField(client, 'assigned_to', e.target.value || null)}
                        className="px-1.5 py-0.5 text-[11px] bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] cursor-pointer font-medium text-slate-700 w-full truncate"
                      >
                        <option value="">Unassigned</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>{s.full_name || s.email.split('@')[0]}</option>
                        ))}
                      </select>
                    </td>

                    {/* Actions Column */}
                    <td className="px-3 py-2 border-r border-[#eee] text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isDscActive ? (
                          <button
                            onClick={() => {
                              setActiveMsgClient({
                                id: client.id,
                                name: client.full_name || 'there',
                                jid: client.whatsapp_jid || `${client.phone_number}@s.whatsapp.net`,
                                dscId: dscId
                              });
                              setSelectedTemplate('custom');
                              setCustomMsgText('');
                            }}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-1 bg-[#111] hover:bg-[#333] text-white font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Message</span>
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              startTransition(async () => {
                                await getOrInitializeDscId(client);
                              });
                            }}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-1 border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 text-[#333] font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                          >
                            <span>Initialize</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Updated Column */}
                    <td className="px-3 py-2 text-right text-[11px] text-slate-400 font-mono whitespace-nowrap">{updatedDate}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination — thin strip */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#e0e0e0] bg-[#fafafa] text-[11px] font-semibold text-[#555] select-none shrink-0">
        <div className="flex items-center gap-1.5">
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
            Showing {filteredClients.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredClients.length)} of {filteredClients.length}
          </span>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-[11px] font-semibold text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 text-[11px] font-semibold text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Message Modal Dialog */}
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
                  setSelectedTemplate('custom');
                  setKycLinkInput('');
                }}
                className="text-[#999] hover:text-[#555] text-xs font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#555]">Request Message Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => {
                    const template = e.target.value;
                    setSelectedTemplate(template);
                    
                    const name = activeMsgClient.name;
                    if (template === 'custom') {
                      setCustomMsgText('');
                    } else if (template === 'video_kyc') {
                      setCustomMsgText(
                        `Dear *${name}*,\n\nPlease complete your DSC Video KYC verification by recording a 15-second video.\n\n👉 *Click here to verify:* ${kycLinkInput || '[Verification Link]'}\n\nThank you! 🙏`
                      );
                    } else if (template === 'payment') {
                      setCustomMsgText(
                        `Dear *${name}*,\n\nPlease complete the payment for your Digital Signature Certificate (DSC) application to proceed.\n\nThank you! 🙏`
                      );
                    } else if (template === 'docs_missing') {
                      setCustomMsgText(
                        `Dear *${name}*,\n\nWe need your identity documents (PAN / Aadhaar) to proceed with your DSC. Please upload them here on WhatsApp.\n\nThank you! 🙏`
                      );
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] cursor-pointer"
                >
                  <option value="custom">-- Custom Message --</option>
                  <option value="video_kyc">Video KYC Link Request</option>
                  <option value="payment">Payment Reminder</option>
                  <option value="docs_missing">PAN/Aadhaar Missing Request</option>
                </select>
              </div>

              {selectedTemplate === 'video_kyc' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#555]">KYC Portal URL</label>
                  <input
                    type="text"
                    placeholder="Paste Capricorn/eMudhra video link here..."
                    value={kycLinkInput}
                    onChange={(e) => {
                      const url = e.target.value;
                      setKycLinkInput(url);
                      setCustomMsgText(
                        `Dear *${activeMsgClient.name}*,\n\nPlease complete your DSC Video KYC verification by recording a 15-second video.\n\n👉 *Click here to verify:* ${url || '[Verification Link]'}\n\nThank you! 🙏`
                      );
                    }}
                    className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] placeholder:text-[#ccc]"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#555]">Message Content</label>
                <textarea
                  value={customMsgText}
                  onChange={(e) => setCustomMsgText(e.target.value)}
                  rows={5}
                  placeholder="Type your WhatsApp message..."
                  className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] font-sans placeholder:text-[#ccc]"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setActiveMsgClient(null);
                    setCustomMsgText('');
                    setSelectedTemplate('custom');
                    setKycLinkInput('');
                  }}
                  className="px-3 py-1.5 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!customMsgText.trim()) return;
                    setSendingMsg(true);
                    
                    let statusToUpdate: string | undefined;
                    if (selectedTemplate === 'video_kyc') {
                      statusToUpdate = 'AWAITING_VIDEO_VERIFICATION';
                    }

                    try {
                      const res = await sendDscWhatsAppMessage(
                        activeMsgClient.jid,
                        customMsgText,
                        activeMsgClient.dscId,
                        statusToUpdate
                      );
                      if (res.success) {
                        alert('Message sent successfully!');
                        setActiveMsgClient(null);
                        setCustomMsgText('');
                        setSelectedTemplate('custom');
                        setKycLinkInput('');
                        router.refresh();
                      } else {
                        alert('Failed to send message: ' + res.error);
                      }
                    } catch {
                      alert('Failed to connect to WhatsApp backend.');
                    } finally {
                      setSendingMsg(false);
                    }
                  }}
                  disabled={sendingMsg || !customMsgText.trim()}
                  className="px-3 py-1.5 text-[11px] font-medium text-white bg-[#111] rounded-lg hover:bg-[#333] disabled:opacity-50 cursor-pointer"
                >
                  {sendingMsg ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
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
                    Send updates to all {filteredClients.length} active DSC clients
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
                  This action will broadcast this message to **every single person** currently filtered in your view ({filteredClients.length} recipients). Please ensure the message content is accurate before sending.
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
                  I confirm that I want to send this broadcast message to all {filteredClients.length} active DSC clients.
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
                        body: JSON.stringify({ 
                          text: broadcastMsgText,
                          jids: filteredClients.map((c: any) => c.whatsapp_jid).filter(Boolean)
                        }),
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
    </div>
  );
}
