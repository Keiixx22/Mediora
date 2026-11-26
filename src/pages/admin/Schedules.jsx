import Core from '../../lib/core.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useToast } from '../../context/UiContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import { useAttempt } from '../../hooks/useAttempt.js';
import { useForm } from '../../hooks/useForm.js';
import Button from '../../components/ui/Button.jsx';
import { Card, PageHeader, SectionTitle } from '../../components/ui/Card.jsx';
import { FormError, Input, Select } from '../../components/ui/Fields.jsx';
import { Actions, Sub, Table } from '../../components/ui/Table.jsx';

/** FR-8: mark a doctor unavailable; booked patients are flagged and can be moved in one click. */
export default function Schedules() {
  useCoreRev();
  const { sess } = useSession();
  const toast = useToast();
  const attempt = useAttempt();
  const docs = Core.listDoctors({ all: true });
  const leaves = Core.listLeaves(sess);
  const { onSubmit, error, busy } = useForm(async (fd, form) => {
    Core.addLeave(sess, fd.get('doctorId'), fd.get('date'), fd.get('reason'));
    toast('Marked unavailable. Booked patients are flagged.', 'good');
    form.reset();
  });

  return (
    <>
      <PageHeader title="Schedules" subtitle="Leave and unavailable days." />
      <Card className="mb-6 max-w-[720px]">
        <h2 className="mb-2 text-lg font-semibold">Mark a doctor unavailable</h2>
        <form onSubmit={onSubmit} noValidate>
          <div className="grid gap-x-4 sm:grid-cols-3">
            <Select id="doctorId" label="Doctor" options={docs.map((d) => [d.id, d.name])} />
            <Input id="date" type="date" label="Date" min={Core.today()} required />
            <Input id="reason" label="Reason" maxLength={120} />
          </div>
          <FormError>{error}</FormError>
          <Button type="submit" variant="primary" disabled={busy}>
            Mark unavailable
          </Button>
        </form>
      </Card>
      <SectionTitle>Unavailable days</SectionTitle>
      <Table heads={['Doctor', 'Date', 'Reason', 'Patients to move', 'Actions']} empty="No leave scheduled.">
        {leaves.map((l) => (
          <tr key={l.id}>
            <td>{l.doctorName}</td>
            <td className="whitespace-nowrap">{Core.fmtDate(l.date)}</td>
            <td className="text-muted">{l.reason}</td>
            <td className="tabular-nums">{l.pending}</td>
            <Actions>
              {l.pending > 0 && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() =>
                    attempt(() => {
                      const r = Core.bulkReschedule(sess, l.doctorId, l.date);
                      toast(`${r.moved} moved to the next available day.${r.remaining ? ` ${r.remaining} could not be moved.` : ''}`, r.remaining ? 'warn' : 'good');
                    })
                  }
                >
                  Move all to next day
                </Button>
              )}
              <Button
                size="sm"
                onClick={() =>
                  attempt(() => {
                    Core.removeLeave(sess, l.id);
                    toast('Leave removed.', 'good');
                  })
                }
              >
                Remove
              </Button>
            </Actions>
          </tr>
        ))}
      </Table>
    </>
  );
}
