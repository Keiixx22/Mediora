import { useState } from 'react';
import Core from '../../lib/core.js';
import { money, shortDate } from '../../lib/ui.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useModal } from '../../context/UiContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import { navigate } from '../../router.jsx';
import Button from '../ui/Button.jsx';
import { Notice } from '../ui/Card.jsx';
import { Chip } from '../ui/Chips.jsx';
import { FormError, Hint } from '../ui/Fields.jsx';
import Ticket from '../ui/Ticket.jsx';
import { useInvoice } from '../InvoiceDialog.jsx';
import PaymentStep from './PaymentStep.jsx';

/** Patient booking in a dialog: choose a day, pay within the 15-minute hold, get the queue number. */
export default function BookingFlow({ doctorId }) {
  useCoreRev();
  const { sess } = useSession();
  const { close } = useModal();
  const showInvoice = useInvoice();
  const [step, setStep] = useState('choose');
  const [date, setDate] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [appt, setAppt] = useState(null);

  if (step === 'pay') return <PaymentStep appt={appt} onPaid={(a) => { setAppt(a); setStep('done'); }} />;

  if (step === 'done') {
    return (
      <div className="[--notch:var(--color-surface)]">
        <Ticket label={appt.label} kicker="Your queue number" right={shortDate(appt.dateLabel)} foot={<span>{appt.doctorName}</span>} />
        <p className="mt-3">Payment received. We sent the confirmation by email and WhatsApp, and saved it in Notifications.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => {
              close();
              navigate('my-queue');
            }}
          >
            Open My Queue
          </Button>
          <Button onClick={() => showInvoice(appt.payment.id)}>View invoice</Button>
        </div>
      </div>
    );
  }

  const { doctor: d, dates } = Core.doctorDates(doctorId);
  const first = dates[0];
  const nearest = dates.find((x) => x.left > 0);
  const chosen = date && dates.some((x) => x.date === date && x.left > 0) ? date : nearest?.date ?? null;
  // FR-10: a full day moves the booking to the next working day, and the patient confirms the date first.
  const autoNote =
    first && first.left === 0 && nearest
      ? `${Core.fmtDate(first.date)} is fully booked, so we moved you to the next working day with space: ${Core.fmtDate(nearest.date)}.`
      : '';

  const confirmBooking = () => {
    try {
      setAppt(Core.book(sess, { doctorId, date: chosen }));
      setStep('pay');
    } catch (e) {
      if (e.code === 'FULL' || e.code === 'NOT_AVAILABLE') {
        // FR-14: someone took the last seat; offer the next date instead of failing.
        setDate(e.data.next || null);
        setNote(e.data.next ? `Someone just took the last seat on that day. The next day with space is ${Core.fmtDate(e.data.next)}. Confirm it below.` : 'That day is no longer available.');
        setError('');
      } else {
        setError(e.message);
      }
    }
  };

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-[42px] shrink-0 place-items-center rounded-[10px] bg-ticket tabular-nums text-xl font-bold text-ticket-ink">{d.letter}</span>
        <div>
          <strong>{d.name}</strong>
          <span className="block text-muted">
            {d.deptName} · {d.consultMin} min per patient · {money(d.fee)}
          </span>
        </div>
      </div>
      {(note || autoNote) && <Notice>{note || autoNote}</Notice>}
      {nearest ? (
        <>
          <h3 className="mt-3 mb-2 text-sm font-semibold text-muted">Choose a day</h3>
          <div role="group" aria-label="Available days" className="mb-3 flex flex-wrap gap-2">
            {dates.map((x) => (
              <Chip
                key={x.date}
                pressed={chosen === x.date}
                disabled={!x.left}
                className="!rounded-xl text-left"
                onClick={() => {
                  setDate(x.date);
                  setNote('');
                }}
              >
                <span className="block">{shortDate(Core.fmtDate(x.date))}</span>
                <span className="block text-xs font-medium opacity-85">{x.left ? `${x.left} of ${x.capacity} left` : 'Full'}</span>
              </Chip>
            ))}
          </div>
          <Hint>You get a queue number, not a fixed time. Arrive when your turn is near; we message you at {Core.config().alertThreshold} patients ahead.</Hint>
          <FormError>{error}</FormError>
          <div className="mt-3">
            <Button variant="primary" onClick={confirmBooking}>
              Continue to payment · {money(d.fee)}
            </Button>
          </div>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted">This doctor has no free day in the next 4 months.</p>
      )}
    </>
  );
}
