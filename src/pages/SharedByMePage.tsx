import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Share2, FileText, UserX, ShieldAlert, CheckCircle2, AlertCircle, Clock, KeyRound } from 'lucide-react';
import { DocumentRecord, PermissionRecord } from '../types/index.ts';

interface SharedByMePageProps {
  onNavigate: (page: string) => void;
  onOpenShare: (docId: string, docTitle: string) => void;
}

interface SharedOutItem {
  permission: PermissionRecord;
  document: DocumentRecord;
}

export const SharedByMePage: React.FC<SharedByMePageProps> = ({ onNavigate, onOpenShare }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<SharedOutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchOutboundShares = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents', {
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });
      if (res.ok) {
        const data = await res.json();
        const myDocs: DocumentRecord[] = (data.documents || []).filter(
          (d: DocumentRecord) => d.ownerId === user?.id
        );

        // Fetch permissions for each owned document
        const allOutbound: SharedOutItem[] = [];
        for (const doc of myDocs) {
          const detailRes = await fetch(`/api/documents/${doc.id}`, {
            headers: { 'x-trustvault-user-id': user?.id || '' },
          });
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const perms: PermissionRecord[] = detailData.permissions || [];
            for (const p of perms) {
              allOutbound.push({ permission: p, document: doc });
            }
          }
        }
        setItems(allOutbound);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutboundShares();
  }, [user]);

  // Immediate Revocation Handler
  const handleRevoke = async (docId: string, permId: string, recipientEmail: string) => {
    if (!confirm(`Revoke all access for ${recipientEmail} immediately?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/documents/${docId}/permissions/${permId}`, {
        method: 'DELETE',
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Access revoked immediately for ${recipientEmail}. Cached tokens invalidated and recorded in audit log.`,
        });
        await fetchOutboundShares();
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.message || 'Revocation failed' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Share2 className="w-6 h-6 text-indigo-400" />
            <span>Shared By Me (Active Grants)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor and govern all active document grants you have issued. You can revoke permissions instantly.
          </p>
        </div>
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

      {/* Outbound Grants Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              Fetching outbound grants...
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Share2 className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium text-slate-300">No active shared documents</p>
              <p className="text-xs text-slate-500">
                You have not shared any documents yet. Go to "My Documents" to share files with internal or external members.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-medium">Shared Document</th>
                  <th className="px-4 py-3.5 font-medium">Recipient</th>
                  <th className="px-4 py-3.5 font-medium">Granted Privilege</th>
                  <th className="px-4 py-3.5 font-medium">Shared Date</th>
                  <th className="px-4 py-3.5 font-medium">Status</th>
                  <th className="px-4 py-3.5 font-medium text-right">Revocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {items.map(item => {
                  const perm = item.permission;
                  const doc = item.document;

                  return (
                    <tr key={perm.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-white flex items-center space-x-2.5">
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div className="truncate max-w-[200px]">{doc.title}</div>
                          <div className="text-[10px] text-slate-500">{doc.category}</div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-300">
                        <div className="font-medium text-white">{perm.granteeName || perm.granteeEmail}</div>
                        <div className="text-[10px] text-slate-500">{perm.granteeEmail}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            perm.permissionType === 'READ_EDIT'
                              ? 'bg-blue-950 text-blue-300 border-blue-800'
                              : perm.permissionType === 'READ_DOWNLOAD'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {perm.permissionType}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {new Date(perm.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>ACTIVE</span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleRevoke(doc.id, perm.id, perm.granteeEmail)}
                          className="px-3 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-semibold flex items-center space-x-1 ml-auto transition-colors"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Revoke Access</span>
                        </button>
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
