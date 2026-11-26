import Core from '../../lib/core.js';
import { shiftLabel } from '../../lib/ui.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useModal, useToast } from '../../context/UiContext.jsx';
import { useAttempt } from '../../hooks/useAttempt.js';
import Button from '../ui/Button.jsx';
import { Card, Notice } from '../ui/Card.jsx';
import Pill from '../ui/Pill.jsx';
import { Actions, Sub, Table } from '../ui/Table.jsx';
import { ReinsertForm, RecordPaymentForm, StatusForm } from './QueueDialogs.jsx';

/**
 * One doctor's queue for one day (FR-20, FR-21, FR-22, FR-33).
 * mode: 'doctor' (own queue), 'board' (reception) or 'admin' (queue records with edit and delete).
 */
export default function QueuePanel({ q, mode }) {
  const { sess, user } = useSession();
  const attempt = useAttempt();
  const toast = useToast();
  const { open, confirm } = useModal();
  const d = q.doctor;
  const role = user.role;
  const canRun = (role === 'doctor' || role === 'admin') && q.isToday;
  const staffy = role === 'staff' || role === 'admin';
  const current = q.entries.find((e) => e.status === 'In consultation');

  const run = (fn, msg) =>
    attempt(() => {
      const a = fn();
      if (msg) toast(msg(a), 'good');
    });

  const rowActions = (e) => {
    const waiting = ['Booked', 'Checked-in'].includes(e.status) && !e.held;
    const out = [];
    if (e.status === 'In consultation' && canRun)
      out.push(
        <Button key="done" size="sm" variant="primary" onClick={() => run(() => Core.done(sess, e.id), (a) => `${a.label} completed.`)}>
          Done
        </Button>,
      );
    if (waiting && e.status === 'Booked' && staffy && q.isToday)
      out.push(
        <Button key="in" size="sm" onClick={() => run(() => Core.checkIn(sess, e.id), (a) => `${a.label} checked in.`)}>
          Check in
        </Button>,
      );
    if (waiting)
      out.push(
        <Button key="ns" size="sm" onClick={() => run(() => Core.noShow(sess, e.id), (a) => `${a.label} marked no-show and skipped.`)}>
          No-show
        </Button>,
      );
    if (e.held && staffy)
      out.push(
        <Button key="pay" size="sm" variant="primary" onClick={() => open('Record on-site payment', <RecordPaymentForm apptId={e.id} />)}>
          Record payment
        </Button>,
      );
    if (e.status === 'No-show' && staffy && q.isToday)
      out.push(
        <Button key="re" size="sm" onClick={() => open('Re-insert patient', <ReinsertForm apptId={e.id} />)}>
          Re-insert
        </Button>,
      );
    if (staffy && ['Booked', 'Checked-in'].includes(e.status))
      out.push(
        <Button
          key="cx"
          size="sm"
          variant="dangerOutline"
          onClick={async () => {
            if (await confirm('Cancel this appointment? A paid booking is marked refunded and the patient is notified.', 'Cancel appointment'))
              run(() => Core.cancel(sess, e.id, 'Cancelled at the front desk'), () => 'Appointment cancelled.');
          }}
        >
          Cancel
        </Button>,
      );
    if (mode === 'admin')
      out.push(
        <Button key="st" size="sm" onClick={() => open('Change status', <StatusForm entry={e} />)}>
          Change status
        </Button>,
        <Button
          key="del"
          size="sm"
          variant="dangerOutline"
          onClick={async () => {
            if (await confirm('Delete this queue record and its payment record? This cannot be undone. Cancel it instead to keep a refund trail.', 'Delete'))
              run(() => Core.deleteAppt(sess, e.id), () => 'Queue record deleted.');
          }}
        >
          Delete
        </Button>,
      );
    return out;
  };

  const heads = mode === 'doctor' ? ['No.', 'Patient', 'Status', 'Actions'] : ['No.', 'Patient', 'Status', 'Payment', 'Actions'];

  return (
    <Card className="mb-4">
      <div className="mb-3 flex flex-wrap justify-between gap-4">
        <div>
          <h2 className="m-0 text-lg font-semibold">{d.name}</h2>
          <span className="text-muted">
            {d.deptName} · {q.dateLabel} · {shiftLabel(d)}
          </span>
        </div>
        <dl className="flex flex-wrap items-end gap-6">
          {[
            ['Serving', q.serving ? q.serving.label : '–', true],
            ['Waiting', q.waitingCount],
            ['Seats', `${q.used}/${q.capacity}`],
          ].map(([k, v, mono]) => (
            <div key={k}>
              <dt className="text-[13px] text-muted">{k}</dt>
              <dd className={`m-0 text-xl font-semibold tabular-nums ${mono ? 'tabular-nums' : ''}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {!q.working && <Notice tone={q.onLeave ? 'warn' : 'info'}>{q.onLeave ? 'Marked unavailable for this date.' : 'No shift on this date.'}</Notice>}

      {canRun && (
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={q.busy || !q.waitingCount}
            onClick={() => run(() => Core.callNext(sess, d.id, q.date), (a) => `Called ${a.label}.`)}
          >
            Call next
          </Button>
          {current && (
            <Button onClick={() => run(() => Core.done(sess, current.id), (a) => `${a.label} completed.`)}>Done with {current.label}</Button>
          )}
          {q.busy && <span className="self-center text-[13px] text-muted">Mark the current consultation Done before calling the next patient.</span>}
        </div>
      )}

      <Table heads={heads}>
        {q.entries.map((e) => (
          <tr key={e.id} className={e.status === 'In consultation' ? 'bg-accent-soft' : ''}>
            <td className="tabular-nums font-bold">{e.label}</td>
            <td>
              {e.patient ? e.patient.name : ''}
              <Sub>
                {e.patient ? `${e.patient.age} y · ${e.patient.gender}` : ''}
                {e.source === 'walkin' ? ' · walk-in' : ''}
              </Sub>
            </td>
            <td>
              <Pill status={e.held ? 'Pending' : e.status} />
            </td>
            {mode !== 'doctor' && <td>{e.payment && <Pill status={e.payment.status} />}</td>}
            <Actions>{rowActions(e)}</Actions>
          </tr>
        ))}
      </Table>
    </Card>
  );
}
