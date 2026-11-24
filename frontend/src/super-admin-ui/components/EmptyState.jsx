export default function EmptyState({ title, children, action }) {
  return (
    <div className="sa-empty">
      <h2 className="sa-empty-title">{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
