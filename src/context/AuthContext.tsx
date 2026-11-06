import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchDemoUser: (role: 'ADMINISTRATOR' | 'OWNER' | 'EDITOR' | 'VIEWER') => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('trustvault_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'x-trustvault-user-id': authToken,
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
        localStorage.removeItem('trustvault_token');
        setToken(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      // Default to Owner demo user on initial load for a seamless experience
      switchDemoUser('OWNER');
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('trustvault_token', data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('trustvault_token');
  };

  const switchDemoUser = async (role: 'ADMINISTRATOR' | 'OWNER' | 'EDITOR' | 'VIEWER') => {
    setLoading(true);
    const demoCredentials: Record<string, { email: string; pass: string }> = {
      ADMINISTRATOR: { email: 'admin@trustvault.local', pass: 'Admin@Trust2026!' },
      OWNER: { email: 'owner@trustvault.local', pass: 'Owner@Trust2026!' },
      EDITOR: { email: 'editor@trustvault.local', pass: 'Editor@Trust2026!' },
      VIEWER: { email: 'viewer@trustvault.local', pass: 'Viewer@Trust2026!' },
    };

    const creds = demoCredentials[role];
    if (creds) {
      const res = await login(creds.email, creds.pass);
      if (!res.success) {
        console.error('Failed to switch demo account:', res.error);
      }
    }
    setLoading(false);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        switchDemoUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
