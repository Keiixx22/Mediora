import { useEffect } from 'react';
import Core from '../../lib/core.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import { EmptyBox, PageHeader } from '../../components/ui/Card.jsx';

/** In-app copies of every message; email and WhatsApp copies go through the async job queue. */
export default function Notifications() {
  useCoreRev();
  const { sess } = useSession();
  const list = Core.myNotifs(sess);
  const unread = list.some((n) => !n.read);

  useEffect(() => {
    if (!unread) return undefined;
    const id = setTimeout(() => Core.markRead(sess), 1200);
    return () => clearTimeout(id);
  }, [unread, sess]);

  return (
    <>
      <PageHeader title="Notifications" subtitle="Copies also go to your email and WhatsApp." />
      {list.length ? (
        <ul className="grid max-w-[720px] gap-2">
          {list.map((n) => (
            <li key={n.id} className={`rounded-xl border border-line bg-surface px-4 py-3 ${n.read ? '' : 'border-l-4 border-l-accent'}`}>
              <div className="flex items-center justify-between gap-2">
                <strong>{n.subject}</strong>
                <span className="text-[13px] text-muted">{Core.fmtDateTime(n.at)}</span>
              </div>
              <p className="mt-1">{n.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyBox>Nothing yet. Alerts about your queue appear here.</EmptyBox>
      )}
    </>
  );
}
