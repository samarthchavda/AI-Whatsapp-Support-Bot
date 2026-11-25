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
  FaBolt,
  FaSave
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
    purpose: 'Universal API for third-party CRMs (Zoho, HubSpot, Salesforce, Custom PHP/Node.js) to send approved WhatsApp templates (with variables), direct text messages, or media directly to customers.',
    authRequired: true,
    headers: {
      'X-KWICKBOT-API-KEY': apiKey || '<YOUR_KWICKBOT_API_KEY>',
      'Content-Type': 'application/json'
    },
    requestBody: {
      to: '919876543210',
      type: 'template',
      templateName: 'order_confirmation_v1',
      language: 'en',
      bodyVariables: ['Samarth Chavda', 'ORD-88492', '₹1,499']
    },
    responseExample: {
      success: true,
      messageId: 'wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSQTIzOTQ4NzM5NDg3MzkwOAA=',
      status: 'sent',
      recipientPhone: '919876543210',
      type: 'template'
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
    purpose: 'Retrieve all approved WhatsApp Message Templates directly from Meta Graph API, including variable placeholders, categories, and button types.',
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
          id: '123456789012345',
          name: 'order_confirmation_v1',
          status: 'APPROVED',
          category: 'UTILITY',
          language: 'en',
          bodyText: 'Hello {{1}}, your order {{2}} for amount {{3}} is confirmed!',
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
    purpose: 'Retrieve the verified display name, quality rating, WABA ID, and connection status of the linked WhatsApp Business Phone Number.',
    authRequired: true,
    headers: {
      'X-KWICKBOT-API-KEY': apiKey || '<YOUR_KWICKBOT_API_KEY>'
    },
    requestBody: null,
    responseExample: {
      success: true,
      account: {
        phoneNumberId: '109283746592019',
        businessAccountId: '987654321098765',
        displayPhoneNumber: '+91 98765 43210',
        verifiedName: 'Kwickbot Store',
        qualityRating: 'GREEN',
        codeVerificationStatus: 'VERIFIED',
        status: 'CONNECTED'
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
    purpose: 'Kwickbot pushes real-time delivery status updates (delivered, read, failed) and incoming customer replies back to your server signed with HMAC-SHA256.',
    authRequired: false,
    headers: {
      'Content-Type': 'application/json',
      'X-Kwickbot-Signature': 'sha256=4f6a9c8b7e6d5...',
      'X-Kwickbot-Event': 'messages.received'
    },
    requestBody: {
      event: 'messages.received',
      timestamp: 1728825600,
      messageId: 'wamid.HBgMOTE5ODc2NTQzMjEw...',
      senderPhone: '919876543210',
      senderName: 'Rahul Sharma',
      type: 'text',
      text: 'Hello! Where is my order?'
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
  const { event, senderPhone, text } = req.body;

  if (event === 'messages.received') {
    console.log(\`Inbound WhatsApp message from \${senderPhone}: \${text}\`);
  } else if (event === 'messages.delivered') {
    console.log(\`Message delivered to \${req.body.recipientPhone}\`);
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
  const [keyNotice, setKeyNotice] = useState(null);

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
  const [webhookNotice, setWebhookNotice] = useState(null);

  useEffect(() => {
    fetchApiKey();
    fetchWebhookConfig();
  }, []);

  const showTemporaryNotice = (setter, type, text) => {
    setter({ type, text });
    setTimeout(() => setter(null), 4000);
  };

  const fetchApiKey = async () => {
    try {
      const res = await api.get('/auth/api-key');
      if (res.data.success && res.data.apiKey) {
        setApiKey(res.data.apiKey);
      }
    } catch (err) {
      console.error('Error fetching API key:', err);
      setApiKey('');
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
        showTemporaryNotice(setKeyNotice, 'success', res.data.message || 'API key updated successfully.');
        setShowKeyModal(false);
        setCustomKeyInput('');
      }
    } catch (err) {
      showTemporaryNotice(setKeyNotice, 'error', err.response?.data?.error || 'Failed to update API key.');
    } finally {
      setKeyLoading(false);
    }
  };

  const handleSaveWebhookConfig = async () => {
    try {
      setWebhookSaving(true);
      setWebhookNotice(null);
      const res = await api.post('/v1/developer/webhook-config', {
        webhookUrl,
        events: subscribedEvents,
        isActive: webhookActive
      });

      if (res.data.success) {
        showTemporaryNotice(setWebhookNotice, 'success', 'Webhook settings saved.');
        if (res.data.webhookSecret) {
          setWebhookSecret(res.data.webhookSecret);
        }
      }
    } catch (err) {
      showTemporaryNotice(setWebhookNotice, 'error', err.response?.data?.error || 'Failed to save webhook settings.');
    } finally {
      setWebhookSaving(false);
    }
  };

  const handleRotateSecret = async () => {
    if (!window.confirm('Rotate your Webhook Signing Secret? Any external signature verification will need the new secret.')) {
      return;
    }

    try {
      const res = await api.post('/v1/developer/rotate-secret');
      if (res.data.success && res.data.webhookSecret) {
        setWebhookSecret(res.data.webhookSecret);
        showTemporaryNotice(setWebhookNotice, 'success', 'Webhook signing secret rotated.');
      }
    } catch (err) {
      showTemporaryNotice(setWebhookNotice, 'error', err.response?.data?.error || 'Failed to rotate secret.');
    }
  };

  const handleTestWebhookPing = async () => {
    if (!webhookUrl.trim()) {
      showTemporaryNotice(setWebhookNotice, 'error', 'Enter a Destination Webhook URL before sending a test.');
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
      setSubscribedEvents(subscribedEvents.filter((e) => e !== eventName));
    } else {
      setSubscribedEvents([...subscribedEvents, eventName]);
    }
  };

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const effectiveKey = apiKey === 'Loading...' ? '' : apiKey;
  const apiList = getApiList(effectiveKey);
  const filteredApis = apiList.filter((apiItem) => {
    const query = searchTerm.toLowerCase();
    const matchesTab = activeTab === 'all' || apiItem.category === activeTab;
    const matchesSearch =
      apiItem.title.toLowerCase().includes(query) ||
      apiItem.path.toLowerCase().includes(query) ||
      apiItem.purpose.toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="developer-api-container">
      {/* Header Banner */}
      <div className="dev-header">
        <div className="dev-header-top">
          <div>
            <div className="dev-badge">
              <FaCode /> Developer API & Webhooks Hub
            </div>
            <h1>Developer REST API & Webhook Integration</h1>
            <p>
              Trigger approved WhatsApp templates, fetch templates and account details, send direct messages, and receive real-time webhook delivery updates in your CRM or custom backend.
            </p>
          </div>
          <a
            href="https://kwickbot.in/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-swagger"
          >
            <FaBookOpen /> OpenAPI Docs <FaExternalLinkAlt style={{ fontSize: '11px' }} />
          </a>
        </div>

        {/* API Key Action Bar */}
        <div className="dev-actions-row">
          <div className="api-key-box">
            <span className="key-label"><FaKey /> API Secret Key</span>
            <code className="key-value">
              {showApiKey
                ? (apiKey || 'Not generated')
                : (apiKey === 'Loading...' ? 'Loading...' : '••••••••••••••••••••••••••••••••••••')}
            </code>
          </div>
          <div className="api-key-controls">
            <button
              type="button"
              className="btn-dev-action"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? 'Hide' : 'Reveal'}
            </button>
            <button
              type="button"
              className="btn-dev-action"
              onClick={() => handleCopy(effectiveKey, 'main_api_key')}
              disabled={!effectiveKey}
            >
              {copiedId === 'main_api_key' ? <FaCheck className="icon-success" /> : <FaCopy />}
              {copiedId === 'main_api_key' ? 'Copied' : 'Copy Key'}
            </button>
            <button
              type="button"
              className="btn-dev-action btn-dev-primary"
              onClick={() => setShowKeyModal(true)}
            >
              <FaEdit /> Change / Regenerate
            </button>
          </div>
        </div>

        {keyNotice && (
          <div className={`dev-inline-notice ${keyNotice.type}`}>
            {keyNotice.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
            <span>{keyNotice.text}</span>
          </div>
        )}
      </div>

      {/* Outbound Webhook Configuration Card */}
      <div className="webhook-settings-card">
        <div className="webhook-card-header">
          <div className="webhook-header-title">
            <span className="webhook-icon-wrap">
              <FaBolt />
            </span>
            <div>
              <h3>Outbound Webhook Relay</h3>
              <p>Configure where Kwickbot delivers real-time message status updates and incoming customer replies.</p>
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
            <span className={`webhook-status-text ${webhookActive ? 'active' : ''}`}>
              {webhookActive ? 'Webhook Active' : 'Webhook Paused'}
            </span>
          </div>
        </div>

        <div className="webhook-form-grid">
          <div className="form-group">
            <label>Destination Webhook URL (HTTPS recommended)</label>
            <input
              type="url"
              placeholder="https://your-crm.com/api/whatsapp-webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
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
                disabled={!webhookSecret}
                title="Copy Secret"
              >
                {copiedId === 'webhook_secret' ? <FaCheck className="icon-success" /> : <FaCopy />}
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

        <div className="events-selection-row">
          <label className="events-label">Subscribe to Real-Time Events</label>
          <div className="event-pills">
            {[
              { id: 'messages.received', label: 'Incoming Messages (Replies)' },
              { id: 'messages.delivered', label: 'Message Delivered' },
              { id: 'messages.read', label: 'Message Read (Blue Tick)' },
              { id: 'messages.failed', label: 'Message Failed' }
            ].map((ev) => (
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

        <div className="webhook-card-footer">
          <div className="footer-left">
            <button
              type="button"
              className="btn-save-webhook"
              onClick={handleSaveWebhookConfig}
              disabled={webhookSaving}
            >
              <FaSave /> {webhookSaving ? 'Saving...' : 'Save Webhook Settings'}
            </button>
            <button
              type="button"
              className="btn-test-webhook"
              onClick={handleTestWebhookPing}
              disabled={webhookTesting || !webhookUrl.trim()}
            >
              <FaPaperPlane /> {webhookTesting ? 'Sending Ping...' : 'Send Test Webhook'}
            </button>
            {webhookNotice && (
              <span className={`save-notice-tag ${webhookNotice.type}`}>
                {webhookNotice.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
                {webhookNotice.text}
              </span>
            )}
          </div>

          {testResult && (
            <div className={`ping-result-badge ${testResult.success ? 'ping-success' : 'ping-failed'}`}>
              {testResult.success ? <FaCheckCircle /> : <FaExclamationCircle />}
              <span>
                {testResult.success
                  ? `Ping succeeded (HTTP ${testResult.statusCode} in ${testResult.latencyMs}ms)`
                  : `Ping failed: ${testResult.error || 'Server responded with error'}`}
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
            placeholder="Search APIs by endpoint, path, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="dev-tabs">
          <button
            type="button"
            className={`tab-item ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All APIs ({apiList.length})
          </button>
          <button
            type="button"
            className={`tab-item ${activeTab === 'whatsapp' ? 'active' : ''}`}
            onClick={() => setActiveTab('whatsapp')}
          >
            <FaWhatsapp style={{ color: '#25D366' }} /> WhatsApp Messaging & Templates
          </button>
          <button
            type="button"
            className={`tab-item ${activeTab === 'webhooks' ? 'active' : ''}`}
            onClick={() => setActiveTab('webhooks')}
          >
            <FaBolt style={{ color: '#f59e0b' }} /> Outbound Webhook Relay
          </button>
        </div>
      </div>

      {/* API Cards */}
      <div className="api-cards-grid">
        {filteredApis.length === 0 ? (
          <div className="no-apis-card">
            <FaServer style={{ fontSize: '36px', color: 'var(--text-muted)' }} />
            <h3>No APIs match your search</h3>
            <p>Try searching for keywords like "send", "template", "account", or "webhook".</p>
          </div>
        ) : (
          filteredApis.map((item) => {
            const currentLang = selectedLanguage[item.id] || 'curl';
            return (
              <div key={item.id} className="api-card">
                <div className="api-card-header">
                  <div className="endpoint-title-row">
                    <span className={`method-badge ${item.method.toLowerCase()}`}>
                      {item.method}
                    </span>
                    <span className="api-path">{item.path}</span>
                  </div>
                  <h3 className="api-title">{item.title}</h3>
                </div>

                <div className="api-card-body">
                  <div className="description-box">
                    <p className="english-desc">
                      <strong>Use Case:</strong> {item.purpose}
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

                  {/* Payload & Response Grid */}
                  <div className={item.requestBody ? 'payload-grid' : 'payload-single'}>
                    {item.requestBody && (
                      <div className="payload-section">
                        <h4>Request Payload (JSON)</h4>
                        <pre className="code-block json-view">
                          <code>{JSON.stringify(item.requestBody, null, 2)}</code>
                        </pre>
                      </div>
                    )}

                    <div className="payload-section">
                      <h4>Success Response (HTTP 200 OK)</h4>
                      <pre className="code-block json-view response-view">
                        <code>{JSON.stringify(item.responseExample, null, 2)}</code>
                      </pre>
                    </div>
                  </div>

                  {/* Code Snippets Section */}
                  <div className="snippets-section">
                    <div className="snippets-header">
                      <h4><FaTerminal /> Ready-to-use Code Snippet</h4>
                      <div className="lang-tabs">
                        {['curl', 'javascript', 'python', 'php'].map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            className={`lang-tab ${currentLang === lang ? 'active' : ''}`}
                            onClick={() => setSelectedLanguage((prev) => ({ ...prev, [item.id]: lang }))}
                          >
                            {lang.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="code-container">
                      <button
                        type="button"
                        className="btn-copy-code"
                        onClick={() => handleCopy(item.codeSnippets[currentLang], `${item.id}_${currentLang}`)}
                      >
                        {copiedId === `${item.id}_${currentLang}` ? <FaCheck className="icon-success" /> : <FaCopy />}
                        {copiedId === `${item.id}_${currentLang}` ? 'Copied' : 'Copy'}
                      </button>
                      <pre className="code-block snippet-block">
                        <code>{item.codeSnippets[currentLang]}</code>
                      </pre>
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
        <div className="dev-modal-backdrop">
          <div className="dev-modal">
            <div className="dev-modal-header">
              <h3><FaKey style={{ color: '#38bdf8' }} /> Update Secret API Key</h3>
              <button type="button" className="dev-modal-close" onClick={() => setShowKeyModal(false)}>
                ✕
              </button>
            </div>

            <p className="dev-modal-desc">
              Enter a custom API Key below or auto-generate a new random secret key:
            </p>

            <div className="dev-modal-field">
              <label>Custom API Key Value (Optional)</label>
              <input
                type="text"
                placeholder="e.g. kw_live_my_custom_secret_key_123"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
              />
            </div>

            <div className="dev-modal-actions">
              <button
                type="button"
                className="btn-dev-action"
                disabled={keyLoading}
                onClick={() => handleUpdateApiKey()}
              >
                <FaSync /> Auto-Generate Random Key
              </button>
              <button
                type="button"
                className="btn-save-webhook"
                disabled={keyLoading || !customKeyInput.trim()}
                onClick={() => handleUpdateApiKey(customKeyInput)}
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
