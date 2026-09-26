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
  FaEdit
} from 'react-icons/fa';
import api from '../../../services/api';
import './DeveloperApi.css';

const API_LIST = [
  {
    id: 'send_template',
    category: 'whatsapp',
    title: 'Send WhatsApp Template Message',
    method: 'POST',
    path: '/api/v1/whatsapp/send-template',
    fullUrl: 'https://kwickbot.in/api/v1/whatsapp/send-template',
    purpose: 'Allows third-party CRMs (Zoho, HubSpot, Salesforce, Custom PHP/Node.js) to trigger official approved WhatsApp Template messages directly to customers.',
    gujaratiDescription: 'કોઈપણ કસ્ટમ CRM કે વેબસાઈટમાંથી કસ્ટમર્સને ડાયરેક્ટ WhatsApp Template મેસેજ (જેમ કે Order Status, Payment Alert) મોકલવા માટે.',
    authRequired: true,
    headers: {
      'Authorization': 'Bearer <YOUR_KWICKBOT_API_KEY>',
      'Content-Type': 'application/json'
    },
    requestBody: {
      to: "919876543210",
      templateName: "order_confirmation_v1",
      language: "en",
      variables: {
        "1": "Samarth Chavda",
        "2": "ORD-88492",
        "3": "₹1,499"
      }
    },
    responseExample: {
      success: true,
      messageId: "wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSQTIzOTQ4NzM5NDg3MzkwOAA=",
      status: "queued"
    },
    codeSnippets: {
      curl: `curl -X POST https://kwickbot.in/api/v1/whatsapp/send-template \\
  -H "Authorization: Bearer YOUR_KWICKBOT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "919876543210",
    "templateName": "order_confirmation_v1",
    "language": "en",
    "variables": {
      "1": "Samarth Chavda",
      "2": "ORD-88492",
      "3": "₹1,499"
    }
  }'`,
      javascript: `const response = await fetch('https://kwickbot.in/api/v1/whatsapp/send-template', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_KWICKBOT_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: '919876543210',
    templateName: 'order_confirmation_v1',
    language: 'en',
    variables: { '1': 'Samarth Chavda', '2': 'ORD-88492', '3': '₹1,499' }
  })
});
const data = await response.json();`,
      python: `import requests

url = "https://kwickbot.in/api/v1/whatsapp/send-template"
headers = {
    "Authorization": "Bearer YOUR_KWICKBOT_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "to": "919876543210",
    "templateName": "order_confirmation_v1",
    "language": "en",
    "variables": {"1": "Samarth Chavda", "2": "ORD-88492", "3": "₹1,499"}
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
      php: `<?php
$curl = curl_init();
curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://kwickbot.in/api/v1/whatsapp/send-template',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => json_encode([
    'to' => '919876543210',
    'templateName' => 'order_confirmation_v1',
    'language' => 'en',
    'variables' => ['1' => 'Samarth Chavda', '2' => 'ORD-88492', '3' => '₹1,499']
  ]),
  CURLOPT_HTTPHEADER => array(
    'Authorization: Bearer YOUR_KWICKBOT_API_KEY',
    'Content-Type: application/json'
  ),
));
$response = curl_exec($curl);
curl_close($curl);
echo $response;`
    }
  },
  {
    id: 'get_templates',
    category: 'whatsapp',
    title: 'Fetch Approved WhatsApp Templates',
    method: 'GET',
    path: '/api/v1/whatsapp/templates',
    fullUrl: 'https://kwickbot.in/api/v1/whatsapp/templates',
    purpose: 'Returns a list of all Meta-approved WhatsApp message templates for populating dropdown menus inside third-party CRM systems.',
    gujaratiDescription: 'CRM માં Approved Templates નું લિસ્ટ બતાવવા માટે (જેથી યુઝર Dropdown માંથી Template પસંદ કરી શકે).',
    authRequired: true,
    headers: {
      'Authorization': 'Bearer <YOUR_KWICKBOT_API_KEY>'
    },
    requestBody: null,
    responseExample: {
      success: true,
      count: 2,
      templates: [
        {
          name: "order_confirmation_v1",
          language: "en",
          status: "APPROVED",
          category: "UTILITY",
          components: [{ type: "BODY", text: "Hello {{1}}, order {{2}} is confirmed for {{3}}." }]
        },
        {
          name: "payment_reminder",
          language: "en",
          status: "APPROVED",
          category: "UTILITY",
          components: [{ type: "BODY", text: "Hi {{1}}, your payment of {{2}} is due." }]
        }
      ]
    },
    codeSnippets: {
      curl: `curl -X GET https://kwickbot.in/api/v1/whatsapp/templates \\
  -H "Authorization: Bearer YOUR_KWICKBOT_API_KEY"`,
      javascript: `const response = await fetch('https://kwickbot.in/api/v1/whatsapp/templates', {
  headers: { 'Authorization': 'Bearer YOUR_KWICKBOT_API_KEY' }
});
const data = await response.json();`,
      python: `import requests
response = requests.get('https://kwickbot.in/api/v1/whatsapp/templates', headers={'Authorization': 'Bearer YOUR_KWICKBOT_API_KEY'})
print(response.json())`,
      php: `<?php
$ch = curl_init('https://kwickbot.in/api/v1/whatsapp/templates');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer YOUR_KWICKBOT_API_KEY']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
curl_close($ch);
echo $result;`
    }
  },
  {
    id: 'shopify_webhook',
    category: 'webhooks',
    title: 'Shopify Order & Customer Webhook Listener',
    method: 'POST',
    path: '/api/webhooks/shopify/orders',
    fullUrl: 'https://kwickbot.in/api/webhooks/shopify/orders',
    purpose: 'Receives real-time order creation and updates from Shopify stores to send instant WhatsApp confirmation messages to buyers.',
    gujaratiDescription: 'Shopify Store મા જ્યારે પણ નવો Order બને ત્યારે Kwickbot ને Automatic Signal મોકલવા માટે.',
    authRequired: false,
    headers: {
      'X-Shopify-Topic': 'orders/create',
      'X-Shopify-Hmac-Sha256': '<HMAC_SIGNATURE>',
      'X-Shopify-Shop-Domain': 'store.myshopify.com'
    },
    requestBody: {
      id: 8153713279138,
      name: "#1010",
      total_price: "1499.00",
      customer: {
        first_name: "Samarth",
        last_name: "Chavda",
        phone: "+919876543210",
        email: "samarth@example.com"
      }
    },
    responseExample: {
      success: true,
      message: "Webhook processed and WhatsApp confirmation triggered",
      orderId: "8153713279138"
    },
    codeSnippets: {
      curl: `curl -X POST https://kwickbot.in/api/webhooks/shopify/orders \\
  -H "X-Shopify-Topic: orders/create" \\
  -H "Content-Type: application/json" \\
  -d '{"id": 8153713279138, "name": "#1010", "total_price": "1499.00"}'`,
      javascript: `// Paste this URL inside Shopify Admin -> Settings -> Notifications -> Webhooks:
// https://kwickbot.in/api/webhooks/shopify/orders`,
      python: `# Managed automatically via Shopify Notifications Webhook Console`,
      php: `# Managed automatically via Shopify Notifications Webhook Console`
    }
  },
  {
    id: 'outbound_webhook',
    category: 'webhooks',
    title: 'Outbound Delivery & Reply Callback Webhook',
    method: 'POST',
    path: 'https://your-crm.com/api/kwickbot-webhook',
    fullUrl: 'Outbound HTTP POST to Client CRM Callback URL',
    purpose: 'Kwickbot pushes real-time delivery status updates (sent, delivered, read, failed) and incoming customer replies back to your CRM.',
    gujaratiDescription: 'જ્યારે WhatsApp Message સામે વાળા યુઝરને Delivered કે Read થાય અથવા સામો Reply આવે, ત્યારે તમારા CRM ને Instant Notification મોકલવા માટે.',
    authRequired: false,
    headers: {
      'Content-Type': 'application/json'
    },
    requestBody: {
      event: "message_status_update",
      messageId: "wamid.HBgMOTE5ODc2NTQzMjEw...",
      status: "delivered",
      recipientPhone: "919876543210",
      timestamp: "2026-09-26T12:45:00Z"
    },
    responseExample: {
      status: 200,
      received: true
    },
    codeSnippets: {
      curl: `# Test receiving outbound webhook in your CRM backend:
curl -X POST https://your-crm.com/api/kwickbot-webhook \\
  -H "Content-Type: application/json" \\
  -d '{"event": "message_status_update", "status": "delivered", "recipientPhone": "919876543210"}'`,
      javascript: `// Express.js handler in your CRM backend:
app.post('/api/kwickbot-webhook', (req, res) => {
  const { event, status, recipientPhone } = req.body;
  console.log('Kwickbot Status Update:', event, status, recipientPhone);
  res.status(200).send({ received: true });
});`,
      python: `# Flask / FastAPI handler in your CRM backend
@app.route('/api/kwickbot-webhook', methods=['POST'])
def handle_kwickbot():
    data = request.json
    print("Received Kwickbot update:", data)
    return jsonify({"received": True}), 200`,
      php: `<?php
// PHP Webhook Receiver Script in your CRM:
$json = file_get_contents('php://input');
$data = json_decode($json, true);
file_put_contents('kwickbot_webhook_log.txt', print_r($data, true), FILE_APPEND);
http_response_code(200);
echo json_encode(['received' => true]);`
    }
  },
  {
    id: 'broadcast_api',
    category: 'broadcast',
    title: 'Trigger Bulk Broadcast Campaign',
    method: 'POST',
    path: '/api/v1/broadcast/send',
    fullUrl: 'https://kwickbot.in/api/v1/broadcast/send',
    purpose: 'Trigger bulk WhatsApp broadcast campaigns programmatically for custom target segments created in your CRM.',
    gujaratiDescription: 'CRM માંથી એક સાથે 1,000 કે 5,000 ગ્રાહકોને Bulk WhatsApp Campaign મોકલવા માટે.',
    authRequired: true,
    headers: {
      'Authorization': 'Bearer <YOUR_KWICKBOT_API_KEY>',
      'Content-Type': 'application/json'
    },
    requestBody: {
      campaignName: "Diwali Festive Special Offer",
      templateName: "festive_discount_v1",
      recipients: [
        { phone: "919876543210", name: "Samarth" },
        { phone: "919898989898", name: "Rahul" }
      ]
    },
    responseExample: {
      success: true,
      broadcastId: "650c82f91a2b3c4d5e6f7a8b",
      totalQueued: 2,
      status: "processing"
    },
    codeSnippets: {
      curl: `curl -X POST https://kwickbot.in/api/v1/broadcast/send \\
  -H "Authorization: Bearer YOUR_KWICKBOT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "campaignName": "Diwali Offer",
    "templateName": "festive_discount_v1",
    "recipients": [{"phone": "919876543210", "name": "Samarth"}]
  }'`,
      javascript: `const res = await fetch('https://kwickbot.in/api/v1/broadcast/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_KWICKBOT_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    campaignName: 'Diwali Offer',
    templateName: 'festive_discount_v1',
    recipients: [{ phone: '919876543210', name: 'Samarth' }]
  })
});`,
      python: `import requests
res = requests.post('https://kwickbot.in/api/v1/broadcast/send', json={
    'campaignName': 'Diwali Offer',
    'templateName': 'festive_discount_v1',
    'recipients': [{'phone': '919876543210', 'name': 'Samarth'}]
}, headers={'Authorization': 'Bearer YOUR_KWICKBOT_API_KEY'})`,
      php: `<?php
// PHP cURL snippet for broadcast campaign API`
    }
  }
];

function DeveloperApi() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [apiKey, setApiKey] = useState('Loading...');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);

  useEffect(() => {
    fetchApiKey();
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

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredApis = API_LIST.filter(api => {
    const matchesTab = activeTab === 'all' || api.category === activeTab;
    const matchesSearch = api.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          api.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          api.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          api.gujaratiDescription.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="developer-api-container">
      {/* Header Banner */}
      <div className="dev-header">
        <div className="dev-header-content">
          <div className="dev-badge">
            <FaCode /> Developer API & Webhooks Portal
          </div>
          <h1>Developer REST API & Webhooks Integration Hub</h1>
          <p>
            Connect third-party CRMs, ERPs, Custom PHP/Node.js Websites, and Meta Cloud API Webhooks with Kwickbot.
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
                <FaEdit /> Change / Set Key
              </button>
            </div>

            <a 
              href="https://kwickbot.in/api/docs" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-swagger"
            >
              <FaBookOpen /> Open Live Swagger OpenAPI Docs <FaExternalLinkAlt style={{ fontSize: '12px' }} />
            </a>
          </div>
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
            All APIs ({API_LIST.length})
          </button>
          <button 
            className={`tab-item ${activeTab === 'whatsapp' ? 'active' : ''}`}
            onClick={() => setActiveTab('whatsapp')}
          >
            WhatsApp & Templates
          </button>
          <button 
            className={`tab-item ${activeTab === 'webhooks' ? 'active' : ''}`}
            onClick={() => setActiveTab('webhooks')}
          >
            Webhooks & Listeners
          </button>
          <button 
            className={`tab-item ${activeTab === 'broadcast' ? 'active' : ''}`}
            onClick={() => setActiveTab('broadcast')}
          >
            Broadcast Campaign
          </button>
        </div>
      </div>

      {/* API Cards Grid */}
      <div className="api-cards-grid">
        {filteredApis.length === 0 ? (
          <div className="no-apis-card">
            <FaServer style={{ fontSize: '40px', color: '#64748b' }} />
            <h3>No APIs match your search</h3>
            <p>Try searching with another keyword like "template", "order", or "webhook".</p>
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

                  {/* Request & Response Side-by-Side */}
                  <div className="code-split-container">
                    {item.requestBody && (
                      <div className="code-block-box">
                        <div className="code-block-header">
                          <span>Request Payload (JSON)</span>
                          <button 
                            className="btn-copy-code"
                            onClick={() => handleCopy(JSON.stringify(item.requestBody, null, 2), `${item.id}_req`)}
                          >
                            {copiedId === `${item.id}_req` ? <FaCheck style={{ color: '#10b981' }} /> : <FaCopy />}
                            {copiedId === `${item.id}_req` ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <pre className="code-content">
                          {JSON.stringify(item.requestBody, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="code-block-box">
                      <div className="code-block-header">
                        <span>Expected Response (JSON)</span>
                        <button 
                          className="btn-copy-code"
                          onClick={() => handleCopy(JSON.stringify(item.responseExample, null, 2), `${item.id}_res`)}
                        >
                          {copiedId === `${item.id}_res` ? <FaCheck style={{ color: '#10b981' }} /> : <FaCopy />}
                          {copiedId === `${item.id}_res` ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre className="code-content">
                        {JSON.stringify(item.responseExample, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Code Snippets Language Selector */}
                  <div className="snippet-section">
                    <div className="snippet-header">
                      <span><FaTerminal /> Client Integration Code Snippet:</span>
                      <div className="lang-buttons">
                        {['curl', 'javascript', 'python', 'php'].map((lang) => (
                          <button 
                            key={lang}
                            className={`lang-btn ${currentLang === lang ? 'active' : ''}`}
                            onClick={() => setSelectedLanguage({ ...selectedLanguage, [item.id]: lang })}
                          >
                            {lang.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="snippet-code-box">
                      <button 
                        className="btn-copy-code floating-copy"
                        onClick={() => handleCopy(item.codeSnippets[currentLang], `${item.id}_snippet_${currentLang}`)}
                      >
                        {copiedId === `${item.id}_snippet_${currentLang}` ? <FaCheck style={{ color: '#10b981' }} /> : <FaCopy />}
                        {copiedId === `${item.id}_snippet_${currentLang}` ? 'Copied Code!' : 'Copy Code'}
                      </button>
                      <pre className="code-content lang-code">
                        {item.codeSnippets[currentLang]}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Change / Set Custom Key Modal */}
      {showKeyModal && (
        <div className="modal-overlay" onClick={() => setShowKeyModal(false)}>
          <div className="modal-content-small" onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--bg-secondary, #0f172a)',
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
              તમારો કસ્ટમ **API Key** ટાઈપ કરો અથવા આપમેળે નવો સિક્રેટ કી (Random Secret Key) જનરેટ કરો:
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
