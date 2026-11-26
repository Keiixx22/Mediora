/** The queue number as a paper ticket. Styles live in index.css (.ticket). */
export default function Ticket({ label, kicker = 'Queue number', right = '', foot, small = false, live = false, className = '' }) {
  return (
    <div className={`ticket ${small ? 'ticket-sm' : ''} ${className}`}>
      <div className="flex justify-between gap-2 text-xs text-ticket-dim">
        <span>{kicker}</span>
        <span>{right}</span>
      </div>
      <div className="ticket-no" aria-live={live ? 'polite' : undefined}>
        {label}
      </div>
      {foot && <div className="ticket-foot">{foot}</div>}
    </div>
  );
}
