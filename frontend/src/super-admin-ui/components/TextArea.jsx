import { useId } from 'react';

export default function TextArea({ label, hint, rows = 3, ...props }) {
  const id = useId();
  return (
    <div className="sa-field">
      <label className="sa-field-label" htmlFor={id}>{label}</label>
      <textarea id={id} className="sa-input sa-textarea" rows={rows} {...props} />
      {hint && <span className="sa-field-hint">{hint}</span>}
    </div>
  );
}
