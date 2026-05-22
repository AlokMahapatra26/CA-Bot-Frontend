'use client';

import { useState } from 'react';
import { Save, Bell, Clock, Settings, RefreshCw, MessageSquare } from 'lucide-react';

export default function RemindersPage() {
  const [autoReminder, setAutoReminder] = useState(true);
  const [frequency, setFrequency] = useState('2');
  const [time, setTime] = useState('10:00');

  // Dummy templates
  const [templates, setTemplates] = useState({
    pendingDocs: 'Hi {name}, this is a quick reminder to upload your pending ITR documents ({pending_docs}) so we can proceed with your filing.',
    awaitingReview: 'Hi {name}, we have received all your documents. Our CA team is currently reviewing them and will update you shortly.',
    docsVerified: 'Hi {name}, your documents are verified! Our team is preparing and filing your ITR now.',
    itrFiled: 'Hi {name}, your ITR has been filed successfully! The official receipt will be shared with you shortly.',
  });

  return (
    <div className="flex-1 flex flex-col h-full w-full">
      {/* Header Panel */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#e0e0e0] bg-[#fafafa] shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#555]" />
          <span className="text-[13px] font-semibold text-[#111]">Reminder Configurations</span>
        </div>
        <button
          onClick={() => alert('Configuration saved (simulation)')}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-white bg-[#111] rounded-lg hover:bg-[#333] transition-colors"
        >
          <Save className="w-3 h-3" /> Save Changes
        </button>
      </div>

      {/* Main Form Area */}
      <div className="flex-1 overflow-auto bg-white p-4 space-y-6 max-w-4xl">
        {/* Section 1: Scheduler Config */}
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold text-[#111] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#eee] pb-1.5">
            <Clock className="w-3.5 h-3.5" /> Scheduler Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 py-2">
              <input
                type="checkbox"
                id="autoReminder"
                checked={autoReminder}
                onChange={(e) => setAutoReminder(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#111] border-[#ddd] rounded cursor-pointer"
              />
              <label htmlFor="autoReminder" className="text-[12px] font-medium text-[#333] cursor-pointer">
                Enable automated WhatsApp reminders
              </label>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-[12px] text-[#555] w-24">Frequency:</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="px-2 py-1 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] flex-1"
              >
                <option value="1">Every 24 Hours</option>
                <option value="2">Every 2 Days</option>
                <option value="7">Every Week</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-[12px] text-[#555] w-24">Execution Time:</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="px-2 py-1 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] flex-1 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Templates Config */}
        <div className="space-y-4">
          <h3 className="text-[12px] font-bold text-[#111] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#eee] pb-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Message Templates
          </h3>
          <p className="text-[11px] text-[#888] italic">Use placeholder fields like {"{name}"}, {"{pending_docs}"} to personalize messages dynamically.</p>
          
          <div className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#555]">Awaiting Documents Reminder</label>
              <textarea
                value={templates.pendingDocs}
                onChange={(e) => setTemplates({ ...templates, pendingDocs: e.target.value })}
                rows={2}
                className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#555]">Awaiting CA Verification Notification</label>
              <textarea
                value={templates.awaitingReview}
                onChange={(e) => setTemplates({ ...templates, awaitingReview: e.target.value })}
                rows={2}
                className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#555]">Documents Verified Alert</label>
              <textarea
                value={templates.docsVerified}
                onChange={(e) => setTemplates({ ...templates, docsVerified: e.target.value })}
                rows={2}
                className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#555]">ITR Filing Completed Receipt</label>
              <textarea
                value={templates.itrFiled}
                onChange={(e) => setTemplates({ ...templates, itrFiled: e.target.value })}
                rows={2}
                className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] font-sans"
              />
            </div>
          </div>
        </div>

        {/* Section 3: System Logs */}
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold text-[#111] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#eee] pb-1.5">
            <Settings className="w-3.5 h-3.5" /> Operations Log
          </h3>
          <div className="border border-[#e0e0e0] rounded-lg overflow-hidden">
            <div className="bg-[#fafafa] px-3 py-1.5 border-b border-[#e0e0e0] flex items-center justify-between text-[11px] font-mono text-[#666]">
              <span>Last Run: Today, 10:00 AM</span>
              <span className="text-green-600 font-bold">● SUCCESSFUL</span>
            </div>
            <div className="p-3 font-mono text-[11px] text-[#555] space-y-1 bg-white">
              <p>[10:00:01] Initiating auto-reminder cycle...</p>
              <p>[10:00:03] Checked 2 pending clients.</p>
              <p>[10:00:04] Sent pending document reminder to Alok Mahapatra (+918849561649)</p>
              <p>[10:00:05] Completed cycle successfully.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
