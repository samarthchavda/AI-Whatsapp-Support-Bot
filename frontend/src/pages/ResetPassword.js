import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaCommentDots, FaCheckCircle, FaLock } from 'react-icons/fa';
import api from '../services/api';
import './ResetPassword.css';

function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(`/auth/reset-password/${token}`, { password });
      if (response.data.success) {
        setMessage(response.data.message || 'Password reset successful! You can now log in.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Reset password failed. Token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      <div className="reset-brand-panel">
        <button className="reset-back-btn" onClick={() => navigate('/login')}>
          <FaArrowLeft /> Back to Login
        </button>

        <div className="reset-brand-content">
          <div className="reset-brand-logo">
            <img src="/logo.png" className="logo-img" alt="Kwickbot Logo" style={{ width: '30px', height: '30px' }} />
            <span>Kwickbot</span>
          </div>
          <h2 className="reset-brand-title">
            Reset Your Admin Credentials
          </h2>
          <p className="reset-brand-desc">
            Set a strong, new password to secure your Support Bot account. Choose a unique password to protect your store configurations.
          </p>
          <div className="reset-brand-features">
            <div className="forgot-brand-feature">
              <FaCheckCircle /> Minimum 6 characters required
            </div>
            <div className="forgot-brand-feature">
              <FaCheckCircle /> Automatic token expiration cleanup
            </div>
            <div className="forgot-brand-feature">
              <FaCheckCircle /> Direct, secure sign-in redirection
            </div>
          </div>
        </div>
      </div>

      <div className="reset-form-panel">
        <button className="reset-back-btn reset-mobile-back" onClick={() => navigate('/login')}>
          <FaArrowLeft /> Back
        </button>

        <div className="reset-card">
          <div className="reset-card-header">
            <h1>Reset password</h1>
            <p>Set a new password for your account</p>
          </div>

          {error && <div className="reset-error">{error}</div>}
          {message && (
            <div className="reset-success">
              <FaLock className="lock-icon" />
              <p>{message}</p>
            </div>
          )}

          {!message && (
            <form onSubmit={handleSubmit}>
              <div className="reset-field">
                <label htmlFor="password">New Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
              </div>

              <div className="reset-field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" className="reset-submit" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="reset-card-footer">
            <button className="reset-return-btn" onClick={() => navigate('/login')}>
              Return to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
