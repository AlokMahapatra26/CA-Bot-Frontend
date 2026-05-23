'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { approveClient, rejectClientAccount } from '../actions';

interface AccountApprovalButtonProps {
  clientId: string;
  clientName: string;
  currentStatus: string | null;
}

export default function AccountApprovalButton({ clientId, clientName, currentStatus }: AccountApprovalButtonProps) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);

  if (currentStatus === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3 h-3" /> Approved
      </span>
    );
  }

  if (currentStatus === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <XCircle className="w-3 h-3" /> Rejected
      </span>
    );
  }

  // PENDING — show action buttons
  const handleApprove = async () => {
    if (!confirm(`Approve account for ${clientName}? They will be notified via WhatsApp.`)) return;
    setLoading('approve');
    const result = await approveClient(clientId);
    setLoading(null);
    if (!result.success) alert(`Failed to approve: ${result.error}`);
  };

  const handleReject = async () => {
    const reason = prompt(`Reason for rejecting ${clientName}'s account (optional):`);
    if (reason === null) return; // cancelled
    setLoading('reject');
    const result = await rejectClientAccount(clientId, reason || undefined);
    setLoading(null);
    if (!result.success) alert(`Failed to reject: ${result.error}`);
  };

  return (
    <div className="flex items-center gap-1">
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mr-1">
        <Clock className="w-3 h-3 text-amber-600" /> Pending
      </span>
      <button
        onClick={handleApprove}
        disabled={loading !== null}
        className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50 transition-colors"
        title="Approve account"
      >
        {loading === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
        Approve
      </button>
      <button
        onClick={handleReject}
        disabled={loading !== null}
        className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
        title="Reject account"
      >
        {loading === 'reject' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
        Reject
      </button>
    </div>
  );
}
