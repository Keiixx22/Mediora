import { useState } from 'react';
import Core from '../lib/core.js';
import { useSession } from '../context/SessionContext.jsx';
import { useModal, useToast } from '../context/UiContext.jsx';
import { useCoreRev } from '../hooks/useCore.js';
import BookingFlow from './booking/BookingFlow.jsx';
import DoctorCard from './DoctorCard.jsx';
import { Chip } from './ui/Chips.jsx';
import { Input } from './ui/Fields.jsx';

/** FR-4: browse and search doctors by name or department. Used on the home page and the patient's Book page. */
export default function DoctorDirectory() {
  useCoreRev();
  const { user } = useSession();
  const toast = useToast();
  const { open } = useModal();
  const [q, setQ] = useState('');
  const [deptId, setDeptId] = useState('');
  const depts = Core.listDepts();
  const list = Core.listDoctors({ q, deptId });

  const book = (doctorId) => {
    if (!user.emailVerified) {
      toast('Verify your email first. The code is in the Sandbox inbox.', 'warn');
      return;
    }
    open('Book an appointment', <BookingFlow doctorId={doctorId} />);
  };

  return (
    <section id="directory" aria-label="Doctors">
      <div className="mb-4 flex flex-wrap items-end gap-x-4">
        <Input
          id="q"
          type="search"
          label="Search by doctor or department"
          fieldClass="flex-1 basis-64"
          placeholder="e.g. Raka or Cardiology"
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div role="group" aria-label="Department" className="mb-3 flex flex-wrap gap-2">
          {[['', 'All'], ...depts.map((d) => [d.id, d.name])].map(([id, name]) => (
            <Chip key={id} pressed={deptId === id} onClick={() => setDeptId(id)}>
              {name}
            </Chip>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4" aria-live="polite">
          {list.map((d) => (
            <DoctorCard key={d.id} doctor={d} role={user?.role} onBook={book} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted">No doctor matches that search. Try a department name like Cardiology.</p>
      )}
    </section>
  );
}
