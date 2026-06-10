import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { FaPlug, FaWhatsapp, FaServer, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaArrowRight, FaKey, FaBuilding, FaUserCheck } from 'react-icons/fa';

function WhatsAppConnect() {
  const [activeTab, setActiveTab] = useState('webbot');
  
  // Web Bot States
  const [qrCode, setQrCode] = useState(null);
  const [webStatus, setWebStatus] = useState('connecting');
  const [webStatusMessage, setWebStatusMessage] = useState('Connecting to server...');
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  // Cloud API States
  const [cloudStatus, setCloudStatus] = useState(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState(null);

  // Fetch Cloud API Status
  const fetchCloudStatus = useCallback(async () => {
    try {
      setCloudLoading(true);
      setCloudError(null);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/webhook/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to retrieve Cloud API status');
      }
      const data = await response.json();
      setCloudStatus(data);
    } catch (err) {
      setCloudError(err.message);
    } finally {
      setCloudLoading(false);
    }
  }, []);

  // Web Bot Socket Handshake
  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    const newSocket = io(API_URL);

    newSocket.on('connect', () => {
      setIsServerConnected(true);
      setWebStatus('waiting');
      setWebStatusMessage('Waiting for WhatsApp QR code...');
    });

    newSocket.on('disconnect', () => {
      setIsServerConnected(false);
      setWebStatus('disconnected');
      setWebStatusMessage('Disconnected from server');
    });

    newSocket.on('whatsapp-qr', (data) => {
      setQrCode(data.qr);
      setWebStatus('qr_ready');
      setWebStatusMessage('Scan this QR code with WhatsApp');
    });

    newSocket.on('whatsapp-status', (data) => {
      setWebStatus(data.status);
      setWebStatusMessage(data.message || getStatusMessage(data.status));
      
      if (data.status === 'ready' || data.isReady) {
        setQrCode(null);
        setWebStatus('ready');
        setWebStatusMessage('WhatsApp connected successfully!');
      }
    });

    setSocket(newSocket);

    // Initial load for Cloud API
    fetchCloudStatus();

    return () => {
      newSocket.close();
    };
  }, [fetchCloudStatus]);

  const getStatusMessage = (status) => {
    const messages = {
      connecting: 'Connecting to server...',
      waiting: 'Waiting for WhatsApp initialization...',
      waiting_qr: 'Generating QR code...',
      qr_ready: 'Scan this QR code with WhatsApp',
      restoring: 'Restoring previous session...',
      authenticated: 'Authentication successful!',
      ready: 'WhatsApp connected and ready!',
      disconnected: 'Disconnected from WhatsApp',
      error: 'Connection error occurred'
    };
    return messages[status] || 'Unknown status';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready':
      case 'active':
        return <FaCheckCircle style={{ color: '#10b981', fontSize: '48px' }} />;
      case 'qr_ready':
        return <FaWhatsapp style={{ color: '#14b8a6', fontSize: '48px' }} />;
      case 'waiting':
      case 'waiting_qr':
      case 'restoring':
      case 'connecting':
        return <div className="spinner" style={{ width: '48px', height: '48px', margin: '0 auto' }}></div>;
      case 'disconnected':
      case 'error':
        return <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '48px' }} />;
      default:
        return <FaPlug style={{ color: '#6b7280', fontSize: '48px' }} />;
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'ready':
      case 'active':
        return { bg: '#d1fae5', text: '#065f46' };
      case 'qr_ready':
        return { bg: '#ccfbf1', text: '#0f766e' };
      case 'waiting':
      case 'waiting_qr':
      case 'restoring':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'disconnected':
      case 'error':
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  return (
    <div className="container" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaWhatsapp style={{ color: '#25d366' }} /> WhatsApp Connection
        </h1>
        <p className="page-subtitle">Choose your preferred WhatsApp integration service to automate client interactions.</p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e4e4e7',
        marginBottom: '24px',
        gap: '16px'
      }}>
        <button
          onClick={() => setActiveTab('webbot')}
          style={{
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: '600',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'webbot' ? '3px solid #25d366' : '3px solid transparent',
            color: activeTab === 'webbot' ? '#25d366' : '#71717a',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          📱 WhatsApp Web Bot (Demo/QR Code)
        </button>
        <button
          onClick={() => {
            setActiveTab('cloudapi');
            fetchCloudStatus();
          }}
          style={{
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: '600',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'cloudapi' ? '3px solid #25d366' : '3px solid transparent',
            color: activeTab === 'cloudapi' ? '#25d366' : '#71717a',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          ⚙️ Official WhatsApp Cloud API (Production)
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'webbot' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* Status Column */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            textAlign: 'center',
            border: '1px solid #f4f4f5'
          }}>
            <div style={{ marginBottom: '16px' }}>
              {getStatusIcon(webStatus)}
            </div>
            
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#18181b' }}>
              {webStatusMessage}
            </h3>

            <div style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: getStatusBadgeColor(webStatus).bg,
              color: getStatusBadgeColor(webStatus).text,
              marginBottom: '20px'
            }}>
              Status: {webStatus.toUpperCase().replace('_', ' ')}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderTop: '1px solid #e4e4e7',
              paddingTop: '16px',
              fontSize: '14px',
              color: '#71717a'
            }}>
              <FaServer style={{ color: isServerConnected ? '#10b981' : '#ef4444' }} />
              <span>{isServerConnected ? 'Backend Server Online' : 'Backend Server Offline'}</span>
            </div>
          </div>

          {/* QR Code / Action Column */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid #f4f4f5'
          }}>
            {qrCode && webStatus === 'qr_ready' ? (
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#18181b' }}>Pair with Your Mobile Account</h3>
                <div style={{
                  display: 'inline-block',
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e4e4e7',
                  marginBottom: '16px'
                }}>
                  <QRCodeSVG value={qrCode} size={200} level="H" includeMargin={true} />
                </div>
                <div style={{ textAlign: 'left', padding: '16px', backgroundColor: '#f4f4f5', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: '#18181b' }}>Pairing Instructions:</h4>
                  <ol style={{ paddingLeft: '18px', fontSize: '13px', color: '#52525b', lineHeight: '1.6', margin: 0 }}>
                    <li>Open WhatsApp on your mobile phone.</li>
                    <li>Tap <strong>Settings</strong> or <strong>Menu (⋮)</strong>.</li>
                    <li>Select <strong>Linked Devices</strong>.</li>
                    <li>Tap <strong>Link a Device</strong> and point your camera to this QR code.</li>
                  </ol>
                </div>
              </div>
            ) : webStatus === 'ready' ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <FaCheckCircle style={{ color: '#10b981', fontSize: '64px', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#065f46', marginBottom: '8px' }}>Active Session Connected</h3>
                <p style={{ fontSize: '14px', color: '#047857', margin: 0 }}>
                  The demo WhatsApp Web client is active. All incoming customer queries will automatically trigger AI responses.
                </p>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#71717a' }}>
                <FaInfoCircle style={{ fontSize: '32px', color: '#a1a1aa', marginBottom: '12px' }} />
                <p style={{ fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                  The Web Bot is initializing. If no session is saved, a QR code will display here shortly. Ensure chromium dependencies are active.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'cloudapi' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* Configuration Status */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid #f4f4f5'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: '#18181b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaServer style={{ color: '#6366f1' }} /> Cloud API Configuration State
            </h3>

            {cloudLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 12px' }}></div>
                <p style={{ fontSize: '14px', color: '#71717a', margin: 0 }}>Fetching Meta profile status...</p>
              </div>
            ) : cloudError ? (
              <div style={{
                padding: '16px',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                borderRadius: '12px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FaExclamationTriangle />
                <span>{cloudError}</span>
              </div>
            ) : cloudStatus ? (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: cloudStatus.isConfigured ? '#e6f4ea' : '#fef3c7',
                  borderRadius: '12px',
                  marginBottom: '20px'
                }}>
                  {cloudStatus.isConfigured ? (
                    <FaCheckCircle style={{ color: '#10b981', fontSize: '24px' }} />
                  ) : (
                    <FaExclamationTriangle style={{ color: '#fbbf24', fontSize: '24px' }} />
                  )}
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#18181b', margin: '0 0 2px 0' }}>
                      {cloudStatus.isConfigured ? 'Meta API Configured' : 'Credentials Missing'}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>
                      {cloudStatus.isConfigured ? 'Your server is connected to the official Meta Business App.' : 'Complete the step-by-step setup in .env.'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4f4f5', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '8px' }}><FaKey style={{ fontSize: '12px' }} /> API Configuration:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: cloudStatus.isConfigured ? '#10b981' : '#f59e0b' }}>
                      {cloudStatus.isConfigured ? 'Active / Configured' : 'Pending'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4f4f5', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '8px' }}><FaBuilding style={{ fontSize: '12px' }} /> Display Name:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#18181b' }}>{cloudStatus.displayName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4f4f5', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '8px' }}><FaWhatsapp style={{ fontSize: '12px' }} /> Phone Details:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#18181b' }}>{cloudStatus.phoneNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '8px' }}><FaUserCheck style={{ fontSize: '12px' }} /> Verified Name:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#18181b' }}>{cloudStatus.verified}</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              border: '1px solid #e4e4e7'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#18181b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaInfoCircle style={{ color: '#3b82f6' }} /> Webhook Callback URL
              </h4>
              <p style={{ fontSize: '12px', color: '#52525b', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                Enter this endpoint URL in your Meta App Webhook settings to redirect client messages to the AI support assistant:
              </p>
              <code style={{
                display: 'block',
                padding: '8px 12px',
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                color: '#2563eb'
              }}>
                {process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/webhook/whatsapp
              </code>
            </div>
          </div>

          {/* Setup Onboarding instructions */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid #f4f4f5'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#18181b' }}>Meta Developer Portal Setup</h3>
            <p style={{ fontSize: '14px', color: '#52525b', marginBottom: '20px', lineHeight: '1.5' }}>
              Follow these simple instructions to link your official WhatsApp Business number to the AI agent:
            </p>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                <div style={{
                  backgroundColor: '#e0e7ff',
                  color: '#4f46e5',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  flexShrink: 0
                }}>1</div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#18181b', margin: '0 0 4px 0' }}>Create Meta Developer Account</h4>
                  <p style={{ fontSize: '13px', color: '#52525b', margin: 0, lineHeight: '1.4' }}>
                    Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" style={{ color: '#25d366', textDecoration: 'underline' }}>developers.facebook.com</a> and sign up for a developer account.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                <div style={{
                  backgroundColor: '#e0e7ff',
                  color: '#4f46e5',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  flexShrink: 0
                }}>2</div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#18181b', margin: '0 0 4px 0' }}>Create a WhatsApp App</h4>
                  <p style={{ fontSize: '13px', color: '#52525b', margin: 0, lineHeight: '1.4' }}>
                    Click <strong>Create App</strong>, choose <strong>Other</strong>, and select the <strong>Business</strong> type. Add the <strong>WhatsApp</strong> product to your app.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                <div style={{
                  backgroundColor: '#e0e7ff',
                  color: '#4f46e5',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  flexShrink: 0
                }}>3</div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#18181b', margin: '0 0 4px 0' }}>Copy credentials to .env</h4>
                  <p style={{ fontSize: '13px', color: '#52525b', margin: 0, lineHeight: '1.4' }}>
                    Copy the <strong>Temporary Access Token</strong>, <strong>Phone Number ID</strong>, and <strong>Business Account ID</strong> from the WhatsApp Getting Started page into your backend <code>.env</code> file.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                <div style={{
                  backgroundColor: '#e0e7ff',
                  color: '#4f46e5',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  flexShrink: 0
                }}>4</div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#18181b', margin: '0 0 4px 0' }}>Configure Webhook</h4>
                  <p style={{ fontSize: '13px', color: '#52525b', margin: 0, lineHeight: '1.4' }}>
                    Set up the Webhook configuration under WhatsApp setup in Meta. Paste the Callback URL shown on the left and enter your verify token (default: <code>secure_webhook_token_123</code>).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WhatsAppConnect;
