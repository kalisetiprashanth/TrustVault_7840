import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  FolderLock,
  Search,
  Filter,
  UploadCloud,
  FileText,
  Download,
  Share2,
  Trash2,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { DocumentRecord } from '../types/index.ts';

interface MyDocumentsPageProps {
  onNavigate: (page: string) => void;
  onOpenUpload: () => void;
  onOpenShare: (docId: string, docTitle: string) => void;
}

export const MyDocumentsPage: React.FC<MyDocumentsPageProps> = ({
  onNavigate,
  onOpenUpload,
  onOpenShare,
}) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [rescanLoadingId, setRescanLoadingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents', {
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [user]);

  // Handle Download with authorization
  const handleDownload = async (doc: DocumentRecord) => {
    if (doc.scanStatus === 'QUARANTINED') {
      setActionFeedback({
        type: 'error',
        message: 'Security Quarantine: This document failed integrity scans and download is restricted.',
      });
      return;
    }

    try {
      const res = await fetch(`/api/documents/${doc.id}/download`, {
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });

      if (!res.ok) {
        const text = await res.text();
        let err: any = {};
        try { err = text ? JSON.parse(text) : {}; } catch { err = { message: text }; }
        setActionFeedback({ type: 'error', message: err.message || 'Download denied by security policy' });
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

      setActionFeedback({ type: 'success', message: `Downloaded: ${doc.title}` });
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Download error' });
    }
  };

  // Handle "Retry Scan" problem fix!
  const handleRetryScan = async (doc: DocumentRecord) => {
    setRescanLoadingId(doc.id);
    setActionFeedback(null);

    try {
      const res = await fetch(`/api/documents/${doc.id}/retry-scan`, {
        method: 'POST',
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });

      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }

      if (!res.ok) {
        setActionFeedback({ type: 'error', message: data.message || 'Re-scan failed' });
      } else {
        setActionFeedback({
          type: 'success',
          message: `Root-cause fix applied: ${data.message}`,
        });
        await fetchDocs();
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Network error during re-scan' });
    } finally {
      setRescanLoadingId(null);
    }
  };

  // Handle Delete
  const handleDelete = async (docId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}" from the vault?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });

      if (res.ok) {
        setActionFeedback({ type: 'success', message: `Document deleted: ${title}` });
        await fetchDocs();
      } else {
        const err = await res.json();
        setActionFeedback({ type: 'error', message: err.message || 'Delete denied' });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    }
  };

  // Filter & Search Logic
  const filteredDocs = documents
    .filter(doc => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || doc.category === selectedCategory;
      const matchesStatus = selectedStatus === 'ALL' || doc.scanStatus === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'size') return (b.sizeBytes || 0) - (a.sizeBytes || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FolderLock className="w-6 h-6 text-cyan-400" />
            <span>Vault Documents Repository</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and manage all encrypted documents with strict server-side authorization checks.
          </p>
        </div>

        {user?.role !== 'VIEWER' && (
          <button
            onClick={onOpenUpload}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 shadow-lg shadow-cyan-900/30"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload New Document</span>
          </button>
        )}
      </div>

      {/* Action feedback banner */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-[10px] text-slate-400 hover:text-white ml-4 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search, Filter, Sort Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative w-full md:flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by document title, owner, or category..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Categories</option>
              <option value="Financial">Financial</option>
              <option value="Legal">Legal</option>
              <option value="Technical">Technical</option>
              <option value="Security">Security</option>
              <option value="General">General</option>
            </select>

            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Scan Statuses</option>
              <option value="CLEAN">Clean Only</option>
              <option value="RETRY_NEEDED">Retry Needed Only</option>
              <option value="QUARANTINED">Quarantined Only</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="date">Sort: Newest</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="size">Sort: File Size</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
              <p className="text-xs">Loading secure vault documents...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium text-slate-300">No documents found</p>
              <p className="text-xs text-slate-500">Try adjusting your filters or upload a new file.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-medium">Document Name</th>
                  <th className="px-4 py-3.5 font-medium">Owner</th>
                  <th className="px-4 py-3.5 font-medium">Category</th>
                  <th className="px-4 py-3.5 font-medium">Size</th>
                  <th className="px-4 py-3.5 font-medium">Scan Status</th>
                  <th className="px-4 py-3.5 font-medium">Uploaded</th>
                  <th className="px-4 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredDocs.map(doc => {
                  const isOwner = doc.ownerId === user?.id;
                  const canEdit = isOwner || (doc as any).effectivePermission === 'READ_EDIT';
                  const canDownload = isOwner || ['READ_DOWNLOAD', 'READ_EDIT'].includes((doc as any).effectivePermission);
                  const isRetrying = rescanLoadingId === doc.id;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-white flex items-center space-x-2.5">
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div className="truncate max-w-[200px] sm:max-w-xs">{doc.title}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{doc.originalName}</div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-400">
                        {isOwner ? (
                          <span className="text-cyan-400 font-semibold">You (Owner)</span>
                        ) : (
                          <span>{doc.ownerName}</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
                          {doc.category}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-400 font-mono">
                        {(doc.sizeBytes / 1024).toFixed(1)} KB
                      </td>

                      {/* Scan Status Column with "Retry Scan" resolution button */}
                      <td className="px-4 py-3.5">
                        {doc.scanStatus === 'CLEAN' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>CLEAN</span>
                          </span>
                        ) : doc.scanStatus === 'RETRY_NEEDED' ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-semibold">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>RETRY NEEDED</span>
                            </span>
                            <button
                              onClick={() => handleRetryScan(doc)}
                              disabled={isRetrying}
                              title="Resolve stuck scan: Run multi-stage heuristic repair"
                              className="px-2 py-0.5 rounded bg-amber-800/60 hover:bg-amber-700 text-amber-200 text-[10px] font-bold flex items-center space-x-1 transition-colors"
                            >
                              <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                              <span>Retry Scan</span>
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-semibold">
                            <ShieldAlert className="w-3 h-3 text-rose-400" />
                            <span>QUARANTINED</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* View details */}
                          <button
                            onClick={() => onNavigate(`document-${doc.id}`)}
                            title="Inspect document and permissions"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Download binary */}
                          <button
                            onClick={() => handleDownload(doc)}
                            disabled={!canDownload && !isOwner}
                            title={canDownload ? 'Download encrypted document' : 'Download not permitted'}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Share with users (Owner only) */}
                          {isOwner && (
                            <button
                              onClick={() => onOpenShare(doc.id, doc.title)}
                              title="Share with member or external guest"
                              className="p-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 transition-colors"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete document (Owner only) */}
                          {isOwner && (
                            <button
                              onClick={() => handleDelete(doc.id, doc.title)}
                              title="Delete permanently from vault"
                              className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
