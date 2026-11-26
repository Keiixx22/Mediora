import { useState } from 'react';
import Core from '../../lib/core.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useCoreRev, useLivePoll } from '../../hooks/useCore.js';
import { PageHeader } from '../../components/ui/Card.jsx';
import { Select } from '../../components/ui/Fields.jsx';
import QueuePanel from '../../components/queue/QueuePanel.jsx';

/** Any doctor, any date: admin view of the full queue with override actions. */
export default function QueueRecords() {
  useCoreRev();
  useLivePoll(15000);
  const { sess } = useSession();
  const docs = Core.listDoctors({ all: true });
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(Core.today());
  const id = docs.some((d) => d.id === doctorId) ? doctorId : docs[0]?.id;
  const q = id ? Core.queue(sess, id, date) : null;

  return (
    <>
      <PageHeader title="Queue records" subtitle="Inspect or correct any doctor's queue." />
      <div className="mb-3 flex flex-wrap gap-x-4">
        <Select id="qdoc" label="Doctor" fieldClass="min-w-60" options={docs.map((d) => [d.id, d.name])} value={id} onChange={(e) => setDoctorId(e.target.value)} />
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value || Core.today())} className="rounded-lg border border-line bg-surface px-3 py-2" />
        </label>
      </div>
      {q && <QueuePanel q={q} mode="admin" />}
    </>
  );
}
