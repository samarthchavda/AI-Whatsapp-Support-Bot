'use client';

// Product mockups for the Services page. They mirror real Kwickbot screens
// (Live Chat, orders, knowledge base, broadcasts, developer API, usage) and use
// clearly-labelled example data. Animations start when the mock scrolls into
// view (MotionProvider adds .is-visible to [data-reveal]).

import React from 'react';
import {
  FaCheck, FaFilePdf, FaPaperPlane, FaRobot, FaUserTie, FaSearch,
  FaShoppingBag, FaTruck, FaComments, FaCheckDouble, FaClock, FaUsers, FaShoppingCart
} from 'react-icons/fa';
import { SiShopify, SiWoocommerce, SiWhatsapp, SiMeta } from 'react-icons/si';
import BrandMark from './BrandMark';

function Window({ title, children, dark = false, note = 'Example data' }) {
  return (
    <figure className={`mock ${dark ? 'mock-dark' : ''}`} data-reveal="up">
      <div className="mock-bar">
        <span className="mock-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="mock-title">{title}</span>
      </div>
      <div className="mock-body">{children}</div>
      {note && <figcaption className="mock-note">{note}</figcaption>}
    </figure>
  );
}

/* ---------- Hero: live connection flow ---------- */
export function FlowHero() {
  const Node = ({ n, icon: Icon, mark, title, sub, variant }) => (
    <div className={`flow-node fh-node ${variant || ''}`} style={{ '--n': n }}>
      <span className="icon-chip" style={variant === 'ai' ? { background: '#FFFFFF' } : undefined}>
        {mark ? <BrandMark className="" /> : <Icon aria-hidden="true" />}
      </span>
      <div>{title}<small>{sub}</small></div>
    </div>
  );
  const Wire = ({ n }) => <span className="flow-wire" style={{ '--n': n }} aria-hidden="true"><i /></span>;

  return (
    <div className="flow-hero" role="img" aria-label="A WhatsApp message flows from the Cloud API to the Kwickbot AI layer, uses Shopify or WooCommerce data, and can be handed to your team">
      <span className="eyebrow" style={{ color: 'var(--deep)' }}>Live connection</span>
      <Node n={0} icon={SiWhatsapp} title="WhatsApp Cloud API" sub="Customer messages & templates" />
      <Wire n={0} />
      <Node n={1} mark title="Kwickbot AI layer" sub="Knowledge, rules & routing" variant="ai" />
      <Wire n={1} />
      <div className="flow-store-row">
        <Node n={2} icon={SiShopify} title="Shopify" sub="Orders & fulfilments" />
        <Node n={2} icon={SiWoocommerce} title="WooCommerce" sub="Store operations" />
      </div>
      <Wire n={2} />
      <Node n={3} icon={FaUserTie} title="Your team" sub="Live chat & escalations" variant="human" />
    </div>
  );
}

/* ---------- Support: Live Chat inbox ---------- */
export function InboxMock() {
  const chats = [
    { initials: 'PM', name: 'Priya Mehta', last: 'Where is my order #1042?', tag: 'AI', tone: 'ai', active: true },
    { initials: 'RK', name: 'Rahul Kumar', last: 'I want a refund, wrong size', tag: 'Escalated', tone: 'warn' },
    { initials: 'AS', name: 'Ananya Shah', last: 'Is COD available in Pune?', tag: 'AI', tone: 'ai' }
  ];
  return (
    <Window title="Kwickbot · Live chat">
      <div className="inbox">
        <ul className="inbox-list">
          {chats.map((c, i) => (
            <li key={c.name} className={`inbox-row anim-item ${c.active ? 'active' : ''}`} style={{ '--k': i }}>
              <span className="avatar">{c.initials}</span>
              <span className="inbox-text"><strong>{c.name}</strong><span>{c.last}</span></span>
              <span className={`tag tag-${c.tone}`}>{c.tag}</span>
            </li>
          ))}
        </ul>
        <div className="inbox-thread">
          <div className="thread-head">
            <strong>Priya Mehta</strong>
            <span className="mode-switch" aria-hidden="true">
              <span className="mode mode-ai"><FaRobot /> AI replying</span>
              <span className="mode mode-agent"><FaUserTie /> Agent took over</span>
            </span>
          </div>
          <div className="thread-body">
            <div className="bubble bubble-in anim-item" style={{ '--k': 1 }}>Where is my order #1042?</div>
            <div className="bubble bubble-out anim-item" style={{ '--k': 2 }}>It shipped yesterday. Here is your tracking link. It should arrive in 2–3 days.</div>
            <div className="bubble bubble-in anim-item" style={{ '--k': 3 }}>Can someone change my delivery address?</div>
            <div className="system-chip anim-item" style={{ '--k': 4 }}>AI paused · assigned to agent</div>
            <div className="bubble bubble-out agent anim-item" style={{ '--k': 5 }}>Hi Priya, I’m Rahul from the store. I’ve updated the address for you.</div>
          </div>
          <div className="thread-compose" aria-hidden="true"><span>Reply as agent…</span><FaPaperPlane /></div>
        </div>
      </div>
    </Window>
  );
}

/* ---------- Orders: automated timeline ---------- */
export function OrderTimelineMock() {
  const events = [
    { icon: FaShoppingBag, title: 'Order received from Shopify', meta: 'Webhook · orders/create', time: '10:02' },
    { icon: SiWhatsapp, title: 'Order confirmation template sent', meta: 'order_confirmation · Sent', time: '10:02' },
    { icon: FaTruck, title: 'Shipping update sent', meta: 'order_shipped · tracking link', time: 'Next day' },
    { icon: FaComments, title: 'Return question answered by AI', meta: 'From return-policy.pdf', time: 'Day 3' }
  ];
  return (
    <Window title="Kwickbot · Order #1042">
      <div className="order-head anim-item" style={{ '--k': 0 }}>
        <div><strong>Order #1042</strong><span>Priya S. · Linen shirt × 1</span></div>
        <div className="order-total">₹2,499<span className="pill" style={{ padding: '2px 10px', fontSize: 12 }}>Paid</span></div>
      </div>
      <ol className="timeline">
        {events.map((e, i) => (
          <li key={e.title} className="timeline-item anim-item" style={{ '--k': i + 1 }}>
            <span className="timeline-dot"><e.icon aria-hidden="true" /></span>
            <span className="timeline-text"><strong>{e.title}</strong><span>{e.meta}</span></span>
            <span className="timeline-time">{e.time}</span>
            <span className="timeline-check"><FaCheck aria-hidden="true" /></span>
          </li>
        ))}
      </ol>
    </Window>
  );
}

/* ---------- Knowledge base: upload + test question ---------- */
export function KnowledgeMock() {
  return (
    <Window title="Kwickbot · Knowledge base">
      <div className="kb-files">
        {[
          { name: 'return-policy.pdf', size: '184 KB', delay: 0 },
          { name: 'shipping-and-cod-faq.pdf', size: '96 KB', delay: 1 }
        ].map((f) => (
          <div key={f.name} className="kb-file anim-item" style={{ '--k': f.delay }}>
            <span className="kb-icon"><FaFilePdf aria-hidden="true" /></span>
            <span className="kb-meta">
              <strong>{f.name}</strong>
              <span className="kb-progress"><i style={{ '--k': f.delay }} /></span>
            </span>
            <span className="kb-state"><span className="kb-processing">Processing…</span><span className="kb-ready"><FaCheck aria-hidden="true" /> Ready</span></span>
          </div>
        ))}
      </div>
      <div className="kb-test anim-item" style={{ '--k': 3 }}>
        <span className="kb-test-label"><FaSearch aria-hidden="true" /> Test a question</span>
        <div className="kb-q">What is your return window?</div>
        <div className="kb-a">
          Returns are accepted within 7 days of delivery for unused items.
          <span className="kb-source">Source: return-policy.pdf</span>
        </div>
      </div>
    </Window>
  );
}

/* ---------- Campaigns: broadcast + cart recovery ---------- */
export function CampaignMock() {
  return (
    <Window title="Kwickbot · Broadcasts">
      <div className="camp">
        <div className="camp-preview anim-item" style={{ '--k': 0 }}>
          <span className="camp-img" aria-hidden="true">Header image</span>
          <p><strong>Festive sale is live</strong><br />Hi {'{{1}}'}, enjoy 20% off sitewide until Sunday.</p>
          <span className="camp-btn">Shop now</span>
        </div>
        <div className="camp-side">
          <div className="camp-row anim-item" style={{ '--k': 1 }}><FaUsers aria-hidden="true" /><span>Audience</span><strong>2,410 from CSV</strong></div>
          <div className="camp-row anim-item" style={{ '--k': 2 }}><FaClock aria-hidden="true" /><span>Schedule</span><strong>Sat, 10:00 AM</strong></div>
          <div className="camp-stats anim-item" style={{ '--k': 3 }}>
            <div className="camp-stat"><span>Sent</span><strong>2,388</strong><span className="bar"><i className="bar-ok" /></span></div>
            <div className="camp-stat"><span>Failed</span><strong>22</strong><span className="bar"><i className="bar-fail" /></span></div>
          </div>
          <div className="camp-row cart anim-item" style={{ '--k': 4 }}>
            <FaShoppingCart aria-hidden="true" /><span className="cart-text">Cart · Ananya S.</span>
            <span className="tag tag-ai"><FaCheckDouble aria-hidden="true" /> Reminder sent</span>
          </div>
        </div>
      </div>
    </Window>
  );
}

/* ---------- Developer API: typed request + webhook log ---------- */
export function ApiMock() {
  const lines = [
    { t: 'curl -X POST https://kwickbot.in/api/v1/messages/send \\', c: 'cmd' },
    { t: '  -H "Authorization: Bearer kw_live_••••••••" \\', c: 'str' },
    { t: '  -H "Content-Type: application/json" \\', c: 'str' },
    { t: '  -d \'{ "to": "919876543210",', c: 'str' },
    { t: '        "templateName": "order_confirmation",', c: 'str' },
    { t: '        "variables": ["Priya", "#1042"] }\'', c: 'str' }
  ];
  return (
    <Window title="Terminal · Kwickbot REST API" dark note="Example request">
      <pre className="code" aria-label="Example API request to send a WhatsApp template">
        {lines.map((l, i) => (
          <span key={i} className={`code-line ${l.c}`} style={{ '--k': i, '--n': l.t.length }}>{l.t}</span>
        ))}
        <span className="code-line res" style={{ '--k': lines.length + 1, '--n': 52 }}>{'{ "success": true, "messageId": "wamid.HBgMOTE5…" }'}</span>
      </pre>
      <div className="hooks">
        <span className="hooks-title">Your webhook endpoint</span>
        {[
          { e: 'messages.received', s: '200 OK' },
          { e: 'webhook.test_ping', s: '200 OK' }
        ].map((h, i) => (
          <div key={h.e} className="hook-row anim-item" style={{ '--k': 8 + i }}>
            <code>{h.e}</code><span className="hook-ok">{h.s}</span>
          </div>
        ))}
      </div>
    </Window>
  );
}

/* ---------- Governance: usage meters ---------- */
export function UsageMock() {
  const meters = [
    { label: 'Conversations', value: '1,284 / 2,000', pct: 64 },
    { label: 'Messages', value: '6,120 / 10,000', pct: 61 },
    { label: 'AI tokens', value: '38% of monthly limit', pct: 38 }
  ];
  return (
    <Window title="Kwickbot · Usage & plan">
      <div className="usage">
        {meters.map((m, i) => (
          <div key={m.label} className="usage-row anim-item" style={{ '--k': i }}>
            <div className="usage-top"><span>{m.label}</span><strong>{m.value}</strong></div>
            <span className="meter"><i style={{ '--pct': `${m.pct}%`, '--k': i }} /></span>
          </div>
        ))}
        <div className="usage-foot anim-item" style={{ '--k': 4 }}>
          <span className="pill"><SiMeta aria-hidden="true" /> WhatsApp connected</span>
          <span className="pill pill-white">Plan · Growth</span>
        </div>
      </div>
    </Window>
  );
}
