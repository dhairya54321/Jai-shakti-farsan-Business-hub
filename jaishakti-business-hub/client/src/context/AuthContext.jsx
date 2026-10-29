import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_ROLE_PERMISSIONS } from '../permissions';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('js_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('js_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('js_user', JSON.stringify(data.user));
        } else {
          logout();
        }
      } catch (err) {
        // In offline mode, keep existing cached user if token valid
        console.warn('Auth check notice (offline mode active):', err.message);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [token]);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Login failed');
    }
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('js_token', data.token);
    localStorage.setItem('js_user', JSON.stringify(data.user));
    return data.user;
  };

  const workerLogin = async ({ worker_id, phone, pin }) => {
    const res = await fetch('/api/auth/worker-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id, phone, pin })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Worker login failed');
    }
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('js_token', data.token);
    localStorage.setItem('js_user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('js_token');
    localStorage.removeItem('js_user');
  };

  const hasPermission = (permKey) => {
    if (!user) return false;
    if (user.role === 'owner') return true;
    if (user.permissions && user.permissions[permKey] !== undefined) {
      return Boolean(user.permissions[permKey]);
    }
    return Boolean(DEFAULT_ROLE_PERMISSIONS[user.role]?.[permKey]);
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      loading,
      isAuthenticated: !!token && !!user,
      role: user?.role || 'guest',
      hasPermission,
      login,
      workerLogin,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
