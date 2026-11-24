export default function EmptyState({ title, children, action }) {
  return (
    <div className="empty">
      <h2 className="empty-title">{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
