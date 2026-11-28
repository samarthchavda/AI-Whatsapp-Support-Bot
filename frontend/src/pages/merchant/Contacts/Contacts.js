import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaAddressBook, FaSearch, FaSync } from 'react-icons/fa';
import api from '../../../services/api';
import './Contacts.css';

const hasGrowthAccess = (admin) => {
  const plan = String(admin?.subscriptionPlan || '').toLowerCase();
  return ['growth', 'professional', 'pro'].includes(plan) &&
    admin?.subscriptionStatus === 'active' &&
    (!admin.subscriptionEndDate || new Date(admin.subscriptionEndDate) > new Date());
};

export default function Contacts({ admin }) {
  const allowed = hasGrowthAccess(admin);
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');
  const [error, setError] = useState('');
  const connected = Boolean(admin?.whatsappConnected || admin?.whatsappConnections?.some((item) => item.isActive !== false));

  const startSync = async () => {
    setSyncing(true);
    setSyncNotice('');
    setError('');
    try {
      const response = await api.post('/contacts/sync');
      setSyncNotice(response.data?.message || 'Contact sync started. Refresh this page in a few minutes.');
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not start contact sync. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!allowed) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/contacts', { params: { page, search: search.trim() } });
        if (cancelled) return;
        setContacts(response.data?.data || []);
        setTotal(response.data?.total || 0);
      } catch (requestError) {
        if (cancelled) return;
        setContacts([]);
        setError(requestError.response?.data?.error || 'Could not load contacts. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 250 : 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [allowed, page, search, refreshKey]);

  if (!allowed) return <div className="container contacts-page">
    <div className="contacts-empty"><FaAddressBook aria-hidden="true" /><h1>Contacts are in the Growth Plan</h1><p>Activate Growth to import WhatsApp Business App contacts and view your customer contacts here.</p><Link className="btn btn-primary" to="/dashboard/billing">View Growth Plan</Link></div>
  </div>;

  return <div className="container contacts-page">
    <div className="contacts-heading">
      <div><h1 className="page-title">WhatsApp Contacts</h1><p className="page-subtitle">Contacts from your connected WhatsApp Business App and customer conversations.</p></div>
      <div className="contacts-actions">
        {connected && <button type="button" className="btn btn-primary" onClick={startSync} disabled={syncing}><FaSync aria-hidden="true" /> {syncing ? 'Starting sync…' : 'Sync Business App contacts'}</button>}
        <button type="button" className="btn btn-secondary" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}><FaSync aria-hidden="true" /> Refresh list</button>
      </div>
    </div>
    <div className="contacts-info" role="note">Business App contacts arrive after a compatible WhatsApp connection completes syncing. Cloud API connections add customers when they message your business.</div>
    {syncNotice && <div className="contacts-notice" role="status">{syncNotice}</div>}
    <div className="contacts-toolbar">
      <label htmlFor="contacts-search"><FaSearch aria-hidden="true" /> Search contacts</label>
      <input id="contacts-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name or phone number" />
      <span>{total.toLocaleString('en-IN')} contacts</span>
    </div>
    {error && <div className="contacts-error" role="alert">{error}</div>}
    {loading ? <div className="contacts-empty" role="status">Loading contacts…</div> : contacts.length ? <>
      <div className="contacts-list" role="list" aria-label="WhatsApp contacts">
        {contacts.map((contact) => <div className="contacts-row" role="listitem" key={contact._id}>
          <div className="contacts-avatar" aria-hidden="true">{(contact.customerName && contact.customerName !== 'Customer' ? contact.customerName : contact.customerPhone || '?').charAt(0).toUpperCase()}</div>
          <div className="contacts-identity"><strong>{contact.customerName && contact.customerName !== 'Customer' ? contact.customerName : contact.customerPhone}</strong><span>{contact.customerPhone}</span></div>
          <span className="contacts-source">{contact.syncedFromWhatsAppApp ? 'WhatsApp Business App' : 'Conversation'}</span>
          <time>{contact.updatedAt ? new Date(contact.updatedAt).toLocaleDateString('en-IN') : '—'}</time>
        </div>)}
      </div>
      <div className="contacts-pagination"><button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page}</span><button className="btn btn-secondary" disabled={page * 25 >= total} onClick={() => setPage((value) => value + 1)}>Next</button></div>
    </> : !error && <div className="contacts-empty"><FaAddressBook aria-hidden="true" /><h2>No contacts yet</h2><p>{search ? 'No contacts match your search.' : 'Contacts will appear here when WhatsApp Business App sync completes or customers message your connected number.'}</p>{!connected && <Link className="btn btn-primary" to="/dashboard/whatsapp-connect">Connect WhatsApp</Link>}</div>}
  </div>;
}
