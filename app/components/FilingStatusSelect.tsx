'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { updateFilingStatus } from '../actions';

interface FilingStatusSelectProps {
  id: string;
  currentStatus: string;
}

export default function FilingStatusSelect({ id, currentStatus }: FilingStatusSelectProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setIsUpdating(true);
    
    const result = await updateFilingStatus(id, newStatus);
    
    setIsUpdating(false);
    if (result.success) {
      setStatus(newStatus);
    } else {
      alert(`Failed to update filing status: ${result.error || 'Unknown error'}`);
    }
  };

  const getSelectClasses = () => {
    const base = "text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 border cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-md ";
    if (status === 'FILED') return base + "bg-blue-50 text-blue-700 border-blue-200";
    if (status === 'DOCS_VERIFIED') return base + "bg-green-50 text-green-700 border-green-200";
    return base + "bg-slate-100 text-slate-700 border-slate-300";
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <select
        value={status}
        onChange={handleChange}
        disabled={isUpdating}
        className={getSelectClasses()}
      >
        <option value="PENDING" className="bg-white text-slate-700">Pending</option>
        <option value="DOCS_VERIFIED" className="bg-white text-green-700">Docs Verified</option>
        <option value="FILED" className="bg-white text-blue-700">Filed</option>
      </select>
      {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
    </div>
  );
}
