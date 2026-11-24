import { useId } from 'react';

export default function TextArea({ label, hint, rows = 3, ...props }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <textarea id={id} className="input textarea" rows={rows} {...props} />
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
