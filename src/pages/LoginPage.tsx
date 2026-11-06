import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, KeyRound, Check } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login, switchDemoUser } = useAuth();
  const [email, setEmail] = useState('owner@trustvault.local');
  const [password, setPassword] = useState('Owner@Trust2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || 'Authentication failed');
    } else {
      onNavigate('dashboard');
    }
    setLoading(false);
  };

  const selectDemoAccount = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient security glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-900/30">
            <Shield className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          TrustVault Enterprise Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Cryptographically Verified Document Sharing & RBAC Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl backdrop-blur-md sm:px-10 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Demo account quick selector */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span className="flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Demo Evaluation Accounts:</span>
              </span>
              <span className="text-[10px] text-cyan-400">Auto-Fill</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => selectDemoAccount('owner@trustvault.local', 'Owner@Trust2026!')}
                className={`py-1.5 px-2 rounded-lg text-left transition-colors border ${
                  email === 'owner@trustvault.local'
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <div className="font-semibold text-[11px]">Owner</div>
                <div className="text-[10px] text-slate-500 truncate">owner@trustvault.local</div>
              </button>

              <button
                type="button"
                onClick={() => selectDemoAccount('admin@trustvault.local', 'Admin@Trust2026!')}
                className={`py-1.5 px-2 rounded-lg text-left transition-colors border ${
                  email === 'admin@trustvault.local'
                    ? 'bg-rose-950/60 border-rose-700 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <div className="font-semibold text-[11px]">Administrator</div>
                <div className="text-[10px] text-slate-500 truncate">admin@trustvault.local</div>
              </button>

              <button
                type="button"
                onClick={() => selectDemoAccount('editor@trustvault.local', 'Editor@Trust2026!')}
                className={`py-1.5 px-2 rounded-lg text-left transition-colors border ${
                  email === 'editor@trustvault.local'
                    ? 'bg-blue-950/60 border-blue-700 text-blue-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <div className="font-semibold text-[11px]">Editor</div>
                <div className="text-[10px] text-slate-500 truncate">editor@trustvault.local</div>
              </button>

              <button
                type="button"
                onClick={() => selectDemoAccount('viewer@trustvault.local', 'Viewer@Trust2026!')}
                className={`py-1.5 px-2 rounded-lg text-left transition-colors border ${
                  email === 'viewer@trustvault.local'
                    ? 'bg-purple-950/60 border-purple-700 text-purple-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <div className="font-semibold text-[11px]">Viewer</div>
                <div className="text-[10px] text-slate-500 truncate">viewer@trustvault.local</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email / User ID</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  placeholder="name@trustvault.local"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center space-x-2 text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-cyan-600 focus:ring-0"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => alert('For demonstration accounts, use the preset selector above. Passwords are encrypted with PBKDF2-SHA512.')}
                className="text-cyan-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg shadow-cyan-900/30"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Secure Vault'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">
              Need a new account?{' '}
              <button
                onClick={() => onNavigate('register')}
                className="text-cyan-400 hover:underline font-medium"
              >
                Create Account
              </button>
            </p>
            <p className="text-[11px] text-slate-500">
              Received an external invitation?{' '}
              <button
                onClick={() => onNavigate('external-portal')}
                className="text-indigo-400 hover:underline font-medium"
              >
                Verify OTP Here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
