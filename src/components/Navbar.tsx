import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Shield,
  ShieldCheck,
  Bell,
  LogOut,
  User as UserIcon,
  ChevronDown,
  ExternalLink,
  Layers,
  KeyRound,
} from 'lucide-react';
import { NotificationRecord } from '../types/index.ts';

interface NavbarProps {
  onOpenChainModal: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenChainModal, onNavigate, currentPage }) => {
  const { user, logout, switchDemoUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const roleBadgeColors: Record<string, string> = {
    ADMINISTRATOR: 'bg-rose-900/40 text-rose-300 border-rose-700/60',
    OWNER: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60',
    EDITOR: 'bg-blue-900/40 text-blue-300 border-blue-700/60',
    VIEWER: 'bg-slate-800 text-slate-300 border-slate-700',
    EXTERNAL: 'bg-amber-900/40 text-amber-300 border-amber-700/60',
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      {/* Brand & Platform Identity */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center space-x-2.5 text-left focus:outline-none group"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/20 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-lg tracking-tight text-white">TrustVault</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                PRO 2026
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-wide font-mono hidden sm:block">
              IMMUTABLE AUDIT & RBAC VAULT
            </p>
          </div>
        </button>

        {/* Cryptographic Chain Status Button */}
        <button
          onClick={onOpenChainModal}
          title="Verify SHA-256 cryptographic audit chain"
          className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900/40 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Chain Validated</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </button>
      </div>

      {/* Right Controls: Demo Role Quick Switcher, Notifications & Profile */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Quick Demo Role Switcher */}
        <div className="hidden lg:flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
          <span className="px-2 text-slate-400 text-[11px] font-medium flex items-center space-x-1">
            <KeyRound className="w-3 h-3 text-slate-500" />
            <span>Demo Switch:</span>
          </span>
          {(['ADMINISTRATOR', 'OWNER', 'EDITOR', 'VIEWER'] as const).map(role => (
            <button
              key={role}
              onClick={() => switchDemoUser(role)}
              className={`px-2 py-1 rounded font-medium transition-all ${
                user?.role === role
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {role.charAt(0) + role.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 relative transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <span className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  <span>Security & Document Alerts</span>
                </span>
                <button
                  onClick={() => onNavigate('notifications')}
                  className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
                >
                  <span>View All</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-500">No notifications yet.</p>
                ) : (
                  notifications.slice(0, 5).map(n => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-3 text-xs cursor-pointer transition-colors ${
                        n.isRead ? 'bg-slate-900/40 text-slate-400' : 'bg-slate-800/40 text-slate-200 font-medium'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-white font-semibold">{n.title}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Account / Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2.5 p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800/80 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold text-xs">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-medium text-white leading-tight">{user?.fullName}</p>
              <span
                className={`inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
                  roleBadgeColors[user?.role || 'VIEWER']
                }`}
              >
                {user?.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl z-50 py-1.5 divide-y divide-slate-800">
              <div className="px-4 py-2.5">
                <p className="text-xs font-semibold text-white">{user?.fullName}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <div className="mt-1.5 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] text-emerald-400 font-medium">Session Active (TLS/AES-256)</span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate('profile');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center space-x-2"
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Security Profile & Password</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate('security-tests');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-cyan-400 hover:bg-slate-800 flex items-center space-x-2"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Run Security Tests (19 Tests)</span>
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                    onNavigate('login');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-rose-950/30 flex items-center space-x-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
