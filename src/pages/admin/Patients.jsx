import { useState } from 'react';
import Core from '../../lib/core.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useModal, useToast } from '../../context/UiContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import { useAttempt } from '../../hooks/useAttempt.js';
import { useForm } from '../../hooks/useForm.js';
import Button from '../../components/ui/Button.jsx';
import { PageHeader } from '../../components/ui/Card.jsx';
import { FormError, Input, Select } from '../../components/ui/Fields.jsx';
import { Actions, Sub, Table } from '../../components/ui/Table.jsx';

function PatientForm({ patient }) {
  const { sess } = useSession();
  const { close } = useModal();
  const toast = useToast();
  const { onSubmit, error, busy } = useForm(async (fd) => {
    await Core.savePatient(sess, { id: patient?.id, ...Object.fromEntries(fd) });
    toast('Patient saved.', 'good');
    close();
  });
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Input id="name" label="Full name" defaultValue={patient?.name} required />
        <Input id="dob" type="date" label="Date of birth" defaultValue={patient?.dob} max={Core.today()} required />
        <Select id="gender" label="Gender" defaultValue={patient?.gender || ''} options={[['', 'Choose'], ['Female', 'Female'], ['Male', 'Male']]} />
        <Input id="phone" type="tel" label="Phone" defaultValue={patient?.phone} required />
        <Input id="email" type="email" label="Email" defaultValue={patient?.email} />
        <Input id="password" type="password" label={patient ? 'New password (optional)' : 'Password (optional)'} autoComplete="new-password" />
      </div>
      <FormError>{error}</FormError>
      <Button type="submit" variant="primary" disabled={busy}>
        Save patient
      </Button>
    </form>
  );
}

export default function Patients() {
  useCoreRev();
  const { sess } = useSession();
  const { open, confirm } = useModal();
  const toast = useToast();
  const attempt = useAttempt();
  const [q, setQ] = useState('');
  const rows = Core.searchPatients(sess, q);
  return (
    <>
      <PageHeader title="Patients">
        <Button variant="primary" onClick={() => open('New patient', <PatientForm />, { wide: true })}>
          Add patient
        </Button>
      </PageHeader>
      <Input id="pq" type="search" label="Search by name, phone or email" fieldClass="max-w-md" value={q} onChange={(e) => setQ(e.target.value)} />
      <Table heads={['Name', 'Age', 'Contact', 'Account', 'Actions']}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="font-semibold">
              {p.name}
              <Sub>{p.gender}</Sub>
            </td>
            <td className="tabular-nums">{p.age}</td>
            <td>
              {p.phone}
              <Sub>{p.email || 'No email'}</Sub>
            </td>
            <td className="text-muted">{p.hasLogin ? (p.emailVerified ? 'Verified' : 'Email not verified') : 'Walk-in only'}</td>
            <Actions>
              <Button size="sm" onClick={() => open('Edit patient', <PatientForm patient={p} />, { wide: true })}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="dangerOutline"
                onClick={async () => {
                  if (await confirm(`Delete ${p.name}?`, 'Delete', true))
                    attempt(() => {
                      Core.deletePatient(sess, p.id);
                      toast('Patient deleted.', 'good');
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
