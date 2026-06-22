import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { FaPlug, FaWhatsapp, FaServer, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaArrowRight, FaKey, FaBuilding, FaUserCheck, FaCode, FaLaptop, FaCopy, FaChevronDown, FaChevronUp, FaExternalLinkAlt } from 'react-icons/fa';

const BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || (window.location.hostname === 'localhost' ? 'http://localhost:5001' : window.location.origin);

const GUIDE_STEPS = [
  {
    step: 1,
    title: 'Find Callback URL & Verification Token',
    description: 'First, look at the "Webhook Configuration Details" card on the left side of this page.\n\nYou will need to copy these two values later in Meta Developer Console:\n1. Callback URL\n2. Verification Token\n\nLeave this tab open or click "Copy" to save them to your clipboard when requested.',
    image: '/guide/step-1.png'
  },
  {
    step: 2,
    title: 'Go to Meta Developers Console',
    description: 'Open a new browser tab and go to developers.facebook.com.\n\nClick on "My Apps" in the top-right navigation menu to open your Meta App dashboard.',
    image: '/guide/step-2.png'
  },
  {
    step: 3,
    title: 'Create a New App',
    description: 'If you do not have any apps created, you will see a landing page. Click the green "Create App" button in the center or top-right corner.',
    image: '/guide/step-3.png'
  },
  {
    step: 4,
    title: 'Enter App Details',
    description: 'Provide basic information for your new application:\n\n1. Enter your "App name" (e.g. your_app_name or support_bot).\n2. Verify your "App contact email" address.\n3. Click "Next" to continue.',
    image: '/guide/step-4.png'
  },
  {
    step: 5,
    title: 'Select WhatsApp Use Case',
    description: 'Choose what features you want to add to your app.\n\nScroll down, select the "Connect with customers through WhatsApp" checkbox, and click "Next".',
    image: '/guide/step-5.png'
  },
  {
    step: 6,
    title: 'Select Business Portfolio',
    description: 'Choose which Business Manager / Business Portfolio you want to connect to this app.\n\nIf you have an existing portfolio, select it and click "Next". If you do not have one, click "Create a business portfolio" link.',
    image: '/guide/step-6.png'
  },
  {
    step: 7,
    title: 'Create a Business Portfolio (If Needed)',
    description: 'If you chose to create a new portfolio:\n\n1. Fill in your "Business portfolio name".\n2. Enter your Contact First and Last Name.\n3. Provide your Business Email address.\n4. Click "Create portfolio" to save it.',
    image: '/guide/step-7.png'
  },
  {
    step: 8,
    title: 'Confirm Publishing Requirements',
    description: 'Meta will show the publishing requirements. Currently, no extra requirements are identified for standard API access.\n\nClick "Next" to skip this step.',
    image: '/guide/step-8.png'
  },
  {
    step: 9,
    title: 'Review and Create App',
    description: 'Check the summary of your choices (App Name, Use Case, Business Portfolio).\n\nClick "Create app". You may be asked to re-enter your Facebook login password for security verification.',
    image: '/guide/step-9.png'
  },
  {
    step: 10,
    title: 'Open App Settings',
    description: 'You will be redirected back to the My Apps dashboard. Your new application will now be visible.\n\nClick on your new app card (e.g. ai_support_bot) to open its management workspace.',
    image: '/guide/step-10.png'
  },
  {
    step: 11,
    title: 'Start WhatsApp Customization',
    description: 'Under "App customization and requirements" on the app dashboard, click on the task: "Customize the Connect with customers through WhatsApp use case".',
    image: '/guide/step-11.png'
  },
  {
    step: 12,
    title: 'Start Using the API',
    description: 'In the WhatsApp onboarding dashboard, scroll to the "API Setup" box and click the blue "Start using the API" button.',
    image: '/guide/step-12.png'
  },
  {
    step: 13,
    title: 'Generate and Copy Credentials',
    description: 'Here you will get the credentials to link the bot:\n\n1. Access Token: Click the "Generate access token" button and copy the generated token.\n2. Phone Number ID: Copy the "Phone number ID" from Step 1.\n3. WhatsApp Business Account ID: Copy the "WhatsApp Business Account ID" from Step 1.\n\nReturn to our dashboard page and paste these three values in the connection form, then click "Save & Connect".',
    image: '/guide/step-13.png'
  },
  {
    step: 14,
    title: 'Set Callback URL & Verification Token',
    description: 'In the Meta Developer left-hand menu under WhatsApp, click on "Configuration".\n\n1. In the Webhook section, click "Edit".\n2. Copy the "Callback URL" from our dashboard and paste it in the Callback URL field.\n3. Copy the "Verification Token" from our dashboard and paste it in the Verify token field.\n4. Click "Verify and save".',
    image: '/guide/step-14.png'
  },
  {
    step: 15,
    title: 'Subscribe to Message Webhook Fields',
    description: 'Lastly, on the Configuration page under "Webhook fields":\n\n1. Find the "messages" field row.\n2. Click the toggle to set it to "Subscribed".\n\nYour AI WhatsApp bot is now fully integrated and will respond to client queries automatically!',
    image: '/guide/step-15.png'
  }
];

const WIDGET_GUIDE_STEPS = [
  {
    step: 1,
    title: 'Customize & Copy Widget Code',
    description: 'Go to the "Website Chat Widget" tab on this page. Customize the widget parameters: enter your WhatsApp Phone Number (with country code), choose Widget Style (Pill with text or Bubble icon only), and enter a Pre-filled Message.\n\nSelect a theme color, choose screen position, and toggle on the Pulse Attention animation.\n\nCheck the Live Preview on the right, then click the green "Copy Snippet" button to save it to your clipboard.',
    image: '/guide/widget/step-1.png'
  },
  {
    step: 2,
    title: 'Open Shopify Theme Code Editor',
    description: 'Log in to your Shopify Store Admin. In the left-hand sidebar, navigate to Online Store -> Themes.\n\nLocate your active theme, click the three dots (...) icon next to the "Customize" button, and select "Edit Code" from the dropdown menu.',
    image: '/guide/widget/step-2.png'
  },
  {
    step: 3,
    title: 'Open layout/theme.liquid File',
    description: 'In the theme editor sidebar directory tree on the left, locate and click to expand the folder named "layout".\n\nUnder it, click on the file named "theme.liquid" to open its template code in the main panel editor.',
    image: '/guide/widget/step-3.png'
  },
  {
    step: 4,
    title: 'Paste Snippet before </body> Tag',
    description: 'Scroll all the way down to the bottom of the theme.liquid file. Locate the closing </body> tag (around line 326).\n\nPaste your copied WhatsApp widget code snippet directly above the </body> tag. Click "Save" in the top-right header corner of the page. Open your store site to view the live widget!',
    image: '/guide/widget/step-4.png'
  },
  {
    step: 5,
    title: 'WordPress/WooCommerce WPCode Integration',
    description: 'For WordPress, navigate to Plugins -> Add New, search for "WPCode", and install/activate the plugin.\n\nThen click on Code Snippets -> Header & Footer in the WordPress sidebar. Paste the snippet inside the "Footer" textarea input and click "Save Changes" at the top.',
    image: '/guide/widget/step-5.png'
  }
];

function WhatsAppConnect() {
  const [activeTab, setActiveTab] = useState('cloudapi');
  
  // Onboarding Guide States
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [currentGuideStep, setCurrentGuideStep] = useState(0);
  const [isWidgetGuideOpen, setIsWidgetGuideOpen] = useState(false);
  const [currentWidgetGuideStep, setCurrentWidgetGuideStep] = useState(0);

  
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
  const [actionLoading, setActionLoading] = useState(false);

  // Form Credentials States
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [whatsappAccessToken, setWhatsappAccessToken] = useState('');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('');
  const [whatsappBusinessAccountId, setWhatsappBusinessAccountId] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Widget Customizer States
  const [widgetPhone, setWidgetPhone] = useState('');
  const [widgetText, setWidgetText] = useState('Chat with us');
  const [widgetMessage, setWidgetMessage] = useState('Hi! I have a question about my order.');
  const [widgetColor, setWidgetColor] = useState('#25d366');
  const [widgetPosition, setWidgetPosition] = useState('right');
  const [widgetStyle, setWidgetStyle] = useState('pill');
  const [widgetPulse, setWidgetPulse] = useState(true);
  const [activeGuideCollapse, setActiveGuideCollapse] = useState('shopify');

  // Copy feedback states
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedVerifyToken, setCopiedVerifyToken] = useState(false);
  const [copiedWidgetCode, setCopiedWidgetCode] = useState(false);

  // Sync widgetPhone when cloud status resolves
  useEffect(() => {
    if (cloudStatus?.phoneNumber && !widgetPhone) {
      const cleanPhone = cloudStatus.phoneNumber.replace(/\D/g, '');
      setWidgetPhone(cleanPhone);
    }
  }, [cloudStatus, widgetPhone]);

  const hexToRgb = (hex) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '37, 211, 102';
  };

  const generateSnippet = () => {
    const cleanPhone = widgetPhone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(widgetMessage);
    const alignment = widgetPosition === 'right' ? 'right: 24px;' : 'left: 24px;';
    
    const pulseStyle = widgetPulse ? `\n  <style>
    @keyframes wa-pulse {
      0% { box-shadow: 0 0 0 0 rgba(${hexToRgb(widgetColor)}, 0.4); }
      70% { box-shadow: 0 0 0 15px rgba(${hexToRgb(widgetColor)}, 0); }
      100% { box-shadow: 0 0 0 0 rgba(${hexToRgb(widgetColor)}, 0); }
    }
    .wa-widget-btn {
      animation: wa-pulse 2s infinite;
    }
  </style>` : '';

    if (widgetStyle === 'bubble') {
      return `<!-- Start of WhatsApp Chat Widget -->
<div id="wa-widget-container" style="position: fixed; bottom: 24px; ${alignment} z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${pulseStyle}
  <a class="wa-widget-btn" href="https://wa.me/${cleanPhone || 'YOUR_PHONE_NUMBER'}?text=${encodedMessage}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: flex; align-items: center; justify-content: center; background-color: ${widgetColor}; color: white; width: 60px; height: 60px; border-radius: 50%; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;" onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.3)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.2)';">
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.48 1.97 14.007 1.05 11.472 1.054c-5.44 0-9.866 4.372-9.87 9.802 0 1.954.512 3.86 1.482 5.56l-.98 3.58 3.687-.962zm13.013-7.87c-.302-.15-1.788-.882-2.056-.979-.268-.097-.463-.146-.658.146-.195.293-.755.95-.926 1.146-.171.195-.341.219-.643.069-.302-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.083-.176-.3-.019-.462.132-.611.135-.134.302-.352.453-.527.151-.176.201-.3.302-.5.101-.2.05-.376-.025-.526-.075-.15-.658-1.586-.902-2.171-.237-.57-.48-.492-.658-.501-.17-.008-.365-.01-.56-.01-.195 0-.512.073-.78.365-.268.293-1.024 1.001-1.024 2.44 0 1.439 1.047 2.827 1.193 3.023.146.195 2.059 3.146 4.99 4.417.697.302 1.242.483 1.666.617.701.223 1.34.192 1.844.117.561-.083 1.787-.732 2.039-1.439.252-.707.252-1.316.177-1.439-.075-.123-.268-.196-.57-.346z"/>
    </svg>
  </a>
</div>
<!-- End of WhatsApp Chat Widget -->`;
    } else {
      return `<!-- Start of WhatsApp Chat Widget -->
<div id="wa-widget-container" style="position: fixed; bottom: 24px; ${alignment} z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${pulseStyle}
  <a class="wa-widget-btn" href="https://wa.me/${cleanPhone || 'YOUR_PHONE_NUMBER'}?text=${encodedMessage}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: flex; align-items: center; justify-content: center; background-color: ${widgetColor}; color: white; padding: 12px 20px; border-radius: 30px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease; gap: 10px; font-weight: 600; font-size: 15px;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.3)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.2)';">
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.48 1.97 14.007 1.05 11.472 1.054c-5.44 0-9.866 4.372-9.87 9.802 0 1.954.512 3.86 1.482 5.56l-.98 3.58 3.687-.962zm13.013-7.87c-.302-.15-1.788-.882-2.056-.979-.268-.097-.463-.146-.658.146-.195.293-.755.95-.926 1.146-.171.195-.341.219-.643.069-.302-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.083-.176-.3-.019-.462.132-.611.135-.134.302-.352.453-.527.151-.176.201-.3.302-.5.101-.2.05-.376-.025-.526-.075-.15-.658-1.586-.902-2.171-.237-.57-.48-.492-.658-.501-.17-.008-.365-.01-.56-.01-.195 0-.512.073-.78.365-.268.293-1.024 1.001-1.024 2.44 0 1.439 1.047 2.827 1.193 3.023.146.195 2.059 3.146 4.99 4.417.697.302 1.242.483 1.666.617.701.223 1.34.192 1.844.117.561-.083 1.787-.732 2.039-1.439.252-.707.252-1.316.177-1.439-.075-.123-.268-.196-.57-.346z"/>
    </svg>
    <span>${widgetText}</span>
  </a>
</div>
<!-- End of WhatsApp Chat Widget -->`;
    }
  };

  // Fetch Cloud API Status
  const fetchCloudStatus = useCallback(async () => {
    try {
      setCloudLoading(true);
      setCloudError(null);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await fetch(`${BASE_URL}/api/webhook/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to retrieve Cloud API status');
      }
      const data = await response.json();
      setCloudStatus(data);
      
      // Auto show form if Meta API credentials are not configured
      if (data && !data.isConfigured) {
        setShowCredentialsForm(true);
      }
      
      // Populate states with current credentials if any
      if (data && data.credentials) {
        setWhatsappPhoneNumberId(data.credentials.whatsappPhoneNumberId || '');
        setWhatsappBusinessAccountId(data.credentials.whatsappBusinessAccountId || '');
        // Keep access token empty if it's masked, so they don't overwrite it unless they input a new one
        if (!data.credentials.whatsappAccessToken) {
          setWhatsappAccessToken('');
        }
      }
    } catch (err) {
      setCloudError(err.message);
    } finally {
      setCloudLoading(false);
    }
  }, []);

  const handleDisconnectCloud = async () => {
    if (!window.confirm('Are you sure you want to disconnect this WhatsApp connection? The AI Bot will stop responding to incoming queries. (Note: This will not log you out of your Admin Dashboard)')) return;
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await fetch(`${BASE_URL}/api/webhook/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        alert('WhatsApp connection disconnected successfully!');
        fetchCloudStatus();
      } else {
        alert('Failed to disconnect WhatsApp');
      }
    } catch (err) {
      console.error(err);
      alert('Error disconnecting WhatsApp');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConnectCloud = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await fetch(`${BASE_URL}/api/webhook/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        alert('WhatsApp connection logged in / activated successfully!');
        fetchCloudStatus();
      } else {
        alert('Failed to login / connect WhatsApp');
      }
    } catch (err) {
      console.error(err);
      alert('Error logging in / connecting WhatsApp');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    if (!whatsappAccessToken || !whatsappPhoneNumberId || !whatsappBusinessAccountId) {
      alert('Please fill out all credentials to connect.');
      return;
    }
    
    try {
      setSaveLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await fetch(`${BASE_URL}/api/webhook/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          whatsappAccessToken,
          whatsappPhoneNumberId,
          whatsappBusinessAccountId
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert('WhatsApp Business credentials saved successfully! Your assistant is now active.');
        setShowCredentialsForm(false);
        fetchCloudStatus();
      } else {
        alert(data.error || 'Failed to save credentials');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving WhatsApp credentials');
    } finally {
      setSaveLoading(false);
    }
  };

  // Keyboard navigation for guide modal
  useEffect(() => {
    if (!isGuideOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setCurrentGuideStep((prev) => Math.min(prev + 1, GUIDE_STEPS.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentGuideStep((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        setIsGuideOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGuideOpen]);

  // Keyboard navigation for widget guide modal
  useEffect(() => {
    if (!isWidgetGuideOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setCurrentWidgetGuideStep((prev) => Math.min(prev + 1, WIDGET_GUIDE_STEPS.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentWidgetGuideStep((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        setIsWidgetGuideOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWidgetGuideOpen]);


  // Web Bot Socket Handshake
  useEffect(() => {
    const newSocket = io(BASE_URL, { transports: ['websocket'] });

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
        {cloudStatus?.webBotEnabled && (
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
        )}
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
        <button
          onClick={() => setActiveTab('widget')}
          style={{
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: '600',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'widget' ? '3px solid #25d366' : '3px solid transparent',
            color: activeTab === 'widget' ? '#25d366' : '#71717a',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          🌐 Website Chat Widget
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
                {showCredentialsForm ? (
                  <form onSubmit={handleSaveCredentials} autoComplete="off" style={{ display: 'grid', gap: '16px' }}>
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: '#e0e7ff',
                      color: '#4f46e5',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '500',
                      lineHeight: '1.4'
                    }}>
                      💡 Connect your WhatsApp Business API by providing your credentials generated from the Meta Developer Console.
                    </div>
                    
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', textAlign: 'left' }}>Meta Access Token</label>
                      <input
                        type="password"
                        placeholder="EAAG..."
                        value={whatsappAccessToken}
                        onChange={(e) => setWhatsappAccessToken(e.target.value)}
                        required
                        autoComplete="new-password"
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gap: '6px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', textAlign: 'left' }}>Phone Number ID</label>
                      <input
                        type="text"
                        placeholder="e.g. 10654897258"
                        value={whatsappPhoneNumberId}
                        onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                        required
                        autoComplete="off"
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gap: '6px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', textAlign: 'left' }}>WhatsApp Business Account ID</label>
                      <input
                        type="text"
                        placeholder="e.g. 20958473925"
                        value={whatsappBusinessAccountId}
                        onChange={(e) => setWhatsappBusinessAccountId(e.target.value)}
                        required
                        autoComplete="off"
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                      <button
                        type="submit"
                        disabled={saveLoading}
                        style={{
                          flex: 1,
                          padding: '12px',
                          backgroundColor: '#25d366',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        {saveLoading ? 'Saving...' : 'Save & Connect'}
                      </button>
                      
                      {cloudStatus.isConfigured && (
                        <button
                          type="button"
                          onClick={() => setShowCredentialsForm(false)}
                          style={{
                            padding: '12px 20px',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      backgroundColor: (cloudStatus.isConfigured && cloudStatus.isConnected) ? '#e6f4ea' : '#fef3c7',
                      borderRadius: '12px',
                      marginBottom: '20px'
                    }}>
                      {(cloudStatus.isConfigured && cloudStatus.isConnected) ? (
                        <FaCheckCircle style={{ color: '#10b981', fontSize: '24px' }} />
                      ) : (
                        <FaExclamationTriangle style={{ color: '#f59e0b', fontSize: '24px' }} />
                      )}
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#18181b', margin: '0 0 2px 0', textAlign: 'left' }}>
                          {(cloudStatus.isConfigured && cloudStatus.isConnected) ? 'WhatsApp Connected & Active' : 'WhatsApp Disconnected'}
                        </h4>
                        <p style={{ fontSize: '12px', color: '#71717a', margin: 0, textAlign: 'left' }}>
                          {(cloudStatus.isConfigured && cloudStatus.isConnected) 
                            ? 'Your server is connected and responding to customer messages.' 
                            : cloudStatus.isConfigured 
                            ? 'Your integration is configured but currently disconnected. The AI agent will not respond to messages.'
                            : 'Complete the step-by-step setup in .env.'}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4f4f5', paddingBottom: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '8px' }}><FaKey style={{ fontSize: '12px' }} /> API Configuration:</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: cloudStatus.isConfigured ? '#10b981' : '#f59e0b' }}>
                          {cloudStatus.isConfigured ? 'Configured' : 'Pending'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4f4f5', paddingBottom: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '8px' }}><FaServer style={{ fontSize: '12px' }} /> Channel Status:</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: cloudStatus.isConnected ? '#10b981' : '#ef4444' }}>
                          {cloudStatus.isConnected ? 'Connected' : 'Disconnected'}
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

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => setShowCredentialsForm(true)}
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          backgroundColor: '#ffffff',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        ⚙️ Update Meta Credentials
                      </button>
                      
                      {cloudStatus.isConfigured && (
                        cloudStatus.isConnected ? (
                          <button
                            onClick={handleDisconnectCloud}
                            disabled={actionLoading}
                            style={{
                              flex: 1,
                              padding: '12px 16px',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fca5a5',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {actionLoading ? 'Disconnecting...' : 'Disconnect WhatsApp'}
                          </button>
                        ) : (
                          <button
                            onClick={handleConnectCloud}
                            disabled={actionLoading}
                            style={{
                              flex: 1,
                              padding: '12px 16px',
                              backgroundColor: '#e6f4ea',
                              color: '#137333',
                              border: '1px solid #a3cfbb',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {actionLoading ? 'Connecting...' : 'Connect / Login WhatsApp'}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div style={{
              marginTop: '24px',
              padding: '20px',
              backgroundColor: 'rgba(99, 102, 241, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(99, 102, 241, 0.15)'
            }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1f2937', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                <FaInfoCircle style={{ color: '#6366f1' }} /> Webhook Configuration Details
              </h4>
              
              <div style={{ display: 'grid', gap: '12px', textAlign: 'left' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Callback URL</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      readOnly
                      value={cloudStatus?.webhookUrl || `${BASE_URL}/api/webhook/whatsapp`}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: '#1f2937'
                      }}
                    />
                    <button
                      onClick={() => {
                        const url = cloudStatus?.webhookUrl || `${BASE_URL}/api/webhook/whatsapp`;
                        navigator.clipboard.writeText(url);
                        setCopiedWebhookUrl(true);
                        setTimeout(() => setCopiedWebhookUrl(false), 2000);
                      }}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: copiedWebhookUrl ? '#1b9a4b' : '#25d366',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      {copiedWebhookUrl ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Verification Token</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      readOnly
                      value={cloudStatus?.verifyToken || 'secure_webhook_token_123'}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: '#1f2937'
                      }}
                    />
                    <button
                      onClick={() => {
                        const token = cloudStatus?.verifyToken || 'secure_webhook_token_123';
                        navigator.clipboard.writeText(token);
                        setCopiedVerifyToken(true);
                        setTimeout(() => setCopiedVerifyToken(false), 2000);
                      }}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: copiedVerifyToken ? '#1b9a4b' : '#25d366',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      {copiedVerifyToken ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
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
            
            <button
              onClick={() => {
                setIsGuideOpen(true);
                setCurrentGuideStep(0);
              }}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '20px',
                boxShadow: '0 2px 10px rgba(99, 102, 241, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
            >
              📖 View Step-by-Step Screenshot Guide
            </button>

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
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#18181b', margin: '0 0 4px 0' }}>Enter Meta Credentials</h4>
                  <p style={{ fontSize: '13px', color: '#52525b', margin: 0, lineHeight: '1.4' }}>
                    Copy the <strong>Access Token</strong>, <strong>Phone Number ID</strong>, and <strong>Business Account ID</strong> from the WhatsApp Getting Started page and paste them into the credentials form on this page.
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
                    Set up the Webhook configuration under WhatsApp setup in Meta. Paste the **Callback URL** and **Verification Token** shown on the left, then subscribe to the <code>messages</code> webhook topic.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'widget' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: '32px',
          alignItems: 'start'
        }}>
          {/* Customizer Panel */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid #f4f4f5',
            display: 'grid',
            gap: '24px'
          }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#18181b', margin: '0 0 6px 0', textAlign: 'left' }}>
                🎨 Customize Your Chat Widget
              </h3>
              <p style={{ fontSize: '14px', color: '#71717a', margin: 0, textAlign: 'left' }}>
                Design a floating WhatsApp button to display on your e-commerce store website.
              </p>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'grid', gap: '18px', textAlign: 'left' }}>
              
              {/* Phone number */}
              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  WhatsApp Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="e.g. 15551234567 (with country code)"
                    value={widgetPhone}
                    onChange={(e) => setWidgetPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {cloudStatus?.phoneNumber && (
                    <button
                      type="button"
                      onClick={() => setWidgetPhone(cloudStatus.phoneNumber.replace(/\D/g, ''))}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: '#f3f4f6',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#4f46e5',
                        cursor: 'pointer'
                      }}
                    >
                      Use Connected
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                  Include country code without any plus (+), dashes (-) or spaces.
                </span>
              </div>

              {/* Style type */}
              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Widget Style
                </label>
                <select
                  value={widgetStyle}
                  onChange={(e) => setWidgetStyle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                >
                  <option value="pill">Pill Shape (Icon + Text)</option>
                  <option value="bubble">Bubble Shape (Icon Only)</option>
                </select>
              </div>

              {/* Button Text */}
              {widgetStyle === 'pill' && (
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Button Text
                  </label>
                  <input
                    type="text"
                    placeholder="Chat with us"
                    value={widgetText}
                    onChange={(e) => setWidgetText(e.target.value)}
                    maxLength={30}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {/* Pre-filled Message */}
              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Welcome Pre-filled Message
                </label>
                <textarea
                  rows={2}
                  placeholder="Hi! I have a question about my order."
                  value={widgetMessage}
                  onChange={(e) => setWidgetMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    resize: 'none'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                  This text automatically fills in the customer's chat screen when they click the widget.
                </span>
              </div>

              {/* Theme Color Picker */}
              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Theme Color
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={widgetColor}
                    onChange={(e) => setWidgetColor(e.target.value)}
                    style={{
                      border: 'none',
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      padding: 0,
                      backgroundColor: 'transparent'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['#25D366', '#6366f1', '#18181b', '#0ea5e9', '#ef4444'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setWidgetColor(color)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: color,
                          border: widgetColor.toLowerCase() === color.toLowerCase() ? '2px solid #6366f1' : '1px solid #e4e4e7',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Position selector */}
              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Widget Position
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="position"
                      value="right"
                      checked={widgetPosition === 'right'}
                      onChange={() => setWidgetPosition('right')}
                    />
                    Bottom-Right
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="position"
                      value="left"
                      checked={widgetPosition === 'left'}
                      onChange={() => setWidgetPosition('left')}
                    />
                    Bottom-Left
                  </label>
                </div>
              </div>

              {/* Pulse Animation Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="pulse-toggle"
                  checked={widgetPulse}
                  onChange={(e) => setWidgetPulse(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="pulse-toggle" style={{ fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>
                  Enable Pulse Attention Animation
                </label>
              </div>

            </div>
          </div>

          {/* Right Column: Code & Preview */}
          <div style={{ display: 'grid', gap: '24px' }}>
            
            {/* Live Preview Card */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              position: 'relative',
              height: '200px',
              overflow: 'hidden'
            }}>
              {/* Preview label */}
              <span style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#ffffff',
                padding: '4px 10px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <FaLaptop /> Live Preview (on your website)
              </span>

              {/* Demo mockup website lines */}
              <div style={{ display: 'grid', gap: '10px', marginTop: '28px', opacity: 0.25 }}>
                <div style={{ height: '18px', width: '40%', backgroundColor: '#64748b', borderRadius: '4px' }}></div>
                <div style={{ height: '12px', width: '85%', backgroundColor: '#64748b', borderRadius: '4px' }}></div>
                <div style={{ height: '12px', width: '70%', backgroundColor: '#64748b', borderRadius: '4px' }}></div>
                <div style={{ height: '12px', width: '90%', backgroundColor: '#64748b', borderRadius: '4px' }}></div>
              </div>

              {/* Render dynamic style tags inside the preview parent */}
              <style>{`
                @keyframes preview-wa-pulse {
                  0% { box-shadow: 0 0 0 0 rgba(${hexToRgb(widgetColor)}, 0.4); }
                  70% { box-shadow: 0 0 0 15px rgba(${hexToRgb(widgetColor)}, 0); }
                  100% { box-shadow: 0 0 0 0 rgba(${hexToRgb(widgetColor)}, 0); }
                }
                .preview-wa-widget-btn {
                  animation: ${widgetPulse ? 'preview-wa-pulse 2s infinite' : 'none'};
                }
              `}</style>

              {/* Floating Widget Mockup */}
              <div style={{
                position: 'absolute',
                bottom: '24px',
                right: widgetPosition === 'right' ? '24px' : 'auto',
                left: widgetPosition === 'left' ? '24px' : 'auto',
                transition: 'all 0.3s ease'
              }}>
                {widgetStyle === 'bubble' ? (
                  <div
                    className="preview-wa-widget-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: widgetColor,
                      color: 'white',
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <FaWhatsapp style={{ fontSize: '28px' }} />
                  </div>
                ) : (
                  <div
                    className="preview-wa-widget-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: widgetColor,
                      color: 'white',
                      padding: '10px 16px',
                      borderRadius: '24px',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                      gap: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <FaWhatsapp style={{ fontSize: '20px' }} />
                    <span>{widgetText}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Generated Code Snippet Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              border: '1px solid #f4f4f5',
              display: 'grid',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifycontent: 'space-between', alignitems: 'center' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#18181b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaCode style={{ color: '#6366f1' }} /> HTML / CSS Widget Code
                </h4>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateSnippet());
                    setCopiedWidgetCode(true);
                    setTimeout(() => setCopiedWidgetCode(false), 2000);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: copiedWidgetCode ? '#d1e7dd' : '#e6f4ea',
                    color: '#137333',
                    border: '1px solid #a3cfbb',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { if (!copiedWidgetCode) e.currentTarget.style.backgroundColor = '#d1e7dd'; }}
                  onMouseOut={(e) => { if (!copiedWidgetCode) e.currentTarget.style.backgroundColor = '#e6f4ea'; }}
                >
                  <FaCopy /> {copiedWidgetCode ? '✓ Copied!' : 'Copy Snippet'}
                </button>
              </div>

              <textarea
                readOnly
                value={generateSnippet()}
                rows={10}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#0f172a',
                  color: '#e2e8f0',
                  borderRadius: '10px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  lineHeight: '1.5',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '11px', color: '#6b7280', textAlign: 'left' }}>
                Copy the code above and paste it right before the <code>&lt;/body&gt;</code> tag of your website files.
              </span>
            </div>

            {/* Platform Integration Instructions */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              border: '1px solid #f4f4f5',
              display: 'grid',
              gap: '16px'
            }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#18181b', margin: '0 0 4px 0', textAlign: 'left' }}>
                🚀 Platform Integration Guide
              </h4>
              <div style={{ display: 'flex', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                <button
                  onClick={() => {
                    setIsWidgetGuideOpen(true);
                    setCurrentWidgetGuideStep(0);
                  }}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 12px',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
                >
                  📖 Open Interactive Guide
                </button>
                <a
                  href="/docs/whatsapp_widget_guide.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 12px',
                    backgroundColor: '#e0e7ff',
                    color: '#4f46e5',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    transition: 'background-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c7d2fe'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e0e7ff'}
                >
                  <FaExternalLinkAlt /> Setup Guide (PDF)
                </a>
              </div>

              {/* Accordion List */}
              <div style={{ display: 'grid', gap: '8px' }}>
                
                {/* Shopify Accordion */}
                <div style={{ border: '1px solid #e4e4e7', borderRadius: '10px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setActiveGuideCollapse(activeGuideCollapse === 'shopify' ? '' : 'shopify')}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: '#f8fafc',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: '700',
                      fontSize: '13px',
                      color: '#1f2937',
                      cursor: 'pointer'
                    }}
                  >
                    <span>🛍️ Shopify Setup Instructions</span>
                    {activeGuideCollapse === 'shopify' ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                  {activeGuideCollapse === 'shopify' && (
                    <div style={{ padding: '16px', fontSize: '13px', color: '#4b5563', borderTop: '1px solid #e4e4e7', textAlign: 'left', lineHeight: '1.6' }}>
                      <ol style={{ margin: 0, paddingLeft: '20px' }}>
                        <li>Log in to your <strong>Shopify Admin Panel</strong>.</li>
                        <li>Go to <strong>Online Store</strong> &rarr; <strong>Themes</strong>.</li>
                        <li>Click the <strong>three dots (...)</strong> next to your active theme and click <strong>Edit Code</strong>.</li>
                        <li>In the file tree, open the <strong>`layout/theme.liquid`</strong> file.</li>
                        <li>Scroll to the bottom, locate the closing <strong>`&lt;/body&gt;`</strong> tag.</li>
                        <li>Paste the copied script widget code directly above the <strong>`&lt;/body&gt;`</strong> tag.</li>
                        <li>Click <strong>Save</strong> at the top right of your page. Refresh your website to see the live button!</li>
                      </ol>
                    </div>
                  )}
                </div>

                {/* WooCommerce Accordion */}
                <div style={{ border: '1px solid #e4e4e7', borderRadius: '10px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setActiveGuideCollapse(activeGuideCollapse === 'woocommerce' ? '' : 'woocommerce')}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: '#f8fafc',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: '700',
                      fontSize: '13px',
                      color: '#1f2937',
                      cursor: 'pointer'
                    }}
                  >
                    <span>⚙️ WordPress / WooCommerce Setup Instructions</span>
                    {activeGuideCollapse === 'woocommerce' ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                  {activeGuideCollapse === 'woocommerce' && (
                    <div style={{ padding: '16px', fontSize: '13px', color: '#4b5563', borderTop: '1px solid #e4e4e7', textAlign: 'left', lineHeight: '1.6' }}>
                      <ol style={{ margin: 0, paddingLeft: '20px' }}>
                        <li>Log in to your <strong>WordPress Dashboard</strong>.</li>
                        <li>Go to <strong>Plugins</strong> &rarr; <strong>Add New</strong>.</li>
                        <li>Search for <strong>"WPCode"</strong> (or "Insert Headers and Footers") and install/activate it.</li>
                        <li>Go to <strong>Code Snippets</strong> &rarr; <strong>Header & Footer</strong> in the sidebar.</li>
                        <li>Locate the <strong>Footer</strong> input box and paste your widget code snippet inside it.</li>
                        <li>Click <strong>Save Changes</strong> at the top. The widget will appear on all your store pages!</li>
                      </ol>
                    </div>
                  )}
                </div>

                {/* Custom HTML Accordion */}
                <div style={{ border: '1px solid #e4e4e7', borderRadius: '10px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setActiveGuideCollapse(activeGuideCollapse === 'custom' ? '' : 'custom')}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: '#f8fafc',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: '700',
                      fontSize: '13px',
                      color: '#1f2937',
                      cursor: 'pointer'
                    }}
                  >
                    <span>🌐 Standard HTML Website Instructions</span>
                    {activeGuideCollapse === 'custom' ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                  {activeGuideCollapse === 'custom' && (
                    <div style={{ padding: '16px', fontSize: '13px', color: '#4b5563', borderTop: '1px solid #e4e4e7', textAlign: 'left', lineHeight: '1.6' }}>
                      <ol style={{ margin: 0, paddingLeft: '20px' }}>
                        <li>Open your project's main HTML files (e.g., <code>index.html</code>, <code>footer.html</code>).</li>
                        <li>Scroll down to the bottom of the file to find the closing <code>&lt;/body&gt;</code> tag.</li>
                        <li>Paste your widget code snippet directly before the <code>&lt;/body&gt;</code> tag.</li>
                        <li>Save and upload the updated files to your web server/hosting.</li>
                      </ol>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Interactive Onboarding Guide Modal */}
      {isGuideOpen && (
        <div style={{
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
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '1100px',
            height: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e4e4e7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaWhatsapp style={{ color: '#25d366' }} /> Meta Developer Console Onboarding Guide
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Step {currentGuideStep + 1} of {GUIDE_STEPS.length}: {GUIDE_STEPS[currentGuideStep].title}
                </p>
              </div>
              <button
                onClick={() => setIsGuideOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#94a3b8',
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
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#334155';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                &times;
              </button>
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#e2e8f0'
            }}>
              <div style={{
                height: '100%',
                width: `${((currentGuideStep + 1) / GUIDE_STEPS.length) * 100}%`,
                backgroundColor: '#6366f1',
                transition: 'width 0.3s ease-out'
              }} />
            </div>

            {/* Body */}
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
              overflow: 'hidden'
            }}>
              {/* Left Pane: Screenshot */}
              <div style={{
                backgroundColor: '#f1f5f9',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                borderRight: '1px solid #e2e8f0',
                position: 'relative'
              }}>
                <img
                  src={GUIDE_STEPS[currentGuideStep].image}
                  alt={GUIDE_STEPS[currentGuideStep].title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    backgroundColor: '#ffffff'
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
                backgroundColor: '#ffffff'
              }}>
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#e0e7ff',
                    color: '#4f46e5',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    marginBottom: '16px'
                  }}>
                    STEP {currentGuideStep + 1}
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', lineHeight: '1.3' }}>
                    {GUIDE_STEPS[currentGuideStep].title}
                  </h3>

                  <div style={{
                    fontSize: '14px',
                    color: '#334155',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-line'
                  }}>
                    {GUIDE_STEPS[currentGuideStep].description}
                  </div>
                </div>

                {/* Quick Helper Tips */}
                <div style={{
                  marginTop: '24px',
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  borderLeft: '4px solid #6366f1',
                  fontSize: '13px',
                  color: '#475569'
                }}>
                  <strong>💡 Pro-Tip:</strong> Use Left & Right Arrow keys on your keyboard to navigate between steps.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e4e4e7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <button
                onClick={() => setCurrentGuideStep((prev) => Math.max(prev - 1, 0))}
                disabled={currentGuideStep === 0}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#ffffff',
                  color: currentGuideStep === 0 ? '#cbd5e1' : '#334155',
                  border: '1px solid #e2e8f0',
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
                {GUIDE_STEPS.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentGuideStep(idx)}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: currentGuideStep === idx ? '#6366f1' : '#cbd5e1',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={`Step ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={() => {
                  if (currentGuideStep === GUIDE_STEPS.length - 1) {
                    setIsGuideOpen(false);
                  } else {
                    setCurrentGuideStep((prev) => Math.min(prev + 1, GUIDE_STEPS.length - 1));
                  }
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#25d366',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {currentGuideStep === GUIDE_STEPS.length - 1 ? 'Finish Setup' : 'Next Step'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Website Widget Onboarding Guide Modal */}
      {isWidgetGuideOpen && (
        <div style={{
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
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '1100px',
            height: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e4e4e7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaWhatsapp style={{ color: '#25d366' }} /> Website Chat Widget Integration Guide
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Step {currentWidgetGuideStep + 1} of {WIDGET_GUIDE_STEPS.length}: {WIDGET_GUIDE_STEPS[currentWidgetGuideStep].title}
                </p>
              </div>
              <button
                onClick={() => setIsWidgetGuideOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#94a3b8',
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
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#334155';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                &times;
              </button>
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#e2e8f0'
            }}>
              <div style={{
                height: '100%',
                width: `${((currentWidgetGuideStep + 1) / WIDGET_GUIDE_STEPS.length) * 100}%`,
                backgroundColor: '#6366f1',
                transition: 'width 0.3s ease-out'
              }} />
            </div>

            {/* Body */}
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
              overflow: 'hidden'
            }}>
              {/* Left Pane: Screenshot */}
              <div style={{
                backgroundColor: '#f1f5f9',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                borderRight: '1px solid #e2e8f0',
                position: 'relative'
              }}>
                <img
                  src={WIDGET_GUIDE_STEPS[currentWidgetGuideStep].image}
                  alt={WIDGET_GUIDE_STEPS[currentWidgetGuideStep].title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    backgroundColor: '#ffffff'
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
                backgroundColor: '#ffffff'
              }}>
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#e0e7ff',
                    color: '#4f46e5',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    marginBottom: '16px'
                  }}>
                    STEP {currentWidgetGuideStep + 1}
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', lineHeight: '1.3' }}>
                    {WIDGET_GUIDE_STEPS[currentWidgetGuideStep].title}
                  </h3>

                  <div style={{
                    fontSize: '14px',
                    color: '#334155',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-line'
                  }}>
                    {WIDGET_GUIDE_STEPS[currentWidgetGuideStep].description}
                  </div>
                </div>

                {/* Quick Helper Tips */}
                <div style={{
                  marginTop: '24px',
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  borderLeft: '4px solid #6366f1',
                  fontSize: '13px',
                  color: '#475569'
                }}>
                  <strong>💡 Pro-Tip:</strong> Use Left & Right Arrow keys on your keyboard to navigate between steps.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e4e4e7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <button
                onClick={() => setCurrentWidgetGuideStep((prev) => Math.max(prev - 1, 0))}
                disabled={currentWidgetGuideStep === 0}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#ffffff',
                  color: currentWidgetGuideStep === 0 ? '#cbd5e1' : '#334155',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: currentWidgetGuideStep === 0 ? 'not-allowed' : 'pointer',
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
                {WIDGET_GUIDE_STEPS.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentWidgetGuideStep(idx)}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: currentWidgetGuideStep === idx ? '#6366f1' : '#cbd5e1',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={`Step ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={() => {
                  if (currentWidgetGuideStep === WIDGET_GUIDE_STEPS.length - 1) {
                    setIsWidgetGuideOpen(false);
                  } else {
                    setCurrentWidgetGuideStep((prev) => Math.min(prev + 1, WIDGET_GUIDE_STEPS.length - 1));
                  }
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#25d366',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {currentWidgetGuideStep === WIDGET_GUIDE_STEPS.length - 1 ? 'Finish Setup' : 'Next Step'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WhatsAppConnect;
