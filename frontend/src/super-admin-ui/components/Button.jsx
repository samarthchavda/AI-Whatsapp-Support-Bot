export default function Button({ variant = 'primary', size, block, icon, className = '', children, type = 'button', ...props }) {
  const classes = ['sa-btn', `sa-btn-${variant}`, size && `sa-btn-${size}`, block && 'sa-btn-block', icon && !children && 'sa-btn-icon', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} {...props}>
      {icon}
      {children}
    </button>
  );
}
