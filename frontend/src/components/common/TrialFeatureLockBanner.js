import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaLock } from 'react-icons/fa';

/**
 * Shared callout shown when a merchant views a feature locked by Free Trial or plan entitlements.
 */
export default function TrialFeatureLockBanner({
  title,
  description,
  ctaLabel = 'Activate Plan in Billing',
  ctaTo = '/dashboard/billing'
}) {
  return (
    <div
      role="status"
      style={{
        background: 'rgba(217, 119, 6, 0.1)',
        border: '1px solid rgba(217, 119, 6, 0.35)',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '240px' }}>
        <span
          aria-hidden="true"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(217, 119, 6, 0.18)',
            color: '#d97706',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px'
          }}
        >
          <FaLock />
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary, #101828)', marginBottom: '4px' }}>
            {title}
          </div>
          <div style={{ fontSize: '13.5px', color: 'var(--text-secondary, #475467)', lineHeight: 1.5 }}>
            {description}
          </div>
        </div>
      </div>

      <Link
        to={ctaTo}
        className="btn btn-primary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
      >
        {ctaLabel} <FaArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
}
