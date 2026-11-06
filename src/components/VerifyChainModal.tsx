import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw, X, Link2, Hash } from 'lucide-react';

interface VerifyChainModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VerifyChainModal: React.FC<VerifyChainModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const verifyChain = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit/verify-chain');
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setResult(data);
    } catch (err: any) {
      setResult({ isValid: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      verifyChain();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Cryptographic Audit Chain Integrity</h3>
              <p className="text-xs text-slate-400">Append-only SHA-256 block verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-300">Recomputing SHA-256 digests across all audit blocks...</p>
            </div>
          ) : result?.isValid ? (
            <div className="space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-4 flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-emerald-300">All Blocks Cryptographically Verified</h4>
                  <p className="text-xs text-emerald-400/90 mt-1">
                    Every audit record from Genesis Block #1 to Block #{result.totalBlocks} maintains a continuous,
                    unbroken cryptographic link. No records have been modified, retrofitted, or omitted.
                  </p>
                </div>
              </div>

              {/* Block Statistics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                  <span className="text-slate-500 block mb-1">Total Verified Blocks</span>
                  <span className="text-lg font-bold text-white font-mono">{result.totalBlocks} Blocks</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                  <span className="text-slate-500 block mb-1">Chain Algorithm</span>
                  <span className="text-lg font-bold text-cyan-400 font-mono">SHA-256 Append-Only</span>
                </div>
              </div>

              {/* Mathematical Chain Formula */}
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-lg space-y-2 text-xs">
                <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
                  <Hash className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Hash Chain Formulation</span>
                </div>
                <p className="font-mono text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 break-all">
                  Hash[N] = SHA256( Index | Timestamp | ActorId | DocId | Action | Status | Details | Hash[N-1] )
                </p>
                <p className="text-[11px] text-slate-500">
                  Because Hash[N] incorporates Hash[N-1], altering any single prior record breaks all subsequent hashes in the chain,
                  making unauthorized log alteration mathematically impossible without immediate detection.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-rose-950/40 border border-rose-800 rounded-xl p-4 flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-rose-300">Cryptographic Chain Compromised!</h4>
                <p className="text-xs text-rose-400/90 mt-1">{result?.error || 'Hash mismatch detected.'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
          <button
            onClick={verifyChain}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 flex items-center space-x-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-Verify Chain</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
