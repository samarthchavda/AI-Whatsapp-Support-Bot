'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaEye, FaEyeSlash } from 'react-icons/fa';

const initialValues = { name: '', businessName: '', businessPhone: '', email: '', password: '', confirmPassword: '', termsAccepted: false };

function validate(values) {
  const errors = {};
  if (!values.name.trim() || values.name.trim().length > 100) errors.name = 'Enter your name (up to 100 characters).';
  if (!values.businessName.trim() || values.businessName.trim().length > 120) errors.businessName = 'Enter your business name (up to 120 characters).';
  const digits = values.businessPhone.replace(/\D/g, '');
  if (!/^[+\d\s().-]+$/.test(values.businessPhone) || digits.length < 10 || digits.length > 15) errors.businessPhone = 'Enter a phone number with 10 to 15 digits.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (values.password.length < 12 || !/[A-Za-z]/.test(values.password) || !/\d/.test(values.password) || new TextEncoder().encode(values.password).length > 72) errors.password = 'Use at least 12 characters with a letter and number (maximum 72 bytes).';
  if (values.confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match.';
  if (!values.termsAccepted) errors.termsAccepted = 'Accept the terms and privacy policy to continue.';
  return errors;
}

export default function SignupPage() {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const update = (event) => {
    const { name, type, checked, value } = event.target;
    const next = { ...values, [name]: type === 'checkbox' ? checked : value };
    setValues(next);
    setServerError('');
    if (touched[name]) setErrors(validate(next));
  };

  const blur = (event) => {
    setTouched((current) => ({ ...current, [event.target.name]: true }));
    setErrors(validate(values));
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setTouched(Object.fromEntries(Object.keys(initialValues).map((key) => [key, true])));
    if (Object.keys(nextErrors).length) return;
    setSubmitting(true);
    setServerError('');
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: values.name.trim(), businessName: values.businessName.trim(),
          businessPhone: values.businessPhone.trim(), email: values.email.trim(),
          password: values.password, termsAccepted: values.termsAccepted
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setServerError(result.error || result.message || 'Could not create your account. Please try again.');
        return;
      }
      const token = result.data.accessToken || result.data.token;
      localStorage.setItem('accessToken', token);
      localStorage.setItem('token', token);
      localStorage.setItem('admin', JSON.stringify(result.data.admin));
      window.location.assign('/dashboard/profile');
    } catch {
      setServerError('Cannot connect to the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name, label, type, placeholder, autoComplete, maxLength) => (
    <div className="field" key={name}>
      <label htmlFor={`signup-${name}`}>{label}</label>
      <input id={`signup-${name}`} name={name} type={type} value={values[name]} onChange={update} onBlur={blur}
        placeholder={placeholder} autoComplete={autoComplete} maxLength={maxLength}
        aria-invalid={Boolean(touched[name] && errors[name])} aria-describedby={touched[name] && errors[name] ? `signup-${name}-error` : undefined} required />
      {touched[name] && errors[name] && <span id={`signup-${name}-error`} className="field-error">{errors[name]}</span>}
    </div>
  );

  return (
    <div className="page">
      <main className="container signup-shell">
        <section className="signup-intro">
          <span className="eyebrow">Get started</span>
          <h1>Create your Kwickbot account</h1>
          <p>Set up your business workspace, connect WhatsApp and start helping customers from one dashboard.</p>
          <ol className="signup-steps">
            <li><strong>Create your account</strong><span>Enter your business and sign-in details.</span></li>
            <li><strong>Complete your profile</strong><span>Add your store and support details.</span></li>
            <li><strong>Connect your channels</strong><span>Link your WhatsApp number and store when ready.</span></li>
          </ol>
          <p className="signup-help">Need help choosing a plan? <Link href="/contact">Contact us <FaArrowRight aria-hidden="true" /></Link></p>
        </section>
        <section className="form-card signup-card" aria-labelledby="signup-title">
          <div><h2 id="signup-title">Your details</h2><p className="form-sub">A Starter trial is assigned when your account is created. No payment is needed to sign up.</p></div>
          {serverError && <div className="alert alert-error" role="alert">{serverError}</div>}
          <form className="signup-form" onSubmit={submit} noValidate>
            <div className="field-row">
              {field('name', 'Full name', 'text', 'Your name', 'name', 100)}
              {field('businessName', 'Business name', 'text', 'Your store or company', 'organization', 120)}
            </div>
            <div className="field-row">
              {field('businessPhone', 'Business phone', 'tel', '+91 98765 43210', 'tel', 24)}
              {field('email', 'Work email', 'email', 'you@company.com', 'email', 254)}
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="signup-password">Password</label>
                <div className="input-wrap">
                  <input id="signup-password" name="password" type={showPassword ? 'text' : 'password'} value={values.password}
                    onChange={update} onBlur={blur} autoComplete="new-password" placeholder="At least 12 characters" maxLength={72}
                    aria-invalid={Boolean(touched.password && errors.password)} aria-describedby={touched.password && errors.password ? 'signup-password-error' : 'signup-password-help'} required />
                  <button type="button" className="input-btn" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                  </button>
                </div>
                {touched.password && errors.password ? <span id="signup-password-error" className="field-error">{errors.password}</span> : <span id="signup-password-help" className="field-help">Use 12+ characters with a letter and a number.</span>}
              </div>
              {field('confirmPassword', 'Confirm password', 'password', 'Enter password again', 'new-password', 72)}
            </div>
            <label className="signup-consent">
              <input type="checkbox" name="termsAccepted" checked={values.termsAccepted} onChange={update} onBlur={blur} aria-invalid={Boolean(touched.termsAccepted && errors.termsAccepted)} />
              <span>I agree to the <Link href="/terms" target="_blank">Terms of Service</Link> and <Link href="/privacy" target="_blank">Privacy Policy</Link>.</span>
            </label>
            {touched.termsAccepted && errors.termsAccepted && <span className="field-error">{errors.termsAccepted}</span>}
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</button>
            <p className="form-foot">Already have an account? <Link href="/login">Sign in</Link></p>
          </form>
        </section>
      </main>
    </div>
  );
}
