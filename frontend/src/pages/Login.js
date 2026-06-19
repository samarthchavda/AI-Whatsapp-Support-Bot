import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCommentDots, FaCheckCircle } from 'react-icons/fa';
import api from '../services/api';
import './Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });

      if (response.data.success) {
        const accessToken = response.data.data.accessToken || response.data.data.token;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);
        localStorage.setItem('admin', JSON.stringify(response.data.data.admin));
        onLogin(response.data.data.admin);
        navigate('/dashboard');
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to the server. Please check if the backend is running.');
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <button className="login-back-btn" onClick={() => navigate('/')}>
          <FaArrowLeft /> Back to Home
        </button>

        <div className="login-brand-content">
          <div className="login-brand-logo">
            <img src="/logo.png" className="logo-img" alt="Kwickbot Logo" style={{ width: '30px', height: '30px' }} />
            <span>Kwickbot</span>
          </div>
          <h2 className="login-brand-title">
            WhatsApp support, powered by AI
          </h2>
          <p className="login-brand-desc">
            Manage conversations, orders, and escalations from one professional dashboard.
            Built for e-commerce teams who need 24/7 customer support at scale.
          </p>
          <div className="login-brand-features">
            <div className="login-brand-feature">
              <FaCheckCircle /> Gemini AI with knowledge base integration
            </div>
            <div className="login-brand-feature">
              <FaCheckCircle /> Live chat with human handoff
            </div>
            <div className="login-brand-feature">
              <FaCheckCircle /> Shopify & WooCommerce sync
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-panel">
        <button className="login-back-btn login-mobile-back" onClick={() => navigate('/')}>
          <FaArrowLeft /> Back
        </button>

        <div className="login-card">
          <div className="login-card-header">
            <h1>Welcome back</h1>
            <p>Sign in to your support dashboard</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="login-field">
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

            <div className="login-field">
              <div className="login-field-header">
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className="login-forgot-link"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in to Dashboard'}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}

export default Login;
