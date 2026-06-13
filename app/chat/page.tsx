'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { MessageSquare, Send, Users, Shield, Briefcase, Hash, Lock, User } from 'lucide-react';
import { getAllProfiles } from '@/app/actions';

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
  } | null;
}

export default function ChatPage() {
  const { profile } = useAuth();
  const [activeChannel, setActiveChannel] = useState('firm_general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowser();

  const activeChannelRef = useRef(activeChannel);

  // Sync activeChannel ref and clear unread status for active channel
  useEffect(() => {
    activeChannelRef.current = activeChannel;
    setUnreadChannels((prev) => {
      if (prev.has(activeChannel)) {
        const next = new Set(prev);
        next.delete(activeChannel);
        return next;
      }
      return prev;
    });
  }, [activeChannel]);

  // Update browser document title when there are unread messages
  useEffect(() => {
    const count = unreadChannels.size;
    if (count > 0) {
      document.title = `(${count}) Internal Chat`;
    } else {
      document.title = `Internal Chat`;
    }
    return () => {
      document.title = 'CA Assistant';
    };
  }, [unreadChannels]);

  // Load team profiles
  useEffect(() => {
    if (profile?.company_id) {
      getAllProfiles(profile.company_id).then((res) => {
        if (res.success && res.profiles) {
          setProfiles(res.profiles);
        }
      });
    }
  }, [profile?.company_id]);

  // Determine channels based on profile
  const channels = [
    { id: 'firm_general', name: 'Firm General', icon: Users, description: 'Company-wide announcements and discussion', isPrivate: false }
  ];

  if (profile?.role === 'admin' || profile?.role === 'hod') {
    channels.push({ id: 'management', name: 'Management', icon: Shield, description: 'Private channel for Admins and HODs', isPrivate: true });
  }

  if (profile?.role === 'admin') {
    channels.push({ id: 'dept_itr', name: 'ITR Dept', icon: Briefcase, description: 'Income Tax Return department', isPrivate: false });
    channels.push({ id: 'dept_gst', name: 'GST Dept', icon: Briefcase, description: 'Goods & Services Tax department', isPrivate: false });
    channels.push({ id: 'dept_dsc', name: 'DSC Dept', icon: Briefcase, description: 'Digital Signature Certificate department', isPrivate: false });
  } else if (profile?.department) {
    if (profile.department === 'ALL') {
      channels.push({ id: 'dept_itr', name: 'ITR Dept', icon: Briefcase, description: 'Income Tax Return department', isPrivate: false });
      channels.push({ id: 'dept_gst', name: 'GST Dept', icon: Briefcase, description: 'Goods & Services Tax department', isPrivate: false });
      channels.push({ id: 'dept_dsc', name: 'DSC Dept', icon: Briefcase, description: 'Digital Signature Certificate department', isPrivate: false });
    } else {
      const depts = profile.department.split(',').map((d: string) => d.trim().toUpperCase());
      depts.forEach((d: string) => {
        if (d === 'ITR') channels.push({ id: 'dept_itr', name: 'ITR Dept', icon: Briefcase, description: 'Income Tax Return department', isPrivate: false });
        if (d === 'GST') channels.push({ id: 'dept_gst', name: 'GST Dept', icon: Briefcase, description: 'Goods & Services Tax department', isPrivate: false });
        if (d === 'DSC') channels.push({ id: 'dept_dsc', name: 'DSC Dept', icon: Briefcase, description: 'Digital Signature Certificate department', isPrivate: false });
      });
    }
  }

  // Client-side message loader
  const loadMessages = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          channel_name,
          created_at,
          sender:profiles (
            id,
            full_name,
            email,
            role,
            department
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('channel_name', activeChannel)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages((data || []) as unknown as Message[]);
    } catch (err) {
      console.error('Failed to load messages client-side:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sound chime notifier using Web Audio API
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch (err) {
      console.warn('Audio feedback blocked by browser autoplay settings.', err);
    }
  };

  // Global Realtime Subscription for incoming messages in this company
  useEffect(() => {
    if (profile?.company_id) {
      const channel = supabase
        .channel(`messages:${profile.company_id}:global`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `company_id=eq.${profile.company_id}`,
          },
          (payload: any) => {
            const incomingChannel = payload.new.channel_name;
            const senderId = payload.new.sender_id;

            if (incomingChannel === activeChannelRef.current) {
              loadMessages();
            } else if (senderId !== profile?.id) {
              setUnreadChannels((prev) => {
                const next = new Set(prev);
                next.add(incomingChannel);
                return next;
              });
              playNotificationSound();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.company_id]);

  // Load messages whenever activeChannel changes
  useEffect(() => {
    if (profile?.company_id) {
      loadMessages();
    }
  }, [activeChannel, profile?.company_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Client-side message sender
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile?.company_id) return;

    const content = newMessage;
    setNewMessage(''); // optimistic clear
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          company_id: profile.company_id,
          sender_id: profile.id,
          channel_name: activeChannel,
          content: content.trim()
        });

      if (error) throw error;
      // Note: loadMessages() will be triggered automatically via the realtime global subscription.
    } catch (err: any) {
      console.error('Failed to send message client-side:', err);
      setNewMessage(content); // revert on failure
    }
  };

  if (!profile) return null; // Don't render if not logged in

  const isDM = activeChannel.startsWith('dm_');
  const currentChannel = channels.find(c => c.id === activeChannel);

  // Helper to parse DM details
  const getDMTargetProfile = (channelId: string) => {
    if (!channelId.startsWith('dm_')) return null;
    const parts = channelId.split('_');
    const targetId = parts[1] === profile?.id ? parts[2] : parts[1];
    return profiles.find(p => p.id === targetId);
  };

  const startDMWithMember = (memberId: string) => {
    if (memberId === profile.id) return;
    const ids = [profile.id, memberId].sort();
    setActiveChannel(`dm_${ids[0]}_${ids[1]}`);
  };

  let displayName = currentChannel?.name || '';
  let displayDescription = currentChannel?.description || '';

  if (isDM) {
    const targetProfile = getDMTargetProfile(activeChannel);
    displayName = targetProfile ? (targetProfile.full_name || targetProfile.email.split('@')[0]) : 'Direct Message';
    displayDescription = targetProfile 
      ? `Direct Message with ${targetProfile.full_name || targetProfile.email.split('@')[0]} (${
          targetProfile.role === 'admin' 
            ? 'Admin' 
            : targetProfile.role === 'hod' 
            ? 'HOD' 
            : `${targetProfile.department} Department`
        })`
      : 'Private conversation';
  }

  // Calculate members of the active channel
  let channelMembers: any[] = [];
  if (profiles.length > 0) {
    if (activeChannel === 'firm_general') {
      channelMembers = profiles;
    } else if (activeChannel === 'management') {
      channelMembers = profiles.filter(p => p.role === 'admin' || p.role === 'hod');
    } else if (activeChannel === 'dept_itr') {
      channelMembers = profiles.filter(p => p.role === 'admin' || p.department === 'ALL' || (p.department && p.department.split(',').map((d: any) => d.trim()).includes('ITR')));
    } else if (activeChannel === 'dept_gst') {
      channelMembers = profiles.filter(p => p.role === 'admin' || p.department === 'ALL' || (p.department && p.department.split(',').map((d: any) => d.trim()).includes('GST')));
    } else if (activeChannel === 'dept_dsc') {
      channelMembers = profiles.filter(p => p.role === 'admin' || p.department === 'ALL' || (p.department && p.department.split(',').map((d: any) => d.trim()).includes('DSC')));
    } else if (activeChannel.startsWith('dm_')) {
      const parts = activeChannel.split('_');
      channelMembers = profiles.filter(p => p.id === parts[1] || p.id === parts[2]);
    }
  }

  return (
    <div className="flex-1 flex bg-white overflow-hidden">
      {/* Channels Sidebar */}
      <div className="w-[280px] bg-[#f8fafc] border-r border-[#e2e8f0] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#e2e8f0]">
          <h2 className="text-[15px] font-bold text-slate-955 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" /> Internal Chat
          </h2>
          <p className="text-[11px] text-slate-500 mt-1 font-medium font-sans">Secure communications dashboard</p>
        </div>
        
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {/* Channels Section */}
          <div>
            <div className="px-3 pb-2 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Channels
            </div>
            <div className="space-y-0.5">
              {channels.map((ch) => {
                const Icon = ch.icon;
                const isActive = activeChannel === ch.id;
                const isUnread = unreadChannels.has(ch.id);
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer text-left ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 font-semibold' 
                        : isUnread
                        ? 'text-slate-955 font-bold bg-slate-100/60'
                        : 'text-slate-650 hover:bg-slate-200/50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : isUnread ? 'text-blue-500' : 'text-slate-405'}`} />
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <span className="text-[13px] truncate">
                        {ch.name}
                      </span>
                      {isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0 ml-1.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Messages Section */}
          <div>
            <div className="px-3 pb-2 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <span>Direct Messages</span>
              <span className="text-[9px] bg-slate-200 text-slate-655 px-1.5 py-0.5 rounded-full font-medium">
                {profiles.filter(p => p.id !== profile.id).length}
              </span>
            </div>
            <div className="space-y-0.5 max-h-[280px] overflow-y-auto pr-1">
              {profiles
                .filter(p => p.id !== profile.id)
                .map((p) => {
                  const ids = [profile.id, p.id].sort();
                  const dmChannelId = `dm_${ids[0]}_${ids[1]}`;
                  const isActive = activeChannel === dmChannelId;
                  const isUnread = unreadChannels.has(dmChannelId);
                  
                  return (
                    <button
                      key={p.id}
                      onClick={() => setActiveChannel(dmChannelId)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer text-left ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : isUnread
                          ? 'text-slate-955 font-bold bg-slate-100/60'
                          : 'text-slate-655 hover:bg-slate-200/50 hover:text-slate-900'
                      }`}
                    >
                      <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center font-bold text-[9px] uppercase shrink-0 transition-colors ${
                        isActive ? 'bg-blue-600 text-white' : isUnread ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {p.full_name ? p.full_name.charAt(0) : p.email.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="text-[13px] truncate">{p.full_name || p.email.split('@')[0]}</span>
                        {isUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0 ml-1.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* Chat Header */}
        <div className="h-[65px] px-6 border-b border-[#e2e8f0] flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-sm z-10">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
              {isDM ? (
                <User className="w-4 h-4 text-blue-500" />
              ) : currentChannel?.isPrivate ? (
                <Lock className="w-4 h-4 text-emerald-500" />
              ) : (
                <Hash className="w-4 h-4 text-slate-400" />
              )}
              {displayName}
            </h3>
            <p className="text-[12px] text-slate-500 mt-0.5 font-medium">{displayDescription}</p>
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
              <div className="p-3 bg-slate-100 rounded-full mb-3 text-slate-400">
                <MessageSquare className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {isDM ? `Chat with ${displayName}` : `Welcome to #${displayName}`}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-[280px] text-center leading-relaxed">
                {isDM 
                  ? `This is the start of your direct message history with ${displayName}.`
                  : `This is the start of the #${displayName} channel. Send a message to begin.`
                }
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const sender = msg.sender;
              const isMe = sender?.id === profile.id;
              const showName = idx === 0 || messages[idx - 1].sender?.id !== sender?.id;
              const senderName = sender ? (sender.full_name || sender.email.split('@')[0]) : 'Unknown User';
              const senderBadge = sender ? (sender.role === 'admin' ? 'Admin' : sender.role === 'hod' ? 'HOD' : sender.department) : 'User';
              
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${isMe ? 'ml-auto' : 'mr-auto'}`}>
                  {showName && !isMe && (
                    <div className="flex items-baseline gap-2 ml-1 mb-1.5">
                      <span className="text-[13px] font-bold text-slate-800">
                        {senderName}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-150 rounded text-slate-650 uppercase tracking-wider font-bold">
                        {senderBadge}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  {showName && isMe && (
                     <div className="flex items-baseline gap-2 mr-1 mb-1.5">
                       <span className="text-[10px] text-slate-400 mr-1">
                         {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                     </div>
                  )}
                  
                  <div className={`px-4 py-2.5 text-[14px] shadow-sm leading-relaxed ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-white border border-slate-200/80 text-slate-850 rounded-2xl rounded-tl-sm'
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
              placeholder={isDM ? `Message ${displayName}...` : `Message #${displayName?.toLowerCase().replace(/\s+/g, '_')}...`}
              className="w-full pl-4 pr-12 py-3.5 bg-slate-100 border-transparent rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-sm font-medium placeholder-slate-400 text-slate-850"
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
            <span className="text-[10px] text-slate-400 font-medium">Messages are securely encrypted within your firm's private workspace.</span>
          </div>
        </div>
      </div>

      {/* Members List Panel */}
      <div className="w-[240px] bg-[#f8fafc] border-l border-[#e2e8f0] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#e2e8f0]">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-400" /> Members ({channelMembers.length})
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {channelMembers.map((member) => {
            const isMe = member.id === profile.id;
            return (
              <button
                key={member.id}
                onClick={() => startDMWithMember(member.id)}
                disabled={isMe}
                title={isMe ? 'This is you' : `Start direct message with ${member.full_name || member.email}`}
                className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${
                  isMe ? 'opacity-85' : 'hover:bg-slate-200/50 cursor-pointer'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] uppercase shrink-0 ${
                  isMe ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {member.full_name ? member.full_name.charAt(0) : member.email.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-slate-800 truncate">
                    {member.full_name || member.email.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {member.role === 'admin' ? 'Admin' : member.role === 'hod' ? 'HOD' : member.department} {isMe && '(You)'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
