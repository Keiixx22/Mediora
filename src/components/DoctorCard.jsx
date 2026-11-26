import Core from '../lib/core.js';
import { dayList, money, shiftLabel } from '../lib/ui.js';
import { Card } from './ui/Card.jsx';
import Button from './ui/Button.jsx';

function Fact({ k, children }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{k}</dt>
      <dd className="m-0 text-sm font-semibold">{children}</dd>
    </div>
  );
}

/** Doctor profile card (FR-5): department, work days, shift hours, fee, and the next free day. */
export default function DoctorCard({ doctor: d, role, onBook }) {
  return (
    <Card as="article" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span
          aria-label={`Queue letter ${d.letter}`}
          className="grid size-[42px] shrink-0 place-items-center rounded-2xl bg-ticket tabular-nums text-xl font-bold text-ticket-ink"
        >
          {d.letter}
        </span>
        <div className="min-w-0">
          <h3 className="m-0 text-base font-semibold">{d.name}</h3>
          <p className="text-muted">{d.deptName}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Fact k="Works">{dayList(d)}</Fact>
        <Fact k="Shift">{shiftLabel(d)}</Fact>
        <Fact k="Per patient">{d.consultMin} min</Fact>
        <Fact k="Seats per day">{d.capacity}</Fact>
        <Fact k="Fee">{money(d.fee)}</Fact>
      </dl>
      <p>
        {d.nextDate ? (
          <>
            Next: <strong>{Core.fmtDate(d.nextDate)}</strong> <span className="text-muted">{d.nextLeft} of {d.capacity} left</span>
          </>
        ) : (
          'No free day in the next 4 months'
        )}
      </p>
      <div className="mt-auto">
        {role === 'patient' ? (
          <Button variant="primary" disabled={!d.nextDate} onClick={() => onBook(d.id)}>
            Book
          </Button>
        ) : !role ? (
          <Button href="#login">Log in to book</Button>
        ) : null}
      </div>
    </Card>
  );
}
