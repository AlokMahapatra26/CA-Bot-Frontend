'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Eye, Download } from 'lucide-react';
import { updateFilingStatus, uploadItrvReceipt } from '../actions';

interface FilingStatusSelectProps {
  id: string;
  currentStatus: string;
  notes?: string | null;
  clientName: string;
  whatsappJid: string;
  onPreview?: (doc: any) => void;
}

export default function FilingStatusSelect({
  id,
  currentStatus,
  notes,
  clientName,
  whatsappJid,
  onPreview
}: FilingStatusSelectProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [receiptUrl, setReceiptUrl] = useState(notes);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync state with parent props updates
  useEffect(() => {
    setStatus(currentStatus);
    setReceiptUrl(notes);
  }, [currentStatus, notes]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    
    if (newStatus === 'FILED') {
      alert("To mark a return as FILED, please upload the ITR-V Acknowledgement PDF directly using the 'Upload ITR-V' button. This automatically saves the receipt and delivers it to the client via WhatsApp!");
      // Revert select back to current state
      e.target.value = status;
      return;
    }

    setIsUpdating(true);
    const result = await updateFilingStatus(id, newStatus);
    setIsUpdating(false);
    
    if (result.success) {
      setStatus(newStatus);
      router.refresh();
    } else {
      alert(`❌ Failed to update filing status: ${result.error || 'Unknown error'}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('❌ Invalid file format: Please select a valid PDF document for the ITR-V acknowledgement receipt.');
      return;
    }

    const confirmUpload = window.confirm(
      `Are you sure you want to upload "${file.name}" as the final ITR-V receipt for ${clientName}? This will instantly notify the client and deliver the PDF on WhatsApp.`
    );
    if (!confirmUpload) return;

    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadItrvReceipt(id, formData);
      if (result.success) {
        setReceiptUrl(result.url);
        setStatus('FILED');
        alert(`✅ ITR-V receipt uploaded successfully! The filing status has been updated to FILED, and the receipt has been sent to ${clientName} on WhatsApp.`);
        router.refresh();
      } else {
        alert(`❌ Upload failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`❌ Error uploading receipt: ${err.message}`);
    } finally {
      setIsUpdating(false);
      // Clear file input
      e.target.value = '';
    }
  };

  const getSelectClasses = () => {
    const base = "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded ";
    if (status === 'FILED') return base + "bg-blue-50 text-blue-700 border-blue-200";
    if (status === 'DOCS_VERIFIED') return base + "bg-green-50 text-green-700 border-green-200";
    return base + "bg-slate-50 text-slate-600 border-slate-200";
  };

  const cleanName = `${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_ITRV.pdf`;
  const downloadUrl = receiptUrl
    ? `/api/download?url=${encodeURIComponent(receiptUrl)}&filename=${encodeURIComponent(cleanName)}`
    : '#';

  return (
    <div className="flex flex-col gap-1.5 items-start">
      <div className="inline-flex items-center gap-1.5">
        <select
          value={status}
          onChange={handleChange}
          disabled={isUpdating || status === 'FILED'}
          className={getSelectClasses()}
        >
          <option value="PENDING" className="bg-white text-slate-700">Pending</option>
          <option value="DOCS_VERIFIED" className="bg-white text-green-700">Docs Verified</option>
          <option value="FILED" className="bg-white text-blue-700" disabled>Filed</option>
        </select>
        {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
      </div>

      {/* Render helper actions depending on status */}
      {status === 'FILED' ? (
        receiptUrl ? (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => onPreview?.({
                url: receiptUrl,
                label: 'ITR-V Receipt',
                type: 'OtherDocs',
                clientName,
                filingId: id,
                whatsappJid,
                filingStatus: 'FILED'
              })}
              className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600 font-semibold uppercase tracking-wider rounded transition-colors"
              title="View uploaded ITR-V Receipt"
            >
              <Eye className="w-3 h-3 text-slate-500" />
              View
            </button>
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600 font-semibold uppercase tracking-wider rounded transition-colors"
              title="Download ITR-V Receipt"
            >
              <Download className="w-3 h-3 text-slate-500" />
              Download
            </a>
          </div>
        ) : (
          <label className="inline-flex items-center gap-1 cursor-pointer bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider transition-colors">
            {isUpdating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Upload className="w-3 h-3" />
            )}
            Upload ITR-V
            <input 
              type="file" 
              accept="application/pdf" 
              className="hidden" 
              onChange={handleFileChange} 
              disabled={isUpdating} 
            />
          </label>
        )
      ) : status === 'DOCS_VERIFIED' ? (
        <label className="inline-flex items-center gap-1 cursor-pointer bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider transition-colors">
          {isUpdating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3 h-3" />
          )}
          Upload ITR-V
          <input 
            type="file" 
            accept="application/pdf" 
            className="hidden" 
            onChange={handleFileChange} 
            disabled={isUpdating} 
          />
        </label>
      ) : null}
    </div>
  );
}
