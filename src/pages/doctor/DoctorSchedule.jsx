import { useState } from 'react';
import Core from '../../lib/core.js';
import { dayList, shiftLabel } from '../../lib/ui.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import Button from '../../components/ui/Button.jsx';
import { PageHeader, SectionTitle } from '../../components/ui/Card.jsx';
import Pill from '../../components/ui/Pill.jsx';
import { Table } from '../../components/ui/Table.jsx';
import QueuePanel from '../../components/queue/QueuePanel.jsx';

export function Meter({ value, max, label }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div role="img" aria-label={label} className="h-2.5 w-28 overflow-hidden rounded-full bg-surface2">
      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** FR-7 and FR-9 from the doctor's side: shift days, hours and the seats each day. Changes are made by an admin. */
export default function DoctorSchedule() {
  useCoreRev();
  const { sess } = useSession();
  const [selected, setSelected] = useState(Core.today());
  const s = Core.doctorSchedule(sess);
  const q = Core.queue(sess, null, selected);
  const d = s.doctor;

  return (
    <>
      <PageHeader
        title="My schedule"
        subtitle={`${d.name} · ${dayList(d)} · ${shiftLabel(d)} · ${d.consultMin} min per patient · ${d.capacity} seats a day. Shift changes are made by an administrator.`}
      />
      <Table heads={['Day', 'Shift', 'Booked', '']}>
        {s.days.map((day) => (
          <tr key={day.date} className={day.date === selected ? 'bg-accent-soft' : ''}>
            <td className="whitespace-nowrap">{day.label}</td>
            <td>{day.onLeave ? <Pill tone="warn">On leave</Pill> : day.shift ? 'Shift' : <span className="text-muted">Off</span>}</td>
            <td>
              <div className="flex items-center gap-2">
                <Meter value={day.shift ? day.used : 0} max={day.capacity} label={`${day.used} of ${day.capacity} booked`} />
                <span className="text-[13px] text-muted tabular-nums">{day.shift ? `${day.used} of ${day.capacity}` : ''}</span>
              </div>
            </td>
            <td>
              <Button size="sm" onClick={() => setSelected(day.date)}>
                View patients
              </Button>
            </td>
          </tr>
        ))}
      </Table>
      <SectionTitle>Appointments on {q.dateLabel}</SectionTitle>
      <QueuePanel q={q} mode="doctor" />
    </>
  );
}
