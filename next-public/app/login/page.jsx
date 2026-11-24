'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FaEye, FaEyeSlash, FaExclamationCircle } from 'react-icons/fa';
import BrandMark from '../components/BrandMark';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdminPortal, setIsAdminPortal] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname.startsWith('admin.')) {
      setIsAdminPortal(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_BASE = '/api';
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const token = data.data.accessToken || data.data.token;
        localStorage.setItem('accessToken', token);
        localStorage.setItem('token', token);
        localStorage.setItem('admin', JSON.stringify(data.data.admin));

        // Redirect to merchant or super-admin dashboard
        if (data.data.admin?.role === 'super_admin') {
          window.location.href = '/dashboard/super-admin';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(data.message || data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Cannot connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <main className="auth-wrap">
        <div className="form-card">
          <div className="auth-head">
            <BrandMark className="brand-mark" />
            <h1 style={{ fontSize: 26, fontWeight: 800 }}>{isAdminPortal ? 'Super admin portal' : 'Welcome back'}</h1>
            <p className="form-sub" style={{ marginTop: 0 }}>
              {isAdminPortal ? 'Sign in to Kwickbot Master Control' : 'Sign in to your Kwickbot dashboard'}
            </p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <FaExclamationCircle aria-hidden="true" style={{ flex: 'none', marginTop: 3 }} /> <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@store.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="field">
              <div className="form-row-between">
                <label htmlFor="login-password">Password</label>
                <Link href="/forgot-password" style={{ fontWeight: 600 }}>Forgot password?</Link>
              </div>
              <div className="input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary btn-block">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {!isAdminPortal && (
            <p className="form-foot">
              New to Kwickbot? <Link href="/signup" style={{ fontWeight: 700 }}>Create an account</Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
