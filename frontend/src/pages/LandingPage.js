import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowRight,
  FaBolt,
  FaBox,
  FaBrain,
  FaBroadcastTower,
  FaCheck,
  FaChartLine,
  FaComments,
  FaFileAlt,
  FaHeadset,
  FaLock,
  FaPlug,
  FaShieldAlt,
  FaWhatsapp,
  FaCommentDots
} from 'react-icons/fa';
import './LandingPage.css';

const metrics = [
  { value: '1.8s', label: 'median first reply' },
  { value: '82%', label: 'queries resolved by AI' },
  { value: '24/7', label: 'WhatsApp coverage' }
];

const howItWorksSteps = [
  {
    number: '01',
    title: 'Connect WhatsApp',
    description: 'Establish WhatsApp Cloud API connection or scan the secure QR code to pair your business number with our platform. Takes under 2 minutes.',
    badge: 'Step 1: Onboarding',
    visualType: 'connect'
  },
  {
    number: '02',
    title: 'Train FAQs & Policies',
    description: 'Feed your store FAQs, custom refund windows, and support documentation directly into the knowledge base. The AI learns your specific business policies.',
    badge: 'Step 2: Knowledge Ingestion',
    visualType: 'train'
  },
  {
    number: '03',
    title: 'Automate 24/7 Support',
    description: 'The AI WhatsApp Bot immediately begins resolving customer tracking queries, cancellation requests, and policy FAQs without agent intervention.',
    badge: 'Step 3: Auto-Resolution',
    visualType: 'automate'
  },
  {
    number: '04',
    title: 'Human Agency Handoff',
    description: 'If a customer asks for a human, expresses high frustration, or triggers refund escalations, the AI pauses and alerts your live support team.',
    badge: 'Step 4: Live Handoff',
    visualType: 'takeover'
  }
];

const workflows = [
  {
    icon: <FaBrain />,
    title: 'AI replies trained on your store',
    copy: 'Upload policies, product FAQs, delivery rules, and return flows so the bot answers like your support team.'
  },
  {
    icon: <FaBox />,
    title: 'Order status without agent effort',
    copy: 'Sync order data and let customers ask natural questions about tracking, cancellations, refunds, and COD status.'
  },
  {
    icon: <FaHeadset />,
    title: 'Human handoff when it matters',
    copy: 'Escalate angry, urgent, or high-value conversations into a live queue with context already attached.'
  },
  {
    icon: <FaBroadcastTower />,
    title: 'Broadcasts with operational control',
    copy: 'Send campaign updates, delivery notices, and payment reminders while monitoring delivery and reply volume.'
  }
];

const platformItems = [
  'WhatsApp Cloud API and WhatsApp Web support',
  'Shopify, WooCommerce, and webhook integrations',
  'Role-based admin and super-admin controls',
  'Conversation analytics, AI logs, and escalation tracking',
  'Knowledge base manager for policies and FAQs',
  'Secure auth with refresh-token session handling'
];

function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inbox');
  const [activeStep, setActiveStep] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi there! 👋 I am the AI WhatsApp Support Assistant. Ask me about features, pricing, human takeover, or track a mock order (try typing "track ORD-1017").' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');

    // Simulated AI response logic
    setTimeout(() => {
      let reply = '';
      const input = userMessage.toLowerCase();

      if (input.includes('price') || input.includes('pricing') || input.includes('cost') || input.includes('money')) {
        reply = '💰 We offer three simple plans:\n• **Starter ($29/mo):** 500 AI messages, standard knowledge base.\n• **Growth ($79/mo):** 2,500 AI messages, WooCommerce/Shopify sync, campaigns.\n• **Scale (Custom):** Unlimited volume, custom CRM integrations.';
      } else if (input.includes('feature') || input.includes('workflow') || input.includes('what can you do')) {
        reply = '🚀 Here is what I can automate on WhatsApp:\n1. Answer FAQ queries (returns, refunds, shipping rules).\n2. Real-time Order Tracking synced to Shopify/WooCommerce.\n3. Automatic Human Takeover (pauses AI and alerts you).\n4. Bulk template broadcast campaigns.';
      } else if (input.includes('human') || input.includes('takeover') || input.includes('pause') || input.includes('agent') || input.includes('escalat')) {
        reply = '🚨 **Instant Agent Handoff:** If a customer is frustrated, asks for a manager, or requests a refund, I automatically pause the AI bot, save their context, and alert your support team in the Live Chat CRM console.';
      } else if (input.includes('order') || input.includes('track') || input.includes('ord-')) {
        if (input.includes('1017')) {
          reply = '📦 **Order Status for #ORD-1017:**\n• **Status:** Delivered ✅\n• **Items:** Premium Leather Boots (x1)\n• **Total:** $142.00\n• **Tracking:** FEDEX888999\n• **Delivered Date:** Yesterday';
        } else {
          reply = '📦 I can fetch order statuses in real-time. Try typing "track ORD-1017" to see how I retrieve and present shipping logs!';
        }
      } else {
        reply = '👋 I am trained on your store catalog and FAQ policies. Ask me about "pricing", "features", "human handoff", or try typing "track ORD-1017" to see order status checking!';
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    }, 800);
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <button className="landing-logo" onClick={() => scrollToSection('top')} aria-label="AI Support Bot home">
            <FaCommentDots />
            <span>AI Support Bot</span>
          </button>

          <div className="landing-nav-links" aria-label="Primary navigation">
            <button onClick={() => scrollToSection('how-it-works')}>How it Works</button>
            <button onClick={() => scrollToSection('workflows')}>Workflows</button>
            <button onClick={() => navigate('/services')}>Services</button>
            <button onClick={() => navigate('/about')}>About Us</button>
            <button onClick={() => scrollToSection('pricing')}>Pricing</button>
          </div>

          <div className="landing-nav-actions">
            <button className="landing-link-button" onClick={() => navigate('/login')}>Sign in</button>
            <button className="landing-primary-button small" onClick={() => navigate('/book-demo')}>
              Book demo
            </button>
          </div>
        </div>
      </nav>

      <main id="top">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-kicker">
              <FaBolt />
              WhatsApp support automation for commerce teams
            </div>
            <h1>AI Support Bot</h1>
            <p className="landing-hero-lede">
              Run customer support, order updates, escalations, broadcasts, and analytics from one focused WhatsApp operations workspace.
            </p>
            <div className="landing-hero-actions">
              <button className="landing-primary-button" onClick={() => navigate('/book-demo')}>
                Book a demo <FaArrowRight />
              </button>
              <button className="landing-secondary-button" onClick={() => navigate('/login')}>
                Open dashboard
              </button>
            </div>
            <div className="landing-proof-row">
              {metrics.map((metric) => (
                <div className="landing-proof-item" key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="product-preview" aria-label="Product dashboard preview">
            <div className="preview-toolbar">
              <div>
                <span className="preview-label">Live inbox</span>
                <strong>WhatsApp Operations</strong>
              </div>
              <span className="preview-status">AI online</span>
            </div>

            <div className="preview-grid">
              <aside className="preview-sidebar">
                <button 
                  className={`preview-tab ${activeTab === 'inbox' ? 'active' : ''}`}
                  onClick={() => setActiveTab('inbox')}
                >
                  <FaComments /> Inbox <span>18</span>
                </button>
                <button 
                  className={`preview-tab ${activeTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setActiveTab('orders')}
                >
                  <FaBox /> Orders <span>42</span>
                </button>
                <button 
                  className={`preview-tab alert ${activeTab === 'escalations' ? 'active' : ''}`}
                  onClick={() => setActiveTab('escalations')}
                >
                  <FaHeadset /> Escalations <span>5</span>
                </button>
                <button 
                  className={`preview-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                  onClick={() => setActiveTab('analytics')}
                >
                  <FaChartLine /> Analytics
                </button>
              </aside>

              {activeTab === 'inbox' && (
                <div className="preview-conversation">
                  <div className="preview-message customer">
                    <span>Customer</span>
                    Is my order arriving today?
                  </div>
                  <div className="preview-message bot">
                    <span>AI assistant</span>
                    Yes. Order #ORD-1017 is out for delivery and should arrive between 4-7 PM.
                  </div>
                  <div className="preview-message note">
                    <FaCheck />
                    Tracking link sent. No agent needed.
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="preview-conversation scrollable-preview">
                  <div className="mock-order-row">
                    <div>
                      <strong>Order #ORD-1017</strong>
                      <span>Premium Leather Boots</span>
                    </div>
                    <span className="mock-badge success">Delivered</span>
                    <strong>$142.00</strong>
                  </div>
                  <div className="mock-order-row">
                    <div>
                      <strong>Order #ORD-1016</strong>
                      <span>Wireless Headphones</span>
                    </div>
                    <span className="mock-badge info">Shipped</span>
                    <strong>$89.50</strong>
                  </div>
                  <div className="mock-order-row">
                    <div>
                      <strong>Order #ORD-1015</strong>
                      <span>Smart Fitness Watch</span>
                    </div>
                    <span className="mock-badge warning">Processing</span>
                    <strong>$210.00</strong>
                  </div>
                </div>
              )}

              {activeTab === 'escalations' && (
                <div className="preview-conversation">
                  <div className="mock-escalation-alert">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="mock-badge urgent">URGENT ESCALATION</span>
                      <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Just now</span>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#e4e4e7', textAlign: 'left' }}>
                      Customer **917777777777** triggered high-priority keyword: *"I want a refund immediately, my order is late."*
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="preview-btn-success" onClick={() => navigate('/login')}>Pause AI & Takeover</button>
                      <button className="preview-btn-secondary" onClick={() => navigate('/login')}>View Logs</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="preview-conversation grid-analytics">
                  <div className="analytics-preview-card">
                    <span>AI Resolution Rate</span>
                    <strong>84.2%</strong>
                    <span className="percent-up">+2.4% this week</span>
                  </div>
                  <div className="analytics-preview-card">
                    <span>Avg Response Time</span>
                    <strong>1.2s</strong>
                    <span className="percent-down">-0.6s faster</span>
                  </div>
                  <div className="analytics-preview-card">
                    <span>Active Conversations</span>
                    <strong>248</strong>
                    <span className="percent-up">24/7 coverage</span>
                  </div>
                </div>
              )}

              <div className="preview-insights">
                <div>
                  <span>Resolution rate</span>
                  <strong>84.2%</strong>
                </div>
                <div>
                  <span>Urgent queue</span>
                  <strong>5</strong>
                </div>
                <div>
                  <span>Broadcast replies</span>
                  <strong>214</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="how-it-works-section">
          <div className="section-heading centered">
            <span>Operational Flow</span>
            <h2>How It Works in 4 Steps</h2>
            <p>From connection to automation and human collaboration, see how our bot integrates with your support desk.</p>
          </div>

          <div className="stepper-grid">
            <div className="stepper-nav">
              {howItWorksSteps.map((step, idx) => (
                <button
                  key={idx}
                  className={`stepper-nav-item ${activeStep === idx ? 'active' : ''}`}
                  onClick={() => setActiveStep(idx)}
                >
                  <span className="step-number">{step.number}</span>
                  <div className="step-content">
                    <span className="step-badge">{step.badge}</span>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="stepper-visual">
              <div className="stepper-visual-inner">
                {activeStep === 0 && (
                  <div className="visual-panel connect-visual">
                    <div className="qr-container">
                      <div className="qr-scanner-mock">
                        <FaWhatsapp className="qr-whatsapp-icon" />
                        <div className="qr-pattern-mock">
                          <div className="qr-dots"></div>
                        </div>
                      </div>
                      <div className="qr-status-indicator">
                        <span className="status-dot pulsing"></span>
                        <span>Waiting for QR Scan...</span>
                      </div>
                    </div>
                    <h4>Direct Connection</h4>
                    <p>Open WhatsApp on your phone, navigate to Linked Devices, and scan the QR code to activate support instantly.</p>
                  </div>
                )}

                {activeStep === 1 && (
                  <div className="visual-panel train-visual">
                    <div className="doc-list-mock">
                      <div className="doc-row-mock">
                        <FaFileAlt className="doc-icon-mock" />
                        <div>
                          <strong>shipping_policies.txt</strong>
                          <span>2.4 KB • Sync completed</span>
                        </div>
                        <span className="doc-badge-mock">Trained</span>
                      </div>
                      <div className="doc-row-mock">
                        <FaFileAlt className="doc-icon-mock" />
                        <div>
                          <strong>return_faqs.pdf</strong>
                          <span>182 KB • Sync completed</span>
                        </div>
                        <span className="doc-badge-mock">Trained</span>
                      </div>
                      <div className="doc-row-mock">
                        <FaFileAlt className="doc-icon-mock" />
                        <div>
                          <strong>product_catalog.json</strong>
                          <span>14.8 KB • 38 items updated</span>
                        </div>
                        <span className="doc-badge-mock">Synced</span>
                      </div>
                    </div>
                    <h4>AI Knowledge Library</h4>
                    <p>Drag and drop text guides, PDF files, or link your Shopify/WooCommerce store catalog. The AI updates its behavior instantly.</p>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="visual-panel automate-visual">
                    <div className="whatsapp-chat-mock">
                      <div className="chat-header-mock">
                        <FaWhatsapp />
                        <span>Store Support Chat</span>
                      </div>
                      <div className="chat-body-mock">
                        <div className="bubble-mock user">
                          Is there a shipping charge for orders below $50?
                        </div>
                        <div className="bubble-mock bot">
                          Yes! For orders under $50, our standard shipping fee is $4.99. Orders above $50 qualify for free shipping! 🚚
                        </div>
                        <div className="bubble-system-mock">
                          Resolved automatically by AI
                        </div>
                      </div>
                    </div>
                    <h4>Automated Resolution</h4>
                    <p>82%+ of common inquiries are handled instantly by the AI, requiring 0 human staff hours.</p>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="visual-panel takeover-visual">
                    <div className="whatsapp-chat-mock">
                      <div className="chat-header-mock">
                        <FaWhatsapp />
                        <span>Store Support Chat</span>
                      </div>
                      <div className="chat-body-mock">
                        <div className="bubble-mock user">
                          My package was damaged and I want a refund right now.
                        </div>
                        <div className="bubble-system-mock warning">
                          ⚠️ Frustration detected. Pausing bot...
                        </div>
                        <div className="bubble-mock bot agent">
                          Hi there, I am Sarah from customer support. I have taken over this chat. Let me process this refund right away!
                        </div>
                      </div>
                    </div>
                    <h4>Human Takeover Control</h4>
                    <p>Automatic takeover guarantees a smooth handoff. High-priority escalation lists notify your staff via email or sound alerts.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="workflows" className="landing-section">
          <div className="section-heading">
            <span>Core workflows</span>
            <h2>Built for the daily work of support teams</h2>
            <p>Less decoration, more operating leverage: every screen maps to a real task inside a WhatsApp support business.</p>
          </div>

          <div className="workflow-grid">
            {workflows.map((workflow) => (
              <article className="workflow-card" key={workflow.title}>
                <div className="workflow-icon">{workflow.icon}</div>
                <h3>{workflow.title}</h3>
                <p>{workflow.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="platform" className="platform-section">
          <div className="platform-copy">
            <span>Platform depth</span>
            <h2>A real startup-grade backend is already part of the product.</h2>
            <p>
              The UI is designed around the project you have: multi-tenant admins, WhatsApp connections, order syncing, AI logs, broadcasts, invoices, and demo request handling.
            </p>
            <button className="landing-secondary-button" onClick={() => navigate('/dashboard')}>
              View product console
            </button>
          </div>

          <div className="platform-list">
            {platformItems.map((item) => (
              <div className="platform-list-item" key={item}>
                <FaCheck />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="security-band">
          <div className="security-item">
            <FaShieldAlt />
            <div>
              <strong>Operational visibility</strong>
              <span>Track conversations, escalations, orders, AI responses, and broadcasts from one console.</span>
            </div>
          </div>
          <div className="security-item">
            <FaPlug />
            <div>
              <strong>Integration ready</strong>
              <span>Use the existing webhook and store integration layer instead of a mock marketing shell.</span>
            </div>
          </div>
          <div className="security-item">
            <FaLock />
            <div>
              <strong>Admin-safe access</strong>
              <span>Support for admin roles, super-admin views, and authenticated dashboard sessions.</span>
            </div>
          </div>
        </section>

        <section id="pricing" className="landing-section pricing-section">
          <div className="section-heading">
            <span>Pricing</span>
            <h2>Plans that fit growing WhatsApp support volume</h2>
            <p>Simple tiers for demo conversations, active stores, and larger support operations.</p>
          </div>

          <div className="pricing-grid">
            <article className="pricing-card">
              <h3>Starter</h3>
              <div className="price">$29<span>/month</span></div>
              <p>For small stores validating AI support.</p>
              <ul>
                <li><FaCheck /> 500 AI messages</li>
                <li><FaCheck /> WhatsApp connection</li>
                <li><FaCheck /> Knowledge base</li>
                <li><FaCheck /> Basic analytics</li>
              </ul>
              <button onClick={() => navigate('/book-demo')}>Start with demo</button>
            </article>

            <article className="pricing-card featured">
              <div className="pricing-tag">Best fit</div>
              <h3>Growth</h3>
              <div className="price">$79<span>/month</span></div>
              <p>For stores managing regular order and support volume.</p>
              <ul>
                <li><FaCheck /> 2,500 AI messages</li>
                <li><FaCheck /> Order sync and webhooks</li>
                <li><FaCheck /> Broadcast campaigns</li>
                <li><FaCheck /> Escalation queue</li>
                <li><FaCheck /> Advanced analytics</li>
              </ul>
              <button onClick={() => navigate('/book-demo')}>Book demo</button>
            </article>

            <article className="pricing-card">
              <h3>Scale</h3>
              <div className="price">Custom</div>
              <p>For teams needing higher limits and custom workflows.</p>
              <ul>
                <li><FaCheck /> Custom message volume</li>
                <li><FaCheck /> Dedicated onboarding</li>
                <li><FaCheck /> Custom integrations</li>
                <li><FaCheck /> Super-admin controls</li>
              </ul>
              <button onClick={() => navigate('/book-demo')}>Talk to sales</button>
            </article>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="footer-brand-container">
          <div className="footer-brand">
            <FaCommentDots />
            <span>AI Support Bot</span>
          </div>
          <p>WhatsApp support automation for real commerce operations.</p>
        </div>
        
        <div className="footer-links-grid">
          <div className="footer-links-col">
            <h4>Product</h4>
            <button onClick={() => scrollToSection('how-it-works')}>How it works</button>
            <button onClick={() => scrollToSection('workflows')}>Workflows</button>
            <button onClick={() => scrollToSection('pricing')}>Pricing</button>
          </div>
          <div className="footer-links-col">
            <h4>Company</h4>
            <button onClick={() => navigate('/about')}>About Us</button>
            <button onClick={() => navigate('/services')}>Services</button>
            <button onClick={() => navigate('/privacy')}>Privacy Policy</button>
          </div>
          <div className="footer-links-col">
            <h4>Account</h4>
            <button onClick={() => navigate('/login')}>Sign In</button>
            <button onClick={() => navigate('/book-demo')}>Book Demo</button>
          </div>
        </div>

        <div className="footer-cta-container">
          <button className="footer-cta-btn" onClick={() => navigate('/book-demo')}>Book demo <FaArrowRight /></button>
        </div>
      </footer>

      {/* Floating WhatsApp Demo Widget */}
      <div className={`floating-chat-widget ${isChatOpen ? 'open' : ''}`}>
        {!isChatOpen ? (
          <button 
            className="chat-trigger-button" 
            onClick={() => setIsChatOpen(true)}
            aria-label="Open AI Demo Chat"
          >
            <FaWhatsapp />
            <span className="pulse-notification">1</span>
          </button>
        ) : (
          <div className="widget-chat-window">
            <div className="widget-chat-header">
              <FaWhatsapp className="widget-chat-icon" />
              <div>
                <h4>AI Support Assistant</h4>
                <span>Online • Powered by Gemini</span>
              </div>
              <button className="widget-chat-close-btn" onClick={() => setIsChatOpen(false)}>×</button>
            </div>

            <div className="widget-chat-messages">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`widget-chat-bubble ${msg.role}`}>
                  <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{msg.content}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} className="widget-chat-input">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type 'pricing', 'features'..."
                required
              />
              <button type="submit"><FaArrowRight /></button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default LandingPage;
