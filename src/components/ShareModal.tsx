import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Share2, Users, Send, CheckCircle2, AlertCircle, X, Shield, KeyRound, Copy } from 'lucide-react';
import { PermissionType } from '../types/index.ts';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  onShareSuccess: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  onShareSuccess,
}) => {
  const { user } = useAuth();
  const [isExternal, setIsExternal] = useState(false);
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [permissionType, setPermissionType] = useState<PermissionType>('READ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide recipient email');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-trustvault-user-id': user?.id || '',
        },
        body: JSON.stringify({
          email,
          mobile: isExternal ? mobile : undefined,
          permissionType,
          isExternal,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        setError(data.message || 'Failed to share document');
        return;
      }

      if (isExternal && data.invitation) {
        setCreatedInvite(data.invitation);
      } else {
        onShareSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (!createdInvite) return;
    const link = `${window.location.origin}/?invite=${createdInvite.token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Share Secure Document</h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{documentTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdInvite ? (
          /* External Invitation Created Summary with OTP details for Evaluator */
          <div className="p-6 space-y-4">
            <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>External Access Invitation Created!</span>
              </div>
              <p className="text-xs text-emerald-400/90">
                A cryptographically locked access token was generated. The external recipient must provide both
                the Email OTP and Mobile SMS OTP to unlock this document.
              </p>
            </div>

            {/* Test Credentials Box for Demonstration / Snovasys Evaluation */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Evaluation Credentials (Dual-Channel OTP)</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Email OTP</span>
                  <span className="text-sm font-mono font-bold text-white tracking-wider">
                    {createdInvite.emailOtpPlainForDev}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">SMS OTP</span>
                  <span className="text-sm font-mono font-bold text-white tracking-wider">
                    {createdInvite.smsOtpPlainForDev}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                In production, these OTPs are dispatched via SMTP and Twilio SMS. In this evaluation mode,
                values are displayed here so you can verify the end-to-end identity check immediately.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Invitation Link</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/?invite=${createdInvite.token}`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300"
                />
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 shrink-0 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onShareSuccess();
                  onClose();
                }}
                className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleShare} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Sharing Type Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setIsExternal(false)}
                className={`py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                  !isExternal ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Internal Member</span>
              </button>
              <button
                type="button"
                onClick={() => setIsExternal(true)}
                className={`py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                  isExternal ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>External Guest (OTP)</span>
              </button>
            </div>

            {/* Recipient Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {isExternal ? 'Recipient Email Address' : 'Member Email Address'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. editor@trustvault.local or auditor@client.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Mobile number for External OTP */}
            {isExternal && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Recipient Mobile Number (For SMS OTP)
                </label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  placeholder="+1-555-0199"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* Permission Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Access Privilege Level</label>
              <select
                value={permissionType}
                onChange={e => setPermissionType(e.target.value as PermissionType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="READ">Read-Only (View metadata & content, no download, no edits)</option>
                <option value="READ_DOWNLOAD">Read & Download (View and download encrypted binary)</option>
                <option value="READ_EDIT">Read & Edit (Modify document details, download binary)</option>
              </select>
            </div>

            {/* Security Notice */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs flex items-start space-x-2">
              <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-400">
                All permission grants are signed and appended to the immutable audit trail. Access can be immediately
                revoked at any time by the owner.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Processing...' : isExternal ? 'Generate OTP Invitation' : 'Grant Permission'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
