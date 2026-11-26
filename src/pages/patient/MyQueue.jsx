import Core from '../../lib/core.js';
import { clockTime, money } from '../../lib/ui.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useModal } from '../../context/UiContext.jsx';
import { useCoreRev, useLivePoll, useNow } from '../../hooks/useCore.js';
import { navigate } from '../../router.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card, EmptyBox, PageHeader } from '../../components/ui/Card.jsx';
import Pill from '../../components/ui/Pill.jsx';
import Ticket from '../../components/ui/Ticket.jsx';
import ResumePayment from '../../components/booking/ResumePayment.jsx';

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

function Stat({ k, children, mono }) {
  return (
    <div className="min-w-0 px-4 first:pl-0">
      <dt className="text-[13px] text-muted">{k}</dt>
      <dd className={`m-0 text-3xl font-semibold tabular-nums ${mono ? 'tabular-nums' : ''}`}>{children}</dd>
    </div>
  );
}

function QueueCard({ a }) {
  const { open } = useModal();
  const now = useNow(1000);
  const threshold = Core.config().alertThreshold;

  if (a.held) {
    return (
      <Card className="mb-4">
        <h2 className="mb-2 text-lg font-semibold">{a.doctorName}</h2>
        <p className="mb-3 rounded-lg bg-warn-bg px-3 py-2 text-warn-fg">
          Payment pending. Slot held for <strong className="tabular-nums">{mmss(Date.parse(a.holdExpiresAt) - now)}</strong>.
        </p>
        <Button variant="primary" onClick={() => open('Complete your payment', <ResumePayment apptId={a.id} />)}>
          Pay {money(a.fee)}
        </Button>
      </Card>
    );
  }

  if (!a.live) {
    return (
      <Card className="mb-4">
        <Ticket small label={a.label} kicker={a.dateLabel} right={a.doctorName} />
        <p className="mt-3">
          Your queue opens when the shift starts at <strong>{a.shiftStartLabel}</strong>. We message you when your turn is near.
        </p>
        {a.flags.unavailable && (
          <p className="mt-2 rounded-lg bg-warn-bg px-3 py-2 text-warn-fg">The doctor is unavailable that day. Open Appointments to rebook or take a refund.</p>
        )}
      </Card>
    );
  }

  const inConsultation = a.status === 'In consultation';
  const hot = inConsultation || a.ahead <= threshold;
  const message = inConsultation
    ? 'You are in consultation now.'
    : a.ahead === 0
      ? 'You are next. Please wait near the consultation room.'
      : a.ahead <= threshold
        ? 'Your turn is near. Head to the hospital now.'
        : `You can wait elsewhere. We will message you when you are ${threshold} away.`;

  return (
    <Card className="mb-4 border-accent">
      <div className="mb-3 flex flex-wrap justify-between gap-1">
        <h2 className="m-0 text-lg font-semibold">{a.doctorName}</h2>
        <span className="text-muted">
          {a.deptName} · {a.dateLabel}
        </span>
      </div>
      <div className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Ticket live label={a.label} kicker="Your number" right={inConsultation ? 'In consultation' : ''} />
        {/* FR-18 and FR-19: current number, patients ahead, and wait = patients ahead x consultation time */}
        <dl className="grid grid-cols-3 divide-x divide-line">
          <Stat k="Now serving" mono>
            {a.serving ? a.serving.label : 'Not started'}
          </Stat>
          <Stat k="Patients ahead">{inConsultation ? 0 : a.ahead}</Stat>
          <Stat k="Estimated wait">{inConsultation ? '–' : Core.fmtWait(a.estWaitMin)}</Stat>
        </dl>
      </div>
      <p role="status" className={`mt-4 rounded-lg px-3 py-2 font-semibold ${hot ? 'bg-accent-bg text-accent-fg' : ''}`}>
        {message}
      </p>
      <p className="mt-2 text-[13px] text-muted">
        Updated {clockTime()} WIB. Refreshes every 15 seconds. Estimate = patients ahead × {a.consultMin} min.
      </p>
    </Card>
  );
}

export default function MyQueue() {
  useCoreRev();
  useLivePoll(15000);
  const { sess } = useSession();
  const list = Core.myQueue(sess);
  const today = Core.today();
  const doneToday = Core.myAppts(sess).filter((a) => a.date === today && ['Completed', 'No-show'].includes(a.status));
  const live = list.find((a) => a.live);

  return (
    <>
      <PageHeader
        title="My Queue"
        subtitle={live ? `${live.ahead} patient${live.ahead === 1 ? '' : 's'} ahead of you with ${live.doctorName}.` : 'Your queue numbers for today and the days ahead.'}
      />
      {list.length ? (
        list.map((a) => <QueueCard key={a.id} a={a} />)
      ) : (
        <EmptyBox>
          <p className="mb-3">No active queue number.</p>
          <Button variant="primary" onClick={() => navigate('book')}>
            Book a doctor
          </Button>
        </EmptyBox>
      )}
      {doneToday.map((a) => (
        <p key={a.id} className="mt-2 text-muted">
          {a.label} with {a.doctorName} today: <Pill status={a.status} />
        </p>
      ))}
    </>
  );
}
