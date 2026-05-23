'use client';

import { Landmark, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GstComingSoon() {
  return (
    <div className="flex-1 bg-white p-6 flex flex-col items-start justify-start border-t border-[#e0e0e0]">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-[#ddd] text-[#555] hover:text-[#222] hover:border-[#aaa] text-[11px] font-semibold uppercase tracking-wider transition-colors rounded"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Dashboard
        </Link>
      </div>

      {/* Main Panel */}
      <div className="w-full max-w-xl border border-[#e0e0e0] bg-white p-5 rounded">
        {/* Header Block */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#e0e0e0]">
          <div className="w-8 h-8 bg-slate-50 border border-slate-200 rounded flex items-center justify-center text-slate-600 shrink-0">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">
              GST Filing Module
            </h1>
            <span className="text-[9px] font-bold text-[#888] tracking-widest uppercase">
              Under Development (Coming Soon)
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          We are currently building the automated GST invoicing module. Soon, your clients will be able to submit monthly sales sheets, purchase registries, and GST receipts directly over WhatsApp.
        </p>

        {/* Feature List */}
        <div className="w-full border border-[#e0e0e0] rounded overflow-hidden">
          <div className="bg-[#fafafa] border-b border-[#e0e0e0] px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Upcoming Automation Highlights
          </div>
          <div className="divide-y divide-[#e0e0e0]">
            <div className="px-3 py-2 text-xs text-slate-600">
              • Auto-dispatch invoices over WhatsApp on the 1st of every month
            </div>
            <div className="px-3 py-2 text-xs text-slate-600">
              • Direct PDF and CSV sales register parsing via backend engines
            </div>
            <div className="px-3 py-2 text-xs text-slate-600">
              • Instant GSTR-1 and GSTR-3B document aggregation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
