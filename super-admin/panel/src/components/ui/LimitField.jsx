import { useId } from 'react';

// Number input with an "Unlimited" checkbox. -1 means unlimited (backend convention).
export default function LimitField({ label, hint, value, onChange, disabled }) {
  const id = useId();
  const unlimited = Number(value) === -1;
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="limit-control">
        <input
          id={id}
          className="input"
          type="number"
          min="0"
          inputMode="numeric"
          value={unlimited ? '' : value ?? ''}
          placeholder={unlimited ? 'Unlimited' : '0'}
          disabled={disabled || unlimited}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
        <label className="check-inline">
          <input type="checkbox" checked={unlimited} disabled={disabled} onChange={(e) => onChange(e.target.checked ? -1 : 0)} />
          Unlimited
        </label>
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
