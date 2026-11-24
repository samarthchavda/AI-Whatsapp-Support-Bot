export default function Checkbox({ checked, onChange, label, desc, disabled }) {
  return (
    <label className={`checkbox ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span>
        <span className="checkbox-label">{label}</span>
        {desc && <span className="checkbox-desc">{desc}</span>}
      </span>
    </label>
  );
}
