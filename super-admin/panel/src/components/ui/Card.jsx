export default function Card({ title, action, pad = true, className = '', children }) {
  return (
    <section className={`card ${pad ? 'card-pad' : ''} ${className}`.trim()}>
      {(title || action) && (
        <div className="card-head">
          {title && <h2 className="card-title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
