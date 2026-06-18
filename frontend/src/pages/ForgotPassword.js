import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCommentDots, FaCheckCircle, FaEnvelope } from 'react-icons/fa';
import api from '../services/api';
import './ForgotPassword.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      if (response.data.success) {
        setMessage(response.data.message || 'If an account exists with that email, a password reset link has been sent.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-brand-panel">
        <button className="forgot-back-btn" onClick={() => navigate('/login')}>
          <FaArrowLeft /> Back to Login
        </button>

        <div className="forgot-brand-content">
          <div className="forgot-brand-logo">
            <img src="/logo.png" className="logo-img" alt="Kwickbot Logo" style={{ width: '30px', height: '30px' }} />
            <span>Kwickbot</span>
          </div>
          <h2 className="forgot-brand-title">
            Recover Your Support Dashboard
          </h2>
          <p className="forgot-brand-desc">
            No worries! Just enter your registered email address and we will send you a secure link to reset your password.
          </p>
          <div className="forgot-brand-features">
            <div className="forgot-brand-feature">
              <FaCheckCircle /> Secure token-based reset link
            </div>
            <div className="forgot-brand-feature">
              <FaCheckCircle /> One-hour link expiration protection
            </div>
            <div className="forgot-brand-feature">
              <FaCheckCircle /> Automatic active session revocation
            </div>
          </div>
        </div>
      </div>

      <div className="forgot-form-panel">
        <button className="forgot-back-btn forgot-mobile-back" onClick={() => navigate('/login')}>
          <FaArrowLeft /> Back
        </button>

        <div className="forgot-card">
          <div className="forgot-card-header">
            <h1>Forgot password?</h1>
            <p>Enter your email address to recover your account</p>
          </div>

          {error && <div className="forgot-error">{error}</div>}
          {message && (
            <div className="forgot-success">
              <FaEnvelope className="envelope-icon" />
              <p>{message}</p>
            </div>
          )}

          {!message && (
            <form onSubmit={handleSubmit}>
              <div className="forgot-field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </div>

              <button type="submit" className="forgot-submit" disabled={loading}>
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="forgot-card-footer">
            <button className="forgot-return-btn" onClick={() => navigate('/login')}>
              Return to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
