'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { Users2, Shield, Plus, Trash2, Mail, UserPlus, Key, RefreshCw, X, AlertCircle } from 'lucide-react';

interface TeamProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'hod' | 'employee';
  created_at: string;
}

export default function TeamPage() {
  const { profile } = useAuth();
  const supabase = createSupabaseBrowser();
  
  const [team, setTeam] = useState<TeamProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'hod' | 'employee'>('employee');
  const [inviteName, setInviteName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Restrict access if not an admin
  const isAdmin = profile?.role === 'admin';

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTeam(data as TeamProfile[]);
      }
    } catch (err) {
      console.error('Failed to load team profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTeam();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider">Access Restricted</h2>
          <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
            You must be an Admin to view and manage team members. Please contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(false);
    setInviteLoading(true);

    try {
      // Invite user through backend function or directly if we use server action
      // Because inviting is an admin-level feature, we call our server actions!
      // Let's create an action in `app/actions.ts` called `inviteTeamMember` and call it here.
      const { inviteTeamMember } = await import('@/app/actions');
      const result = await inviteTeamMember({
        email: inviteEmail.trim(),
        role: inviteRole,
        fullName: inviteName.trim(),
      });

      if (!result.success) {
        setInviteError(result.error || 'Failed to send invite.');
      } else {
        setInviteSuccess(true);
        setInviteEmail('');
        setInviteName('');
        setInviteRole('employee');
        setShowInviteModal(false);
        fetchTeam();
      }
    } catch (err: any) {
      setInviteError(err.message || 'An unexpected error occurred.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'hod' | 'employee') => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (!error) {
        setTeam(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m));
      } else {
        alert(`Failed to update role: ${error.message}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteMember = async (userId: string, userEmail: string) => {
    if (userId === profile?.id) {
      alert('You cannot delete your own admin account.');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${userEmail} from the team?`)) {
      return;
    }

    setActionLoading(userId);
    try {
      const { deleteTeamMember } = await import('@/app/actions');
      const res = await deleteTeamMember(userId);
      
      if (res.success) {
        setTeam(prev => prev.filter(m => m.id !== userId));
      } else {
        alert(res.error || 'Failed to delete member.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col overflow-hidden p-6">
      {/* Header */}
      <div className="border-b border-[#e5e5e5] pb-4 mb-6 shrink-0 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">ADMIN MODULE</span>
          <h1 className="text-[18px] font-bold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
            <Users2 className="w-5 h-5 text-slate-700" /> Team & Role Directory
          </h1>
          <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
            Manage your firm's employees, departments, access control tiers, and send team invitation links.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-700 rounded-lg hover:shadow-sm transition-all duration-150 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-auto max-w-4xl border border-[#e5e5e5] rounded-xl bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
            <span className="text-[11px] text-slate-500">Retrieving directory entries...</span>
          </div>
        ) : team.length === 0 ? (
          <div className="text-center py-20 text-[12px] text-slate-400">
            No team members registered yet. Click Invite Member to add someone.
          </div>
        ) : (
          <table className="w-full text-[12px] text-left border-collapse">
            <thead>
              <tr className="bg-[#fafafa] border-b border-[#e5e5e5] text-[10px] text-slate-400 uppercase tracking-wider font-semibold select-none">
                <th className="px-4 py-3 font-semibold">Name / Email</th>
                <th className="px-4 py-3 font-semibold">Role Tier</th>
                <th className="px-4 py-3 font-semibold">Joined Date</th>
                <th className="px-4 py-3 text-right font-semibold pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map(member => (
                <tr key={member.id} className="border-b border-[#f0f0f0] hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">
                      {member.full_name || member.email.split('@')[0]}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{member.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {member.id === profile?.id ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold border border-slate-200">
                        <Shield className="w-3 h-3 text-slate-500" />
                        <span>Admin (You)</span>
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        disabled={actionLoading === member.id}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value as any)}
                        className="px-2 py-1 text-[11px] bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] transition-colors cursor-pointer font-medium text-slate-700"
                      >
                        <option value="admin">Admin</option>
                        <option value="hod">HOD</option>
                        <option value="employee">Employee</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#666] font-medium">
                    {new Date(member.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {member.id !== profile?.id && (
                      <button
                        onClick={() => handleDeleteMember(member.id, member.email)}
                        disabled={actionLoading === member.id}
                        className="inline-flex items-center justify-center p-1.5 border border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
          <form
            onSubmit={handleInvite}
            className="bg-white border border-[#e0e0e0] rounded-xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="bg-[#fafafa] px-4 py-3 border-b border-[#e0e0e0] flex items-center justify-between shrink-0">
              <span className="text-[12px] font-bold text-[#111] uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-[#555]" /> Invite Team Member
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError(null);
                }}
                className="text-[#999] hover:text-[#555] text-xs font-semibold p-1 hover:bg-[#eee] rounded transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {inviteError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[11px] text-red-700 font-medium">
                  {inviteError}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 text-[12px] bg-[#fafafa] border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] focus:bg-white transition-all placeholder:text-[#bbb]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="john.doe@firm.com"
                  className="w-full px-3 py-2 text-[12px] bg-[#fafafa] border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] focus:bg-white transition-all placeholder:text-[#bbb]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">
                  Access Level Tier
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-[12px] bg-[#fafafa] border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] focus:bg-white transition-all cursor-pointer font-medium text-slate-700"
                >
                  <option value="employee">Employee (Restricted Client Access)</option>
                  <option value="hod">HOD (Full View, No Role Controls)</option>
                  <option value="admin">Admin (Full Access & Controls)</option>
                </select>
              </div>
            </div>

            <div className="bg-[#fafafa] px-4 py-3 border-t border-[#e0e0e0] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError(null);
                }}
                className="px-3 py-2 border border-[#ddd] hover:bg-[#eee] rounded-lg text-[11px] font-semibold text-[#555] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteLoading}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 rounded-lg text-[11px] font-semibold hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
              >
                {inviteLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Inviting...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Send Invite Link</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
