'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Check, X, Loader2, Download } from 'lucide-react';
import { rejectDocument, acceptAllDocuments } from '../actions';

interface DownloadDropdownProps {
  filingId: string;
  clientName: string;
  recipientJid: string;
  clientPhone: string;
  form16Url: string | null;
  bankStatementUrl: string | null;
  capitalGainsUrl: string | null;
  propertyDocsUrl: string | null;
  otherDocsUrl: string | null;
  filingStatus: string;
  onPreview: (doc: {
    url: string;
    label: string;
    type: 'Form16' | 'BankStatement' | 'CapitalGains' | 'PropertyDocs' | 'OtherDocs';
    clientName: string;
    filingId: string;
    whatsappJid: string;
  }) => void;
}

type DocType = 'Form16' | 'BankStatement' | 'CapitalGains' | 'PropertyDocs' | 'OtherDocs';

export default function DownloadDropdown({
  filingId,
  clientName,
  recipientJid,
  clientPhone,
  form16Url,
  bankStatementUrl,
  capitalGainsUrl,
  propertyDocsUrl,
  otherDocsUrl,
  filingStatus,
  onPreview,
}: DownloadDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState<DocType | 'ALL' | 'ZIP' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAcceptAll = async () => {
    setLoadingDoc('ALL');
    const result = await acceptAllDocuments(filingId, clientName, recipientJid);
    setLoadingDoc(null);

    if (result.success) {
      alert(`✅ Documents have been accepted and a verification confirmation has been sent to the client's WhatsApp.`);
      router.refresh();
      setIsOpen(false);
    } else {
      alert(`Failed to accept documents: ${result.error || 'Unknown error'}`);
    }
  };

  const handleDownloadZip = async () => {
    setLoadingDoc('ZIP');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Download each active document as an ArrayBuffer
      for (const doc of activeDocs) {
        const proxyUrl = `/api/download?url=${encodeURIComponent(doc.url!)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error(`Failed to download ${doc.label}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        const cleanUrl = doc.url!.split('?')[0];
        const parts = cleanUrl.split('.');
        const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : 'pdf';
        
        const safeLabel = doc.label.replace(/\s+/g, '_');
        zip.file(`${safeLabel}.${ext}`, arrayBuffer);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(content);
      
      const tempLink = document.createElement('a');
      tempLink.href = zipUrl;
      
      const safeClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
      const safePhone = clientPhone.replace(/[^0-9]/g, '');
      tempLink.download = `${safeClientName}_${safePhone}.zip`;
      
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(zipUrl);
    } catch (error: any) {
      alert(`❌ Failed to create ZIP: ${error.message}`);
    } finally {
      setLoadingDoc(null);
    }
  };

  const handleReject = async (docType: DocType, docLabel: string, docUrl?: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to REJECT the ${docLabel}? \n\nThis will permanently delete the uploaded document from Supabase and automatically notify the client on WhatsApp to upload it again.`
    );
    
    if (!confirmed) return;

    setLoadingDoc(docType);
    const result = await rejectDocument(filingId, clientName, recipientJid, docType, undefined, docUrl);
    setLoadingDoc(null);

    if (result.success) {
      alert(`❌ ${docLabel} has been rejected. An automated request has been sent to the client's WhatsApp.`);
      router.refresh();
      setIsOpen(false);
    } else {
      alert(`Failed to reject document: ${result.error || 'Unknown error'}`);
    }
  };

  const otherDocsList = otherDocsUrl ? otherDocsUrl.split(',') : [];

  const docItems: { type: DocType; label: string; url: string | null }[] = [
    { type: 'Form16' as DocType, label: 'Form 16', url: form16Url },
    { type: 'BankStatement' as DocType, label: 'Bank Statement', url: bankStatementUrl },
    { type: 'CapitalGains' as DocType, label: 'Capital Gains', url: capitalGainsUrl },
    { type: 'PropertyDocs' as DocType, label: 'Property Deeds', url: propertyDocsUrl },
  ];

  if (otherDocsList.length > 0) {
    otherDocsList.forEach((url, idx) => {
      docItems.push({
        type: 'OtherDocs' as DocType,
        label: otherDocsList.length > 1 ? `Other Document ${idx + 1}` : 'Other Document',
        url: url.trim(),
      });
    });
  } else {
    docItems.push({ type: 'OtherDocs' as DocType, label: 'Other Document', url: null });
  }

  const activeDocs = docItems.filter(item => !!item.url);
  const anyDocUploaded = activeDocs.length > 0;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 text-[10px] font-bold uppercase tracking-wider transition-all rounded-md"
        title="Manage documents"
      >
        <span>Review Docs</span>
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 shadow-lg z-50 rounded-lg divide-y divide-slate-100">
          <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider rounded-t-lg">
            Review Submitted ITR Docs
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {activeDocs.map((doc) => (
              <div key={`${doc.type}-${doc.label}`} className="px-3 py-2 text-[12px] font-medium flex items-center justify-between gap-4">
                <button
                  onClick={() => onPreview({
                    url: doc.url!,
                    label: doc.label,
                    type: doc.type,
                    clientName,
                    filingId,
                    whatsappJid: recipientJid,
                    filingStatus
                  })}
                  className="font-bold text-slate-800 hover:text-blue-600 transition-colors text-left truncate flex-1 hover:underline"
                  title={`Click to preview ${doc.label}`}
                >
                  {doc.label}
                </button>
                {filingStatus !== 'DOCS_VERIFIED' && filingStatus !== 'FILED' ? (
                  <button
                    onClick={() => handleReject(doc.type, doc.label, doc.url || undefined)}
                    disabled={loadingDoc !== null}
                    className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 font-bold uppercase tracking-wider hover:bg-red-100/60 disabled:opacity-50 rounded shrink-0"
                  >
                    {loadingDoc === doc.type ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    Reject
                  </button>
                ) : (
                  <span className="text-[10px] text-green-600 font-semibold font-mono tracking-wider shrink-0 bg-green-50/50 px-1 py-0.5 border border-green-100 rounded">✓ Verified</span>
                )}
              </div>
            ))}
            {!anyDocUploaded && (
              <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium italic">
                No documents uploaded yet
              </div>
            )}
          </div>

          {/* APPROVE & DOWNLOAD FILING DOCUMENTS */}
          {anyDocUploaded && (
            <div className="p-2 bg-slate-50 rounded-b-lg space-y-1.5 border-t border-slate-100">
              <button
                onClick={handleDownloadZip}
                disabled={loadingDoc !== null}
                className="w-full inline-flex items-center justify-center gap-1.5 text-[10px] py-1.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold uppercase tracking-wider disabled:opacity-50 rounded-md transition-colors cursor-pointer"
              >
                {loadingDoc === 'ZIP' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Download All (ZIP)
              </button>
              {filingStatus !== 'DOCS_VERIFIED' && filingStatus !== 'FILED' && (
                <button
                  onClick={handleAcceptAll}
                  disabled={loadingDoc !== null}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-[10px] py-1.5 bg-green-50 text-green-700 border border-green-200 font-bold uppercase tracking-wider hover:bg-green-100 disabled:opacity-50 rounded-md transition-colors cursor-pointer"
                >
                  {loadingDoc === 'ALL' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Approve Documents
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
