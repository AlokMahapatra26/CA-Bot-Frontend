'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteDscApplicationAction } from '../actions';

interface DscDeleteButtonProps {
  clientId: string;
  clientName: string;
}

export default function DscDeleteButton({ clientId, clientName }: DscDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteDsc = async () => {
    const confirmed = window.confirm(`Are you sure you want to remove ${clientName} from the DSC list? The client profile will remain.`);
    if (!confirmed) return;

    setIsDeleting(true);
    const result = await deleteDscApplicationAction(clientId);
    setIsDeleting(false);

    if (!result.success) {
      alert(`Failed to remove DSC service: ${result.error || 'Unknown error'}`);
    }
  };

  return (
    <button
      onClick={handleDeleteDsc}
      disabled={isDeleting}
      className="inline-flex items-center justify-center p-1.5 border transition-all rounded-md bg-slate-50 border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Remove from DSC List Only"
    >
      {isDeleting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
