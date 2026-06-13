'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteFiling } from '../actions';

interface DeleteButtonProps {
  filingId?: string;
  clientId: string;
}

export default function DeleteButton({ filingId }: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteFiling = async () => {
    if (!filingId) return;
    const confirmed = window.confirm('Are you sure you want to delete this filing and its documents? The client profile will remain.');
    if (!confirmed) return;

    setIsDeleting(true);
    const result = await deleteFiling(filingId);
    setIsDeleting(false);

    if (!result.success) {
      alert(`Failed to delete documents: ${result.error || 'Unknown error'}`);
    }
  };

  return (
    <button
      onClick={handleDeleteFiling}
      disabled={!filingId || isDeleting}
      className="inline-flex items-center justify-center p-1 border transition-all rounded-md bg-slate-50 border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Delete Documents Only"
    >
      {isDeleting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
