const TONE = {
  info: 'bg-info-bg text-info-fg',
  good: 'bg-good-bg text-good-fg',
  warn: 'bg-warn-bg text-warn-fg',
  bad: 'bg-bad-bg text-bad-fg',
  neutral: 'bg-neutral-bg text-neutral-fg',
  accent: 'bg-accent-bg text-accent-fg',
};

const STATUS_TONE = {
  Booked: 'info',
  'Checked-in': 'info',
  'In consultation': 'accent',
  Completed: 'good',
  Cancelled: 'neutral',
  'No-show': 'warn',
  Paid: 'good',
  Pending: 'warn',
  Refunded: 'neutral',
  sent: 'good',
  queued: 'warn',
  failed: 'bad',
  Active: 'good',
  Inactive: 'neutral',
  'On leave': 'warn',
};

/** A status chip. One per row, never squeezed. */
export default function Pill({ status, tone, children }) {
  const t = tone || STATUS_TONE[status] || 'neutral';
  return (
    <span className={`inline-block shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-semibold ${TONE[t]}`}>
      {children ?? status}
    </span>
  );
}
