import { useState } from 'react';
import Core from '../../lib/core.js';
import { money } from '../../lib/ui.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import { Chip } from '../../components/ui/Chips.jsx';
import { PageHeader, SectionTitle } from '../../components/ui/Card.jsx';

const RANGES = [['today', 'Today'], ['7d', '7 days'], ['30d', '30 days'], ['all', 'All time']];

function Kpi({ k, children }) {
  return (
    <div className="min-w-0 px-4 first:pl-0">
      <dt className="text-[13px] text-muted">{k}</dt>
      <dd className="m-0 text-3xl font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function Bar({ label, value, max, tone = 'bg-accent' }) {
  return (
    <li className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3">
      <span className="truncate">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-surface2">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </span>
      <span className="text-right tabular-nums">{value}</span>
    </li>
  );
}

/** FR-20 and FR-21: KPI strip, appointment outcomes, patients per department, revenue. */
export default function Dashboard() {
  useCoreRev();
  const { sess } = useSession();
  const [range, setRange] = useState('7d');
  const s = Core.stats(sess, range);
  const o = s.outcomes;
  const maxO = Math.max(1, ...Object.values(o));
  const maxD = Math.max(1, ...s.perDept.map((d) => d.patients));
  const tones = { Completed: 'bg-good-fg', Cancelled: 'bg-muted', 'No-show': 'bg-warn-fg' };

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Figures from ${Core.fmtDate(s.from === '0000-00-00' ? Core.today() : s.from)} to today.`} />
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Range">
        {RANGES.map(([id, l]) => (
          <Chip key={id} pressed={range === id} onClick={() => setRange(id)}>
            {l}
          </Chip>
        ))}
      </div>
      <dl className="mb-6 grid grid-cols-2 gap-y-4 divide-line md:grid-cols-4 md:divide-x">
        <Kpi k="Appointments today">{s.today}</Kpi>
        <Kpi k="Waiting now">{s.todayWaiting}</Kpi>
        <Kpi k="Revenue">{money(s.revenue)}</Kpi>
        <Kpi k="Refunded">{money(s.refunded)}</Kpi>
      </dl>
      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <SectionTitle>Outcomes ({s.totalAppts} appointments)</SectionTitle>
          <ul className="grid gap-2.5">
            {Object.entries(o).map(([k, v]) => (
              <Bar key={k} label={k} value={v} max={maxO} tone={tones[k]} />
            ))}
          </ul>
        </section>
        <section>
          <SectionTitle>Patients per department</SectionTitle>
          <ul className="grid gap-2.5">
            {s.perDept.map((d) => (
              <Bar key={d.name} label={d.name} value={d.patients} max={maxD} />
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
