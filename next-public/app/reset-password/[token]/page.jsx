'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FaArrowLeft, FaCheckCircle, FaEye, FaEyeSlash } from 'react-icons/fa';

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
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a1a1aa', fontSize: '13.5px', textDecoration: 'none', marginBottom: '24px' }}>
            <FaArrowLeft /> Back to login
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <img src="/app-icon.png" alt="Kwickbot" style={{ width: '40px', height: '40px', borderRadius: '10px' }} />
            <div>
              <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>New Password</h2>
              <p style={{ color: '#a1a1aa', fontSize: '13.5px', margin: 0 }}>Create a strong password for your account</p>
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

          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <FaCheckCircle style={{ color: '#4ade80', fontSize: '48px', marginBottom: '16px' }} />
              <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Password Reset Successful!</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '24px' }}>
                Your password has been updated. Redirecting you to login...
              </p>
              <Link href="/login" className="glowing-btn-white" style={{ display: 'inline-block', width: '100%', height: '44px', lineHeight: '44px', textAlign: 'center', fontSize: '14px' }}>
                Go to Login Now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', color: '#d4d4d8', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>New Password</label>
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

              <div>
                <label style={{ display: 'block', color: '#d4d4d8', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
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
                {loading ? 'Updating password...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
