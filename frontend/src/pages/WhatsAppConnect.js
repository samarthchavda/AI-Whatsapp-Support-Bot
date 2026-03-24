import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';

function WhatsAppConnect() {
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [statusMessage, setStatusMessage] = useState('Connecting to server...');
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to Socket.IO
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    const newSocket = io(API_URL);

    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      setIsConnected(true);
      setStatus('waiting');
      setStatusMessage('Waiting for WhatsApp QR code...');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
      setStatus('disconnected');
      setStatusMessage('Disconnected from server');
    });

    // Listen for QR code
    newSocket.on('whatsapp-qr', (data) => {
      console.log('📱 QR code received');
      setQrCode(data.qr);
      setStatus('qr_ready');
      setStatusMessage('Scan this QR code with WhatsApp');
    });

    // Listen for status updates
    newSocket.on('whatsapp-status', (data) => {
      console.log('📊 Status update:', data);
      setStatus(data.status);
      setStatusMessage(data.message || getStatusMessage(data.status));
      
      if (data.status === 'ready' || data.isReady) {
        setQrCode(null);
        setStatus('ready');
        setStatusMessage('WhatsApp connected successfully!');
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

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

  const getStatusIcon = () => {
    switch (status) {
      case 'ready':
        return '✅';
      case 'qr_ready':
        return '📱';
      case 'authenticated':
        return '🔐';
      case 'waiting':
      case 'waiting_qr':
      case 'restoring':
        return '⏳';
      case 'disconnected':
      case 'error':
        return '❌';
      default:
        return '🔄';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'ready':
        return '#28a745';
      case 'qr_ready':
      case 'authenticated':
        return '#17a2b8';
      case 'waiting':
      case 'waiting_qr':
      case 'restoring':
        return '#ffc107';
      case 'disconnected':
      case 'error':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  return (
    <div className="container">
      <h1>WhatsApp Connection</h1>

      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        {/* Status Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '30px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '20px'
          }}>
            {getStatusIcon()}
          </div>
          
          <h2 style={{
            color: getStatusColor(),
            marginBottom: '10px'
          }}>
            {statusMessage}
          </h2>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '15px'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#28a745' : '#dc3545'
            }}></div>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {isConnected ? 'Server Connected' : 'Server Disconnected'}
            </span>
          </div>
        </div>

        {/* QR Code Display */}
        {qrCode && status === 'qr_ready' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '30px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            marginBottom: '30px'
          }}>
            <h3 style={{ marginBottom: '20px' }}>Scan QR Code</h3>
            
            <div style={{
              display: 'inline-block',
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '10px',
              border: '2px solid #e0e0e0'
            }}>
              <QRCodeSVG 
                value={qrCode} 
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>

            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              textAlign: 'left'
            }}>
              <h4 style={{ marginBottom: '10px', fontSize: '16px' }}>How to scan:</h4>
              <ol style={{ marginLeft: '20px', fontSize: '14px', lineHeight: '1.8' }}>
                <li>Open WhatsApp on your phone</li>
                <li>Tap Menu (⋮) or Settings</li>
                <li>Tap "Linked Devices"</li>
                <li>Tap "Link a Device"</li>
                <li>Point your phone at this screen to scan the QR code</li>
              </ol>
            </div>
          </div>
        )}

        {/* Success Message */}
        {status === 'ready' && (
          <div style={{
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#155724', marginBottom: '10px' }}>
              🎉 Connected Successfully!
            </h3>
            <p style={{ color: '#155724', margin: 0 }}>
              Your WhatsApp bot is now active and ready to receive messages.
            </p>
          </div>
        )}

        {/* Instructions */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'left'
        }}>
          <h3 style={{ marginBottom: '15px' }}>Connection Status</h3>
          
          <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#666' }}>
            <p><strong>Current Status:</strong> {status}</p>
            <p><strong>Server:</strong> {isConnected ? '🟢 Online' : '🔴 Offline'}</p>
            <p><strong>WhatsApp:</strong> {status === 'ready' ? '🟢 Connected' : '⚪ Not Connected'}</p>
          </div>

          {status !== 'ready' && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#fff3cd',
              borderRadius: '5px',
              fontSize: '13px'
            }}>
              <strong>Note:</strong> Make sure the backend server is running with <code>npm run dev</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WhatsAppConnect;
