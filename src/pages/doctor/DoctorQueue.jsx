import Core from '../../lib/core.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useCoreRev, useLivePoll } from '../../hooks/useCore.js';
import { EmptyBox, PageHeader } from '../../components/ui/Card.jsx';
import QueuePanel from '../../components/queue/QueuePanel.jsx';

/** 4.3 Doctor handling: Call next, then Done. The doctor's Done click is the source of truth. */
export default function DoctorQueue() {
  useCoreRev();
  useLivePoll(15000);
  const { sess } = useSession();
  const q = Core.queue(sess, null, Core.today());

  if (!q.working && !q.entries.length) {
    const next = Core.doctorSchedule(sess).days.find((x) => x.shift && !x.onLeave);
    return (
      <>
        <PageHeader title="Today's queue" />
        <EmptyBox>No shift today.{next ? ` Your next shift is ${next.label}.` : ''}</EmptyBox>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Today's queue" subtitle={`${q.waitingCount} waiting${q.serving ? `, serving ${q.serving.label}` : ''}.`} />
      <QueuePanel q={q} mode="doctor" />
    </>
  );
}
