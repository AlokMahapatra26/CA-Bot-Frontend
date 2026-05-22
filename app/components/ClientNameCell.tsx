'use client';

import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';

interface Client {
  id: string;
  phone_number: string | null;
  whatsapp_jid: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  pan_media_url: string | null;
  aadhaar_media_url: string | null;
}

interface ClientNameCellProps {
  client: Client;
}

const getExtension = (url: string) => {
  try {
    const u = new URL(url);
    return u.pathname.split('.').pop() || 'pdf';
  } catch {
    return 'pdf';
  }
};

const renderDocLink = (url: string | null, clientName: string, docType: string) => {
  if (!url) return <span className="text-slate-400 font-normal">—</span>;
  const ext = getExtension(url);
  const filename = `${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${docType}.${ext}`;
  const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  return (
    <a href={downloadUrl} className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-mono" title="Download">
      <FileText className="w-3.5 h-3.5" /> Download {docType}
    </a>
  );
};

export default function ClientNameCell({ client }: ClientNameCellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const clientName = client.full_name || 'Anonymous';

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate"
        title="Click to view full client information"
      >
        {clientName}
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-none"
          onClick={() => setIsOpen(false)} // Close when clicking backdrop
        >
          <div 
            className="bg-white border border-slate-300 w-full max-w-lg shadow-xl rounded-none flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500">Client Information Table</span>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                  {clientName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{clientName}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">DB UUID: {client.id}</p>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200">
                <table className="w-full text-left border-collapse text-xs table-fixed">
                  <tbody>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <td className="px-3 py-2.5 font-bold text-slate-500 w-[140px] border-r border-slate-100">Full Name</td>
                      <td className="px-3 py-2.5 text-slate-900 font-semibold truncate">{client.full_name || '—'}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-3 py-2.5 font-bold text-slate-500 border-r border-slate-100">Phone Number</td>
                      <td className="px-3 py-2.5 text-slate-900 font-mono">
                        {client.phone_number ? `+${client.phone_number}` : 'Not provided yet'}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <td className="px-3 py-2.5 font-bold text-slate-500 border-r border-slate-100">WhatsApp JID</td>
                      <td className="px-3 py-2.5 text-slate-900 font-mono truncate" title={client.whatsapp_jid || ''}>
                        {client.whatsapp_jid || '—'}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-3 py-2.5 font-bold text-slate-500 border-r border-slate-100">Date of Birth (DOB)</td>
                      <td className="px-3 py-2.5 text-slate-900 font-mono">{client.date_of_birth || '—'}</td>
                    </tr>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <td className="px-3 py-2.5 font-bold text-slate-500 border-r border-slate-100">Email Address</td>
                      <td className="px-3 py-2.5 text-slate-900 font-mono truncate" title={client.email || ''}>{client.email || '—'}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-3 py-2.5 font-bold text-slate-500 border-r border-slate-100">PAN Card</td>
                      <td className="px-3 py-2.5 text-slate-900 font-semibold truncate">
                        {renderDocLink(client.pan_media_url, clientName, 'PAN')}
                      </td>
                    </tr>
                    <tr className="border-slate-100 bg-slate-50/50">
                      <td className="px-3 py-2.5 font-bold text-slate-500 border-r border-slate-100">Aadhaar Card</td>
                      <td className="px-3 py-2.5 text-slate-900 font-semibold truncate">
                        {renderDocLink(client.aadhaar_media_url, clientName, 'Aadhaar')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
