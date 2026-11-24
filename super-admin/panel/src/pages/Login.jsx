import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CircleAlert, Eye, EyeOff } from 'lucide-react';
import BrandMark from '../components/BrandMark';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import { HOME_PATH, useAuth } from '../lib/auth';
import { errorMessage } from '../lib/api';

// Same endpoint as the public site's login page; super admins only
export default function Login() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (status === 'authed') return <Navigate to={HOME_PATH} replace />;

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(HOME_PATH, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Login failed. Check your email and password.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="card auth-card">
        <div className="auth-brand"><BrandMark /></div>
        <h1 className="auth-title">Log in to Kwickbot admin</h1>
        <p className="page-sub">For the Kwickbot team. Merchants log in at kwickbot.in</p>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          {error && (
            <div className="alert alert-error" role="alert">
              <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            addon={(
              <button
                type="button"
                className="field-addon"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
              </button>
            )}
          />
          <Button type="submit" variant="primary" size="lg" block disabled={busy || !email || !password}>
            {busy ? 'Logging in' : 'Log in'}
          </Button>
        </form>

        <p className="auth-foot">
          Forgot your password? <a href="/forgot-password">Reset it</a>
        </p>
      </div>
    </div>
  );
}
