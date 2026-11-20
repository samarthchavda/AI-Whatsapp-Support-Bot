'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FaCheck, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import axios from 'axios';
import { safeJsonStringify } from '../../utils/jsonSanitizer';

export default function BookDemo() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    businessDetails: '',
    websiteUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
      const response = await axios.post(`${API_URL}/demo-requests`, formData);
      
      if (response.data.success) {
        setSuccess(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          businessName: '',
          businessDetails: '',
          websiteUrl: ''
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit demo request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://kwickbot.in'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Book Live Demo',
        item: 'https://kwickbot.in/demo'
      }
    ]
  };

  const fields = [
    { name: 'name', label: 'Full name', type: 'text', placeholder: 'John Doe', autoComplete: 'name' },
    { name: 'email', label: 'Work email', type: 'email', placeholder: 'john@company.com', autoComplete: 'email', half: true },
    { name: 'phone', label: 'Phone number', type: 'tel', placeholder: '+91 98765 43210', autoComplete: 'tel', half: true },
    { name: 'businessName', label: 'Business name', type: 'text', placeholder: 'Your store name', autoComplete: 'organization', half: true },
    { name: 'websiteUrl', label: 'Website URL', type: 'text', placeholder: 'https://yourwebsite.com', autoComplete: 'url', half: true }
  ];

  const renderField = (f) => (
    <div className="field" key={f.name}>
      <label htmlFor={`demo-${f.name}`}>{f.label} <span aria-hidden="true">*</span></label>
      <input
        id={`demo-${f.name}`}
        type={f.type}
        name={f.name}
        value={formData[f.name]}
        onChange={handleChange}
        placeholder={f.placeholder}
        autoComplete={f.autoComplete}
        required
      />
    </div>
  );

  return (
    <div className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonStringify(breadcrumbSchema) }} />

      <main className="container">
        <div className="form-shell">
          <div className="form-intro" data-reveal="left">
            <span className="eyebrow">Book a live demo</span>
            <h1>See Kwickbot answer <span className="highlight swipe">your customers.</span></h1>
            <p>We will walk through your real support questions, order flows and campaigns on WhatsApp, and show how much of the routine work Kwickbot can take off your team.</p>
            <ul className="checklist">
              <li><span className="check"><FaCheck aria-hidden="true" /></span>A 30-minute walkthrough tailored to your store</li>
              <li><span className="check"><FaCheck aria-hidden="true" /></span>Shopify, WooCommerce or your own CRM / API</li>
              <li><span className="check"><FaCheck aria-hidden="true" /></span>Setup plan for WhatsApp Cloud API and templates</li>
            </ul>
          </div>

          <div className="form-card" data-reveal="right">
            {success ? (
              <div className="success-panel" role="status">
                <span className="icon-chip"><FaCheckCircle aria-hidden="true" /></span>
                <h2>Request received</h2>
                <p style={{ color: 'var(--muted)' }}>Our team will contact you within 24 hours to schedule your demo.</p>
                <button type="button" onClick={() => setSuccess(false)} className="btn btn-secondary">Submit another request</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate={false}>
                <div>
                  <h2>Tell us about your store</h2>
                  <p className="form-sub" style={{ marginTop: 6 }}>All fields are required.</p>
                </div>
                {error && (
                  <div className="alert alert-error" role="alert">
                    <FaExclamationCircle aria-hidden="true" style={{ flex: 'none', marginTop: 3 }} /> <span>{error}</span>
                  </div>
                )}
                {renderField(fields[0])}
                <div className="field-row">{fields.slice(1, 3).map(renderField)}</div>
                <div className="field-row">{fields.slice(3, 5).map(renderField)}</div>
                <div className="field">
                  <label htmlFor="demo-businessDetails">Business details &amp; expectations <span aria-hidden="true">*</span></label>
                  <textarea
                    id="demo-businessDetails"
                    name="businessDetails"
                    value={formData.businessDetails}
                    onChange={handleChange}
                    placeholder="Describe your current support challenges and monthly conversation volume…"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-block">
                  {loading ? 'Submitting…' : 'Request my demo'}
                </button>
                <p className="form-foot" style={{ fontSize: 13 }}>
                  By submitting, you agree to our <Link href="/privacy">privacy policy</Link>.
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
