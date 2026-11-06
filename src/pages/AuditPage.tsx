import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Hash,
  Clock,
  User,
  FileText,
  AlertOctagon,
} from 'lucide-react';
import { AuditRecord } from '../types/index.ts';

interface AuditPageProps {
  onOpenChainModal: () => void;
}

export const AuditPage: React.FC<AuditPageProps> = ({ onOpenChainModal }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'DENIED'>('ALL');

  const fetchAuditEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit', {
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, [user]);

  const filteredEvents = events.filter(e => {
    const matchesSearch =
      e.actorEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.documentName && e.documentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileCheck className="w-6 h-6 text-emerald-400" />
            <span>Immutable Cryptographic Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-resistant append-only event ledger. Every operation embeds the SHA-256 hash of its predecessor.
          </p>
        </div>

        <button
          onClick={onOpenChainModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 shadow-lg shadow-emerald-900/30"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Verify Hash Chain Integrity</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by actor, action name, document, or details..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Outcomes (Success & Denied)</option>
            <option value="SUCCESS">Success Only</option>
            <option value="DENIED">Security Denials Only</option>
          </select>

          <button
            onClick={fetchAuditEvents}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh events"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              Loading cryptographic ledger...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <FileCheck className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium text-slate-300">No audit records match your search</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-3.5 font-mono font-medium"># Block</th>
                  <th className="px-3 py-3.5 font-medium">Timestamp (UTC)</th>
                  <th className="px-3 py-3.5 font-medium">Actor</th>
                  <th className="px-3 py-3.5 font-medium">Action Event</th>
                  <th className="px-3 py-3.5 font-medium">Status</th>
                  <th className="px-3 py-3.5 font-medium">Target Document</th>
                  <th className="px-3 py-3.5 font-medium">Details & IP</th>
                  <th className="px-3 py-3.5 font-mono font-medium text-right">Block SHA-256</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredEvents.map(evt => {
                  const isDenied = evt.status === 'DENIED';

                  return (
                    <tr key={evt.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-3 py-3.5 font-mono text-cyan-400 font-bold">
                        #{evt.index}
                      </td>

                      <td className="px-3 py-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(evt.timestampUtc).toLocaleString()}
                      </td>

                      <td className="px-3 py-3.5 font-medium text-white">
                        <span className="truncate max-w-[130px] block" title={evt.actorEmail}>
                          {evt.actorEmail}
                        </span>
                      </td>

                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                            isDenied
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {evt.action}
                        </span>
                      </td>

                      <td className="px-3 py-3.5">
                        <span
                          className={`font-bold text-[10px] ${
                            isDenied ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {evt.status}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-slate-300">
                        <span className="truncate max-w-[150px] block" title={evt.documentName || 'N/A'}>
                          {evt.documentName || <span className="text-slate-600 font-mono">SYSTEM</span>}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-slate-400 max-w-xs">
                        <div className="line-clamp-2 text-[11px] text-slate-300">{evt.details}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">IP: {evt.ipAddress}</div>
                      </td>

                      <td className="px-3 py-3.5 font-mono text-[10px] text-cyan-400 text-right whitespace-nowrap">
                        <span title={evt.currentHash}>{evt.currentHash.substring(0, 10)}...</span>
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
