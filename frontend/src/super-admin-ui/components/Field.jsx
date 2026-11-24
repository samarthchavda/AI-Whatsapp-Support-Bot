import { useId } from 'react';

export default function Field({ label, hint, addon, id, ...inputProps }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className="sa-field">
      <label className="sa-field-label" htmlFor={inputId}>{label}</label>
      <div className="sa-field-control">
        <input id={inputId} className="sa-input" {...inputProps} />
        {addon}
      </div>
      {hint && <span className="sa-field-hint">{hint}</span>}
    </div>
  );
}
