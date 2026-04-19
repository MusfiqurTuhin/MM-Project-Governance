import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../api';

interface AuthUser {
  username: string;
  role: 'super_admin' | 'admin';
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('mm_auth');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (user) {
      api.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [user]);

  const login = async (username: string, password: string) => {
    const form = new URLSearchParams();
    form.append('username', username);
    form.append('password', password);

    const res = await api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const authUser: AuthUser = {
      username: res.data.username,
      role: res.data.role,
      token: res.data.access_token,
    };
    localStorage.setItem('mm_auth', JSON.stringify(authUser));
    api.defaults.headers.common['Authorization'] = `Bearer ${authUser.token}`;
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem('mm_auth');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isSuperAdmin: user?.role === 'super_admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
