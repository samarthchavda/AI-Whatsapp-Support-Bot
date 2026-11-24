import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, getStoredAdmin, getStoredToken, isJwtExpired, loginRequest, logoutRequest, refreshSession } from './api';

const AuthContext = createContext(null);

// Starts a session the same way the current dashboard does: a valid stored
// token is used as is, otherwise one refresh attempt through the cookie.
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', admin: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getStoredToken();
      const admin = getStoredAdmin();
      // A merchant session on the same domain is left alone, just not used here
      if (admin && admin.role !== 'super_admin') {
        if (!cancelled) setState({ status: 'guest', admin: null });
        return;
      }
      if (token && admin && !isJwtExpired(token)) {
        if (!cancelled) setState({ status: 'authed', admin });
        return;
      }
      if (token || admin || window.location.pathname.startsWith('/dashboard')) {
        try {
          const session = await refreshSession();
          if (!cancelled && session.admin?.role === 'super_admin') {
            setState({ status: 'authed', admin: session.admin });
            return;
          }
        } catch {
          clearSession();
        }
      }
      if (!cancelled) setState({ status: 'guest', admin: null });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const admin = await loginRequest(email, password);
    setState({ status: 'authed', admin });
    return admin;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => {});
    setState({ status: 'guest', admin: null });
  }, []);

  const value = useMemo(() => ({
    ...state,
    login,
    logout
  }), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const HOME_PATH = '/dashboard/super-admin';
