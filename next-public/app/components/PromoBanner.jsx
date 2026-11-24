'use client';

import { useEffect, useState } from 'react';

// Scrolling strip above the header with coupons and offers the Super Admin
// marked "Show on website". Hidden when there are none or the service is down.
const DISMISS_KEY = 'kb-promo-dismissed';

export default function PromoBanner() {
  const [items, setItems] = useState([]);
  const [copied, setCopied] = useState('');
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/sa-api/v1/public/promotions')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.success || !Array.isArray(json.data)) return;
        const list = json.data.filter((i) => i && i.text);
        let dismissed = '';
        try { dismissed = sessionStorage.getItem(DISMISS_KEY) || ''; } catch { /* storage blocked */ }
        const signature = list.map((i) => i.text).join('|');
        if (dismissed && dismissed === signature) setHidden(true);
        setItems(list);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!items.length || hidden) return null;

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(''), 2000);
    } catch { /* clipboard blocked */ }
  };

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, items.map((i) => i.text).join('|')); } catch { /* storage blocked */ }
    setHidden(true);
  };

  // The list is repeated so the scroll loops without a gap
  const row = (copyIndex) => items.map((item, i) => (
    <span className="promo-item" key={`${copyIndex}-${i}`} aria-hidden={copyIndex > 0 ? 'true' : undefined}>
      <span>{item.text}</span>
      {item.code && (
        <button
          type="button"
          className="promo-code"
          onClick={() => copy(item.code)}
          tabIndex={copyIndex > 0 ? -1 : 0}
          aria-label={`Copy code ${item.code}`}
        >
          {copied === item.code ? 'Copied' : item.code}
        </button>
      )}
      {item.endsAt && <span className="promo-meta">till {new Date(item.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
      <span className="promo-sep" aria-hidden="true">•</span>
    </span>
  ));

  return (
    <div className="promo-banner" role="region" aria-label="Offers">
      <div className="promo-track">
        <div className="promo-run">{row(0)}{row(1)}</div>
      </div>
      <button type="button" className="promo-close" onClick={dismiss} aria-label="Hide offers">×</button>
    </div>
  );
}
