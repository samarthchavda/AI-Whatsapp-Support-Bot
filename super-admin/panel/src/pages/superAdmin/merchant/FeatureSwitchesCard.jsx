import { useState } from 'react';
import Card from '../../../components/ui/Card';
import Switch from '../../../components/ui/Switch';
import api, { errorMessage } from '../../../lib/api';

// Same switches as the current panel: POST /super-admin/users/:id/toggle-*.
// Each endpoint flips the value, so the switch only sends when it differs.
const FEATURES = [
  {
    key: 'webBotEnabled',
    path: 'toggle-web-bot',
    label: 'WhatsApp Web (QR) connection',
    desc: 'Lets the merchant connect a number by scanning a QR code instead of the Cloud API',
    read: (u) => Boolean(u?.webBotEnabled)
  },
  {
    key: 'shopifyEnabled',
    path: 'toggle-shopify',
    label: 'Shopify integration',
    desc: 'Lets the merchant connect and sync a Shopify store',
    read: (u) => u?.shopifyEnabled !== false
  },
  {
    key: 'woocommerceEnabled',
    path: 'toggle-woocommerce',
    label: 'WooCommerce integration',
    desc: 'Lets the merchant connect and sync a WooCommerce store',
    read: (u) => u?.woocommerceEnabled !== false
  }
];

export default function FeatureSwitchesCard({ userId, user, onUserChange, onNotice }) {
  const [busy, setBusy] = useState(null);

  const flip = async (feature, on) => {
    if (feature.read(user) === on) return;
    setBusy(feature.key);
    try {
      const res = await api.post(`/super-admin/users/${userId}/${feature.path}`);
      const updated = res.data?.data;
      onUserChange({ [feature.key]: updated && feature.key in updated ? updated[feature.key] : on });
      onNotice({ tone: 'success', message: `${feature.label} turned ${on ? 'on' : 'off'}` });
    } catch (err) {
      onNotice({ tone: 'error', message: errorMessage(err, `Could not change ${feature.label.toLowerCase()}.`) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card title="Features">
      {FEATURES.map((feature) => (
        <div className="setting-row" key={feature.key}>
          <div>
            <div className="setting-label">{feature.label}</div>
            <div className="setting-desc">{feature.desc}</div>
          </div>
          <Switch
            checked={feature.read(user)}
            onChange={(on) => flip(feature, on)}
            disabled={!user || Boolean(busy)}
            label={feature.label}
          />
        </div>
      ))}
    </Card>
  );
}
