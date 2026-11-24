// On/off switch. Uses a real checkbox so keyboard and screen readers work.
export default function Switch({ checked, onChange, disabled, label }) {
  return (
    <label className={`switch ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} aria-label={label} />
      <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
    </label>
  );
}
