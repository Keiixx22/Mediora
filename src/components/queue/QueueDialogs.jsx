import Core from '../../lib/core.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useModal, useToast } from '../../context/UiContext.jsx';
import { useForm } from '../../hooks/useForm.js';
import Button from '../ui/Button.jsx';
import { FormError, Hint, Input, Select } from '../ui/Fields.jsx';
import Pill from '../ui/Pill.jsx';

/** FR-29: staff record cash or other on-site payments. */
export function RecordPaymentForm({ apptId }) {
  const { sess } = useSession();
  const { close } = useModal();
  const toast = useToast();
  const { onSubmit, error } = useForm(async (fd) => {
    Core.recordPayment(sess, apptId, fd.get('method'));
    toast('Payment recorded.', 'good');
    close();
  });
  return (
    <form onSubmit={onSubmit}>
      <Select id="method" label="Payment method" options={Core.PAY_ONSITE.map((m) => [m, m])} />
      <FormError>{error}</FormError>
      <Button type="submit" variant="primary">
        Record payment
      </Button>
    </form>
  );
}

/** A skipped patient arrives late: staff re-insert them; the override and its reason are logged. */
export function ReinsertForm({ apptId }) {
  const { sess } = useSession();
  const { close } = useModal();
  const toast = useToast();
  const { onSubmit, error } = useForm(async (fd) => {
    Core.reinsert(sess, apptId, fd.get('reason'));
    toast('Patient re-inserted.', 'good');
    close();
  });
  return (
    <form onSubmit={onSubmit}>
      <p className="mb-3">The patient keeps the original number, so they are called next. This override is logged.</p>
      <Input id="reason" label="Reason" required maxLength={160} placeholder="e.g. Arrived late from parking" />
      <FormError>{error}</FormError>
      <Button type="submit" variant="primary">
        Re-insert
      </Button>
    </form>
  );
}

/** Admin override of an appointment's status, always with a reason (written to the audit log). */
export function StatusForm({ entry }) {
  const { sess } = useSession();
  const { close } = useModal();
  const toast = useToast();
  const { onSubmit, error } = useForm(async (fd) => {
    Core.adminSetStatus(sess, entry.id, fd.get('status'), fd.get('reason'));
    toast('Status updated and logged.', 'good');
    close();
  });
  return (
    <form onSubmit={onSubmit}>
      <p className="mb-3">
        <strong className="tabular-nums">{entry.label}</strong> {entry.patientName} · now <Pill status={entry.status} />
      </p>
      <Select id="status" label="New status" options={Core.STATUSES.map((s) => [s, s])} defaultValue={entry.status} />
      <Input id="reason" label="Reason" required maxLength={160} />
      <Hint>Cancelling a paid booking marks its payment as refunded.</Hint>
      <FormError>{error}</FormError>
      <div className="mt-3">
        <Button type="submit" variant="primary">
          Save change
        </Button>
      </div>
    </form>
  );
}
