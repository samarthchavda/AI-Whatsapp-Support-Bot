'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FaArrowLeft, FaCheckCircle, FaEye, FaEyeSlash, FaExclamationCircle } from 'react-icons/fa';
import BrandMark from '../../components/BrandMark';

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.message || data.error || 'Reset link is invalid or has expired.');
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
          <Link href="/login" className="back-link"><FaArrowLeft aria-hidden="true" /> Back to sign in</Link>

          {success ? (
            <div className="success-panel" role="status">
              <span className="icon-chip"><FaCheckCircle aria-hidden="true" /></span>
              <h1 style={{ fontSize: 24, fontWeight: 800 }}>Password updated</h1>
              <p style={{ color: 'var(--muted)' }}>Your password has been reset. Taking you to sign in…</p>
              <Link href="/login" className="btn btn-primary btn-block">Sign in now</Link>
            </div>
          ) : (
            <>
              <div className="auth-head">
                <BrandMark className="brand-mark" />
                <h1 style={{ fontSize: 26, fontWeight: 800 }}>Choose a new password</h1>
                <p className="form-sub" style={{ marginTop: 0 }}>Use at least 6 characters. A longer passphrase is safer.</p>
              </div>
              {error && (
                <div className="alert alert-error" role="alert">
                  <FaExclamationCircle aria-hidden="true" style={{ flex: 'none', marginTop: 3 }} /> <span>{error}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field">
                  <label htmlFor="reset-password">New password</label>
                  <div className="input-wrap">
                    <input
                      id="reset-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      className="input-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="reset-confirm">Confirm new password</label>
                  <input
                    id="reset-confirm"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-block">
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
