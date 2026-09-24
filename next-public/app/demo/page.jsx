'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';

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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kwickbot.in/api';
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

  return (
    <div className="retro-page-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="bg-video-wrapper">
        <video className="bg-video" autoPlay muted loop playsInline>
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
            type="video/mp4"
          />
        </video>
        <div className="bg-overlay-gradient"></div>
      </div>

      <main style={{ position: 'relative', zIndex: 1, padding: '40px 20px 80px' }}>
        <section className="dark-section-card" style={{ maxWidth: '680px' }}>
          <div className="dark-heading-center" style={{ marginBottom: '24px' }}>
            <span>SCHEDULE DEMO</span>
            <h1 className="retro-dot-headline" style={{ fontSize: 'clamp(28px, 4vw, 44px)', margin: '12px auto' }}>
              Book a Live Demo
            </h1>
            <p className="retro-subhead" style={{ margin: '0 auto', fontSize: '15px' }}>
              See how Kwickbot can automate 80%+ of your WhatsApp customer support operations.
            </p>
          </div>

          {success ? (
            <div style={{ textAlignment: 'center', padding: '30px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', color: '#4ade80', marginBottom: '16px' }}><FaCheckCircle /></div>
              <h2 style={{ color: '#ffffff', fontSize: '24px', marginBottom: '10px' }}>Request Submitted Successfully!</h2>
              <p style={{ color: '#a1a1aa', fontSize: '15px', marginBottom: '24px' }}>Our engineering team will contact you within 24 hours to schedule your demo.</p>
              <button onClick={() => setSuccess(false)} className="glowing-btn-white">
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#f87171', padding: '12px 16px', borderRadius: '10px', fontSize: '14px' }}>
                  {error}
                </div>
              )}

              <div>
                <label style={{ display: 'block', color: '#ffffff', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  style={{ width: '100%', height: '44px', background: '#18181b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0 14px', color: '#ffffff', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#ffffff', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@company.com"
                    required
                    style={{ width: '100%', height: '44px', background: '#18181b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0 14px', color: '#ffffff', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#ffffff', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    required
                    style={{ width: '100%', height: '44px', background: '#18181b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0 14px', color: '#ffffff', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#ffffff', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Business Name *</label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="Your Store Name"
                  required
                  style={{ width: '100%', height: '44px', background: '#18181b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0 14px', color: '#ffffff', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#ffffff', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Website URL *</label>
                <input
                  type="text"
                  name="websiteUrl"
                  value={formData.websiteUrl}
                  onChange={handleChange}
                  placeholder="https://yourwebsite.com"
                  required
                  style={{ width: '100%', height: '44px', background: '#18181b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0 14px', color: '#ffffff', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#ffffff', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Business Details &amp; Expectations *</label>
                <textarea
                  name="businessDetails"
                  value={formData.businessDetails}
                  onChange={handleChange}
                  placeholder="Describe your current support challenges and monthly conversation volume..."
                  rows="4"
                  required
                  style={{ width: '100%', background: '#18181b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px 14px', color: '#ffffff', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <button type="submit" disabled={loading} className="glowing-btn-white" style={{ marginTop: '10px', width: '100%' }}>
                {loading ? 'Submitting...' : 'Submit Demo Request'}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
