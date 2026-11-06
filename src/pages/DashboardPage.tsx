import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  FolderLock,
  Share2,
  FileKey,
  ShieldCheck,
  ShieldAlert,
  UploadCloud,
  FileText,
  Activity,
  HardDrive,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import { DocumentRecord, AuditRecord } from '../types/index.ts';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onOpenUpload: () => void;
  onOpenChainModal: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenUpload,
  onOpenChainModal,
}) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = { 'x-trustvault-user-id': user?.id || '' };
      const [docsRes, auditRes] = await Promise.all([
        fetch('/api/documents', { headers }),
        fetch('/api/audit', { headers }),
      ]);

      if (docsRes.ok) {
        const text = await docsRes.text();
        const d = text ? JSON.parse(text) : {};
        setDocuments(d.documents || []);
      }
      if (auditRes.ok) {
        const text = await auditRes.text();
        const a = text ? JSON.parse(text) : {};
        setAuditEvents(a.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const myUploads = documents.filter(d => d.ownerId === user?.id);
  const sharedWithMe = documents.filter(d => d.ownerId !== user?.id);
  const securityDenials = auditEvents.filter(a => a.status === 'DENIED');

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-cyan-600/10 to-transparent pointer-events-none"></div>
        <div className="space-y-1 relative z-10">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Welcome back, {user?.fullName}
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              {user?.role}
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            TrustVault Enterprise Vault active. All data operations are guarded by resource-based authorization
            and committed to an immutable SHA-256 cryptographic audit chain.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center space-x-3 shrink-0 relative z-10">
          {user?.role !== 'VIEWER' && (
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors shadow-lg shadow-cyan-900/30"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('security-tests')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Test Suite (19)</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">My Documents</span>
            <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
              <FolderLock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{myUploads.length}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Encrypted in private storage</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Shared With Me</span>
            <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/60">
              <FileKey className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{sharedWithMe.length}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Granted by other owners</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Cryptographic Audit Blocks</span>
            <button
              onClick={onOpenChainModal}
              title="Inspect hash chain"
              className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{auditEvents.length}</div>
            <p className="text-[11px] text-emerald-400 mt-0.5 font-medium flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>SHA-256 Chain Intact</span>
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Security Denials Blocked</span>
            <div className="p-2 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/60">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{securityDenials.length}</div>
            <p className="text-[11px] text-rose-400 mt-0.5 font-medium">IDOR & unauthorized blocked</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Documents & Live Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents Table (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Accessible Documents</h2>
            </div>
            <button
              onClick={() => onNavigate('my-documents')}
              className="text-xs text-cyan-400 hover:underline flex items-center space-x-1 font-medium"
            >
              <span>View All ({documents.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            {documents.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No accessible documents found in your vault.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Document Title</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Scan Status</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {documents.slice(0, 5).map(doc => {
                    const isOwn = doc.ownerId === user?.id;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-white flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px] sm:max-w-xs">{doc.title}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 truncate max-w-[120px]">
                          {isOwn ? <span className="text-cyan-400 font-semibold">You (Owner)</span> : doc.ownerName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
                            {doc.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {doc.scanStatus === 'CLEAN' ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-semibold">
                              CLEAN
                            </span>
                          ) : doc.scanStatus === 'RETRY_NEEDED' ? (
                            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-semibold">
                              RETRY SCAN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-semibold">
                              QUARANTINED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onNavigate(`document-${doc.id}`)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
                          >
                            Details
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

        {/* Live Immutable Audit Stream (1 Col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Cryptographic Audit Feed</h2>
              </div>
              <button
                onClick={onOpenChainModal}
                className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1"
              >
                <span>Verify Chain</span>
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[380px] overflow-y-auto divide-y divide-slate-800/40">
              {auditEvents.slice(0, 6).map(evt => {
                const isDenied = evt.status === 'DENIED';
                return (
                  <div key={evt.id} className="pt-2.5 first:pt-0 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          isDenied
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {evt.action}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(evt.timestampUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-tight line-clamp-2">{evt.details}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Actor: {evt.actorEmail.split('@')[0]}</span>
                      <span>Hash: {evt.currentHash.substring(0, 8)}...</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
            <button
              onClick={() => onNavigate('audit')}
              className="text-xs text-cyan-400 hover:underline font-medium"
            >
              View Full Audit Trail & Search Filters &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
