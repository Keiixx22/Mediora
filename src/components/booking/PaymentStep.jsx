import { useEffect } from 'react';
import Core from '../../lib/core.js';
import { money } from '../../lib/ui.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useModal, useToast } from '../../context/UiContext.jsx';
import { useNow } from '../../hooks/useCore.js';
import { useForm } from '../../hooks/useForm.js';
import Button from '../ui/Button.jsx';
import { Notice } from '../ui/Card.jsx';
import { Check, FormError, Radio } from '../ui/Fields.jsx';

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** FR-28 and the 15-minute hold: pay with a sandbox method, or watch the slot be released. */
export default function PaymentStep({ appt, onPaid }) {
  const { sess } = useSession();
  const { close } = useModal();
  const toast = useToast();
  const now = useNow(1000);
  const left = Date.parse(appt.holdExpiresAt) - now;
  const expired = left <= 0;

  useEffect(() => {
    if (expired) Core.tick(); // releases the held slot and notifies the patient
  }, [expired]);

  const { onSubmit, error, busy } = useForm(async (fd) => {
    const a = Core.pay(sess, appt.id, { method: fd.get('method'), simulate: fd.get('simulate') ? 'fail' : 'ok' });
    toast(`Booking confirmed: ${a.label}`, 'good');
    onPaid(a);
  });

  if (expired) {
    return (
      <>
        <FormError>This booking was released because payment did not arrive in time. Please book again.</FormError>
        <Button onClick={close}>Close</Button>
      </>
    );
  }

  return (
    <>
      <div className="mb-3">
        <strong>{appt.doctorName}</strong>
        <span className="block text-muted">
          {appt.dateLabel} · {appt.deptName}
        </span>
      </div>
      <Notice>
        Your slot is held for <strong className="tabular-nums">{mmss(left)}</strong>. Pay before then or it is released.
      </Notice>
      <form onSubmit={onSubmit}>
        <fieldset className="mb-3 rounded-lg border border-line px-3 py-2">
          <legend className="px-1 text-sm font-semibold">Payment method (sandbox)</legend>
          {Core.PAY_ONLINE.map((m, i) => (
            <Radio key={m} name="method" value={m} defaultChecked={i === 0}>
              {m}
            </Radio>
          ))}
        </fieldset>
        <Check name="simulate" value="fail">
          Simulate a failed payment (sandbox)
        </Check>
        <FormError>{error}</FormError>
        <div className="mt-3">
          <Button type="submit" variant="primary" disabled={busy}>
            Pay {money(appt.fee)}
          </Button>
        </div>
      </form>
    </>
  );
}
