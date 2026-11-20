// Kwickbot "Block K" mark. Geometry matches docs/brand/svg/kwickbot-mark.svg.
export default function BrandMark({ variant = 'light', className = 'brand-mark', title }) {
  const colors = variant === 'dark'
    ? { stem: '#F5F8EF', ai: '#B9DB97', low: '#F5F8EF' }
    : { stem: '#3D5A22', ai: '#8DBF64', low: '#3D5A22' };

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect x="8" y="7" width="13" height="50" rx="6.5" fill={colors.stem} />
      <path d="M31 29L50 10" fill="none" stroke={colors.ai} strokeWidth="13" strokeLinecap="round" />
      <path d="M31 36L51 55" fill="none" stroke={colors.low} strokeWidth="13" strokeLinecap="round" />
    </svg>
  );
}
