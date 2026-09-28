import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaLock, FaCrown, FaArrowLeft, FaShieldAlt } from 'react-icons/fa';
import { useEffectiveAccess } from '../../context/EffectiveAccessContext';
import './AccessRestricted.css';

function AccessRestricted({ 
  title = "Feature Restricted", 
  description = "This feature is not included in your current subscription plan. Upgrade your plan to unlock full access to this feature.",
  requiredFeature = "Integration / API Platform",
  returnPath = "/dashboard"
}) {
  const navigate = useNavigate();
  const { subscription } = useEffectiveAccess();

  const currentPlanName = subscription?.planName || 'Current Plan';

  return (
    <div className="access-restricted-container">
      <div className="access-restricted-card">
        <div className="access-icon-badge">
          <FaLock className="lock-icon" />
        </div>

        <div className="access-shield-tag">
          <FaShieldAlt /> Plan Entitlement Required
        </div>

        <h2 className="access-restricted-title">{title}</h2>
        <p className="access-restricted-desc">{description}</p>

        <div className="access-plan-status-box">
          <div className="plan-status-item">
            <span className="plan-status-label">Your Current Plan:</span>
            <span className="plan-status-val current">{currentPlanName}</span>
          </div>
          <div className="plan-status-divider"></div>
          <div className="plan-status-item">
            <span className="plan-status-label">Required Feature:</span>
            <span className="plan-status-val required">{requiredFeature}</span>
          </div>
        </div>

        <div className="access-actions-group">
          <Link to="/dashboard/billing" className="btn-upgrade-access">
            <FaCrown /> Upgrade Plan
          </Link>
          <button onClick={() => navigate(returnPath)} className="btn-back-access">
            <FaArrowLeft /> Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccessRestricted;
