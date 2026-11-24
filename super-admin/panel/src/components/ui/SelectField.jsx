import { useId } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SelectField({ label, hint, options, ...props }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="select-wrap">
        <select id={id} className="input" {...props}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
