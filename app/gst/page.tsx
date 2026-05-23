'use client';

import { Landmark, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GstComingSoon() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-[#fdfdfd] p-8 h-full">
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-lg shadow-sm text-center">
        <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center mx-auto mb-5 text-blue-600">
          <Landmark className="w-6 h-6" />
        </div>
        
        <h1 className="text-xl font-bold text-slate-800 tracking-tight mb-2">
          GST Filing Module
        </h1>
        
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6">
          ⏳ Coming Soon
        </div>
        
        <p className="text-xs text-slate-500 leading-relaxed mb-8 max-w-sm mx-auto">
          We are currently building the automated GST invoicing module. Soon, your clients will be able to submit monthly sales sheets, purchase registries, and GST receipts directly over WhatsApp.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-700 text-xs font-semibold uppercase tracking-wider transition-all rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to ITR Dashboard
        </Link>
      </div>
    </div>
  );
}
