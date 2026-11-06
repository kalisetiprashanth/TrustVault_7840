import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  Phone,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setFeedback({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-trustvault-user-id': user?.id || '',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.message || 'Password update failed' });
      } else {
        setFeedback({ type: 'success', message: 'Password updated successfully with PBKDF2-SHA512 hashing.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <User className="w-6 h-6 text-cyan-400" />
          <span>User Profile & Security Clearance</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review your account clearance, MFA verification status, and cryptographic credentials.
        </p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
            <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-300 font-bold text-lg">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{user?.fullName}</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                {user?.role}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400 flex items-center space-x-2">
                <Mail className="w-3.5 h-3.5" />
                <span>Email Address</span>
              </span>
              <span className="text-white font-medium">{user?.email}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400 flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5" />
                <span>Mobile (SMS OTP)</span>
              </span>
              <span className="text-white font-mono">{user?.mobile}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400 flex items-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Account Status</span>
              </span>
              <span className="text-emerald-400 font-bold">{user?.status}</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400 flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Member Since</span>
              </span>
              <span className="text-slate-300">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs">
            <span className="font-semibold text-cyan-400">Security Guarantee</span>
            <p className="text-[11px] text-slate-400">
              Your password is encrypted using salted PBKDF2 with 100,000 SHA-512 iterations.
              All authentication comparisons are protected against timing side-channel attacks.
            </p>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800 text-white font-bold text-sm">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>Update Credentials</span>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition-colors mt-2"
            >
              {loading ? 'Rehashing & Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
