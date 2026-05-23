'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Loader2 } from 'lucide-react';
import { rejectDocument, acceptAllDocuments } from '../actions';

interface DownloadDropdownProps {
  filingId: string;
  clientName: string;
  recipientJid: string;
  panUrl: string | null;
  aadhaarUrl: string | null;
  form16Url: string | null;
  bankStatementUrl: string | null;
  capitalGainsUrl: string | null;
  propertyDocsUrl: string | null;
  otherDocsUrl: string | null;
}

type DocType = 'Form16' | 'BankStatement' | 'CapitalGains' | 'PropertyDocs' | 'OtherDocs';

export default function DownloadDropdown({
  filingId,
  clientName,
  recipientJid,
  panUrl,
  aadhaarUrl,
  form16Url,
  bankStatementUrl,
  capitalGainsUrl,
  propertyDocsUrl,
  otherDocsUrl,
}: DownloadDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState<DocType | 'ALL' | null>(null);
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
      setIsOpen(false);
    } else {
      alert(`Failed to accept documents: ${result.error || 'Unknown error'}`);
    }
  };

  const handleReject = async (docType: DocType, docLabel: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to REJECT the ${docLabel}? \n\nThis will permanently delete the uploaded document from Supabase and automatically notify the client on WhatsApp to upload it again.`
    );
    
    if (!confirmed) return;

    setLoadingDoc(docType);
    const result = await rejectDocument(filingId, clientName, recipientJid, docType);
    setLoadingDoc(null);

    if (result.success) {
      alert(`❌ ${docLabel} has been rejected. An automated request has been sent to the client's WhatsApp.`);
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
                <span className="font-bold text-slate-800 truncate" title={doc.label}>
                  {doc.label}
                </span>
                <button
                  onClick={() => handleReject(doc.type, doc.label)}
                  disabled={loadingDoc !== null}
                  className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 font-bold uppercase tracking-wider hover:bg-red-100/60 disabled:opacity-50 rounded shrink-0"
                >
                  {loadingDoc === doc.type ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                  Reject
                </button>
              </div>
            ))}
            {!anyDocUploaded && (
              <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium italic">
                No documents uploaded yet
              </div>
            )}
          </div>

          {/* APPROVE FILING DOCUMENTS */}
          {anyDocUploaded && (
            <div className="p-2 bg-slate-50 rounded-b-lg">
              <button
                onClick={handleAcceptAll}
                disabled={loadingDoc !== null}
                className="w-full inline-flex items-center justify-center gap-1.5 text-[10px] py-1.5 bg-green-50 text-green-700 border border-green-200 font-bold uppercase tracking-wider hover:bg-green-100 disabled:opacity-50 rounded-md"
              >
                {loadingDoc === 'ALL' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Approve Documents
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
