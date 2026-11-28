import React from 'react';
import { FaArrowRight, FaCheckCircle, FaCopy, FaExternalLinkAlt, FaPlug, FaServer, FaSync, FaWhatsapp } from 'react-icons/fa';

export default function WhatsAppCloudPanel({
  status,
  loading,
  error,
  embeddedLoading,
  disconnectingPhoneId,
  syncingHistoryPhoneId,
  historySyncNotice,
  historySyncError,
  reconnecting,
  onConnectBusinessApp,
  onConnectCloudApi,
  onSyncHistory,
  onDisconnect,
  onReconnect,
  onRetry,
  onOpenGuide,
  onCopyWebhookUrl,
  onCopyVerifyToken,
  copiedWebhookUrl,
  copiedVerifyToken,
  fallbackWebhookUrl
}) {
  const connections = status?.connections || [];
  const activeCount = connections.filter(connection => connection.isActive).length;
  const limit = status?.connectionLimit;
  const limitReached = limit !== -1 && Number.isFinite(limit) && activeCount >= limit;

  return (
    <div className="wa-connection-workspace">
      <section className="wa-connect-intro" aria-labelledby="wa-connect-title">
        <div>
          <span className="wa-eyebrow"><FaWhatsapp aria-hidden="true" /> Official WhatsApp Cloud API</span>
          <h2 id="wa-connect-title">Connect your WhatsApp numbers</h2>
          <p>Bring your Business App number or a Cloud API number into one Kwickbot workspace. Add another number whenever you have a free slot.</p>
        </div>
        <div className="wa-connection-count" aria-live="polite">
          <strong>{activeCount}{Number.isFinite(limit) && limit !== -1 ? ` / ${limit}` : ''}</strong>
          <span>connected {activeCount === 1 ? 'number' : 'numbers'}</span>
        </div>
      </section>

      {error && (
        <div className="wa-connect-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>Retry</button>
        </div>
      )}

      <section className="wa-connect-panel" aria-labelledby="wa-add-number-title">
        <div className="wa-panel-heading">
          <div>
            <h3 id="wa-add-number-title">Add a WhatsApp number</h3>
            <p>Choose how this number is currently used. Meta will guide you through the connection.</p>
          </div>
          <span className="wa-panel-note">Secure connection through Meta</span>
        </div>

        <div className="wa-connect-options">
          <div className="wa-connect-option">
            <span className="wa-option-icon"><FaWhatsapp aria-hidden="true" /></span>
            <div>
              <h4>Keep using your Business App</h4>
              <p>Connect an eligible number already used in the WhatsApp Business mobile app. Continue using the app while Kwickbot handles connected workflows.</p>
            </div>
            <button type="button" className="wa-connect-action wa-connect-action-primary" onClick={onConnectBusinessApp} disabled={embeddedLoading || limitReached}>
              {embeddedLoading ? 'Opening Meta…' : 'Connect Business App number'} <FaArrowRight aria-hidden="true" />
            </button>
          </div>
          <div className="wa-connect-option">
            <span className="wa-option-icon wa-option-icon-dark"><FaServer aria-hidden="true" /></span>
            <div>
              <h4>Connect a Cloud API number</h4>
              <p>Set up a dedicated WhatsApp Business Platform number through Meta, including numbers used for API testing.</p>
            </div>
            <button type="button" className="wa-connect-action wa-connect-action-secondary" onClick={onConnectCloudApi} disabled={embeddedLoading || limitReached}>
              {embeddedLoading ? 'Opening Meta…' : 'Connect Cloud API number'} <FaArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>

        {limitReached && (
          <p className="wa-limit-message" role="status">All {limit} number slots are in use. Disconnect a number before adding a different one.</p>
        )}
        <div className="wa-coexistence-note">
          <FaCheckCircle aria-hidden="true" />
          <span>Business App coexistence is available for eligible numbers. You can keep replying from your phone after connecting.</span>
        </div>
      </section>

      <section className="wa-connect-panel" aria-labelledby="wa-connected-title">
        <div className="wa-panel-heading">
          <div>
            <h3 id="wa-connected-title">Connected numbers</h3>
            <p>Manage every WhatsApp number linked to this workspace.</p>
          </div>
          <button type="button" className="wa-text-action" onClick={onRetry}>Refresh</button>
        </div>

        {historySyncNotice && <div className="wa-sync-notice" role="status">{historySyncNotice}</div>}
        {historySyncError && <div className="wa-connect-error wa-sync-error" role="alert"><span>{historySyncError}</span></div>}

        {loading ? (
          <p className="wa-connection-empty" role="status">Loading WhatsApp numbers…</p>
        ) : connections.length === 0 ? (
          <div className="wa-connection-empty"><FaPlug aria-hidden="true" /><span>No numbers connected yet. Choose one of the connection options above to get started.</span></div>
        ) : (
          <div className="wa-connection-list">
            {connections.map(connection => (
              <article className="wa-connection-row" key={connection.phoneNumberId}>
                <div className="wa-number-icon"><FaWhatsapp aria-hidden="true" /></div>
                <div className="wa-number-details">
                  <div className="wa-number-title">
                    <h4>{connection.displayPhoneNumber || connection.phoneNumberId}</h4>
                    <span className={connection.isActive ? 'wa-number-state' : 'wa-number-state wa-number-state-muted'}>
                      {connection.isActive ? 'Connected' : 'Inactive'}
                    </span>
                    {connection.isPrimary && <span className="wa-primary-tag">Primary</span>}
                  </div>
                  {connection.businessName && <p>{connection.businessName}</p>}
                  <small>Phone ID: {connection.phoneNumberId}{connection.businessAccountId ? ` · WABA ID: ${connection.businessAccountId}` : ''}</small>
                </div>
                <div className="wa-number-actions">
                  {connection.isActive && onSyncHistory && (
                    <button
                      type="button"
                      className="wa-sync-action"
                      onClick={() => onSyncHistory(connection.phoneNumberId)}
                      disabled={Boolean(syncingHistoryPhoneId) || Boolean(disconnectingPhoneId) || reconnecting}
                      aria-label={`Sync chat history for ${connection.displayPhoneNumber || connection.phoneNumberId}`}
                    >
                      <FaSync aria-hidden="true" /> {syncingHistoryPhoneId === connection.phoneNumberId ? 'Syncing…' : 'Sync chat history'}
                    </button>
                  )}
                  {!connection.isActive && connection.isPrimary && (
                    <button type="button" className="wa-reconnect-action" onClick={onReconnect} disabled={reconnecting || Boolean(disconnectingPhoneId)}>
                      {reconnecting ? 'Reconnecting…' : 'Reconnect'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="wa-disconnect-action"
                    onClick={() => onDisconnect(connection.phoneNumberId)}
                    disabled={Boolean(disconnectingPhoneId) || reconnecting || syncingHistoryPhoneId === connection.phoneNumberId}
                    aria-label={`Disconnect ${connection.displayPhoneNumber || connection.phoneNumberId}`}
                  >
                    {disconnectingPhoneId === connection.phoneNumberId ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="wa-connect-panel wa-setup-panel" aria-labelledby="wa-setup-title">
        <div className="wa-panel-heading">
          <div>
            <h3 id="wa-setup-title">How connection works</h3>
            <p>Three steps to start using a number with Kwickbot.</p>
          </div>
          <button type="button" className="wa-text-action" onClick={onOpenGuide}>Advanced guide <FaArrowRight aria-hidden="true" /></button>
        </div>
        <ol className="wa-setup-steps">
          <li><span>1</span><div><strong>Choose a number type</strong><p>Select your existing Business App number or a Cloud API number.</p></div></li>
          <li><span>2</span><div><strong>Approve access in Meta</strong><p>Complete Meta's sign in and select the WhatsApp Business account and phone number.</p></div></li>
          <li><span>3</span><div><strong>Check the number here</strong><p>Once connected, it appears above. Add another number if a slot is available.</p></div></li>
        </ol>
        <details className="wa-webhook-details">
          <summary>Webhook setup details</summary>
          <p>Use these values in Meta if your webhook needs manual verification.</p>
          <div className="wa-webhook-field">
            <label htmlFor="wa-callback-url">Callback URL</label>
            <div><input id="wa-callback-url" value={status?.webhookUrl || fallbackWebhookUrl} readOnly /><button type="button" onClick={onCopyWebhookUrl}><FaCopy aria-hidden="true" /> {copiedWebhookUrl ? 'Copied' : 'Copy'}</button></div>
          </div>
          <div className="wa-webhook-field">
            <label htmlFor="wa-verification-token">Verification token</label>
            <div><input id="wa-verification-token" value={status?.verifyToken || ''} readOnly /><button type="button" onClick={onCopyVerifyToken} disabled={!status?.verifyToken}><FaCopy aria-hidden="true" /> {copiedVerifyToken ? 'Copied' : 'Copy'}</button></div>
          </div>
          <a href="https://business.facebook.com/wa/manage/phone-numbers" target="_blank" rel="noopener noreferrer" className="wa-meta-link">Open Meta WhatsApp Manager <FaExternalLinkAlt aria-hidden="true" /></a>
        </details>
      </section>
    </div>
  );
}
