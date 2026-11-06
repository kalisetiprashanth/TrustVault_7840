import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Bell, CheckCircle2, AlertTriangle, ShieldAlert, Info, Check, ExternalLink } from 'lucide-react';
import { NotificationRecord } from '../types/index.ts';

interface NotificationsPageProps {
  onNavigate: (page: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'x-trustvault-user-id': user?.id || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [user]);

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Bell className="w-6 h-6 text-cyan-400" />
            <span>Platform Alerts & Security Notices</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time feed of document shares, revocations, and system security events.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-800">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Bell className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-medium text-slate-300">No notifications on file</p>
          </div>
        ) : (
          notifications.map(n => {
            const isAlert = n.type === 'ALERT' || n.type === 'WARNING';

            return (
              <div
                key={n.id}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                  n.isRead ? 'bg-slate-900/60 opacity-80' : 'bg-slate-900/90'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isAlert
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                    }`}
                  >
                    {isAlert ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-white">{n.title}</h3>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-slate-500 block pt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {n.link && (
                    <button
                      onClick={() => onNavigate('my-documents')}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                  {!n.isRead && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
