'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaCheckCircle, FaEye, FaEyeSlash } from 'react-icons/fa';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="retro-page-container">
      <div className="bg-video-wrapper">
        <video className="bg-video" autoPlay muted loop playsInline>
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
            type="video/mp4"
          />
        </video>
        <div className="bg-overlay-gradient"></div>
      </div>

      <main style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(18, 18, 21, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '24px',
          padding: '36px 32px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
        }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a1a1aa', fontSize: '13.5px', textDecoration: 'none', marginBottom: '24px' }}>
            <FaArrowLeft /> Back to home
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <img src="/app-icon.png" alt="Kwickbot" style={{ width: '40px', height: '40px', borderRadius: '10px' }} />
            <div>
              <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>Welcome back</h2>
              <p style={{ color: '#a1a1aa', fontSize: '13.5px', margin: 0 }}>Sign in to your Kwickbot dashboard</p>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '13.5px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', color: '#d4d4d8', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@store.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: '#27272a',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#d4d4d8', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    paddingRight: '44px',
                    borderRadius: '12px',
                    background: '#27272a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#a1a1aa',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="glowing-btn-white"
              style={{
                width: '100%',
                marginTop: '10px',
                height: '46px',
                fontSize: '15px'
              }}
            >
              {loading ? 'Signing in...' : 'Sign in to Dashboard'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <Link href="/forgot-password" style={{ color: '#38bdf8', fontSize: '13.5px', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#a1a1aa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaCheckCircle style={{ color: '#4ade80' }} /> 24/7 AI WhatsApp Support &amp; Analytics
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaCheckCircle style={{ color: '#4ade80' }} /> Live Handoff &amp; Order Cancellations
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
