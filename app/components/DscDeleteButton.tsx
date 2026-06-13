'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Loader2, FileX, UserX } from 'lucide-react';
import { deleteDscApplicationAction, deleteClient } from '../actions';

interface DscDeleteButtonProps {
  clientId: string;
  clientName: string;
}

export default function DscDeleteButton({ clientId, clientName }: DscDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteDsc = async () => {
    const confirmed = window.confirm(`Are you sure you want to remove ${clientName} from the DSC list? The client profile will remain.`);
    if (!confirmed) return;

    setIsOpen(false);
    setIsDeleting(true);
    const result = await deleteDscApplicationAction(clientId);
    setIsDeleting(false);

    if (!result.success) {
      alert(`Failed to remove DSC service: ${result.error || 'Unknown error'}`);
    }
  };

  const handleDeleteClient = async () => {
    const confirmed = window.confirm('WARNING: Are you sure you want to PERMANENTLY delete this entire client profile and all their data? This cannot be undone.');
    if (!confirmed) return;

    setIsOpen(false);
    setIsDeleting(true);
    const result = await deleteClient(clientId);
    setIsDeleting(false);

    if (!result.success) {
      alert(`Failed to delete client: ${result.error || 'Unknown error'}`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDeleting}
        className={`inline-flex items-center justify-center p-1.5 border transition-all rounded-md cursor-pointer ${
          isOpen 
            ? 'bg-red-50 border-red-200 text-red-600' 
            : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title="Delete options"
      >
        {isDeleting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Trash2 className="w-3.5 h-3.5" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 shadow-lg rounded-lg z-50">
          <div className="py-1 flex flex-col">
            <button
              onClick={handleDeleteDsc}
              disabled={isDeleting}
              className="px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileX className="w-3 h-3 text-slate-400" />
              Remove from DSC List Only
            </button>
            <div className="border-t border-slate-100 my-0.5"></div>
            <button
              onClick={handleDeleteClient}
              disabled={isDeleting}
              className="px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserX className="w-3 h-3 text-red-400" />
              Delete Entire Client Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
