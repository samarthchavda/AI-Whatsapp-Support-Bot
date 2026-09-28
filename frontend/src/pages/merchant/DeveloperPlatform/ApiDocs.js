import React, { useState } from 'react';
import { 
  FaBookOpen, 
  FaSearch, 
  FaTerminal, 
  FaCopy, 
  FaCheck, 
  FaExternalLinkAlt
} from 'react-icons/fa';
import './DeveloperPlatform.css';
import '../IntegrationPlatform/IntegrationDashboard.css';

const API_ENDPOINTS = [
  {
    id: 'send_template',
    category: 'whatsapp',
    title: 'Send Official WhatsApp Template Message',
    method: 'POST',
    path: '/api/v1/whatsapp/send-template',
    purpose: 'Send Meta-approved WhatsApp template notifications (order updates, shipping alerts, OTPs, reminders) to any phone number.',
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
        "2": "ORD-99210",
        "3": "₹2,499"
      }
    },
    responseExample: {
      success: true,
      messageId: "wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSQTIzOTQ4NzM5NDg3MzkwOAA=",
      status: "queued",
      recipient: "919876543210"
    },
    snippets: {
      curl: `curl -X POST https://kwickbot.in/api/v1/whatsapp/send-template \\
  -H "Authorization: Bearer YOUR_KWICKBOT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "919876543210",
    "templateName": "order_confirmation_v1",
    "language": "en",
    "variables": {
      "1": "Samarth Chavda",
      "2": "ORD-99210",
      "3": "₹2,499"
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
    variables: { '1': 'Samarth Chavda', '2': 'ORD-99210', '3': '₹2,499' }
  })
});
const data = await response.json();
console.log(data);`,
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
    "variables": {"1": "Samarth Chavda", "2": "ORD-99210", "3": "₹2,499"}
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
    'variables' => ['1' => 'Samarth Chavda', '2' => 'ORD-99210', '3' => '₹2,499']
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
    title: 'List Approved WhatsApp Message Templates',
    method: 'GET',
    path: '/api/v1/whatsapp/templates',
    purpose: 'Retrieve all Meta-approved templates associated with your WhatsApp Business Account for populating dropdown selections in your CRM.',
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
          components: [{ type: "BODY", text: "Hello {{1}}, order {{2}} for {{3}} is confirmed." }]
        }
      ]
    },
    snippets: {
      curl: `curl -X GET https://kwickbot.in/api/v1/whatsapp/templates \\
  -H "Authorization: Bearer YOUR_KWICKBOT_API_KEY"`,
      javascript: `const res = await fetch('https://kwickbot.in/api/v1/whatsapp/templates', {
  headers: { 'Authorization': 'Bearer YOUR_KWICKBOT_API_KEY' }
});
const data = await res.json();`,
      python: `import requests
res = requests.get('https://kwickbot.in/api/v1/whatsapp/templates', headers={'Authorization': 'Bearer YOUR_KWICKBOT_API_KEY'})
print(res.json())`,
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
    id: 'ingest_event',
    category: 'events',
    title: 'Ingest External CRM / ERP Event',
    method: 'POST',
    path: '/api/v1/events/ingest',
    purpose: 'Push custom business events (e.g. Lead Created, Payment Received, Contract Signed) from custom backends directly into Kwickbot pipeline.',
    authRequired: true,
    headers: {
      'Authorization': 'Bearer <YOUR_KWICKBOT_API_KEY>',
      'Content-Type': 'application/json'
    },
    requestBody: {
      eventType: "crm.lead.created",
      source: "odoo_custom_server",
      payload: {
        lead_id: 1849,
        customer_name: "Rahul Sharma",
        phone: "+919898989898",
        expected_revenue: 50000
      }
    },
    responseExample: {
      success: true,
      eventId: "evt_66f7d8c1e2b3c4d5e6f7a8b9",
      status: "queued"
    },
    snippets: {
      curl: `curl -X POST https://kwickbot.in/api/v1/events/ingest \\
  -H "Authorization: Bearer YOUR_KWICKBOT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "eventType": "crm.lead.created",
    "source": "my_crm",
    "payload": { "lead_id": 1849, "phone": "+919898989898" }
  }'`,
      javascript: `const res = await fetch('https://kwickbot.in/api/v1/events/ingest', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_KWICKBOT_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventType: 'crm.lead.created',
    source: 'my_crm',
    payload: { lead_id: 1849, phone: '+919898989898' }
  })
});
const data = await res.json();`,
      python: `import requests
res = requests.post('https://kwickbot.in/api/v1/events/ingest', json={
    'eventType': 'crm.lead.created',
    'source': 'my_crm',
    'payload': {'lead_id': 1849, 'phone': '+919898989898'}
}, headers={'Authorization': 'Bearer YOUR_KWICKBOT_API_KEY'})
print(res.json())`,
      php: `<?php
// PHP cURL snippet for event ingestion`
    }
  },
  {
    id: 'broadcast_api',
    category: 'broadcast',
    title: 'Trigger Bulk WhatsApp Broadcast Campaign',
    method: 'POST',
    path: '/api/v1/broadcast/send',
    purpose: 'Initiate bulk WhatsApp broadcast campaigns programmatically for segmented lists created in your CRM.',
    authRequired: true,
    headers: {
      'Authorization': 'Bearer <YOUR_KWICKBOT_API_KEY>',
      'Content-Type': 'application/json'
    },
    requestBody: {
      campaignName: "Festive Customer Offer",
      templateName: "festive_discount_v1",
      recipients: [
        { phone: "919876543210", name: "Samarth" },
        { phone: "919898989898", name: "Rahul" }
      ]
    },
    responseExample: {
      success: true,
      broadcastId: "66f7d8c1e2b3c4d5e6f7a8b0",
      totalQueued: 2,
      status: "processing"
    },
    snippets: {
      curl: `curl -X POST https://kwickbot.in/api/v1/broadcast/send \\
  -H "Authorization: Bearer YOUR_KWICKBOT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "campaignName": "Festive Offer",
    "templateName": "festive_discount_v1",
    "recipients": [{"phone": "919876543210", "name": "Samarth"}]
  }'`,
      javascript: `// Node.js fetch snippet for bulk broadcast API`,
      python: `# Python requests snippet for bulk broadcast API`,
      php: `<?php // PHP snippet for broadcast API`
    }
  }
];

function ApiDocs() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLang, setSelectedLang] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = API_ENDPOINTS.filter(ep => {
    const matchCat = activeCategory === 'all' || ep.category === activeCategory;
    const matchSearch = ep.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        ep.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        ep.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="dev-container">
      {/* Header */}
      <div className="dev-header">
        <div className="dev-header-content">
          <div className="dev-badge">
            <FaBookOpen /> REST API Reference
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>Interactive API Documentation</h1>
              <p>Complete documentation, request schemas, and code samples for integrating with Kwickbot WhatsApp APIs.</p>
            </div>
            <a 
              href="https://kwickbot.in/api/docs" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="quick-action-btn primary"
            >
              Open Swagger UI <FaExternalLinkAlt style={{ fontSize: '11px' }} />
            </a>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="integration-section-card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
            <FaSearch style={{ color: 'var(--text-muted, #98a2b3)' }} />
            <input 
              type="text" 
              placeholder="Search endpoints by path or name..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input, #f8fafc)',
                border: '1px solid var(--border-subtle, #d9e8f7)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'whatsapp', 'events', 'broadcast'].map(cat => (
              <button 
                key={cat}
                className={`quick-action-btn ${activeCategory === cat ? 'primary' : ''}`}
                style={{ fontSize: '12px', padding: '6px 14px' }}
                onClick={() => setActiveCategory(cat)}
              >
                {cat === 'all' ? 'All Endpoints' : cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Endpoints List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {filtered.map(item => {
          const currentLang = selectedLang[item.id] || 'curl';
          return (
            <div key={item.id} className="integration-section-card">
              {/* Endpoint Header */}
              <div className="section-header-row" style={{ marginBottom: '14px', borderBottom: '1px solid var(--border-subtle, #d9e8f7)', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span className={`status-tag ${item.method === 'POST' ? 'connected' : 'processing'}`} style={{ fontWeight: '800' }}>
                    {item.method}
                  </span>
                  <code style={{ fontSize: '14px', fontWeight: '700' }}>{item.path}</code>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{item.title}</h3>
              </div>

              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary, #667085)', marginBottom: '16px' }}>
                {item.purpose}
              </p>

              {/* Headers Table */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted, #98a2b3)', marginBottom: '8px' }}>
                  Required Headers
                </h4>
                <div style={{ background: 'var(--bg-input, #f8fafc)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border-subtle, #d9e8f7)', fontSize: '12.5px', fontFamily: 'monospace' }}>
                  {Object.entries(item.headers).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ color: 'var(--accent, #1677ff)', fontWeight: '600' }}>{k}:</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Request & Response Side by Side */}
              <div style={{ display: 'grid', gridTemplateColumns: item.requestBody ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '16px' }}>
                {item.requestBody && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary, #667085)' }}>Request Body (JSON)</span>
                      <button 
                        className="quick-action-btn" 
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        onClick={() => handleCopy(JSON.stringify(item.requestBody, null, 2), `${item.id}_req`)}
                      >
                        {copiedId === `${item.id}_req` ? <FaCheck style={{ color: '#16a36a' }} /> : <FaCopy />} {copiedId === `${item.id}_req` ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre style={{ background: '#09090b', color: '#f4f4f5', padding: '12px', borderRadius: '8px', fontSize: '12px', overflowX: 'auto', margin: 0 }}>
                      {JSON.stringify(item.requestBody, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary, #667085)' }}>Response Example (200 OK)</span>
                    <button 
                      className="quick-action-btn" 
                      style={{ padding: '2px 8px', fontSize: '11px' }}
                      onClick={() => handleCopy(JSON.stringify(item.responseExample, null, 2), `${item.id}_res`)}
                    >
                      {copiedId === `${item.id}_res` ? <FaCheck style={{ color: '#16a36a' }} /> : <FaCopy />} {copiedId === `${item.id}_res` ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre style={{ background: '#09090b', color: '#f4f4f5', padding: '12px', borderRadius: '8px', fontSize: '12px', overflowX: 'auto', margin: 0 }}>
                    {JSON.stringify(item.responseExample, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Code Snippets Language Selector */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary, #667085)' }}>
                    <FaTerminal /> Integration Code Snippet
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['curl', 'javascript', 'python', 'php'].map(lang => (
                      <button 
                        key={lang}
                        className={`quick-action-btn ${currentLang === lang ? 'primary' : ''}`}
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        onClick={() => setSelectedLang({ ...selectedLang, [item.id]: lang })}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="code-container">
                  <div className="code-header-bar">
                    <span>{currentLang.toUpperCase()} Code</span>
                    <button 
                      className="quick-action-btn" 
                      style={{ padding: '2px 8px', fontSize: '11px', background: 'transparent', border: 'none', color: '#a1a1aa' }}
                      onClick={() => handleCopy(item.snippets[currentLang], `${item.id}_snippet`)}
                    >
                      {copiedId === `${item.id}_snippet` ? <FaCheck style={{ color: '#10b981' }} /> : <FaCopy />} {copiedId === `${item.id}_snippet` ? 'Copied Code' : 'Copy Snippet'}
                    </button>
                  </div>
                  <pre className="code-body">
                    {item.snippets[currentLang]}
                  </pre>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ApiDocs;
