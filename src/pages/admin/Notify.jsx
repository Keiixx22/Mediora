import Core from '../../lib/core.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useToast } from '../../context/UiContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import { useForm } from '../../hooks/useForm.js';
import Button from '../../components/ui/Button.jsx';
import { Card, PageHeader, SectionTitle } from '../../components/ui/Card.jsx';
import { FormError, Hint, Input } from '../../components/ui/Fields.jsx';
import Pill from '../../components/ui/Pill.jsx';
import { Sub, Table } from '../../components/ui/Table.jsx';

/** FR-19 and NFR: alert threshold plus the async email/WhatsApp delivery queue (3 attempts per message). */
export default function Notify() {
  useCoreRev();
  const { sess } = useSession();
  const toast = useToast();
  const cfg = Core.config();
  const jobs = Core.listJobs(sess);
  const { onSubmit, error, busy } = useForm(async (fd) => {
    Core.setThreshold(sess, fd.get('n'));
    toast('Alert threshold saved.', 'good');
  });
  return (
    <>
      <PageHeader title="Notifications" subtitle="When a patient is this many places away, they get a message by email and WhatsApp." />
      <Card className="mb-6 max-w-[420px]">
        <form onSubmit={onSubmit} noValidate key={cfg.alertThreshold}>
          <Input id="n" type="number" min="1" max="50" label="Alert threshold (patients ahead)" defaultValue={cfg.alertThreshold} required />
          <Hint>Default is 5.</Hint>
          <FormError>{error}</FormError>
          <Button type="submit" variant="primary" disabled={busy}>
            Save
          </Button>
        </form>
      </Card>
      <SectionTitle>Delivery queue</SectionTitle>
      <Table heads={['Channel', 'To', 'Subject', 'Status', 'Attempts']} empty="No messages yet.">
        {jobs.map((j) => (
          <tr key={j.id}>
            <td className="capitalize">{j.channel}</td>
            <td>{j.to}</td>
            <td>
              {j.subject}
              {j.log?.length > 0 && <Sub>{j.log[j.log.length - 1].msg}</Sub>}
            </td>
            <td>
              <Pill status={j.status === 'sent' ? 'Paid' : j.status === 'failed' ? 'Cancelled' : 'Pending'}>{j.status}</Pill>
            </td>
            <td className="tabular-nums">{j.attempts}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
