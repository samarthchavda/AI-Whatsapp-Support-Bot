import { useEffect, useRef, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import Button from './Button';
import { errorMessage } from '../lib/saApi';

// Confirmation for actions that change a merchant's account. `confirmText`
// makes the person type a value (like the store name) before a destructive action.
export default function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger, confirmText, onConfirm, onClose }) {
  const ref = useRef(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setTyped('');
      setError('');
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const blocked = Boolean(confirmText) && typed.trim() !== confirmText;

  const submit = async (event) => {
    event.preventDefault();
    if (blocked || busy) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="sa-dialog" onClose={onClose} onCancel={(e) => { if (busy) e.preventDefault(); }}>
      <form onSubmit={submit} className="sa-dialog-body">
        <h2 className="sa-dialog-title">{title}</h2>
        <div className="sa-dialog-text">{children}</div>
        {confirmText && (
          <label className="sa-field">
            <span className="sa-field-label">Type <strong className="sa-mono">{confirmText}</strong> to confirm</span>
            <input className="sa-input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
        )}
        {error && (
          <div className="sa-alert sa-alert-error" role="alert">
            <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <div className="sa-dialog-actions">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} disabled={blocked || busy}>
            {busy ? 'Working' : confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
