'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white min-h-[400px] h-full w-full animate-in fade-in duration-300">
      {/* Pulse outer glow & rotating ring */}
      <div className="relative flex items-center justify-center w-16 h-16">
        <div className="absolute inset-0 rounded-full bg-blue-50/50 animate-ping opacity-75" />
        <div className="absolute inset-1 rounded-full border border-dashed border-slate-200 animate-[spin_10s_linear_infinite]" />
        <div className="w-10 h-10 rounded-full border-[3px] border-slate-100 border-t-blue-600 animate-spin shadow-sm flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
