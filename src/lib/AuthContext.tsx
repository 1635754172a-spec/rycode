import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setToken, clearToken, AppUser } from './api';

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('rycode_user');
    const token = localStorage.getItem('rycode_token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      // Verify token is still valid
      authApi.me()
        .then(({ user }) => {
          setUser(user);
          localStorage.setItem('rycode_user', JSON.stringify(user));
        })
        .catch(() => {
          clearToken();
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password);
    setToken(token);
    localStorage.setItem('rycode_user', JSON.stringify(user));
    setUser(user);
  }, []);

  const register = useCallback(async (email: string, password: string, username: string) => {
    const { token, user } = await authApi.register(email, password, username);
    setToken(token);
    localStorage.setItem('rycode_user', JSON.stringify(user));
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
