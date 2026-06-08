'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { Users2, Shield, Trash2, UserPlus, RefreshCw, AlertCircle, Eye, EyeOff, Briefcase, MessageCircle, Mail, Edit2 } from 'lucide-react';

interface TeamProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'hod' | 'employee';
  department: 'ITR' | 'GST' | 'DSC' | 'ALL';
  phone?: string;
  date_of_birth?: string;
  created_at: string;
}

export default function TeamPage() {
  const { profile } = useAuth();
  const supabase = createSupabaseBrowser();
  
  const [team, setTeam] = useState<TeamProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createRole, setCreateRole] = useState<'admin' | 'hod' | 'employee'>('employee');
  const [createDepartment, setCreateDepartment] = useState<'ITR' | 'GST' | 'DSC' | 'ALL'>('ITR');
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createDOB, setCreateDOB] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ITR' | 'GST' | 'DSC' | 'MANAGEMENT'>('ALL');

  // Edit Member details state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDOB, setEditDOB] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Restrict access if not an admin
  const isAdmin = profile?.role === 'admin';

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const { getAllProfiles } = await import('@/app/actions');
      const result = await getAllProfiles(profile?.company_id || undefined);
      if (result.success && result.profiles) {
        setTeam(result.profiles as TeamProfile[]);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(false);
    setCreateLoading(true);

    try {
      const { createTeamMember } = await import('@/app/actions');
      
      // Admins are always ALL department, otherwise use selected
      const finalDept = createRole === 'admin' ? 'ALL' : createDepartment;

      const result = await createTeamMember({
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
        department: finalDept,
        fullName: createName.trim(),
        companyId: profile?.company_id || '',
        phone: createPhone.trim() || undefined,
        dateOfBirth: createDOB.trim() || undefined,
      });

      if (!result.success) {
        setCreateError(result.error || 'Failed to create member.');
      } else {
        setCreateSuccess(true);
        setCreateEmail('');
        setCreatePassword('');
        setCreateName('');
        setCreatePhone('');
        setCreateDOB('');
        setCreateRole('employee');
        setCreateDepartment('ITR');
        setShowCreateModal(false);
        fetchTeam();
      }
    } catch (err: any) {
      setCreateError(err.message || 'An unexpected error occurred.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditClick = (member: TeamProfile) => {
    setEditingMember(member);
    setEditName(member.full_name || '');
    setEditPhone(member.phone || '');
    setEditDOB(member.date_of_birth || '');
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setEditError(null);
    setEditLoading(true);

    try {
      const { updateTeamMemberDetails } = await import('@/app/actions');
      const result = await updateTeamMemberDetails({
        userId: editingMember.id,
        fullName: editName.trim(),
        phone: editPhone.trim() || undefined,
        dateOfBirth: editDOB.trim() || undefined,
      });

      if (!result.success) {
        setEditError(result.error || 'Failed to update member details.');
      } else {
        setShowEditModal(false);
        setEditingMember(null);
        fetchTeam();
      }
    } catch (err: any) {
      setEditError(err.message || 'An error occurred.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpdateRoleAndDepartment = async (
    userId: string, 
    newRole: 'admin' | 'hod' | 'employee',
    newDepartment: 'ITR' | 'GST' | 'DSC' | 'ALL'
  ) => {
    setActionLoading(userId);
    try {
      const { updateTeamMemberRoleAndDepartment } = await import('@/app/actions');
      
      // Admins are always ALL department
      const finalDept = newRole === 'admin' ? 'ALL' : newDepartment;

      const result = await updateTeamMemberRoleAndDepartment(userId, newRole, finalDept);
      if (result.success) {
        setTeam(prev => prev.map(m => m.id === userId ? { ...m, role: newRole, department: finalDept } : m));
      } else {
        alert(`Failed to update settings: ${result.error}`);
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

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-slate-900 text-white border-slate-900',
      hod: 'bg-blue-50 text-blue-700 border-blue-200',
      employee: 'bg-slate-50 text-slate-600 border-slate-200',
    };
    return colors[role] || colors.employee;
  };

  const filteredTeam = team.filter(member => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'MANAGEMENT') return member.role === 'admin' || member.role === 'hod' || member.department === 'ALL';
    return member.department === activeTab;
  });

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
            Create team accounts, assign access tiers, and manage department allocations.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-700 rounded-lg hover:shadow-sm transition-all duration-150 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Create Member</span>
        </button>
      </div>

      {/* Success Toast */}
      {createSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-[11px] text-green-700 font-medium flex items-center justify-between">
          <span>Team member created successfully. They can now sign in with their credentials.</span>
          <button onClick={() => setCreateSuccess(false)} className="text-green-500 hover:text-green-700 ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#e5e5e5] mb-4 overflow-x-auto hide-scrollbar">
        {[
          { id: 'ALL', label: 'All Staff' },
          { id: 'MANAGEMENT', label: 'Management / Admins' },
          { id: 'ITR', label: 'ITR Dept' },
          { id: 'GST', label: 'GST Dept' },
          { id: 'DSC', label: 'DSC Dept' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-[12px] font-semibold tracking-wide transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-500 font-bold">
              {tab.id === 'ALL' 
                ? team.length 
                : tab.id === 'MANAGEMENT'
                  ? team.filter(m => m.role === 'admin' || m.role === 'hod' || m.department === 'ALL').length
                  : team.filter(m => m.department === tab.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-auto max-w-5xl border border-[#e5e5e5] rounded-xl bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
            <span className="text-[11px] text-slate-500">Loading team directory...</span>
          </div>
        ) : filteredTeam.length === 0 ? (
          <div className="text-center py-20 text-[12px] text-slate-400">
            No members found in this category.
          </div>
        ) : (
          <table className="w-full text-[12px] text-left border-collapse">
            <thead>
              <tr className="bg-[#fafafa] border-b border-[#e5e5e5] text-[10px] text-slate-400 uppercase tracking-wider font-semibold select-none">
                <th className="px-4 py-3 font-semibold">Name / Email</th>
                <th className="px-4 py-3 font-semibold">Role Tier & Department</th>
                <th className="px-4 py-3 font-semibold">Joined Date</th>
                <th className="px-4 py-3 text-right font-semibold pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeam.map(member => (
                <tr key={member.id} className="border-b border-[#f0f0f0] hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      <span>{member.full_name || member.email.split('@')[0]}</span>
                      {member.date_of_birth && (
                        <span className="text-[10px] font-medium text-indigo-650 bg-indigo-50/70 px-1.5 py-0.5 rounded-md flex items-center gap-1 select-none" title={`Date of Birth: ${new Date(member.date_of_birth).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`}>
                          <span>🎂</span>
                          <span>{new Date(member.date_of_birth).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-400 font-mono">
                      <button
                        onClick={() => handleCopy(member.email, `${member.id}-email`)}
                        className="hover:text-slate-650 transition-colors cursor-pointer flex items-center gap-1 group text-left border-none bg-transparent p-0 font-mono text-[11px]"
                        title="Click to copy email"
                      >
                        <span>{member.email}</span>
                        {copiedId === `${member.id}-email` ? (
                          <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded transition-all">Copied!</span>
                        ) : (
                          <span className="opacity-0 group-hover:opacity-100 text-[8px] text-slate-400 bg-slate-100 px-1 rounded transition-all scale-90">Copy</span>
                        )}
                      </button>
                      {member.phone && (
                        <>
                          <span className="hidden sm:inline text-slate-300">|</span>
                          <button
                            onClick={() => handleCopy(member.phone!, `${member.id}-phone`)}
                            className="hover:text-slate-700 transition-colors cursor-pointer flex items-center gap-1 group text-left border-none bg-transparent p-0 font-mono text-[11px]"
                            title="Click to copy phone number"
                          >
                            <span className="text-slate-500 font-semibold">{member.phone}</span>
                            {copiedId === `${member.id}-phone` ? (
                              <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded transition-all">Copied!</span>
                            ) : (
                              <span className="opacity-0 group-hover:opacity-100 text-[8px] text-slate-400 bg-slate-100 px-1 rounded transition-all scale-90">Copy</span>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {member.id === profile?.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded font-semibold border ${roleBadge(member.role)}`}>
                          <Shield className="w-3 h-3" />
                          <span>Admin (You)</span>
                        </span>
                        <span className="text-[11.5px] font-bold text-slate-400 font-mono">ALL</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {/* Role Selector */}
                        <select
                          value={member.role}
                          disabled={actionLoading === member.id}
                          onChange={(e) => {
                            const newRole = e.target.value as any;
                            if (window.confirm(`Are you sure you want to change this member's role to ${newRole.toUpperCase()}?`)) {
                              handleUpdateRoleAndDepartment(member.id, newRole, member.department);
                            }
                          }}
                          className="px-2 py-1 text-[11px] bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] transition-colors cursor-pointer font-medium text-slate-700"
                        >
                          <option value="admin">Admin</option>
                          <option value="hod">HOD</option>
                          <option value="employee">Employee</option>
                        </select>

                        {/* Department Selector (Disabled for admins) */}
                        {member.role !== 'admin' ? (
                          <select
                            value={member.department || 'ITR'}
                            disabled={actionLoading === member.id}
                            onChange={(e) => {
                              const newDept = e.target.value as any;
                              if (window.confirm(`Are you sure you want to reassign this member to the ${newDept} department?`)) {
                                handleUpdateRoleAndDepartment(member.id, member.role, newDept);
                              }
                            }}
                            className="px-2 py-1 text-[11px] bg-white border border-[#ddd] rounded-md focus:outline-none focus:border-[#999] transition-colors cursor-pointer font-medium text-slate-700"
                          >
                            <option value="ITR">ITR</option>
                            <option value="GST">GST</option>
                            <option value="DSC">DSC</option>
                            <option value="ALL">ALL</option>
                          </select>
                        ) : (
                          <span className="text-[11.5px] font-bold text-slate-400 font-mono px-1">ALL</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#666] font-medium">
                    {new Date(member.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* WhatsApp Button */}
                      {member.phone ? (
                        <a
                          href={`https://wa.me/${member.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center p-1.5 border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-600 rounded-lg text-slate-400 transition-colors cursor-pointer"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <div
                          className="inline-flex items-center justify-center p-1.5 border border-slate-100 bg-slate-50 rounded-lg text-slate-300 cursor-not-allowed"
                          title="No phone number available"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* Email Button */}
                      <a
                        href={`mailto:${member.email}`}
                        className="inline-flex items-center justify-center p-1.5 border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-600 rounded-lg text-slate-400 transition-colors cursor-pointer"
                        title="Send Email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleEditClick(member)}
                        className="inline-flex items-center justify-center p-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 rounded-lg text-slate-400 transition-colors cursor-pointer"
                        title="Edit details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Member Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
          <form
            onSubmit={handleCreate}
            className="bg-white border border-[#e0e0e0] rounded-xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="bg-[#fafafa] px-4 py-3 border-b border-[#e0e0e0] flex items-center justify-between shrink-0">
              <span className="text-[12px] font-bold text-[#111] uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-[#555]" /> Create Team Member
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError(null);
                }}
                className="text-[#999] hover:text-[#555] text-xs font-semibold p-1 hover:bg-[#eee] rounded transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[11px] text-red-700 font-medium">
                  {createError}
                </div>
              )}
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 text-[12px] bg-[#fafafa] border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] focus:bg-white transition-all placeholder:text-[#bbb]"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder="e.g. 919876543210"
                  className="w-full px-3 py-2 text-[12px] bg-[#fafafa] border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] focus:bg-white transition-all placeholder:text-[#bbb]"
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={createDOB}
                  onChange={(e) => setCreateDOB(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] bg-[#fafafa] border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] focus:bg-white transition-all text-slate-700 font-mono"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="john.doe@firm.com"
                  className="w-full px-3 py-2 text-[12px] bg-[#fafafa] border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] focus:bg-white transition-all placeholder:text-[#bbb]"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 pr-10 text-[12px] bg-[#fafafa] border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] focus:bg-white transition-all placeholder:text-[#bbb]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555] transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">
                  Access Level Tier
                </label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-[12px] bg-[#fafafa] border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] focus:bg-white transition-all cursor-pointer font-medium text-slate-700"
                >
                  <option value="employee">Employee (Restricted Client Access)</option>
                  <option value="hod">HOD (Full View, No Role Controls)</option>
                  <option value="admin">Admin (Full Access & Controls)</option>
                </select>
              </div>

              {/* Department (Only visible if not Admin) */}
              {createRole !== 'admin' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#555] uppercase tracking-wider flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-[#555]" /> Assigned Department
                  </label>
                  <select
                    value={createDepartment}
                    onChange={(e) => setCreateDepartment(e.target.value as any)}
                    className="w-full px-3 py-2 text-[12px] bg-[#fafafa] border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] focus:bg-white transition-all cursor-pointer font-medium text-slate-700"
                  >
                    <option value="ITR">ITR (Income Tax Return)</option>
                    <option value="GST">GST (Goods & Services Tax)</option>
                    <option value="DSC">DSC (Digital Signature Certificate)</option>
                    <option value="ALL">ALL Departments</option>
                  </select>
                </div>
              )}
            </div>

            <div className="bg-[#fafafa] px-4 py-3 border-t border-[#e0e0e0] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError(null);
                }}
                className="px-3 py-2 border border-[#ddd] hover:bg-[#eee] rounded-lg text-[11px] font-semibold text-[#555] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-3 py-2 bg-[#111] hover:bg-[#333] text-white border border-[#111] rounded-lg text-[11px] font-semibold hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
              >
                {createLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
          <form
            onSubmit={handleEditSubmit}
            className="bg-white border border-[#e0e0e0] rounded-xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="bg-[#fafafa] px-4 py-3 border-b border-[#e0e0e0] flex items-center justify-between shrink-0">
              <span className="text-[12px] font-bold text-[#111] uppercase tracking-wider flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-[#555]" /> Edit Member Details
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMember(null);
                  setEditError(null);
                }}
                className="text-[#999] hover:text-[#555] text-xs font-semibold p-1 hover:bg-[#eee] rounded transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[11px] text-red-700 font-medium">
                  {editError}
                </div>
              )}
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 text-[12px] bg-[#fafafa] border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] focus:bg-white transition-all placeholder:text-[#bbb]"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 919876543210"
                  className="w-full px-3 py-2 text-[12px] bg-[#fafafa] border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] focus:bg-white transition-all placeholder:text-[#bbb]"
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={editDOB}
                  onChange={(e) => setEditDOB(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] bg-[#fafafa] border border-[#ddd] rounded-lg focus:outline-none focus:border-[#999] focus:bg-white transition-all text-slate-700 font-mono"
                />
              </div>
            </div>

            <div className="bg-[#fafafa] px-4 py-3 border-t border-[#e0e0e0] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMember(null);
                  setEditError(null);
                }}
                className="px-3 py-2 border border-[#ddd] hover:bg-[#eee] rounded-lg text-[11px] font-semibold text-[#555] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="px-3 py-2 bg-[#111] hover:bg-[#333] text-white border border-[#111] rounded-lg text-[11px] font-semibold hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
              >
                {editLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
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
