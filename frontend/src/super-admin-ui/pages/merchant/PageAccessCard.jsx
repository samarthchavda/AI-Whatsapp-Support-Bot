import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ConfirmDialog from '../../components/ConfirmDialog';
import SelectField from '../../components/SelectField';
import Switch from '../../components/Switch';
import api, { errorMessage } from '../../lib/saApi';

// Which dashboard pages this merchant sees.
// Server rule (services/permissionService.js): pages from the plan/profile
// (with customPermissionProfile overriding plan.allowedPages when set),
// plus allowedPages, minus deniedPages. Saved with PUT /super-admin/users/:id/effective-access.
const GROUP_LABELS = {
  kwickbot_crm: 'E-commerce pages',
  crm_integration: 'CRM pages',
  whatsapp_api: 'WhatsApp API pages',
  account_shared: 'Account pages'
};

export default function PageAccessCard({ userId, onNotice }) {
  const [access, setAccess] = useState(null);
  const [groups, setGroups] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [draft, setDraft] = useState(null);
  const [profileDraft, setProfileDraft] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    try {
      const [accessRes, metaRes, profilesRes] = await Promise.all([
        api.get(`/super-admin/users/${userId}/effective-access`),
        api.get('/super-admin/permission-profiles/metadata/canonical'),
        api.get('/super-admin/permission-profiles').catch(() => ({ data: { data: [] } }))
      ]);
      const data = accessRes.data?.data;
      setAccess(data);
      setGroups(metaRes.data?.data?.pageGroups || {});
      setProfiles(profilesRes.data?.data || []);
      setDraft(new Set(data?.effectiveAccess?.effectivePages || []));
      setProfileDraft(data?.overrides?.customPermissionProfile || '');
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load page access.'));
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const category = access?.plan?.category || 'kwickbot_crm';
  const shownGroups = useMemo(() => {
    if (!groups) return [];
    return [category, 'account_shared']
      .filter((key, i, all) => groups[key] && all.indexOf(key) === i)
      .map((key) => ({ key, label: GROUP_LABELS[key] || key, pages: groups[key] }));
  }, [groups, category]);

  const effective = useMemo(() => new Set(access?.effectiveAccess?.effectivePages || []), [access]);
  const allowed = access?.overrides?.allowedPages || [];
  const denied = access?.overrides?.deniedPages || [];
  const currentProfile = access?.overrides?.customPermissionProfile || '';
  const inPlan = (page) => (effective.has(page) && !allowed.includes(page)) || denied.includes(page);

  const shownKeys = shownGroups.flatMap((g) => g.pages.map((p) => p.key));
  const changed = draft ? shownKeys.filter((key) => draft.has(key) !== effective.has(key)) : [];
  const profileChanged = profileDraft !== currentProfile;
  const totalChanges = changed.length + (profileChanged ? 1 : 0);

  const toggle = (key, on) => {
    const next = new Set(draft);
    if (on) next.add(key);
    else next.delete(key);
    setDraft(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (profileChanged) {
        payload.customPermissionProfile = profileDraft || null;
      }
      if (changed.length > 0) {
        // Keep overrides for pages not shown here, recompute the shown ones
        const nextAllowed = allowed.filter((p) => !shownKeys.includes(p));
        const nextDenied = denied.filter((p) => !shownKeys.includes(p));
        shownKeys.forEach((key) => {
          const want = draft.has(key);
          if (want && !inPlan(key)) nextAllowed.push(key);
          if (!want && inPlan(key)) nextDenied.push(key);
        });
        payload.allowedPages = nextAllowed;
        payload.deniedPages = nextDenied;
      }
      await api.put(`/super-admin/users/${userId}/effective-access`, payload);
      await load();
      onNotice({ tone: 'success', message: 'Page access saved. The merchant sees the change right away.' });
    } catch (err) {
      onNotice({ tone: 'error', message: errorMessage(err, 'Could not save page access.') });
    } finally {
      setSaving(false);
    }
  };

  const resetToPlan = async () => {
    await api.put(`/super-admin/users/${userId}/effective-access`, { resetToPlanDefaults: true });
    await load();
    onNotice({ tone: 'success', message: 'Page access reset to the plan defaults' });
  };

  const profileOptions = [
    { value: '', label: `Use plan default (${access?.plan?.permissionProfile || access?.plan?.name || 'default'})` },
    ...profiles.map((p) => ({ value: p.key, label: `${p.name} (${p.key})` }))
  ];

  return (
    <Card
      title="Page access"
      action={access?.overrides?.hasOverrides ? <span className="sa-tag">Custom</span> : access ? <span className="sa-tag">Plan defaults</span> : null}
    >
      {error ? (
        <p className="sa-secondary">{error}</p>
      ) : !draft ? (
        <span className="sa-skeleton" style={{ display: 'block', height: 160 }} />
      ) : (
        <>
          <div className="sa-setting-group">
            <SelectField
              label="Permission profile override"
              value={profileDraft}
              options={profileOptions}
              onChange={(e) => setProfileDraft(e.target.value)}
              disabled={saving}
              hint={profileDraft
                ? 'Overrides the plan page list with this permission profile (without altering the plan for other merchants).'
                : 'Uses the pages and permissions defined by their current plan.'}
            />
          </div>
          {shownGroups.map((group) => (
            <div className="sa-setting-group" key={group.key}>
              <div className="sa-setting-group-label">{group.label}</div>
              {group.pages.map((page) => (
                <div className="sa-setting-row" key={page.key}>
                  <div>
                    <div className="sa-setting-label">
                      {page.label}
                      {draft.has(page.key) !== effective.has(page.key) && <span className="sa-changed-mark">Changed</span>}
                    </div>
                    <div className="sa-setting-desc">
                      {page.description}
                      {!inPlan(page.key) && effective.has(page.key) ? ' · added for this merchant' : ''}
                      {inPlan(page.key) && !effective.has(page.key) ? ' · hidden for this merchant' : ''}
                    </div>
                  </div>
                  <Switch checked={draft.has(page.key)} onChange={(on) => toggle(page.key, on)} label={page.label} disabled={saving} />
                </div>
              ))}
            </div>
          ))}
          <div className="sa-card-actions">
            {access?.overrides?.hasOverrides && (
              <Button variant="ghost" onClick={() => setConfirmReset(true)} disabled={saving} style={{ marginRight: 'auto' }}>
                Reset to plan
              </Button>
            )}
            <Button variant="secondary" disabled={!totalChanges || saving} onClick={() => { setDraft(new Set(effective)); setProfileDraft(currentProfile); }}>Discard</Button>
            <Button variant="primary" disabled={!totalChanges || saving} onClick={save}>
              {saving ? 'Saving' : totalChanges ? `Save ${totalChanges} change${totalChanges === 1 ? '' : 's'}` : 'Save'}
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="Reset page access to the plan?"
        confirmLabel="Reset"
        onConfirm={resetToPlan}
        onClose={() => setConfirmReset(false)}
      >
        Every page added or hidden and any custom permission profile override for this merchant goes back to what their plan includes.
      </ConfirmDialog>
    </Card>
  );
}
