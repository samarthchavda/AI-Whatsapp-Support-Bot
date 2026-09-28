import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const EffectiveAccessContext = createContext(null);

export function EffectiveAccessProvider({ children, admin }) {
  const [accessData, setAccessData] = useState({
    effectivePages: [],
    effectivePermissions: [],
    usageLimits: {},
    currentUsage: {},
    subscription: null,
    features: {},
    user: null,
    loading: true,
    error: null
  });

  const fetchEffectiveAccess = useCallback(async () => {
    try {
      const response = await api.get('/auth/effective-access');
      if (response.data && response.data.success) {
        setAccessData({
          effectivePages: response.data.effectivePages || [],
          effectivePermissions: response.data.effectivePermissions || [],
          usageLimits: response.data.usageLimits || {},
          currentUsage: response.data.currentUsage || {},
          subscription: response.data.subscription || null,
          features: response.data.features || {},
          user: response.data.user || null,
          loading: false,
          error: null
        });
      } else {
        setAccessData(prev => ({ ...prev, loading: false, error: 'Invalid response format' }));
      }
    } catch (err) {
      console.warn('Could not fetch effective access from server:', err?.message || err);
      // Fallback to local admin payload if available
      if (admin) {
        setAccessData(prev => ({
          ...prev,
          effectivePages: admin.allowedPages || [],
          effectivePermissions: admin.allowedPermissions || [],
          subscription: {
            planSlug: admin.subscriptionPlan || 'starter',
            planName: admin.subscriptionPlan || 'Starter',
            status: admin.subscriptionStatus || 'trial'
          },
          loading: false,
          error: err?.message || 'Failed to fetch'
        }));
      } else {
        setAccessData(prev => ({ ...prev, loading: false, error: err?.message }));
      }
    }
  }, [admin]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (token) {
      fetchEffectiveAccess();
    } else {
      setAccessData(prev => ({ ...prev, loading: false }));
    }
  }, [fetchEffectiveAccess]);

  const canViewPage = useCallback((pageKey) => {
    if (!pageKey) return true;
    if (admin && admin.role === 'super_admin') return true;
    if (accessData.user && accessData.user.role === 'super_admin') return true;

    // Check both hyphen and underscore format
    const normalizedKey = pageKey.toLowerCase();
    const underscoreKey = normalizedKey.replace(/-/g, '_');
    const hyphenKey = normalizedKey.replace(/_/g, '-');

    const pages = accessData.effectivePages || [];
    if (pages.includes(normalizedKey) || pages.includes(underscoreKey) || pages.includes(hyphenKey)) {
      return true;
    }

    // Fallback check on admin.allowedPages if effectivePages is still empty
    if (pages.length === 0 && admin && Array.isArray(admin.allowedPages) && admin.allowedPages.length > 0) {
      return admin.allowedPages.includes(normalizedKey) || 
             admin.allowedPages.includes(underscoreKey) || 
             admin.allowedPages.includes(hyphenKey);
    }

    return false;
  }, [admin, accessData]);

  const hasPermission = useCallback((permKey) => {
    if (!permKey) return true;
    if (admin && admin.role === 'super_admin') return true;
    if (accessData.user && accessData.user.role === 'super_admin') return true;

    const perms = accessData.effectivePermissions || [];
    return perms.includes(permKey);
  }, [admin, accessData]);

  const hasFeature = useCallback((featureKey) => {
    if (!featureKey) return true;
    if (admin && admin.role === 'super_admin') return true;
    if (accessData.user && accessData.user.role === 'super_admin') return true;

    return Boolean(accessData.features && accessData.features[featureKey]);
  }, [admin, accessData]);

  const getUsageLimit = useCallback((limitKey) => {
    if (!accessData.usageLimits) return 0;
    return accessData.usageLimits[limitKey] ?? 0;
  }, [accessData]);

  const value = {
    ...accessData,
    canViewPage,
    hasPermission,
    hasFeature,
    getUsageLimit,
    refreshAccess: fetchEffectiveAccess
  };

  return (
    <EffectiveAccessContext.Provider value={value}>
      {children}
    </EffectiveAccessContext.Provider>
  );
}

export function useEffectiveAccess() {
  const context = useContext(EffectiveAccessContext);
  if (!context) {
    throw new Error('useEffectiveAccess must be used within an EffectiveAccessProvider');
  }
  return context;
}

export default EffectiveAccessContext;
