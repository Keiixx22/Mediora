import Core from '../../lib/core.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useToast } from '../../context/UiContext.jsx';
import { useForm } from '../../hooks/useForm.js';
import Button from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { FormError, Hint, Input, Select } from '../../components/ui/Fields.jsx';

/** FR-1: patient registration with name, date of birth, gender, phone, email and password. */
export default function Signup() {
  const { login } = useSession();
  const toast = useToast();
  const { onSubmit, error, busy } = useForm(async (fd) => {
    const s = await Core.register(Object.fromEntries(fd));
    login(s);
    toast('Account created. Verify your email to start booking.', 'good');
  });

  return (
    <Card className="mx-auto max-w-[900px]">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Create your patient account</h1>
      <form onSubmit={onSubmit} noValidate>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Input id="name" label="Full name" autoComplete="name" required />
          <Input id="dob" type="date" label="Date of birth" autoComplete="bday" required max={Core.today()} />
          <Select
            id="gender"
            label="Gender"
            required
            defaultValue=""
            options={[
              ['', 'Choose'],
              ['Female', 'Female'],
              ['Male', 'Male'],
            ]}
          />
          <Input id="phone" type="tel" label="Phone (WhatsApp)" autoComplete="tel" placeholder="+62 812 3456 7890" required />
          <Input id="email" type="email" label="Email" autoComplete="email" required />
          <Input id="password" type="password" label="Password" autoComplete="new-password" minLength={8} required />
        </div>
        <Hint>At least 8 characters with a letter and a number. We only store the basics: name, date of birth, gender, phone and email.</Hint>
        <FormError>{error}</FormError>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="submit" variant="primary" disabled={busy}>
            Create account
          </Button>
          <Button variant="ghost" href="#login">
            I already have an account
          </Button>
        </div>
      </form>
    </Card>
  );
}
