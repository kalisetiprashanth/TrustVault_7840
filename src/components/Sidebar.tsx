import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  LayoutDashboard,
  FolderLock,
  Share2,
  Users,
  FileCheck,
  ShieldAlert,
  Settings,
  HardDrive,
  UserCheck,
  Radio,
  FileKey,
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-documents', label: 'My Documents', icon: FolderLock },
    { id: 'shared-with-me', label: 'Shared With Me', icon: FileKey },
    { id: 'shared-by-me', label: 'Shared By Me', icon: Share2 },
    { id: 'audit', label: 'Audit Trail', icon: FileCheck },
    { id: 'security-tests', label: 'Security Test Center', icon: ShieldAlert, highlight: true },
    { id: 'profile', label: 'User Profile', icon: UserCheck },
  ];

  // Include admin tab if administrator
  if (user?.role === 'ADMINISTRATOR') {
    navItems.splice(5, 0, { id: 'admin', label: 'Admin Hub', icon: Users, highlight: false });
  }

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Top Nav links */}
      <div className="p-4 space-y-6">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2 block">
            Navigation
          </span>
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && (
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-amber-950 text-amber-400 border border-amber-800">
                      19 Tests
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* External Access Simulation Link */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2 block">
            External Sharing
          </span>
          <button
            onClick={() => onNavigate('external-portal')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
              currentPage === 'external-portal'
                ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Radio className="w-4 h-4 text-indigo-400" />
            <span>External OTP Portal</span>
          </button>
        </div>
      </div>

      {/* Bottom Storage & Security Posture */}
      <div className="p-4 border-t border-slate-800 space-y-4">
        {/* Storage Meter */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg text-xs">
          <div className="flex items-center justify-between mb-1.5 text-slate-400 font-medium">
            <span className="flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              <span>Encrypted Storage</span>
            </span>
            <span className="text-[11px] text-slate-300">3.4 MB / 5 GB</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: '4%' }}></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">Zero-Knowledge AES-256 Vault</p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center space-x-2 text-[11px] text-slate-400 bg-slate-900/50 p-2 rounded-md border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>SNOVASYS 2026 Compliant</span>
        </div>
      </div>
    </aside>
  );
};
