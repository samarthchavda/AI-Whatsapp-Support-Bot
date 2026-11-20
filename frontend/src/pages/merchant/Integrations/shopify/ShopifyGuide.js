import React from 'react';
import { FaShopify } from 'react-icons/fa';
import { SHOPIFY_GUIDE_STEPS } from './guideSteps';

function ShopifyGuide({ currentGuideStep, setCurrentGuideStep, onClose }) {
  return (
        <div role="dialog" aria-modal="true" aria-label="Shopify setup guide" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(9, 9, 11, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="shopify-guide-panel" style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '1100px',
            height: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg, 0 25px 50px -12px rgba(0, 0, 0, 0.5))',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-input)'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaShopify style={{ color: '#96bf48' }} /> Shopify App Integration Guide
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Step {currentGuideStep + 1} of {SHOPIFY_GUIDE_STEPS.length}: {SHOPIFY_GUIDE_STEPS[currentGuideStep].title}
                </p>
              </div>
              <button
                onClick={() => onClose()}
                aria-label="Close Shopify setup guide"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                &times;
              </button>
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: 'var(--border)'
            }}>
              <div style={{
                height: '100%',
                width: `${((currentGuideStep + 1) / SHOPIFY_GUIDE_STEPS.length) * 100}%`,
                backgroundColor: '#96bf48',
                transition: 'width 0.3s ease-out'
              }} />
            </div>

            {/* Body */}
            <div className="shopify-guide-body" style={{
              flex: 1,
              display: 'grid',
              overflow: 'hidden'
            }}>
              {/* Left Pane: Screenshot */}
              <div style={{
                backgroundColor: 'var(--bg-input)',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                borderRight: '1px solid var(--border)',
                position: 'relative'
              }}>
                <img
                  src={SHOPIFY_GUIDE_STEPS[currentGuideStep].image}
                  alt={SHOPIFY_GUIDE_STEPS[currentGuideStep].title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-md)',
                    backgroundColor: 'var(--bg-card)'
                  }}
                />
              </div>

              {/* Right Pane: Content / Description */}
              <div style={{
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-card)'
              }}>
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    marginBottom: '16px'
                  }}>
                    STEP {currentGuideStep + 1}
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', lineHeight: '1.3' }}>
                    {SHOPIFY_GUIDE_STEPS[currentGuideStep].title}
                  </h3>

                  <div style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-line'
                  }}>
                    {SHOPIFY_GUIDE_STEPS[currentGuideStep].description}
                  </div>
                </div>

                {/* Quick Helper Tips */}
                <div style={{
                  marginTop: '24px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: '8px',
                  borderLeft: '4px solid #96bf48',
                  fontSize: '13px',
                  color: 'var(--text-secondary)'
                }}>
                  <strong>💡 Pro-Tip:</strong> Use Left & Right Arrow keys on your keyboard to navigate between steps.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-input)'
            }}>
              <button
                type="button"
                onClick={() => setCurrentGuideStep((prev) => Math.max(prev - 1, 0))}
                disabled={currentGuideStep === 0}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'var(--bg-hover)',
                  color: currentGuideStep === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: currentGuideStep === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Previous Step
              </button>

              {/* Dots */}
              <div style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                {SHOPIFY_GUIDE_STEPS.map((step, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setCurrentGuideStep(idx)}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: currentGuideStep === idx ? '#96bf48' : 'var(--border)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={`Step ${idx + 1}`}
                    aria-label={`Go to step ${idx + 1}: ${step.title}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (currentGuideStep === SHOPIFY_GUIDE_STEPS.length - 1) {
                    onClose();
                  } else {
                    setCurrentGuideStep((prev) => Math.min(prev + 1, SHOPIFY_GUIDE_STEPS.length - 1));
                  }
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#96bf48',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {currentGuideStep === SHOPIFY_GUIDE_STEPS.length - 1 ? 'Finish Setup' : 'Next Step'}
              </button>
            </div>
          </div>
        </div>
  );
}

export default ShopifyGuide;
