export default function Button({ variant = 'primary', size, block, icon, className = '', children, type = 'button', ...props }) {
  const classes = ['btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', icon && !children && 'btn-icon', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} {...props}>
      {icon}
      {children}
    </button>
  );
}
