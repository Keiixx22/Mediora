import { useState } from 'react';
import Core from '../../lib/core.js';
import { DAYS, dayList, money, shiftLabel } from '../../lib/ui.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useModal, useToast } from '../../context/UiContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import { useAttempt } from '../../hooks/useAttempt.js';
import { useForm } from '../../hooks/useForm.js';
import Button from '../../components/ui/Button.jsx';
import { PageHeader } from '../../components/ui/Card.jsx';
import { ChipCheck } from '../../components/ui/Chips.jsx';
import { Check, FormError, Hint, Input, Select } from '../../components/ui/Fields.jsx';
import Pill from '../../components/ui/Pill.jsx';
import { Actions, Sub, Table } from '../../components/ui/Table.jsx';

/** FR-7 and FR-9: capacity = shift hours x 60 / consultation minutes, previewed live while editing. */
function DoctorForm({ doctor }) {
  const { sess } = useSession();
  const { close } = useModal();
  const toast = useToast();
  const depts = Core.listDepts();
  const [hours, setHours] = useState(doctor?.shiftHours ?? 5);
  const [mins, setMins] = useState(doctor?.consultMin ?? 15);
  const cap = mins > 0 ? Math.floor((hours * 60) / mins) : 0;
  const email = doctor ? Core.doctorLogin(sess, doctor.id) : '';

  const { onSubmit, error, busy } = useForm(async (fd, form) => {
    await Core.saveDoctor(sess, {
      id: doctor?.id,
      name: fd.get('name'),
      deptId: fd.get('deptId'),
      letter: fd.get('letter'),
      fee: Number(fd.get('fee')),
      shiftDays: fd.getAll('day').map(Number),
      shiftStart: fd.get('shiftStart'),
      shiftHours: Number(fd.get('shiftHours')),
      consultMin: Number(fd.get('consultMin')),
      active: fd.get('active') === 'on',
      email: fd.get('email'),
      password: fd.get('password'),
    });
    toast('Doctor saved.', 'good');
    close();
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Input id="name" label="Name" defaultValue={doctor?.name} required />
        <Select id="deptId" label="Department" defaultValue={doctor?.deptId} options={depts.map((d) => [d.id, d.name])} />
        <Input id="letter" label="Queue letter" maxLength={1} defaultValue={doctor?.letter} required />
        <Input id="fee" type="number" min="0" step="1000" label="Fee (IDR)" defaultValue={doctor?.fee ?? 150000} required />
        <Input id="shiftStart" type="time" label="Shift starts" defaultValue={doctor?.shiftStart ?? '08:00'} required />
        <Input id="shiftHours" type="number" min="1" max="12" label="Shift hours" value={hours} onChange={(e) => setHours(Number(e.target.value))} required />
        <Input id="consultMin" type="number" min="5" max="240" label="Minutes per patient" value={mins} onChange={(e) => setMins(Number(e.target.value))} required />
        <Input id="email" type="email" label="Login email" defaultValue={email} required={!doctor} />
        <Input id="password" type="password" label={doctor ? 'New password (optional)' : 'Password'} autoComplete="new-password" required={!doctor} />
      </div>
      <fieldset className="mb-3">
        <legend className="mb-1 text-sm font-medium">Shift days</legend>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d, i) => (
            <ChipCheck key={d} name="day" value={i} defaultChecked={doctor ? doctor.shiftDays.includes(i) : [1, 2, 3, 4, 5].includes(i)}>
              {d}
            </ChipCheck>
          ))}
        </div>
      </fieldset>
      <Hint>
        Capacity: <strong>{cap}</strong> patients a day ({hours} h × 60 ÷ {mins} min).
      </Hint>
      <Check name="active" defaultChecked={doctor?.active ?? true}>
        Active (bookable)
      </Check>
      <FormError>{error}</FormError>
      <Button type="submit" variant="primary" disabled={busy}>
        Save doctor
      </Button>
    </form>
  );
}

export default function Doctors() {
  useCoreRev();
  const { sess } = useSession();
  const { open, confirm } = useModal();
  const toast = useToast();
  const attempt = useAttempt();
  const docs = Core.listDoctors({ all: true });

  return (
    <>
      <PageHeader title="Doctors" subtitle="Shift, consultation time and fee decide how many seats each day has.">
        <Button variant="primary" onClick={() => open('New doctor', <DoctorForm />, { wide: true })}>
          Add doctor
        </Button>
      </PageHeader>
      <Table heads={['Doctor', 'Department', 'Shift', 'Seats a day', 'Fee', 'Status', 'Actions']}>
        {docs.map((d) => (
          <tr key={d.id}>
            <td>
              <span className="tabular-nums font-bold">{d.letter}</span> {d.name}
            </td>
            <td>{d.deptName}</td>
            <td>
              {dayList(d)}
              <Sub>{shiftLabel(d)}</Sub>
            </td>
            <td className="tabular-nums">
              {d.capacity}
              <Sub>{d.consultMin} min each</Sub>
            </td>
            <td className="tabular-nums">{money(d.fee)}</td>
            <td>{d.active ? <Pill tone="good">Active</Pill> : <Pill tone="neutral">Inactive</Pill>}</td>
            <Actions>
              <Button size="sm" onClick={() => open('Edit doctor', <DoctorForm doctor={d} />, { wide: true })}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="dangerOutline"
                onClick={async () => {
                  if (await confirm(`Delete ${d.name}? Doctors with appointment records can only be set inactive.`, 'Delete', true))
                    attempt(() => {
                      Core.deleteDoctor(sess, d.id);
                      toast('Doctor deleted.', 'good');
                    });
                }}
              >
                Delete
              </Button>
            </Actions>
          </tr>
        ))}
      </Table>
    </>
  );
}
