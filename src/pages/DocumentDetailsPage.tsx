import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  FileText,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Download,
  Share2,
  Trash2,
  ArrowLeft,
  Clock,
  HardDrive,
  User,
  Users,
  Edit3,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { DocumentRecord, PermissionRecord } from '../types/index.ts';

interface DocumentDetailsPageProps {
  documentId: string;
  onNavigate: (page: string) => void;
  onOpenShare: (docId: string, docTitle: string) => void;
}

export const DocumentDetailsPage: React.FC<DocumentDetailsPageProps> = ({
  documentId,
  onNavigate,
  onOpenShare,
}) => {
  const { user } = useAuth();
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [rescanLoading, setRescanLoading] = useState(false);

  const fetchDocDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        setError(data.message || 'Access Denied: You do not have authorization to view this document.');
        return;
      }

      setDoc(data.document);
      setPermissions(data.permissions || []);
      setIsOwner(data.isOwner);
      setEditTitle(data.document.title);
      setEditCategory(data.document.category);
    } catch (err: any) {
      setError(err.message || 'Network error fetching document');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocDetails();
  }, [documentId, user]);

  const handleDownload = async () => {
    if (!doc) return;
    if (doc.scanStatus === 'QUARANTINED') {
      alert('Security Quarantine: Download restricted.');
      return;
    }

    try {
      const res = await fetch(`/api/documents/${doc.id}/download`, {
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Download denied by policy.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName || doc.title;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!doc) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-trustvault-user-id': user?.id || '',
        },
        body: JSON.stringify({ title: editTitle, category: editCategory }),
      });
      if (res.ok) {
        setIsEditing(false);
        setActionFeedback('Metadata updated successfully and logged in audit trail.');
        await fetchDocDetails();
      } else {
        const err = await res.json();
        alert(err.message);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRetryScan = async () => {
    if (!doc) return;
    setRescanLoading(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/retry-scan`, {
        method: 'POST',
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback(`Scan complete: ${data.message}`);
        await fetchDocDetails();
      } else {
        alert(data.message);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRescanLoading(false);
    }
  };

  const handleRevokePermission = async (permId: string) => {
    if (!doc) return;
    if (!confirm('Revoke access immediately?')) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}/permissions/${permId}`, {
        method: 'DELETE',
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });
      if (res.ok) {
        setActionFeedback('Permission revoked immediately.');
        await fetchDocDetails();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Verifying access authorization & decrypting record...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Denied by Security Policy</h2>
        <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
        <div className="pt-2">
          <button
            onClick={() => onNavigate('my-documents')}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Return to Documents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => onNavigate('my-documents')}
          className="flex items-center space-x-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Documents</span>
        </button>

        <div className="flex items-center space-x-2">
          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={doc.scanStatus === 'QUARANTINED'}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Encrypted File</span>
          </button>

          {/* Share (Owner only) */}
          {isOwner && (
            <button
              onClick={() => onOpenShare(doc.id, doc.title)}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Access</span>
            </button>
          )}

          {/* Edit (Owner or Editor) */}
          {isOwner && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Metadata'}</span>
            </button>
          )}
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Main Metadata & Scan Health Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Info Card (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-sm font-bold text-white"
                  />
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                  >
                    <option value="Financial">Financial</option>
                    <option value="Legal">Legal</option>
                    <option value="Technical">Technical</option>
                    <option value="Security">Security</option>
                    <option value="General">General</option>
                  </select>
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 bg-cyan-600 text-white rounded text-xs font-semibold"
                  >
                    Save Changes
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-white tracking-tight">{doc.title}</h1>
                  <p className="text-xs text-slate-400 font-mono">Original: {doc.originalName}</p>
                </>
              )}
            </div>

            <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium">
              {doc.category}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">Owner</span>
              <span className="font-medium text-slate-200">{doc.ownerName}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">File Size</span>
              <span className="font-medium text-slate-200 font-mono">{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">MIME Type</span>
              <span className="font-medium text-slate-200 font-mono">{doc.mimeType || 'text/plain'}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Uploaded</span>
              <span className="font-medium text-slate-200">{new Date(doc.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Secure Content Preview Area */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Vault Document Preview</span>
            </span>

            {doc.scanStatus === 'QUARANTINED' ? (
              <div className="p-4 bg-rose-950/30 border border-rose-800/80 rounded-xl text-xs text-rose-300 space-y-1">
                <p className="font-semibold">Security Alert: File Content Quarantined</p>
                <p className="text-[11px] text-rose-400/90">{doc.scanDetails}</p>
              </div>
            ) : doc.contentPreview ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed border-l-4 border-l-cyan-500">
                {doc.contentPreview}
              </div>
            ) : (
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                Binary format ({doc.mimeType}). Download file to view on authorized viewer software.
              </div>
            )}
          </div>
        </div>

        {/* Scan Status & Heuristic Health Diagnosis (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-white font-semibold text-sm">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Multi-Stage Scan Status</span>
            </div>

            <div
              className={`p-4 rounded-xl border space-y-2 ${
                doc.scanStatus === 'CLEAN'
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : doc.scanStatus === 'RETRY_NEEDED'
                  ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-xs uppercase tracking-wider">
                <span>Status: {doc.scanStatus}</span>
                {doc.scanStatus === 'CLEAN' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4" />
                )}
              </div>
              <p className="text-[11px] leading-relaxed">{doc.scanDetails}</p>
            </div>

            {/* If in Retry Scan mode, show direct action button to resolve */}
            {doc.scanStatus === 'RETRY_NEEDED' && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-800/60 space-y-2 text-xs">
                <span className="font-semibold text-amber-300">Resolve Stuck Scan Problem</span>
                <p className="text-[11px] text-slate-400">
                  Runs deep magic-byte inspection, checks binary header signatures, and repairs the scan state.
                </p>
                <button
                  onClick={handleRetryScan}
                  disabled={rescanLoading}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${rescanLoading ? 'animate-spin' : ''}`} />
                  <span>{rescanLoading ? 'Running Heuristics...' : 'Execute Deep Re-Scan'}</span>
                </button>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <span className="text-slate-400 font-semibold block">Security Attributes</span>
              <div className="flex items-center justify-between text-slate-300 py-1 border-b border-slate-800">
                <span>Magic Bytes Verified</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {doc.magicVerified ? 'YES (VALID)' : 'NO / QUARANTINE'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300 py-1 border-b border-slate-800">
                <span>At-Rest Encryption</span>
                <span className="text-cyan-400 font-mono font-bold">AES-256-GCM</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 py-1">
                <span>Storage Key Obfuscation</span>
                <span className="text-slate-500 font-mono text-[10px]">UUID Vault Protected</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            Immutable Audit Hash committed for this document.
          </div>
        </div>
      </div>

      {/* Permissions Management Section (Owner Only) */}
      {isOwner && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Document Access Control List (ACL)</h2>
            </div>
            <button
              onClick={() => onOpenShare(doc.id, doc.title)}
              className="text-xs text-cyan-400 hover:underline flex items-center space-x-1 font-medium"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Grant New Access</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            {permissions.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                No active grants. Only you (the owner) currently have access to this document.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Grantee Email</th>
                    <th className="px-4 py-3 font-medium">Privilege Level</th>
                    <th className="px-4 py-3 font-medium">Granted At</th>
                    <th className="px-4 py-3 font-medium text-right">Revocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {permissions.map(p => (
                    <tr key={p.id} className="hover:bg-slate-850/50">
                      <td className="px-4 py-3 text-white font-medium">{p.granteeEmail}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold border border-slate-700 text-cyan-300">
                          {p.permissionType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRevokePermission(p.id)}
                          className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 text-[11px] font-semibold transition-colors"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
