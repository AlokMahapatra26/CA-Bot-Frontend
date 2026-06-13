'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteFiling, deleteClient } from '../actions';

interface DeleteButtonProps {
  filingId?: string;
  clientId: string;
  clientName?: string;
}

export default function DeleteButton({ filingId, clientId, clientName }: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (filingId) {
      const confirmed = window.confirm('Are you sure you want to delete this filing and its documents? The client profile will remain.');
      if (!confirmed) return;

      setIsDeleting(true);
      const result = await deleteFiling(filingId);
      setIsDeleting(false);

      if (!result.success) {
        alert(`Failed to delete documents: ${result.error || 'Unknown error'}`);
      }
    } else {
      const displayName = clientName || 'this client profile';
      const confirmed = window.confirm(`Are you sure you want to delete ${displayName}? This action will permanently remove the client profile.`);
      if (!confirmed) return;

      setIsDeleting(true);
      const result = await deleteClient(clientId);
      setIsDeleting(false);

      if (!result.success) {
        alert(`Failed to delete client profile: ${result.error || 'Unknown error'}`);
      }
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center justify-center p-1 border transition-all rounded-md bg-slate-50 border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
      title={filingId ? "Delete Documents Only" : "Delete Client Profile"}
    >
      {isDeleting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

