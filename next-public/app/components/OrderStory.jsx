'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FaShoppingBag, FaCheckDouble, FaTruck, FaComments, FaHeadset } from 'react-icons/fa';
import BrandMark from './BrandMark';

// Example conversation for a fictional customer. Each step maps to a workflow
// Kwickbot supports: store webhooks, mapped order templates, knowledge-base
// answers and Live Chat handoff.
const STEPS = [
  {
    icon: FaShoppingBag,
    kicker: 'Step 1 · Order placed',
    title: 'Your store tells Kwickbot instantly',
    copy: 'Shopify or WooCommerce sends the new order to Kwickbot by webhook, with the customer, items and total.',
    screen: [
      { kind: 'system', text: 'New order received from your store' },
      { kind: 'store' }
    ]
  },
  {
    icon: FaCheckDouble,
    kicker: 'Step 2 · Confirmation',
    title: 'An approved template confirms the order',
    copy: 'The order-confirmation template you mapped in Kwickbot goes out on WhatsApp automatically, filled with the order details.',
    screen: [
      { kind: 'out', tag: 'Order confirmation', text: 'Hi Priya, thanks for shopping with us! Your order #1042 for ₹2,499 is confirmed. We will message you when it ships.' }
    ]
  },
  {
    icon: FaTruck,
    kicker: 'Step 3 · Shipping update',
    title: 'Shipping updates follow on their own',
    copy: 'When the order is fulfilled, the shipped template sends the tracking details, so customers stop asking “where is my order?”.',
    screen: [
      { kind: 'out', tag: 'Order confirmation', text: 'Your order #1042 for ₹2,499 is confirmed.', faded: true },
      { kind: 'out', tag: 'Order shipped', text: 'Good news, Priya! Order #1042 is on its way. Track it here: track.example.com/1042' }
    ]
  },
  {
    icon: FaComments,
    kicker: 'Step 4 · Customer asks',
    title: 'AI answers from your own policies',
    copy: 'Questions about returns, sizes or delivery are answered from the documents you uploaded and the live order data.',
    screen: [
      { kind: 'out', tag: 'Order shipped', text: 'Order #1042 is on its way.', faded: true },
      { kind: 'in', text: 'Can I return it if the size doesn’t fit?' },
      { kind: 'out', text: 'Yes. Per the store’s return policy you can request a return after delivery. I can start that for you once it arrives.' }
    ]
  },
  {
    icon: FaHeadset,
    kicker: 'Step 5 · Human handoff',
    title: 'Your team takes over when it matters',
    copy: 'When a customer asks for a person or a rule is triggered, the AI pauses and the chat moves to Live Chat with full history.',
    screen: [
      { kind: 'in', text: 'I want to talk to someone about a refund.' },
      { kind: 'system', text: 'AI paused · routed to Live Chat' },
      { kind: 'out', text: 'Hi Priya, this is Rahul from the store team. I can help you with that refund.' }
    ]
  }
];

function Screen({ items }) {
  return items.map((item, i) => {
    const style = { animationDelay: `${i * 160}ms` };
    if (item.kind === 'system') return <span key={i} className="system-chip seq-item" style={style}>{item.text}</span>;
    if (item.kind === 'store') {
      return (
        <div key={i} className="store-card seq-item" style={style}>
          <div className="row"><strong>Order #1042</strong><span className="pill" style={{ padding: '2px 10px', fontSize: 12 }}>Paid</span></div>
          <div className="row"><span className="muted">Customer</span><span>Priya S.</span></div>
          <div className="row"><span className="muted">Items</span><span>Linen shirt × 1</span></div>
          <div className="row"><span className="muted">Total</span><strong>₹2,499</strong></div>
        </div>
      );
    }
    return (
      <div key={i} className={`bubble ${item.kind === 'in' ? 'bubble-in' : 'bubble-out'} seq-item`} style={{ ...style, opacity: item.faded ? 0.55 : undefined }}>
        {item.tag && <span className="tpl-tag">{item.tag}</span>}
        {item.text}
      </div>
    );
  });
}

export default function OrderStory() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef([]);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(Number(entry.target.dataset.index));
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="story">
      <ol className="story-steps" style={{ listStyle: 'none', margin: 0 }}>
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.kicker}
              ref={(el) => { stepRefs.current[index] = el; }}
              data-index={index}
              className={`story-step ${active === index ? 'active' : ''}`}
            >
              <span className="step-kicker"><Icon aria-hidden="true" /> {step.kicker}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
              <div className="story-mobile-preview" aria-hidden="true">
                <Screen items={step.screen} />
              </div>
            </li>
          );
        })}
      </ol>

      <div className="story-stage" aria-hidden="true">
        <div className="phone">
          <div className="phone-screen">
            <div className="phone-bar">
              <span className="preview-avatar"><BrandMark variant="dark" className="" /></span>
              <div>
                <strong>Your Store</strong>
                <span>Business account · WhatsApp</span>
              </div>
            </div>
            <div className="phone-body" key={active}>
              <Screen items={STEPS[active].screen} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
