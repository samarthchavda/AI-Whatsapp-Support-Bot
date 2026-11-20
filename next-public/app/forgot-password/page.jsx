'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaPaperPlane, FaExclamationCircle } from 'react-icons/fa';
import BrandMark from '../components/BrandMark';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.message || data.error || 'Failed to send reset link. Please try again.');
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
              <span className="icon-chip"><FaPaperPlane aria-hidden="true" /></span>
              <h1 style={{ fontSize: 24, fontWeight: 800 }}>Check your email</h1>
              <p style={{ color: 'var(--muted)' }}>
                If an account exists for <strong style={{ color: 'var(--ink)' }}>{email}</strong>, we have sent a password reset link. Follow the instructions in that email.
              </p>
              <Link href="/login" className="btn btn-primary btn-block">Return to sign in</Link>
            </div>
          ) : (
            <>
              <div className="auth-head">
                <BrandMark className="brand-mark" />
                <h1 style={{ fontSize: 26, fontWeight: 800 }}>Reset your password</h1>
                <p className="form-sub" style={{ marginTop: 0 }}>Enter your registered email and we will send you a reset link.</p>
              </div>
              {error && (
                <div className="alert alert-error" role="alert">
                  <FaExclamationCircle aria-hidden="true" style={{ flex: 'none', marginTop: 3 }} /> <span>{error}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field">
                  <label htmlFor="forgot-email">Email address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@store.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-block">
                  {loading ? 'Sending link…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
