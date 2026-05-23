'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, Download, Upload, FileText, Clock, CheckCircle2, HelpCircle, RefreshCw, Plus, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ClientNameCell from './ClientNameCell';
import DeleteButton from './DeleteButton';
import AccountApprovalButton from './AccountApprovalButton';
import { importClients, updateClientProfile, uploadClientDoc, createClientProfile } from '../actions';

interface ClientsDashboardProps {
  clientsData: any[];
}

const getExtension = (url: string) => {
  try {
    return new URL(url).pathname.split('.').pop() || 'pdf';
  } catch { return 'pdf'; }
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
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editForm, setEditForm] = useState<any>({
    full_name: '',
    phone_number: '',
    email: '',
    date_of_birth: '',
    account_status: '',
    bot_status: ''
  });
  const [activePreviewDoc, setActivePreviewDoc] = useState<{ url: string; clientName: string; docType: string } | null>(null);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        setIsImporting(true);
        
        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          alert('❌ The selected CSV file is empty or invalid.');
          setIsImporting(false);
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        const nameIdx = headers.findIndex(h => h.includes('name'));
        const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('number'));
        const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));

        if (nameIdx === -1 || phoneIdx === -1) {
          alert('❌ Invalid CSV structure: Must contain at least "name" and "phone" columns as headers.');
          setIsImporting(false);
          return;
        }

        const clients: Array<{ full_name: string; phone_number: string; email?: string }> = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cells: string[] = [];
          let currentCell = '';
          let insideQuotes = false;

          for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const char = line[charIdx];
            if (char === '"') {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              cells.push(currentCell.trim().replace(/^"|"$/g, ''));
              currentCell = '';
            } else {
              currentCell += char;
            }
          }
          cells.push(currentCell.trim().replace(/^"|"$/g, ''));

          const name = cells[nameIdx];
          const phone = cells[phoneIdx];
          const email = emailIdx !== -1 ? cells[emailIdx] : undefined;

          if (name && phone) {
            clients.push({
              full_name: name,
              phone_number: phone,
              email: email || undefined
            });
          }
        }

        if (clients.length === 0) {
          alert('❌ No valid client profiles found in the CSV (check that names and phone numbers are present).');
          setIsImporting(false);
          return;
        }

        const confirmImport = window.confirm(
          `Are you sure you want to import ${clients.length} clients? They will be marked as Pre-Approved in the system automatically.`
        );
        if (!confirmImport) {
          setIsImporting(false);
          return;
        }

        const result = await importClients(clients);
        if (result.success) {
          alert(`✅ Successfully imported ${clients.length} clients!`);
          router.refresh();
        } else {
          alert(`❌ Import failed: ${result.error}`);
        }
      } catch (err: any) {
        alert(`❌ Error parsing CSV file: ${err.message}`);
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleDirectDocUpload = async (clientId: string, docType: 'pan' | 'aadhaar', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmUpload = window.confirm(
      `Are you sure you want to upload "${file.name}" as the official ${docType.toUpperCase()} card for this client?`
    );
    if (!confirmUpload) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Perform upload
      const res = await uploadClientDoc(clientId, docType, formData);
      if (res.success) {
        alert(`✅ ${docType.toUpperCase()} document uploaded successfully!`);
        router.refresh();
      } else {
        alert(`❌ Upload failed: ${res.error}`);
      }
    } catch (err: any) {
      alert(`❌ Error uploading document: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };

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

  // Reset to first page when search query changes
  useMemo(() => {
    setCurrentPage(1);
  }, [query]);

  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  }, [filtered, currentPage, pageSize]);

  const downloadTemplate = () => {
    const csvContent = "full_name,phone_number,email\nAlok Kumar,919876543210,alok@example.com\nJane Doe,919988776655,jane@example.com";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setEditingClient({ id: 'NEW', full_name: 'New Client' });
              setDobDay('');
              setDobMonth('');
              setDobYear('');
              setEditForm({
                full_name: '',
                phone_number: '',
                email: '',
                date_of_birth: '',
                account_status: 'APPROVED',
                bot_status: 'REGISTERED'
              });
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors"
          >
            <Plus className="w-3 h-3 text-slate-500 font-bold" />
            <span>Add Client</span>
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowImportDropdown(!showImportDropdown)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors"
            >
              <Download className="w-3 h-3 text-slate-500 font-bold" />
              <span>{isImporting ? 'Importing...' : 'Import CSV'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {showImportDropdown && (
              <div className="absolute right-0 mt-1 z-30 w-48 bg-white border border-[#ddd] rounded-lg shadow-sm py-1 text-[11px] font-medium text-[#555]">
                <button
                  onClick={() => {
                    downloadTemplate();
                    setShowImportDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#f5f5f5] text-[#555] transition-colors border-b border-[#eee]"
                >
                  Download CSV Template
                </button>
                <label className="w-full text-left px-3 py-1.5 hover:bg-[#f5f5f5] text-[#555] transition-colors cursor-pointer flex items-center justify-between">
                  <span>Upload & Import Clients</span>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      handleImportCSV(e);
                      setShowImportDropdown(false);
                    }}
                    disabled={isImporting}
                  />
                </label>
              </div>
            )}
          </div>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors"
          >
            <Upload className="w-3 h-3 text-slate-500 font-bold" /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[1400px] text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#f5f5f5] border-b border-[#e0e0e0] text-[11px] font-semibold text-[#666] uppercase tracking-wide">
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[160px]">Name</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[120px]">Phone</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[90px]">DOB</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[170px]">Email</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[100px]">PAN Card</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[100px]">Aadhaar</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[120px]">Services</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[90px]">Reg. Stage</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[220px]">Account Status</th>
              <th className="px-3 py-2 border-r border-[#e0e0e0] w-[110px] text-right">Joined</th>
              <th className="px-3 py-2 w-[140px] text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-[12px] text-[#aaa]">
                  {query ? `No profiles matching "${query}"` : 'No client profiles found.'}
                </td>
              </tr>
            )}
            {paginatedClients.map((client: any) => {
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
                  <td className="px-3 py-2 border-r border-[#eee] font-mono text-[11px] text-[#555]">
                    {(() => {
                      if (!client.date_of_birth) return '—';
                      const p = client.date_of_birth.split('-');
                      if (p.length === 3 && p[0].length === 4) {
                        return `${p[2]}-${p[1]}-${p[0]}`;
                      }
                      return client.date_of_birth;
                    })()}
                  </td>
                  <td className="px-3 py-2 border-r border-[#eee] font-mono text-[11px] text-[#555] truncate" title={client.email || ''}>{client.email || '—'}</td>
                  <td className="px-3 py-2 border-r border-[#eee] whitespace-nowrap">
                    {client.pan_media_url ? (
                      <button
                        onClick={() => setActivePreviewDoc({ url: client.pan_media_url, clientName: name, docType: 'PAN' })}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                        title="View PAN Card"
                      >
                        <FileText className="w-3.5 h-3.5" /> PAN
                      </button>
                    ) : (
                      <label className="inline-flex items-center gap-1 cursor-pointer bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600 font-semibold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider transition-colors">
                        <Upload className="w-2.5 h-2.5 text-slate-500" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => handleDirectDocUpload(client.id, 'pan', e)}
                        />
                      </label>
                    )}
                  </td>
                  <td className="px-3 py-2 border-r border-[#eee] whitespace-nowrap">
                    {client.aadhaar_media_url ? (
                      <button
                        onClick={() => setActivePreviewDoc({ url: client.aadhaar_media_url, clientName: name, docType: 'Aadhaar' })}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                        title="View Aadhaar Card"
                      >
                        <FileText className="w-3.5 h-3.5" /> Aadhaar
                      </button>
                    ) : (
                      <label className="inline-flex items-center gap-1 cursor-pointer bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600 font-semibold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider transition-colors">
                        <Upload className="w-2.5 h-2.5 text-slate-500" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => handleDirectDocUpload(client.id, 'aadhaar', e)}
                        />
                      </label>
                    )}
                  </td>
                  <td className="px-3 py-2 border-r border-[#eee]">
                    <div className="flex items-center gap-1 flex-wrap">
                      {client.itr_filings && client.itr_filings.length > 0 ? (
                        <Link
                          href="/"
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 hover:border-blue-300 transition-colors cursor-pointer"
                          title="View ITR Filing"
                        >
                          <FileText className="w-2.5 h-2.5" /> ITR
                        </Link>
                      ) : null}
                      {/* GST & DSC tags — greyed out until modules go live */}
                      {/* 
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-slate-50 text-slate-400 border border-slate-200 rounded">GST</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-slate-50 text-slate-400 border border-slate-200 rounded">DSC</span>
                      */}
                      {(!client.itr_filings || client.itr_filings.length === 0) && (
                        <span className="text-[10px] text-[#ccc]">—</span>
                      )}
                    </div>
                  </td>
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
                        onClick={() => {
                          setEditingClient(client);
                          
                          const dob = client.date_of_birth || '';
                          const parts = dob.split('-');
                          if (parts.length === 3) {
                            // Postgres stores as YYYY-MM-DD
                            setDobDay(parts[2]);
                            setDobMonth(parts[1]);
                            setDobYear(parts[0]);
                          } else {
                            setDobDay('');
                            setDobMonth('');
                            setDobYear('');
                          }

                          setEditForm({
                            full_name: client.full_name || '',
                            phone_number: client.phone_number || '',
                            email: client.email || '',
                            date_of_birth: client.date_of_birth || '',
                            account_status: client.account_status || 'PENDING',
                            bot_status: client.bot_status || 'REGISTERED'
                          });
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa] transition-colors"
                      >
                        Edit
                      </button>
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

      {/* Edit Client Profile Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[0.5px]">
          <div className="bg-white border border-[#e0e0e0] rounded-xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-[#fafafa] px-4 py-2.5 border-b border-[#e0e0e0] flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#111] uppercase tracking-wider">
                {editingClient.id === 'NEW' ? 'Add New Client' : `Edit Profile — ${editingClient.full_name || 'Anonymous'}`}
              </span>
              <button
                onClick={() => setEditingClient(null)}
                className="text-[#999] hover:text-[#555] text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Form Content */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editForm.full_name.trim() || !editForm.phone_number.trim()) {
                  alert('Full Name and Phone Number are required.');
                  return;
                }

                setIsUpdating(true);
                try {
                  const formattedDob = dobDay && dobMonth && dobYear ? `${dobYear}-${dobMonth}-${dobDay}` : null;
                  const submissionData = { ...editForm, date_of_birth: formattedDob };
                  
                  let res;
                  if (editingClient.id === 'NEW') {
                    res = await createClientProfile(submissionData);
                  } else {
                    res = await updateClientProfile(editingClient.id, submissionData);
                  }
                  
                  if (res.success) {
                    alert(editingClient.id === 'NEW' ? '✅ Client profile created successfully!' : '✅ Client profile updated successfully!');
                    setEditingClient(null);
                    router.refresh();
                  } else {
                    alert(`❌ Action failed: ${res.error}`);
                  }
                } catch (err: any) {
                  alert(`❌ Error updating profile: ${err.message}`);
                } finally {
                  setIsUpdating(false);
                }
              }}
              className="p-4 space-y-3"
            >
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999]"
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone_number}
                  onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999]"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Email (Optional)</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999]"
                />
              </div>

              {/* DOB */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Date of Birth (Optional)</label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Day */}
                  <select
                    value={dobDay}
                    onChange={(e) => setDobDay(e.target.value)}
                    className="w-full px-2 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999]"
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  {/* Month */}
                  <select
                    value={dobMonth}
                    onChange={(e) => setDobMonth(e.target.value)}
                    className="w-full px-2 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999]"
                  >
                    <option value="">Month</option>
                    {[
                      { value: '01', label: 'Jan' },
                      { value: '02', label: 'Feb' },
                      { value: '03', label: 'Mar' },
                      { value: '04', label: 'Apr' },
                      { value: '05', label: 'May' },
                      { value: '06', label: 'Jun' },
                      { value: '07', label: 'Jul' },
                      { value: '08', label: 'Aug' },
                      { value: '09', label: 'Sep' },
                      { value: '10', label: 'Oct' },
                      { value: '11', label: 'Nov' },
                      { value: '12', label: 'Dec' }
                    ].map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>

                  {/* Year */}
                  <select
                    value={dobYear}
                    onChange={(e) => setDobYear(e.target.value)}
                    className="w-full px-2 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999]"
                  >
                    <option value="">Year</option>
                    {Array.from({ length: new Date().getFullYear() - 1940 + 1 }, (_, i) => String(new Date().getFullYear() - i)).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Account Approval Status */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Account Status</label>
                <select
                  value={editForm.account_status}
                  onChange={(e) => setEditForm({ ...editForm, account_status: e.target.value })}
                  className="w-full px-2 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999]"
                >
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0e0e0] mt-4">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-3 py-1.5 text-[11px] font-medium text-[#555] bg-white border border-[#ddd] rounded-lg hover:border-[#aaa]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-3 py-1.5 text-[11px] font-medium text-white bg-[#111] rounded-lg hover:bg-[#333] disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Document Preview Modal */}
      {activePreviewDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-4xl h-[85vh] flex flex-col md:flex-row overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              onClick={() => setActivePreviewDoc(null)}
              className="absolute top-3 right-3 bg-white/95 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 p-1.5 rounded-full transition-all z-20 shadow-sm"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* LEFT PANEL: Document Viewport (70%) */}
            <div className="flex-1 bg-slate-100 p-6 flex flex-col items-center justify-center relative overflow-hidden h-[50vh] md:h-full">
              {/* Header overlay for file title */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-slate-200/85 border-b border-slate-350 flex items-center justify-between text-slate-800 z-10">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Viewing KYC Document</span>
                  <h2 className="text-xs font-bold truncate pr-16">{activePreviewDoc.docType} — {activePreviewDoc.clientName}</h2>
                </div>
              </div>

              {/* Document Content */}
              <div className="w-full h-full flex items-center justify-center pt-12 overflow-auto">
                {activePreviewDoc.url.toLowerCase().includes('.pdf') || activePreviewDoc.url.toLowerCase().includes('pdf') ? (
                  <iframe
                    src={activePreviewDoc.url}
                    className="w-full h-full border border-slate-300 bg-white rounded"
                    title={activePreviewDoc.docType}
                  />
                ) : (
                  <img
                    src={activePreviewDoc.url}
                    alt={activePreviewDoc.docType}
                    className="max-w-full max-h-full object-contain border border-slate-300 bg-white rounded shadow-sm select-none"
                  />
                )}
              </div>
            </div>

            {/* RIGHT PANEL: Info & Actions (30%) */}
            <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="mb-6">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Document Status</span>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded font-semibold text-[10px] uppercase tracking-wider">
                    ✓ Uploaded KYC
                  </div>
                </div>

                <div className="space-y-4 mb-6 border-b border-slate-200 pb-5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Client Name</span>
                    <span className="text-xs font-semibold text-slate-700">{activePreviewDoc.clientName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Document Type</span>
                    <span className="text-xs font-bold text-slate-800">{activePreviewDoc.docType}</span>
                  </div>
                </div>

                {/* Download Button */}
                <div className="mb-6">
                  {(() => {
                    const ext = activePreviewDoc.url.toLowerCase().includes('.pdf') || activePreviewDoc.url.toLowerCase().includes('pdf') ? 'pdf' : 'jpg';
                    const filename = `${activePreviewDoc.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${activePreviewDoc.docType}.${ext}`;
                    const downloadUrl = `/api/download?url=${encodeURIComponent(activePreviewDoc.url)}&filename=${encodeURIComponent(filename)}`;
                    return (
                      <a
                        href={downloadUrl}
                        className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider transition-all rounded"
                      >
                        <Download className="w-4 h-4 text-slate-500" />
                        Download Document
                      </a>
                    );
                  })()}
                </div>
              </div>

              {/* Bottom Info text */}
              <div className="pt-4 border-t border-slate-200 text-center">
                <span className="text-[10px] text-slate-450 font-medium">Internal CA KYC Records</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
