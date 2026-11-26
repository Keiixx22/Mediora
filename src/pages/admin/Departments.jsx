import Core from '../../lib/core.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useModal, useToast } from '../../context/UiContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import { useAttempt } from '../../hooks/useAttempt.js';
import { useForm } from '../../hooks/useForm.js';
import Button from '../../components/ui/Button.jsx';
import { PageHeader } from '../../components/ui/Card.jsx';
import { FormError, Input } from '../../components/ui/Fields.jsx';
import { Actions, Table } from '../../components/ui/Table.jsx';

function DeptForm({ dept }) {
  const { sess } = useSession();
  const { close } = useModal();
  const toast = useToast();
  const { onSubmit, error, busy } = useForm(async (fd) => {
    Core.saveDept(sess, { id: dept?.id, name: fd.get('name'), description: fd.get('description') });
    toast('Department saved.', 'good');
    close();
  });
  return (
    <form onSubmit={onSubmit} noValidate>
      <Input id="name" label="Name" defaultValue={dept?.name} required />
      <Input id="description" label="Description" defaultValue={dept?.description} maxLength={200} />
      <FormError>{error}</FormError>
      <Button type="submit" variant="primary" disabled={busy}>
        Save
      </Button>
    </form>
  );
}

export default function Departments() {
  useCoreRev();
  const { sess } = useSession();
  const { open, confirm } = useModal();
  const toast = useToast();
  const attempt = useAttempt();
  return (
    <>
      <PageHeader title="Departments">
        <Button variant="primary" onClick={() => open('New department', <DeptForm />)}>
          Add department
        </Button>
      </PageHeader>
      <Table heads={['Name', 'Description', 'Doctors', 'Actions']}>
        {Core.listDepts().map((d) => (
          <tr key={d.id}>
            <td className="font-semibold">{d.name}</td>
            <td className="text-muted">{d.description}</td>
            <td className="tabular-nums">{d.doctors}</td>
            <Actions>
              <Button size="sm" onClick={() => open('Edit department', <DeptForm dept={d} />)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="dangerOutline"
                onClick={async () => {
                  if (await confirm(`Delete ${d.name}?`, 'Delete', true))
                    attempt(() => {
                      Core.deleteDept(sess, d.id);
                      toast('Department deleted.', 'good');
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
