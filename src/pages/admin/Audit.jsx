import { useState } from 'react';
import Core from '../../lib/core.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import { PageHeader } from '../../components/ui/Card.jsx';
import { Select } from '../../components/ui/Fields.jsx';
import { Sub, Table } from '../../components/ui/Table.jsx';

const ENTITIES = ['appointment', 'doctor', 'department', 'patient', 'payment', 'schedule', 'queue', 'config'];

/** NFR: every create, update, delete and override by staff or admin is recorded. */
export default function Audit() {
  useCoreRev();
  const { sess } = useSession();
  const [entity, setEntity] = useState('');
  const rows = Core.listAudit(sess, { entity });
  return (
    <>
      <PageHeader title="Audit log" subtitle="Who changed what, newest first. Shows the latest 200 entries." />
      <Select id="ent" label="Entity" fieldClass="max-w-xs" options={[['', 'All'], ...ENTITIES.map((e) => [e, e])]} value={entity} onChange={(e) => setEntity(e.target.value)} />
      <Table heads={['When', 'Who', 'Action', 'Detail']} empty="No entries.">
        {rows.map((l) => (
          <tr key={l.id}>
            <td className="whitespace-nowrap">{Core.fmtDateTime(l.at)}</td>
            <td>
              {l.actor}
              <Sub>{l.role}</Sub>
            </td>
            <td>
              {l.action} <span className="text-muted">{l.entity}</span>
            </td>
            <td className="text-muted">{l.detail}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
