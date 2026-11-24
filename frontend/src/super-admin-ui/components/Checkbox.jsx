export default function Checkbox({ checked, onChange, label, desc, disabled }) {
  return (
    <label className={`sa-checkbox ${disabled ? 'sa-is-disabled' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span>
        <span className="sa-checkbox-label">{label}</span>
        {desc && <span className="sa-checkbox-desc">{desc}</span>}
      </span>
    </label>
  );
}
