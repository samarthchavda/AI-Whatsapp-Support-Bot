import React, { useState, useEffect } from 'react';
import { 
  FaCode, 
  FaKey, 
  FaCopy, 
  FaCheck, 
  FaExternalLinkAlt, 
  FaBookOpen, 
  FaTerminal, 
  FaServer,
  FaSearch,
  FaSync,
  FaEdit,
  FaPaperPlane,
  FaCheckCircle,
  FaExclamationCircle,
  FaWhatsapp,
  FaBolt
} from 'react-icons/fa';
import api from '../../../services/api';
import './DeveloperApi.css';

const getApiList = (apiKey) => [
  {
    id: 'send_message',
    category: 'whatsapp',
    title: 'Universal Send WhatsApp Message (Template, Text & Media)',
    method: 'POST',
    path: '/api/v1/messages/send',
    fullUrl: 'https://kwickbot.in/api/v1/messages/send',
    purpose: 'Universal API for third-party CRMs (Zoho, HubSpot, Salesforce, Custom PHP/Node.js) to send approved WhatsApp templates, direct text messages, or media.',
    gujaratiDescription: 'CRM કે વેબસાઈટમાંથી WhatsApp Template મેસેજ (Variables સાથે) અથવા સામાન્ય Text મેસેજ ડાયરેક્ટ ગ્રાહકને મોકલવા માટે.',
    authRequired: true,
    headers: {
      'X-KWICKBOT-API-KEY': apiKey || '<YOUR_KWICKBOT_API_KEY>',
      'Content-Type': 'application/json'
    },
    requestBody: {
      to: "919876543210",
      type: "template",
      templateName: "order_confirmation_v1",
      language: "en",
      bodyVariables: ["Samarth Chavda", "ORD-88492", "₹1,499"]
    },
    responseExample: {
      success: true,
      messageId: "wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSQTIzOTQ4NzM5NDg3MzkwOAA=",
      status: "sent",
      recipientPhone: "919876543210",
      type: "template"
    },
    codeSnippets: {
      curl: `curl -X POST https://kwickbot.in/api/v1/messages/send \\
  -H "X-KWICKBOT-API-KEY: ${apiKey || 'YOUR_KWICKBOT_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "919876543210",
    "type": "template",
    "templateName": "order_confirmation_v1",
    "language": "en",
    "bodyVariables": ["Samarth Chavda", "ORD-88492", "₹1,499"]
  }'`,
      javascript: `const response = await fetch('https://kwickbot.in/api/v1/messages/send', {
  method: 'POST',
  headers: {
    'X-KWICKBOT-API-KEY': '${apiKey || 'YOUR_KWICKBOT_API_KEY'}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: '919876543210',
    type: 'template',
    templateName: 'order_confirmation_v1',
    language: 'en',
    bodyVariables: ['Samarth Chavda', 'ORD-88492', '₹1,499']
  })
});
const data = await response.json();
console.log(data);`,
      python: `import requests

url = "https://kwickbot.in/api/v1/messages/send"
headers = {
    "X-KWICKBOT-API-KEY": "${apiKey || 'YOUR_KWICKBOT_API_KEY'}",
    "Content-Type": "application/json"
}
payload = {
    "to": "919876543210",
    "type": "template",
    "templateName": "order_confirmation_v1",
    "language": "en",
    "bodyVariables": ["Samarth Chavda", "ORD-88492", "₹1,499"]
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
      php: `<?php
$curl = curl_init();
curl_setopt_array($curl, [
  CURLOPT_URL => 'https://kwickbot.in/api/v1/messages/send',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => json_encode([
    'to' => '919876543210',
    'type' => 'template',
    'templateName' => 'order_confirmation_v1',
    'language' => 'en',
    'bodyVariables' => ['Samarth Chavda', 'ORD-88492', '₹1,499']
  ]),
  CURLOPT_HTTPHEADER => [
    'X-KWICKBOT-API-KEY: ${apiKey || 'YOUR_KWICKBOT_API_KEY'}',
    'Content-Type: application/json'
  ]
]);
$response = curl_exec($curl);
curl_close($curl);
echo $response;`
    }
  },
  {
    id: 'get_templates',
    category: 'whatsapp',
    title: 'Fetch Meta Approved WhatsApp Templates',
    method: 'GET',
    path: '/api/v1/whatsapp/templates',
    fullUrl: 'https://kwickbot.in/api/v1/whatsapp/templates',
    purpose: 'Retrieve all approved WhatsApp Message Templates directly from Meta Graph API with variable placeholders, category, and button types.',
    gujaratiDescription: 'તમારા Meta WhatsApp એકાઉન્ટમાંથી બધા મંજૂર થયેલા Templates (Order Alert, OTP, Discount) ના નામ અને Variables ની લિસ્ટ મેળવવા માટે.',
    authRequired: true,
    headers: {
      'X-KWICKBOT-API-KEY': apiKey || '<YOUR_KWICKBOT_API_KEY>'
    },
    requestBody: null,
    responseExample: {
      success: true,
      total: 2,
      templates: [
        {
          id: "123456789012345",
          name: "order_confirmation_v1",
          status: "APPROVED",
          category: "UTILITY",
          language: "en",
          bodyText: "Hello {{1}}, your order {{2}} for amount {{3}} is confirmed!",
          bodyVariablesCount: 3,
          buttons: []
        }
      ]
    },
    codeSnippets: {
      curl: `curl -X GET https://kwickbot.in/api/v1/whatsapp/templates \\
  -H "X-KWICKBOT-API-KEY: ${apiKey || 'YOUR_KWICKBOT_API_KEY'}"`,
      javascript: `const response = await fetch('https://kwickbot.in/api/v1/whatsapp/templates', {
  headers: {
    'X-KWICKBOT-API-KEY': '${apiKey || 'YOUR_KWICKBOT_API_KEY'}'
  }
});
const templates = await response.json();
console.log(templates);`,
      python: `import requests

res = requests.get(
    "https://kwickbot.in/api/v1/whatsapp/templates",
    headers={"X-KWICKBOT-API-KEY": "${apiKey || 'YOUR_KWICKBOT_API_KEY'}"}
)
print(res.json())`,
      php: `<?php
$curl = curl_init();
curl_setopt_array($curl, [
  CURLOPT_URL => 'https://kwickbot.in/api/v1/whatsapp/templates',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ['X-KWICKBOT-API-KEY: ${apiKey || 'YOUR_KWICKBOT_API_KEY'}']
]);
$response = curl_exec($curl);
curl_close($curl);
echo $response;`
    }
  },
  {
    id: 'get_account',
    category: 'whatsapp',
    title: 'Get WhatsApp Account & Phone Details',
    method: 'GET',
    path: '/api/v1/whatsapp/account',
    fullUrl: 'https://kwickbot.in/api/v1/whatsapp/account',
    purpose: 'Retrieve the verified display name, quality rating, and status of the connected WhatsApp Business Phone Number.',
    gujaratiDescription: 'કનેક્ટેડ WhatsApp બિઝનેસ નંબરનું વેરિફાઇડ નામ, Quality Rating અને WABA ID ચેક કરવા માટે.',
    authRequired: true,
    headers: {
      'X-KWICKBOT-API-KEY': apiKey || '<YOUR_KWICKBOT_API_KEY>'
    },
    requestBody: null,
    responseExample: {
      success: true,
      account: {
        phoneNumberId: "109283746592019",
        businessAccountId: "987654321098765",
        displayPhoneNumber: "+91 98765 43210",
        verifiedName: "Kwickbot Store",
        qualityRating: "GREEN",
        codeVerificationStatus: "VERIFIED",
        status: "CONNECTED"
      }
    },
    codeSnippets: {
      curl: `curl -X GET https://kwickbot.in/api/v1/whatsapp/account \\
  -H "X-KWICKBOT-API-KEY: ${apiKey || 'YOUR_KWICKBOT_API_KEY'}"`,
      javascript: `const res = await fetch('https://kwickbot.in/api/v1/whatsapp/account', {
  headers: { 'X-KWICKBOT-API-KEY': '${apiKey || 'YOUR_KWICKBOT_API_KEY'}' }
});
console.log(await res.json());`,
      python: `import requests
res = requests.get(
    'https://kwickbot.in/api/v1/whatsapp/account',
    headers={'X-KWICKBOT-API-KEY': '${apiKey || 'YOUR_KWICKBOT_API_KEY'}'}
)
print(res.json())`,
      php: `<?php
$curl = curl_init();
curl_setopt_array($curl, [
  CURLOPT_URL => 'https://kwickbot.in/api/v1/whatsapp/account',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ['X-KWICKBOT-API-KEY: ${apiKey || 'YOUR_KWICKBOT_API_KEY'}']
]);
echo curl_exec($curl);
curl_close($curl);`
    }
  },
  {
    id: 'outbound_webhook',
    category: 'webhooks',
    title: 'Outbound Delivery & Customer Reply Webhook Relay',
    method: 'POST',
    path: 'https://your-crm.com/api/kwickbot-webhook',
    fullUrl: 'Outbound HTTP POST to Client Webhook Callback URL',
    purpose: 'Kwickbot pushes real-time delivery status updates (delivered, read, failed) and incoming customer replies back to your server with HMAC-SHA256 signature.',
    gujaratiDescription: 'જ્યારે ગ્રાહક WhatsApp પર Reply આપે અથવા મેસેજ Delivered/Read (Blue Tick) થાય ત્યારે Kwickbot તમારા સર્વર પર Instant Alert મોકલે છે.',
    authRequired: false,
    headers: {
      'Content-Type': 'application/json',
      'X-Kwickbot-Signature': 'sha256=4f6a9c8b7e6d5...',
      'X-Kwickbot-Event': 'messages.received'
    },
    requestBody: {
      event: "messages.received",
      timestamp: 1728825600,
      messageId: "wamid.HBgMOTE5ODc2NTQzMjEw...",
      senderPhone: "919876543210",
      senderName: "Rahul Sharma",
      type: "text",
      text: "Hello! Where is my order?"
    },
    responseExample: {
      status: 200,
      received: true
    },
    codeSnippets: {
      curl: `# Test receiving outbound webhook in your CRM backend:
curl -X POST https://your-crm.com/api/kwickbot-webhook \\
  -H "Content-Type: application/json" \\
  -H "X-Kwickbot-Signature: sha256=test_signature" \\
  -d '{
    "event": "messages.received",
    "senderPhone": "919876543210",
    "text": "Hello, I want to track my order!"
  }'`,
      javascript: `// Express.js handler in your CRM server:
const crypto = require('crypto');

app.post('/api/kwickbot-webhook', (req, res) => {
  const signature = req.headers['x-kwickbot-signature'];
  const { event, senderPhone, text, status } = req.body;
  
  if (event === 'messages.received') {
    console.log(\`📩 Inbound WhatsApp message from \${senderPhone}: \${text}\`);
  } else if (event === 'messages.delivered') {
    console.log(\`✅ Message delivered to \${req.body.recipientPhone}\`);
  }
  
  res.status(200).json({ received: true });
});`,
      python: `# Flask receiver in your CRM:
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/kwickbot-webhook', methods=['POST'])
def handle_kwickbot():
    data = request.json
    event = data.get('event')
    print("Received Kwickbot Event:", event, data)
    return jsonify({"received": True}), 200`,
      php: `<?php
// PHP Webhook Receiver Script:
$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

if ($data['event'] === 'messages.received') {
  file_put_contents('whatsapp_inbound.log', "From: " . $data['senderPhone'] . " - " . $data['text'] . PHP_EOL, FILE_APPEND);
}

http_response_code(200);
echo json_encode(['received' => true]);`
    }
  }
];

function DeveloperApi() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  
  // API Key State
  const [apiKey, setApiKey] = useState('Loading...');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);

  // Webhook Configuration State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [subscribedEvents, setSubscribedEvents] = useState([
    'messages.received',
    'messages.delivered',
    'messages.read',
    'messages.failed'
  ]);
  const [webhookActive, setWebhookActive] = useState(true);
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  useEffect(() => {
    fetchApiKey();
    fetchWebhookConfig();
  }, []);

  const fetchApiKey = async () => {
    try {
      const res = await api.get('/auth/api-key');
      if (res.data.success && res.data.apiKey) {
        setApiKey(res.data.apiKey);
      }
    } catch (err) {
      console.error('Error fetching API key:', err);
    }
  };

  const fetchWebhookConfig = async () => {
    try {
      const res = await api.get('/v1/developer/webhook-config');
      if (res.data.success) {
        setWebhookUrl(res.data.webhookUrl || '');
        setWebhookSecret(res.data.webhookSecret || '');
        if (Array.isArray(res.data.events) && res.data.events.length > 0) {
          setSubscribedEvents(res.data.events);
        }
        if (res.data.isActive !== undefined) {
          setWebhookActive(res.data.isActive);
        }
      }
    } catch (err) {
      console.warn('Webhook config not yet initialized, will save on first submit');
    }
  };

  const handleUpdateApiKey = async (newKey = null) => {
    try {
      setKeyLoading(true);
      const payload = newKey ? { customKey: newKey } : {};
      const res = await api.post('/auth/api-key/regenerate', payload);
      if (res.data.success && res.data.apiKey) {
        setApiKey(res.data.apiKey);
        alert(res.data.message || 'API Key updated successfully!');
        setShowKeyModal(false);
        setCustomKeyInput('');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update API Key');
    } finally {
      setKeyLoading(false);
    }
  };

  const handleSaveWebhookConfig = async () => {
    try {
      setWebhookSaving(true);
      setSaveSuccessMsg('');
      const res = await api.post('/v1/developer/webhook-config', {
        webhookUrl,
        events: subscribedEvents,
        isActive: webhookActive
      });

      if (res.data.success) {
        setSaveSuccessMsg('Webhook settings saved successfully!');
        if (res.data.webhookSecret) {
          setWebhookSecret(res.data.webhookSecret);
        }
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save webhook settings');
    } finally {
      setWebhookSaving(false);
    }
  };

  const handleRotateSecret = async () => {
    if (!window.confirm('Are you sure you want to rotate your Webhook Secret? Any external signature verification will need the new secret.')) {
      return;
    }

    try {
      const res = await api.post('/v1/developer/rotate-secret');
      if (res.data.success && res.data.webhookSecret) {
        setWebhookSecret(res.data.webhookSecret);
        alert('Webhook Secret rotated successfully!');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to rotate secret');
    }
  };

  const handleTestWebhookPing = async () => {
    if (!webhookUrl.trim()) {
      alert('Please enter a Webhook URL before testing');
      return;
    }

    try {
      setWebhookTesting(true);
      setTestResult(null);
      const res = await api.post('/v1/developer/test-webhook', {
        webhookUrl: webhookUrl.trim()
      });

      setTestResult(res.data);
    } catch (err) {
      setTestResult({
        success: false,
        error: err.response?.data?.error || err.message || 'Test request failed'
      });
    } finally {
      setWebhookTesting(false);
    }
  };

  const handleToggleEvent = (eventName) => {
    if (subscribedEvents.includes(eventName)) {
      setSubscribedEvents(subscribedEvents.filter(e => e !== eventName));
    } else {
      setSubscribedEvents([...subscribedEvents, eventName]);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const apiList = getApiList(apiKey === 'Loading...' ? '' : apiKey);
  const filteredApis = apiList.filter(apiItem => {
    const matchesTab = activeTab === 'all' || apiItem.category === activeTab;
    const matchesSearch = apiItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          apiItem.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          apiItem.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          apiItem.gujaratiDescription.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="developer-api-container">
      {/* Header Banner */}
      <div className="dev-header">
        <div className="dev-header-content">
          <div className="dev-badge">
            <FaCode /> Developer API & Webhooks Hub
          </div>
          <h1>Developer REST API & Webhook Integration Platform</h1>
          <p>
            Seamlessly trigger approved WhatsApp Templates, fetch contact templates, send direct messages, and receive real-time webhook delivery updates into your CRM or custom software.
          </p>

          {/* Quick Info & Action Bar */}
          <div className="dev-actions-row">
            <div className="api-key-box">
              <span className="key-label"><FaKey /> Your API Secret Key:</span>
              <code className="key-value">
                {showApiKey ? apiKey : (apiKey === 'Loading...' ? 'Loading...' : '••••••••••••••••••••••••••••••••••••••••••••')}
              </code>
              <button 
                className="btn-toggle-key"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? 'Hide' : 'Reveal'}
              </button>
              <button 
                className="btn-copy-key"
                onClick={() => handleCopy(apiKey, 'main_api_key')}
              >
                {copiedId === 'main_api_key' ? <FaCheck style={{ color: '#10b981' }} /> : <FaCopy />}
                {copiedId === 'main_api_key' ? 'Copied!' : 'Copy Key'}
              </button>
              <button 
                className="btn-toggle-key"
                style={{ background: '#0284c7' }}
                onClick={() => setShowKeyModal(true)}
              >
                <FaEdit /> Change / Regenerate Key
              </button>
            </div>

            <a 
              href="https://kwickbot.in/api/docs" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-swagger"
            >
              <FaBookOpen /> Open Swagger OpenAPI Docs <FaExternalLinkAlt style={{ fontSize: '12px' }} />
            </a>
          </div>
        </div>
      </div>

      {/* OUTBOUND WEBHOOK CONFIGURATION CARD */}
      <div className="webhook-settings-card">
        <div className="webhook-card-header">
          <div className="webhook-header-title">
            <FaBolt style={{ color: '#f59e0b', fontSize: '20px' }} />
            <div>
              <h3>Outbound Webhook Relay Configuration</h3>
              <p>Configure where Kwickbot should send real-time delivery statuses and incoming customer WhatsApp replies.</p>
            </div>
          </div>
          <div className="webhook-status-toggle">
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={webhookActive} 
                onChange={(e) => setWebhookActive(e.target.checked)} 
              />
              <span className="toggle-slider"></span>
            </label>
            <span style={{ fontSize: '13px', fontWeight: '600', color: webhookActive ? '#10b981' : '#94a3b8' }}>
              {webhookActive ? 'Webhook Active' : 'Webhook Paused'}
            </span>
          </div>
        </div>

        <div className="webhook-form-grid">
          {/* Webhook URL Input */}
          <div className="form-group url-group">
            <label>Destination Webhook URL (HTTPS recommended)</label>
            <div className="input-with-button">
              <input 
                type="url" 
                placeholder="https://your-crm.com/api/whatsapp-webhook" 
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Webhook Secret Key */}
          <div className="form-group secret-group">
            <label>Webhook Signing Secret (HMAC-SHA256)</label>
            <div className="secret-display-box">
              <code>
                {showSecret ? (webhookSecret || 'whsec_••••••••••••••••••••••••') : '••••••••••••••••••••••••••••••••'}
              </code>
              <button 
                type="button" 
                className="btn-sm-action"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? 'Hide' : 'Reveal'}
              </button>
              <button 
                type="button" 
                className="btn-sm-action"
                onClick={() => handleCopy(webhookSecret, 'webhook_secret')}
              >
                {copiedId === 'webhook_secret' ? <FaCheck style={{ color: '#10b981' }} /> : <FaCopy />}
              </button>
              <button 
                type="button" 
                className="btn-sm-action btn-rotate"
                onClick={handleRotateSecret}
                title="Rotate Secret"
              >
                <FaSync /> Rotate
              </button>
            </div>
          </div>
        </div>

        {/* Subscribed Events Checkboxes */}
        <div className="events-selection-row">
          <label className="events-label">Subscribe to Real-Time Events:</label>
          <div className="event-pills">
            {[
              { id: 'messages.received', label: 'Incoming Messages (Replies)' },
              { id: 'messages.delivered', label: 'Message Delivered' },
              { id: 'messages.read', label: 'Message Read (Blue Tick)' },
              { id: 'messages.failed', label: 'Message Failed' }
            ].map(ev => (
              <label key={ev.id} className={`event-checkbox-pill ${subscribedEvents.includes(ev.id) ? 'checked' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={subscribedEvents.includes(ev.id)}
                  onChange={() => handleToggleEvent(ev.id)}
                />
                {ev.label}
              </label>
            ))}
          </div>
        </div>

        {/* Actions & Test Status */}
        <div className="webhook-card-footer">
          <div className="footer-left">
            <button 
              className="btn-save-webhook"
              onClick={handleSaveWebhookConfig}
              disabled={webhookSaving}
            >
              {webhookSaving ? 'Saving...' : '💾 Save Webhook Settings'}
            </button>
            <button 
              className="btn-test-webhook"
              onClick={handleTestWebhookPing}
              disabled={webhookTesting || !webhookUrl.trim()}
            >
              <FaPaperPlane /> {webhookTesting ? 'Sending Ping...' : 'Send Test Webhook'}
            </button>
            {saveSuccessMsg && (
              <span className="save-success-tag">
                <FaCheckCircle /> {saveSuccessMsg}
              </span>
            )}
          </div>

          {testResult && (
            <div className={`ping-result-badge ${testResult.success ? 'ping-success' : 'ping-failed'}`}>
              {testResult.success ? <FaCheckCircle /> : <FaExclamationCircle />}
              <span>
                {testResult.success 
                  ? `Ping Succeeded! (Status ${testResult.statusCode} in ${testResult.latencyMs}ms)`
                  : `Ping Failed: ${testResult.error || 'Server responded with error'}`
                }
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="dev-controls">
        <div className="dev-search-box">
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search APIs by endpoint name, description, or Gujarati use case..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="dev-tabs">
          <button 
            className={`tab-item ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All APIs ({apiList.length})
          </button>
          <button 
            className={`tab-item ${activeTab === 'whatsapp' ? 'active' : ''}`}
            onClick={() => setActiveTab('whatsapp')}
          >
            <FaWhatsapp style={{ color: '#25D366' }} /> WhatsApp Messaging & Templates
          </button>
          <button 
            className={`tab-item ${activeTab === 'webhooks' ? 'active' : ''}`}
            onClick={() => setActiveTab('webhooks')}
          >
            <FaBolt style={{ color: '#f59e0b' }} /> Outbound Webhook Relay
          </button>
        </div>
      </div>

      {/* API Cards Grid */}
      <div className="api-cards-grid">
        {filteredApis.length === 0 ? (
          <div className="no-apis-card">
            <FaServer style={{ fontSize: '40px', color: '#64748b' }} />
            <h3>No APIs match your search</h3>
            <p>Try searching with another keyword like "send", "template", or "webhook".</p>
          </div>
        ) : (
          filteredApis.map((item) => {
            const currentLang = selectedLanguage[item.id] || 'curl';
            return (
              <div key={item.id} className="api-card">
                {/* Card Top Banner */}
                <div className="api-card-header">
                  <div className="endpoint-title-row">
                    <span className={`method-badge ${item.method.toLowerCase()}`}>
                      {item.method}
                    </span>
                    <span className="api-path">{item.path}</span>
                  </div>
                  <h3 className="api-title">{item.title}</h3>
                </div>

                {/* Card Description */}
                <div className="api-card-body">
                  <div className="description-box">
                    <p className="english-desc">
                      <strong>Use Case:</strong> {item.purpose}
                    </p>
                    <p className="gujarati-desc">
                      💡 <strong>ગુજરાતી માં ઉપયોગ:</strong> {item.gujaratiDescription}
                    </p>
                  </div>

                  {/* Headers Section */}
                  <div className="params-section">
                    <h4>HTTP Request Headers</h4>
                    <div className="headers-table">
                      {Object.entries(item.headers).map(([k, v]) => (
                        <div key={k} className="header-row">
                          <span className="header-key">{k}:</span>
                          <span className="header-val">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Request Body JSON */}
                  {item.requestBody && (
                    <div className="payload-section">
                      <h4>Request Payload (JSON)</h4>
                      <pre className="code-block json-view">
                        <code>{JSON.stringify(item.requestBody, null, 2)}</code>
                      </pre>
                    </div>
                  )}

                  {/* Response Example */}
                  <div className="payload-section">
                    <h4>Success Response (HTTP 200 OK)</h4>
                    <pre className="code-block json-view response-view">
                      <code>{JSON.stringify(item.responseExample, null, 2)}</code>
                    </pre>
                  </div>

                  {/* Code Snippets Section */}
                  <div className="snippets-section">
                    <div className="snippets-header">
                      <h4><FaTerminal /> Ready-to-use Code Snippet</h4>
                      <div className="lang-tabs">
                        {['curl', 'javascript', 'python', 'php'].map((lang) => (
                          <button
                            key={lang}
                            className={`lang-tab ${currentLang === lang ? 'active' : ''}`}
                            onClick={() => setSelectedLanguage(prev => ({ ...prev, [item.id]: lang }))}
                          >
                            {lang.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="code-container">
                      <pre className="code-block">
                        <code>{item.codeSnippets[currentLang]}</code>
                      </pre>
                      <button 
                        className="btn-copy-code"
                        onClick={() => handleCopy(item.codeSnippets[currentLang], `${item.id}_${currentLang}`)}
                      >
                        {copiedId === `${item.id}_${currentLang}` ? <FaCheck style={{ color: '#10b981' }} /> : <FaCopy />}
                        {copiedId === `${item.id}_${currentLang}` ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for Setting / Changing Custom API Key */}
      {showKeyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '480px',
            width: '90%',
            color: '#f8fafc'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}><FaKey style={{ color: '#0284c7' }} /> Update Secret API Key</h3>
              <button onClick={() => setShowKeyModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '13.5px', marginBottom: '20px' }}>
              તમારો કસ્ટમ <strong>API Key</strong> ટાઈપ કરો અથવા આપમેળે નવો સિક્રેટ કી (Random Secret Key) જનરેટ કરો:
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>Custom API Key Value (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. kw_live_my_custom_secret_key_123" 
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#020617',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#10b981',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                disabled={keyLoading}
                onClick={() => handleUpdateApiKey()}
                style={{
                  background: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FaSync /> Auto-Generate Random Key
              </button>

              <button 
                disabled={keyLoading || !customKeyInput.trim()}
                onClick={() => handleUpdateApiKey(customKeyInput)}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Save Custom Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeveloperApi;
