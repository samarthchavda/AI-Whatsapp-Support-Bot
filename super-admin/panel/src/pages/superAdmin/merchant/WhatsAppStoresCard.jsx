import { useEffect, useState } from 'react';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import api, { errorMessage } from '../../../lib/api';
import { formatDate } from '../../../lib/format';

// WhatsApp numbers come from the merchant record. "Check connection" asks Meta
// whether the primary number's token still works (POST .../verify-whatsapp).
// "Email offline alert" emails the merchant (POST .../alert-health-offline).
// Store status comes from GET /super-admin/integration-health.
export default function WhatsAppStoresCard({ userId, user, onReload, onNotice }) {
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const [confirmAlert, setConfirmAlert] = useState(false);
  const [stores, setStores] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    api.get('/super-admin/integration-health')
      .then((res) => {
        if (cancelled) return;
        const row = (res.data?.data?.merchants || []).find((m) => String(m._id) === String(userId));
        setStores(row || null);
      })
      .catch(() => { if (!cancelled) setStores(false); });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const connections = user?.whatsappConnections || [];

  const runCheck = async () => {
    setChecking(true);
    setCheck(null);
    try {
      const res = await api.post(`/super-admin/users/${userId}/verify-whatsapp`);
      const status = res.data?.status;
      setCheck({
        tone: status === 'connected' ? 'good' : 'bad',
        text: status === 'connected' ? 'Connected and working'
          : status === 'unconfigured' ? 'No Cloud API credentials saved'
            : 'Not working. The Meta token may be invalid or expired'
      });
      onReload();
    } catch (err) {
      setCheck({ tone: 'bad', text: errorMessage(err, 'Could not reach Meta to check') });
    } finally {
      setChecking(false);
    }
  };

  const sendAlert = async () => {
    const res = await api.post(`/super-admin/users/${userId}/alert-health-offline`);
    onNotice({ tone: 'success', message: res.data?.message || `Alert emailed to ${user.email}` });
  };

  const storeLine = (status) => (status === 'Active' ? 'Connected' : status === 'Inactive' ? 'Connected, not syncing' : 'Not connected');

  return (
    <Card title="WhatsApp and stores">
      <div className="setting-group">
        <div className="setting-group-label">WhatsApp numbers</div>
        {!user ? (
          <span className="skeleton" style={{ display: 'block', height: 40 }} />
        ) : connections.length === 0 ? (
          <p className="secondary">{user.whatsappConnected ? 'Connected (number details not saved)' : 'No WhatsApp number connected'}</p>
        ) : (
          connections.map((c) => (
            <div className="setting-row" key={c.phoneNumberId}>
              <div>
                <div className="setting-label num">{c.displayPhoneNumber || c.phoneNumberId}</div>
                <div className="setting-desc">
                  {c.businessName || 'WhatsApp number'}{c.connectedAt ? ` · since ${formatDate(c.connectedAt)}` : ''}
                </div>
              </div>
              <span className="cell-status">
                <span className={`dot ${c.isActive !== false ? 'is-on' : ''}`} aria-hidden="true" />
                {c.isActive !== false ? 'Active' : 'Off'}
              </span>
            </div>
          ))
        )}
        <div className="setting-row">
          <div>
            <div className="setting-label">Check connection</div>
            <div className="setting-desc">
              {check ? <span className={`inline-result is-${check.tone}`}>{check.text}</span> : 'Asks Meta whether the main number still works'}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={runCheck} disabled={!user || checking}>{checking ? 'Checking' : 'Check'}</Button>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Email offline alert</div>
            <div className="setting-desc">Emails the merchant that their WhatsApp is disconnected, with a reconnect link</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setConfirmAlert(true)} disabled={!user}>Send</Button>
        </div>
      </div>

      <div className="setting-group">
        <div className="setting-group-label">Stores</div>
        {stores === undefined ? (
          <span className="skeleton" style={{ display: 'block', height: 40 }} />
        ) : stores === false ? (
          <p className="secondary">Store status is not available right now</p>
        ) : (
          <>
            <div className="setting-row">
              <div className="setting-label">Shopify</div>
              <span className="secondary">{storeLine(stores?.shopifyStatus)}</span>
            </div>
            <div className="setting-row">
              <div className="setting-label">WooCommerce</div>
              <span className="secondary">{storeLine(stores?.wooStatus)}</span>
            </div>
            <div className="setting-row">
              <div className="setting-label">Last sync</div>
              <span className="secondary num">{stores?.lastSync ? formatDate(stores.lastSync) : 'Never'}</span>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmAlert}
        title="Email an offline alert?"
        confirmLabel="Send email"
        onConfirm={sendAlert}
        onClose={() => setConfirmAlert(false)}
      >
        {user ? `An email goes to ${user.email} saying their WhatsApp connection is offline and asking them to reconnect.` : ''}
      </ConfirmDialog>
    </Card>
  );
}
