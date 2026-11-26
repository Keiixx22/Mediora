import Core from '../../lib/core.js';
import { money } from '../../lib/ui.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useModal, useToast } from '../../context/UiContext.jsx';
import { useCoreRev, useLivePoll } from '../../hooks/useCore.js';
import { useAttempt } from '../../hooks/useAttempt.js';
import Button from '../../components/ui/Button.jsx';
import { PageHeader } from '../../components/ui/Card.jsx';
import Pill from '../../components/ui/Pill.jsx';
import { Actions, Sub, Table } from '../../components/ui/Table.jsx';
import ResumePayment from '../../components/booking/ResumePayment.jsx';
import { useInvoice } from '../../components/InvoiceDialog.jsx';

/** FR-16: appointment history with statuses. FR-15 and 4.5: cancel before the cutoff. */
export default function Appointments() {
  useCoreRev();
  useLivePoll(30000);
  const { sess } = useSession();
  const { open, confirm } = useModal();
  const toast = useToast();
  const attempt = useAttempt();
  const showInvoice = useInvoice();
  const rows = Core.myAppts(sess);

  return (
    <>
      <PageHeader title="Appointments" subtitle="Your booking history. Only you can see these." />
      <Table heads={['Number', 'Doctor', 'Date', 'Status', 'Payment', 'Actions']}>
        {rows.map((a) => (
          <tr key={a.id}>
            <td className="tabular-nums font-bold">{a.label}</td>
            <td>
              {a.doctorName}
              <Sub>{a.deptName}</Sub>
            </td>
            <td className="whitespace-nowrap">{a.dateLabel}</td>
            <td>
              <Pill status={a.held ? 'Pending' : a.status} />
              {a.flags.unavailable && <Sub>Doctor unavailable</Sub>}
            </td>
            <td>
              {a.payment && <Pill status={a.payment.status} />}
              {a.payment && <Sub>{money(a.payment.amount)}</Sub>}
            </td>
            <Actions>
              {a.held && (
                <Button size="sm" variant="primary" onClick={() => open('Complete your payment', <ResumePayment apptId={a.id} />)}>
                  Pay now
                </Button>
              )}
              {a.flags.unavailable && a.status === 'Booked' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() =>
                    attempt(() => {
                      const r = Core.rebook(sess, a.id);
                      toast(`Moved to ${r.dateLabel}. Your new number is ${r.label}.`, 'good');
                    })
                  }
                >
                  Rebook next day
                </Button>
              )}
              {a.canCancel && (
                <Button
                  size="sm"
                  variant="dangerOutline"
                  onClick={async () => {
                    if (await confirm('Cancel this appointment? If you already paid, the payment is marked as refunded.', 'Cancel appointment'))
                      attempt(() => {
                        Core.cancel(sess, a.id);
                        toast('Appointment cancelled.', 'good');
                      });
                  }}
                >
                  {a.flags.unavailable ? 'Refund' : 'Cancel'}
                </Button>
              )}
              {a.payment && a.payment.status !== 'Pending' && (
                <Button size="sm" onClick={() => showInvoice(a.payment.id)}>
                  Invoice
                </Button>
              )}
              {a.status === 'Booked' && !a.canCancel && !a.held && <span className="text-[13px] text-muted">Cancellation closed. Contact the hospital.</span>}
              {a.status === 'Booked' && a.canCancel && !a.flags.unavailable && !a.held && (
                <span className="text-[13px] text-muted">Cancel until {Core.fmtDateTime(new Date(a.cancelBy).toISOString())}</span>
              )}
            </Actions>
          </tr>
        ))}
      </Table>
    </>
  );
}
