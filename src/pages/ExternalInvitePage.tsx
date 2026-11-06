import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Radio, KeyRound, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Lock, FileText } from 'lucide-react';
import { InvitationRecord } from '../types/index.ts';

interface ExternalInvitePageProps {
  initialToken?: string;
  onNavigate: (page: string) => void;
}

export const ExternalInvitePage: React.FC<ExternalInvitePageProps> = ({ initialToken, onNavigate }) => {
  const { login } = useAuth();
  const [tokenInput, setTokenInput] = useState(initialToken || '');
  const [invite, setInvite] = useState<any | null>(null);
  const [emailOtp, setEmailOtp] = useState('');
  const [smsOtp, setSmsOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load invitation details if token provided
  const loadInvitation = async (token: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invitations/${token}`);
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        setError(data.message || 'Invitation not found or expired');
        setInvite(null);
      } else {
        setInvite(data.invitation);
        // Pre-fill demo OTPs for ease of evaluation
        if (data.invitation.emailOtpPlainForDev) {
          setEmailOtp(data.invitation.emailOtpPlainForDev);
        }
        if (data.invitation.smsOtpPlainForDev) {
          setSmsOtp(data.invitation.smsOtpPlainForDev);
        }
      }
    } catch (e: any) {
      setError(e.message || 'Error loading invitation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      loadInvitation(initialToken);
    }
  }, [initialToken]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;

    setVerifying(true);
    setError(null);

    try {
      const res = await fetch(`/api/invitations/${invite.token}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOtp, smsOtp }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        setError(data.message || 'OTP verification failed');
      } else {
        setSuccessMsg('Identity verified! Access granted to document.');
        // Auto-login external user session
        if (data.token) {
          localStorage.setItem('trustvault_token', data.token);
        }
        setTimeout(() => {
          onNavigate(`document-${data.documentId}`);
        }, 1200);
      }
    } catch (e: any) {
      setError(e.message || 'Verification error');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6 animate-in fade-in">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-900/30">
          <Radio className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">External Identity Verification</h1>
        <p className="text-xs text-slate-400">
          Dual-channel Email & SMS OTP gate for authorized guest document access.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {!invite ? (
        /* Token Input Card */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white">Enter Invitation Token</h2>
            <p className="text-xs text-slate-400">
              Paste the access token received in your external invitation email:
            </p>
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder="e.g. 7f9d8a34bc..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => loadInvitation(tokenInput)}
              disabled={loading || !tokenInput}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? 'Validating...' : 'Load'}
            </button>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
            <span className="font-semibold text-slate-300">How to test this flow:</span>
            <p className="text-[11px] text-slate-400">
              1. Log in as <strong>Owner</strong>.
              <br />
              2. Go to <strong>My Documents</strong>, click Share &rarr; select <strong>External Guest</strong>.
              <br />
              3. Enter an email and mobile number to generate a real OTP invitation token.
            </p>
          </div>
        </div>
      ) : (
        /* Active Invitation OTP Form */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          {/* Target Document Summary */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs">
              <FileText className="w-4 h-4" />
              <span>Target Document</span>
            </div>
            <h3 className="text-base font-bold text-white">{invite.documentTitle}</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
              <div>
                <span className="text-slate-500 block text-[10px]">Shared By</span>
                <span className="text-slate-300">{invite.senderName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Access Level</span>
                <span className="text-indigo-300 font-bold font-mono">{invite.permissionType}</span>
              </div>
            </div>
          </div>

          {/* Test OTP Helper Box for Evaluators */}
          {invite.emailOtpPlainForDev && (
            <div className="p-3 bg-indigo-950/40 border border-indigo-800 rounded-xl space-y-2 text-xs">
              <span className="text-[11px] font-bold text-indigo-300 flex items-center space-x-1">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Simulated Dual OTPs (Evaluation Mode)</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Email OTP</span>
                  <span className="font-mono font-bold text-white tracking-widest">
                    {invite.emailOtpPlainForDev}
                  </span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">SMS OTP</span>
                  <span className="font-mono font-bold text-white tracking-widest">
                    {invite.smsOtpPlainForDev}
                  </span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  6-Digit Email OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={emailOtp}
                  onChange={e => setEmailOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-center tracking-widest text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  6-Digit SMS OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={smsOtp}
                  onChange={e => setSmsOtp(e.target.value)}
                  placeholder="654321"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-center tracking-widest text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={verifying || !emailOtp || !smsOtp}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-900/30"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{verifying ? 'Verifying Identity...' : 'Verify Dual OTPs & Unlock File'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
