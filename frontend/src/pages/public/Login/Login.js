import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCommentDots, FaCheckCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import api from '../../../services/api';
import SEO from '../../../components/SEO';
import './Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <SEO 
        title="Merchant Login — Kwickbot"
        description="Sign in to your Kwickbot merchant dashboard to manage WhatsApp AI conversations, view order analytics, and configure knowledge base settings."
        keywords="Kwickbot login, merchant dashboard, WhatsApp bot admin, e-commerce support login"
        ogTitle="Merchant Login — Kwickbot"
      />
      <div className="login-brand-panel">
        <button className="login-back-btn" onClick={() => navigate('/')}>
          <FaArrowLeft /> Back to Home
        </button>

        <div className="login-brand-content">
          <div className="login-brand-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <img src="/logo.png" className="header-logo-img" alt="Kwickbot Logo" />
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
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper" style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary, #64748b)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    fontSize: '16px',
                    borderRadius: '4px',
                    transition: 'color 0.2s ease'
                  }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="login-forgot-wrapper">
                <button
                  type="button"
                  className="login-forgot-link"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot password?
                </button>
              </div>
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
