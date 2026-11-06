import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { FileKey, FileText, Download, Eye, Edit3, Shield, Clock, AlertCircle } from 'lucide-react';
import { DocumentRecord } from '../types/index.ts';

interface SharedWithMePageProps {
  onNavigate: (page: string) => void;
}

export const SharedWithMePage: React.FC<SharedWithMePageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [sharedDocs, setSharedDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchSharedDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents', {
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });
      if (res.ok) {
        const data = await res.json();
        // Filter only documents where the user is NOT the owner
        const filtered = (data.documents || []).filter(
          (d: DocumentRecord) => d.ownerId !== user?.id
        );
        setSharedDocs(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedDocs();
  }, [user]);

  const handleDownload = async (doc: DocumentRecord) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/download`, {
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });
      if (!res.ok) {
        const err = await res.json();
        setFeedback(err.message || 'Download forbidden by permission policy');
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
    } catch (err: any) {
      setFeedback(err.message || 'Download failed');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileKey className="w-6 h-6 text-indigo-400" />
            <span>Documents Shared With Me</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Files where other document owners have explicitly granted you access rights.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Security Rule Reminder Box */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1.5">
        <div className="flex items-center space-x-2 text-indigo-400 font-semibold">
          <Shield className="w-4 h-4" />
          <span>Server-Enforced Access Restrictions</span>
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          Your permissions (<code className="text-cyan-300 font-mono">READ</code>,{' '}
          <code className="text-cyan-300 font-mono">READ_DOWNLOAD</code>, or{' '}
          <code className="text-cyan-300 font-mono">READ_EDIT</code>) are strictly validated on every backend API request.
          You cannot delete, re-share, or transfer ownership of files in this view.
        </p>
      </div>

      {/* Shared Documents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              Loading shared documents...
            </div>
          ) : sharedDocs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <FileKey className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium text-slate-300">No documents shared with you</p>
              <p className="text-xs text-slate-500">
                When another user shares a document with <span className="text-slate-400">{user?.email}</span>, it will appear here.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-medium">Document Title</th>
                  <th className="px-4 py-3.5 font-medium">Owner</th>
                  <th className="px-4 py-3.5 font-medium">Your Permission</th>
                  <th className="px-4 py-3.5 font-medium">Category</th>
                  <th className="px-4 py-3.5 font-medium">Scan Status</th>
                  <th className="px-4 py-3.5 font-medium text-right">Permitted Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {sharedDocs.map(doc => {
                  const perm = (doc as any).effectivePermission || 'READ';
                  const canDownload = ['READ_DOWNLOAD', 'READ_EDIT'].includes(perm);
                  const canEdit = perm === 'READ_EDIT';

                  return (
                    <tr key={doc.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-white flex items-center space-x-2.5">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div>
                          <div className="truncate max-w-[200px] sm:max-w-xs">{doc.title}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{doc.originalName}</div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-400">
                        <div className="font-medium text-slate-200">{doc.ownerName}</div>
                        <div className="text-[10px] text-slate-500">{doc.ownerEmail}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            perm === 'READ_EDIT'
                              ? 'bg-blue-950 text-blue-300 border-blue-800'
                              : perm === 'READ_DOWNLOAD'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {perm}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
                          {doc.category}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-semibold">
                          {doc.scanStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onNavigate(`document-${doc.id}`)}
                            title="View document details"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDownload(doc)}
                            disabled={!canDownload}
                            title={canDownload ? 'Download document binary' : 'Download forbidden by grant'}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {canEdit && (
                            <button
                              onClick={() => onNavigate(`document-${doc.id}`)}
                              title="Edit permitted"
                              className="p-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
