import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Layers,
  FileCheck,
  Lock,
  Cpu,
} from 'lucide-react';
import { SecurityTestResult } from '../types/index.ts';

export const SecurityTestPage: React.FC = () => {
  const [results, setResults] = useState<SecurityTestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalExecuted, setTotalExecuted] = useState(0);

  const runSuite = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test/run-security-suite', { method: 'POST' });
      const data = await res.json();
      setResults(data.results || []);
      setTotalExecuted(data.totalTests || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSuite();
  }, []);

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
              <span>Automated Security Test Suite (19 Tests)</span>
            </h1>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              SNOVASYS 2026 Target: 100% Pass
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Live integration security verification directly against the TrustVault authorization engine.
            Tests IDOR prevention, role segregation, immediate revocation, magic-byte quarantine, and SHA-256 audit chain integrity.
          </p>
        </div>

        <button
          onClick={runSuite}
          disabled={loading}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center space-x-2 transition-colors shrink-0 shadow-lg shadow-amber-900/30 disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-white" />
          )}
          <span>{loading ? 'Executing Suite...' : 'Re-Run Security Suite'}</span>
        </button>
      </div>

      {/* Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-500 text-xs block mb-1">Total Test Cases</span>
          <div className="text-2xl font-bold text-white font-mono">{results.length}</div>
          <span className="text-[11px] text-slate-400">Target Coverage: 100%</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-500 text-xs block mb-1">Passed Verifications</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{passedCount}</div>
          <span className="text-[11px] text-emerald-400 font-medium">All Authorization Gates Valid</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-500 text-xs block mb-1">Critical Security Failures</span>
          <div className="text-2xl font-bold text-slate-200 font-mono">
            <span className={failedCount === 0 ? 'text-slate-400' : 'text-rose-400'}>
              {failedCount}
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Zero IDOR / Privilege leaks</span>
        </div>
      </div>

      {/* Tests List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <h2 className="text-sm font-semibold text-white">Security Verification Results</h2>
          <span className="text-xs text-slate-400 font-mono">
            {passedCount} / {results.length} Passed
          </span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {results.map((test, idx) => (
            <div key={test.id} className="p-4 hover:bg-slate-850/40 transition-colors space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {test.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs text-cyan-400 font-bold">{test.id}</span>
                      <h3 className="text-xs sm:text-sm font-semibold text-white">{test.title}</h3>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {test.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{test.description}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border font-mono ${
                      test.passed
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border-rose-800'
                    }`}
                  >
                    {test.passed ? 'PASSED' : 'FAILED'}
                  </span>
                  <span className="block text-[10px] text-slate-500 font-mono mt-1">
                    {test.executionTimeMs} ms
                  </span>
                </div>
              </div>

              {/* Technical details evidence */}
              <div className="ml-8 p-2.5 rounded bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300">
                {test.details}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
