import { useState } from 'react';
import Core from '../../lib/core.js';
import { money } from '../../lib/ui.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useToast } from '../../context/UiContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import { useAttempt } from '../../hooks/useAttempt.js';
import Button from '../../components/ui/Button.jsx';
import { PageHeader } from '../../components/ui/Card.jsx';
import { Input, Select } from '../../components/ui/Fields.jsx';
import Pill from '../../components/ui/Pill.jsx';
import { Actions, Sub, Table } from '../../components/ui/Table.jsx';
import { useInvoice } from '../../components/InvoiceDialog.jsx';

/** FR-22: billing records with filters and manual status changes. */
export default function Billing() {
  useCoreRev();
  const { sess } = useSession();
  const toast = useToast();
  const attempt = useAttempt();
  const showInvoice = useInvoice();
  const [f, setF] = useState({ from: '', to: '', doctorId: '', status: '' });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const r = Core.listPayments(sess, f);
  const docs = Core.listDoctors({ all: true });
  const change = (y, status) =>
    attempt(() => {
      Core.setPayment(sess, y.id, { status, method: y.method });
      toast(`Marked ${status.toLowerCase()}.`, 'good');
    });

  return (
    <>
      <PageHeader title="Billing" subtitle={`Paid ${money(r.total)} · Refunded ${money(r.refunded)} in this view.`} />
      <div className="mb-3 flex flex-wrap gap-x-4">
        <Input id="from" type="date" label="From" value={f.from} onChange={set('from')} />
        <Input id="to" type="date" label="To" value={f.to} onChange={set('to')} />
        <Select id="bdoc" label="Doctor" options={[['', 'All doctors'], ...docs.map((d) => [d.id, d.name])]} value={f.doctorId} onChange={set('doctorId')} />
        <Select id="bst" label="Status" options={[['', 'All'], ['Paid', 'Paid'], ['Pending', 'Pending'], ['Refunded', 'Refunded']]} value={f.status} onChange={set('status')} />
      </div>
      <Table heads={['Invoice', 'Patient', 'Doctor', 'Date', 'Method', { label: 'Amount', right: true }, 'Status', 'Actions']}>
        {r.rows.map((y) => (
          <tr key={y.id}>
            <td className="tabular-nums">{y.invoiceNo || '–'}</td>
            <td>
              {y.patientName}
              <Sub>{y.label}</Sub>
            </td>
            <td>{y.doctorName}</td>
            <td className="whitespace-nowrap">{Core.fmtDate(y.date)}</td>
            <td>{y.method || '–'}</td>
            <td className="text-right tabular-nums">{money(y.amount)}</td>
            <td>
              <Pill status={y.status} />
            </td>
            <Actions>
              {y.status !== 'Pending' && (
                <Button size="sm" onClick={() => showInvoice(y.id)}>
                  Invoice
                </Button>
              )}
              {y.status === 'Pending' && (
                <Button size="sm" onClick={() => change(y, 'Paid')}>
                  Mark paid
                </Button>
              )}
              {y.status === 'Paid' && (
                <Button size="sm" variant="dangerOutline" onClick={() => change(y, 'Refunded')}>
                  Refund
                </Button>
              )}
            </Actions>
          </tr>
        ))}
      </Table>
    </>
  );
}
