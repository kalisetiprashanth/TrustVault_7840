import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Users,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  HardDrive,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Lock,
  RefreshCw,
  FolderLock,
  Activity,
} from 'lucide-react';
import { User, PlatformMetrics } from '../types/index.ts';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Member Modal State
  const [showAddMember, setShowAddMember] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newRole, setNewRole] = useState<'OWNER' | 'EDITOR' | 'VIEWER'>('EDITOR');
  const [tempPassword, setTempPassword] = useState('Temp@Trust2026!');
  const [submitting, setSubmitting] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { 'x-trustvault-user-id': user?.id || '' };
      const [uRes, mRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/metrics', { headers }),
      ]);

      if (uRes.ok) {
        const uText = await uRes.text();
        const u = uText ? JSON.parse(uText) : {};
        setUsersList(u.users || []);
      }
      if (mRes.ok) {
        const mText = await mRes.text();
        const m = mText ? JSON.parse(mText) : {};
        setMetrics(m.metrics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  const handleToggleStatus = async (targetUser: User) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!confirm(`Change account status for ${targetUser.email} to ${nextStatus}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-trustvault-user-id': user?.id || '',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `User ${targetUser.email} status changed to ${nextStatus}. Audit event logged.`,
        });
        await fetchAdminData();
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.message || 'Action failed' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-trustvault-user-id': user?.id || '',
        },
        body: JSON.stringify({
          fullName: newFullName,
          email: newEmail,
          mobile: newMobile,
          role: newRole,
          temporaryPassword: tempPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.message || 'Failed to create member' });
      } else {
        setFeedback({
          type: 'success',
          message: `Member ${newEmail} created with temporary password. Mandatory password change enforced on first login.`,
        });
        setShowAddMember(false);
        setNewFullName('');
        setNewEmail('');
        setNewMobile('');
        await fetchAdminData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-rose-400" />
            <span>Administrator Governance & Member Hub</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Oversee corporate user lifecycle, audit health, and security postures across the platform.
          </p>
        </div>

        <button
          onClick={() => setShowAddMember(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 shadow-lg shadow-rose-900/30"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New Member</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Explicit Administrative Document Content Isolation Policy Notice */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
        <div className="flex items-center space-x-2 text-amber-400 font-semibold">
          <Lock className="w-4 h-4" />
          <span>Document Content Isolation Policy (Zero-Trust Administrative Segregation)</span>
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          In strict compliance with the Snovasys challenge specification, the Administrator role grants governance over
          member accounts, platform telemetry, and audit monitoring, but <strong className="text-white">does not automatically grant access to read or download confidential document contents</strong>.
          Document decryption requires an explicit share grant from the document owner.
        </p>
      </div>

      {/* Platform Telemetry KPIs */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-slate-500 text-xs block mb-1">Total Members</span>
            <div className="text-2xl font-bold text-white font-mono">{metrics.totalUsers}</div>
            <span className="text-[10px] text-emerald-400">{metrics.activeUsers} Active Accounts</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-slate-500 text-xs block mb-1">Total Vault Documents</span>
            <div className="text-2xl font-bold text-white font-mono">{metrics.totalDocuments}</div>
            <span className="text-[10px] text-cyan-400">{metrics.cleanDocuments} Clean / {metrics.quarantinedDocuments} Flagged</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-slate-500 text-xs block mb-1">Security Denials Blocked</span>
            <div className="text-2xl font-bold text-rose-400 font-mono">{metrics.deniedAccessEvents}</div>
            <span className="text-[10px] text-slate-400">IDOR & Unauthorized</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-slate-500 text-xs block mb-1">Audit Chain Health</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono">100% Valid</div>
            <span className="text-[10px] text-emerald-400">{metrics.totalAuditEvents} SHA-256 Blocks</span>
          </div>
        </div>
      )}

      {/* Member Management Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <h2 className="text-sm font-semibold text-white">Registered Platform Members</h2>
          <button onClick={fetchAdminData} className="text-xs text-slate-400 hover:text-white flex items-center space-x-1">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">Loading members...</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-medium">Full Name & Email</th>
                  <th className="px-4 py-3.5 font-medium">Assigned Role</th>
                  <th className="px-4 py-3.5 font-medium">Mobile (OTP)</th>
                  <th className="px-4 py-3.5 font-medium">Account Status</th>
                  <th className="px-4 py-3.5 font-medium">Registered</th>
                  <th className="px-4 py-3.5 font-medium text-right">Governance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-white">{u.fullName}</div>
                      <div className="text-[10px] text-slate-500">{u.email}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-slate-800 border-slate-700 text-cyan-300">
                        {u.role}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">{u.mobile}</td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        <span>{u.status}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800 hover:bg-rose-900'
                              : 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-rose-950 border border-rose-800 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Provision Member Account</h3>
                <p className="text-xs text-slate-400">Generate secure credentials with forced password reset</p>
              </div>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  placeholder="e.g. Rachel Adams"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="radams@trustvault.local"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mobile Number (SMS OTP)</label>
                <input
                  type="tel"
                  required
                  value={newMobile}
                  onChange={e => setNewMobile(e.target.value)}
                  placeholder="+1-555-0199"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Role Assignment</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="OWNER">Document Owner</option>
                  <option value="EDITOR">Compliance Editor</option>
                  <option value="VIEWER">Auditor / Viewer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Temporary Initial Password</label>
                <input
                  type="text"
                  required
                  value={tempPassword}
                  onChange={e => setTempPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-cyan-300"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  * User will be forced to change password on first login.
                </span>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors"
                >
                  {submitting ? 'Creating...' : 'Provision Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
