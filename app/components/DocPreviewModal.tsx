'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Download, AlertTriangle, Loader2, Check } from 'lucide-react';
import { rejectDocument } from '../actions';

interface DocPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: {
    url: string;
    label: string;
    type: 'Form16' | 'BankStatement' | 'CapitalGains' | 'PropertyDocs' | 'OtherDocs';
    clientName: string;
    filingId: string;
    whatsappJid: string;
    filingStatus?: string;
  } | null;
}

export default function DocPreviewModal({ isOpen, onClose, doc }: DocPreviewModalProps) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !doc) return null;

  const isPdf = doc.url.toLowerCase().includes('.pdf') || doc.url.toLowerCase().includes('pdf');
  const isImage = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(doc.url) || !isPdf; // Fallback to image if not explicitly pdf

  // Clean filename for downloading
  const ext = isPdf ? 'pdf' : 'jpg';
  const cleanName = `${doc.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${doc.label.replace(/\s/g, '_')}.${ext}`;
  const downloadUrl = `/api/download?url=${encodeURIComponent(doc.url)}&filename=${encodeURIComponent(cleanName)}`;

  const handleReject = async () => {
    if (!reason.trim()) {
      const confirmEmpty = window.confirm(
        'Are you sure you want to reject this document without providing a custom reason message?'
      );
      if (!confirmEmpty) return;
    }

    setLoading(true);
    try {
      const result = await rejectDocument(
        doc.filingId,
        doc.clientName,
        doc.whatsappJid,
        doc.type,
        reason.trim() || undefined,
        doc.url
      );
      if (result.success) {
        alert(`❌ ${doc.label} has been rejected. An automated message has been sent to the client's WhatsApp.`);
        router.refresh();
        onClose();
      } else {
        alert(`❌ Failed to reject document: ${result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`❌ Error rejecting document: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* Modal Card */}
      <div className="relative w-full max-w-6xl h-[85vh] bg-white border border-slate-350 shadow-lg flex flex-col md:flex-row overflow-hidden rounded-md">
        
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-1 text-slate-400 hover:text-slate-700 transition-colors"
          title="Close review panel"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT PANEL: Document Viewport (70%) */}
        <div className="flex-1 bg-slate-100 p-6 flex flex-col items-center justify-center relative overflow-hidden h-[50vh] md:h-full">
          {/* Header overlay for file title */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-slate-200/80 border-b border-slate-300 flex items-center justify-between text-slate-800 z-10">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Viewing Document</span>
              <h2 className="text-xs font-bold truncate pr-16">{doc.label} — {doc.clientName}</h2>
            </div>
          </div>

          {/* Document Content */}
          <div className="w-full h-full flex items-center justify-center pt-12 overflow-auto">
            {isPdf ? (
              <iframe
                src={doc.url}
                className="w-full h-full border border-slate-300 bg-white rounded"
                title={doc.label}
              />
            ) : isImage ? (
              <img
                src={doc.url}
                alt={doc.label}
                className="max-w-full max-h-full object-contain border border-slate-300 bg-white rounded shadow-sm select-none"
              />
            ) : (
              <div className="text-center text-slate-500 p-8">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <p className="text-xs font-semibold">Preview not supported for this file type.</p>
                <p className="text-[11px] text-slate-400 mt-1">Please use the download button on the right to view it.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: CA Actions & Details (30%) */}
        <div className="w-full md:w-80 lg:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-6 flex flex-col justify-between overflow-y-auto">
          {/* Top section: Info */}
          <div>
            <div className="mb-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Document Status</span>
              {doc.filingStatus === 'DOCS_VERIFIED' ? (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded font-semibold text-[10px] uppercase tracking-wider">
                  ✓ Verified & Approved
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold text-[10px] uppercase tracking-wider">
                  Needs Verification
                </div>
              )}
            </div>

            <div className="space-y-4 mb-6 border-b border-slate-200 pb-5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Client</span>
                <span className="text-xs font-semibold text-slate-700">{doc.clientName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Document Category</span>
                <span className="text-xs font-bold text-slate-800">{doc.label}</span>
              </div>
            </div>

            {/* Action 1: Download */}
            <div className="mb-6">
              <a
                href={downloadUrl}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-700 text-xs font-semibold uppercase tracking-wider transition-all rounded"
              >
                <Download className="w-4 h-4 text-slate-500" />
                Download Document
              </a>
            </div>

            {/* Action 2: Rejection Reason */}
            {doc.filingStatus !== 'DOCS_VERIFIED' && (
              <div className="mb-6">
                <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Rejection Reason (Sent on WhatsApp)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Doc is blur, please re-upload a clear file or PDF."
                  className="w-full h-24 p-3 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-slate-350 focus:ring-0 placeholder:text-slate-400 text-slate-800 resize-none"
                />
              </div>
            )}
          </div>

          {/* Bottom section: Action Buttons */}
          <div className="space-y-2.5 pt-4 border-t border-slate-200">
            {doc.filingStatus === 'DOCS_VERIFIED' ? (
              <div className="flex items-center justify-center p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded font-medium gap-2">
                <Check className="w-4 h-4 text-green-600 shrink-0" />
                <span>Documents fully verified. No action needed!</span>
              </div>
            ) : (
              /* Reject Button */
              <button
                onClick={handleReject}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold uppercase tracking-wider transition-all rounded disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                Reject Document
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
