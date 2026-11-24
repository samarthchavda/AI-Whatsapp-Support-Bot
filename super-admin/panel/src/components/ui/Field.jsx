import { useId } from 'react';

export default function Field({ label, hint, addon, id, ...inputProps }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>{label}</label>
      <div className="field-control">
        <input id={inputId} className="input" {...inputProps} />
        {addon}
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
