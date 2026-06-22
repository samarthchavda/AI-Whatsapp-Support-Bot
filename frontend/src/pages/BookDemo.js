import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCommentDots, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';
import './BookDemo.css';

function BookDemo() {
  const navigate = useNavigate();
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
      const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api');
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

  if (success) {
    return (
      <div className="book-demo-page">
        <button className="back-button" onClick={() => navigate('/')}>
          <FaArrowLeft /> Back to Home
        </button>

        <div className="success-container">
          <div className="success-icon">
            <FaCheckCircle />
          </div>
          <h1>Request Submitted Successfully!</h1>
          <p>Thank you for your interest in Kwickbot.</p>
          <p>Our team will contact you within 24 hours to schedule your personalized demo.</p>
          <div className="success-actions">
            <button className="btn-primary" onClick={() => navigate('/')}>
              Back to Home
            </button>
            <button className="btn-secondary" onClick={() => setSuccess(false)}>
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="book-demo-page">
      <button className="back-button" onClick={() => navigate('/')}>
        <FaArrowLeft /> Back to Home
      </button>

      <div className="book-demo-container">
        <div className="demo-header">
          <div className="demo-logo">
            <img src="/logo.png" className="logo-img-large" alt="Kwickbot Logo" />
          </div>
          <h1>Book a Demo</h1>
          <p>See how Kwickbot can transform your customer service</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="demo-form">
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@company.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="businessName">Business Name *</label>
            <input
              type="text"
              id="businessName"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              placeholder="Your Company Name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="websiteUrl">Website URL *</label>
            <input
              type="text"
              id="websiteUrl"
              name="websiteUrl"
              value={formData.websiteUrl}
              onChange={handleChange}
              placeholder="https://yourwebsite.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="businessDetails">Tell us about your business and how you plan to use our bot *</label>
            <textarea
              id="businessDetails"
              name="businessDetails"
              value={formData.businessDetails}
              onChange={handleChange}
              placeholder="Describe your business, current customer support challenges, expected message volume, and how you envision using Kwickbot..."
              rows="6"
              required
            />
            <div className="char-count">
              {formData.businessDetails.length} characters
            </div>
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Demo Request'}
          </button>

          <p className="form-note">
            * Required fields. We'll contact you within 24 hours to schedule your personalized demo.
          </p>
        </form>
      </div>
    </div>
  );
}

export default BookDemo;
