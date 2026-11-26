import Core from '../../lib/core.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useCoreRev, useLivePoll } from '../../hooks/useCore.js';
import { EmptyBox, PageHeader } from '../../components/ui/Card.jsx';
import QueuePanel from '../../components/queue/QueuePanel.jsx';

/** Reception view: every doctor on shift today. Check in, skip no-shows, record on-site payments. */
export default function Board() {
  useCoreRev();
  useLivePoll(15000);
  const { sess } = useSession();
  const list = Core.board(sess);
  const waiting = list.reduce((n, q) => n + q.waitingCount, 0);
  return (
    <>
      <PageHeader
        title="Queue board"
        subtitle={`${waiting} patient${waiting === 1 ? '' : 's'} waiting across ${list.length} doctor${list.length === 1 ? '' : 's'} on shift today.`}
      />
      {list.length ? list.map((q) => <QueuePanel key={q.doctor.id} q={q} mode="board" />) : <EmptyBox>No doctor is on shift today.</EmptyBox>}
    </>
  );
}
