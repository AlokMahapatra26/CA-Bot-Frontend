'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { MessageSquare, Send, Users, Shield, Briefcase, Hash } from 'lucide-react';
import { getMessages, sendMessage } from '@/app/actions';

interface Message {
  id: string;
  content: string;
  channel_name: string;
  created_at: string;
  sender: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    department: string;
  };
}

export default function ChatPage() {
  const { profile } = useAuth();
  const [activeChannel, setActiveChannel] = useState('firm_general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowser();

  // Determine available channels based on profile
  const channels = [
    { id: 'firm_general', name: 'Firm General', icon: Users, description: 'Company-wide announcements and discussion' }
  ];

  if (profile?.role === 'admin' || profile?.role === 'hod') {
    channels.push({ id: 'management', name: 'Management', icon: Shield, description: 'Private channel for Admins and HODs' });
  }

  if (profile?.role === 'admin') {
    channels.push({ id: 'dept_itr', name: 'ITR Dept', icon: Briefcase, description: 'Income Tax Return department' });
    channels.push({ id: 'dept_gst', name: 'GST Dept', icon: Briefcase, description: 'Goods & Services Tax department' });
    channels.push({ id: 'dept_dsc', name: 'DSC Dept', icon: Briefcase, description: 'Digital Signature Certificate department' });
  } else if (profile?.department) {
    if (profile.department !== 'ALL') {
      channels.push({ 
        id: `dept_${profile.department.toLowerCase()}`, 
        name: `${profile.department} Dept`, 
        icon: Briefcase,
        description: `${profile.department} team communication`
      });
    }
  }

  const loadMessages = async () => {
    setLoading(true);
    const result = await getMessages(activeChannel);
    if (result.success && result.messages) {
      setMessages(result.messages as unknown as Message[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.company_id) {
      loadMessages();

      // Subscribe to real-time updates for THIS channel and company
      const channel = supabase
        .channel(`messages:${profile.company_id}:${activeChannel}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `company_id=eq.${profile.company_id}`,
          },
          (payload: any) => {
            // Only reload if it belongs to the current active channel
            if (payload.new.channel_name === activeChannel) {
              loadMessages();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeChannel, profile?.company_id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile?.company_id) return;

    const content = newMessage;
    setNewMessage(''); // optimistic clear
    
    const result = await sendMessage(activeChannel, content, profile.company_id);
    if (!result.success) {
      console.error('Failed to send message:', result.error);
      setNewMessage(content); // revert on failure
    }
  };

  if (!profile) return null; // Don't render if not logged in

  const currentChannel = channels.find(c => c.id === activeChannel);

  return (
    <div className="flex-1 flex bg-white overflow-hidden">
      {/* Channels Sidebar */}
      <div className="w-[280px] bg-[#f8fafc] border-r border-[#e2e8f0] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#e2e8f0]">
          <h2 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" /> Internal Chat
          </h2>
          <p className="text-[11px] text-slate-500 mt-1">Communicate securely with your firm.</p>
        </div>
        
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          <div className="px-3 pb-2 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Your Channels
          </div>
          {channels.map((ch) => {
            const Icon = ch.icon;
            const isActive = activeChannel === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer text-left ${
                  isActive 
                    ? 'bg-blue-100/50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                }`}
              >
                <div className={`p-1.5 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-semibold truncate ${isActive ? 'text-blue-800' : ''}`}>
                    {ch.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* Chat Header */}
        <div className="h-[65px] px-6 border-b border-[#e2e8f0] flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-sm z-10">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400" /> {currentChannel?.name}
            </h3>
            <p className="text-[12px] text-slate-500 mt-0.5">{currentChannel?.description}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
          {loading && messages.length === 0 ? (
            <div className="flex justify-center items-center h-full text-slate-400 text-sm">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-slate-400">
              <MessageSquare className="w-12 h-12 mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">Welcome to #{currentChannel?.name}</p>
              <p className="text-xs text-slate-400 mt-1">This is the start of the channel. Send a message to begin.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.sender.id === profile.id;
              const showName = idx === 0 || messages[idx - 1].sender.id !== msg.sender.id;
              
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${isMe ? 'ml-auto' : 'mr-auto'}`}>
                  {showName && !isMe && (
                    <div className="flex items-baseline gap-2 ml-1 mb-1.5">
                      <span className="text-[13px] font-bold text-slate-800">
                        {msg.sender.full_name || msg.sender.email.split('@')[0]}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 uppercase tracking-wider font-semibold">
                        {msg.sender.role === 'admin' ? 'Admin' : msg.sender.role === 'hod' ? 'HOD' : msg.sender.department}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  {showName && isMe && (
                     <div className="flex items-baseline gap-2 mr-1 mb-1.5">
                       <span className="text-[11px] text-slate-400 mr-1">
                         {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                     </div>
                  )}
                  
                  <div className={`px-4 py-2.5 text-[14px] shadow-sm leading-relaxed ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-[#e2e8f0] shrink-0">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message #${currentChannel?.name.toLowerCase().replace(' ', '_')}...`}
              className="w-full pl-4 pr-12 py-3.5 bg-slate-100 border-transparent rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-sm"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-slate-400">Messages are end-to-end encrypted within your firm's private workspace.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
