import { useState } from 'react';
import Core from '../../lib/core.js';
import { money } from '../../lib/ui.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useModal, useToast } from '../../context/UiContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import { useAttempt } from '../../hooks/useAttempt.js';
import Button from '../../components/ui/Button.jsx';
import { PageHeader } from '../../components/ui/Card.jsx';
import { Input, Select } from '../../components/ui/Fields.jsx';
import Pill from '../../components/ui/Pill.jsx';
import { Actions, Sub, Table } from '../../components/ui/Table.jsx';

function StatusDialog({ a }) {
  const { sess } = useSession();
  const { close } = useModal();
  const toast = useToast();
  const attempt = useAttempt();
  const [status, setStatus] = useState(a.status);
  const [reason, setReason] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        attempt(() => {
          Core.adminSetStatus(sess, a.id, status, reason);
          toast('Status updated.', 'good');
          close();
        });
      }}
    >
      <Select id="st" label="Status" options={Core.STATUSES.map((s) => [s, s])} value={status} onChange={(e) => setStatus(e.target.value)} />
      <Input id="why" label="Reason (kept in the audit log)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={160} />
      <Button type="submit" variant="primary">
        Save status
      </Button>
    </form>
  );
}

export default function AdminAppointments() {
  useCoreRev();
  const { sess } = useSession();
  const { open, confirm } = useModal();
  const toast = useToast();
  const attempt = useAttempt();
  const [f, setF] = useState({ q: '', date: '', doctorId: '', status: '' });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const rows = Core.listAppts(sess, f);
  const docs = Core.listDoctors({ all: true });

  return (
    <>
      <PageHeader title="Appointments" subtitle="Every booking. Changes are written to the audit log." />
      <div className="mb-3 flex flex-wrap gap-x-4">
        <Input id="fq" type="search" label="Patient or number" value={f.q} onChange={set('q')} />
        <Input id="fd" type="date" label="Date" value={f.date} onChange={set('date')} />
        <Select id="fdoc" label="Doctor" options={[['', 'All doctors'], ...docs.map((d) => [d.id, d.name])]} value={f.doctorId} onChange={set('doctorId')} />
        <Select id="fst" label="Status" options={[['', 'All'], ...Core.STATUSES.map((s) => [s, s])]} value={f.status} onChange={set('status')} />
      </div>
      <Table heads={['Number', 'Patient', 'Doctor', 'Date', 'Status', 'Payment', 'Actions']}>
        {rows.map((a) => (
          <tr key={a.id}>
            <td className="tabular-nums font-bold">{a.label}</td>
            <td>{a.patientName}</td>
            <td>{a.doctorName}</td>
            <td className="whitespace-nowrap">{a.dateLabel}</td>
            <td>
              <Pill status={a.held ? 'Pending' : a.status} />
            </td>
            <td>
              {a.payment && <Pill status={a.payment.status} />}
              {a.payment && <Sub>{money(a.payment.amount)}</Sub>}
            </td>
            <Actions>
              <Button size="sm" onClick={() => open('Change status', <StatusDialog a={a} />)}>
                Status
              </Button>
              <Button
                size="sm"
                variant="dangerOutline"
                onClick={async () => {
                  if (await confirm('Delete this appointment record and its payment? This cannot be undone.', 'Delete', true))
                    attempt(() => {
                      Core.deleteAppt(sess, a.id);
                      toast('Appointment deleted.', 'good');
                    });
                }}
              >
                Delete
              </Button>
            </Actions>
          </tr>
        ))}
      </Table>
    </>
  );
}
