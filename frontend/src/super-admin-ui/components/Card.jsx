export default function Card({ title, action, pad = true, className = '', children }) {
  return (
    <section className={`sa-card ${pad ? 'sa-card-pad' : ''} ${className}`.trim()}>
      {(title || action) && (
        <div className="sa-card-head">
          {title && <h2 className="sa-card-title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
