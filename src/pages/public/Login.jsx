import { useState } from 'react';
import Core from '../../lib/core.js';
import { DEMO_ACCOUNTS } from '../../lib/ui.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useToast } from '../../context/UiContext.jsx';
import { useForm } from '../../hooks/useForm.js';
import Button from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { FormError, Input } from '../../components/ui/Fields.jsx';

export default function Login() {
  const { login } = useSession();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { onSubmit, error, busy } = useForm(async (fd) => {
    // FR-2: the role in the returned session decides which screens open.
    const s = await Core.login(fd.get('email'), fd.get('password'));
    login(s);
    toast(`Welcome, ${s.name}`, 'good');
  });

  return (
    <div className="mx-auto grid max-w-[900px] items-start gap-4 md:grid-cols-2">
      <Card>
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Log in</h1>
        <form onSubmit={onSubmit} noValidate>
          <Input id="email" type="email" label="Email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input id="password" type="password" label="Password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <FormError>{error}</FormError>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={busy}>
              Log in
            </Button>
            <Button variant="ghost" href="#forgot">
              Forgot password
            </Button>
          </div>
        </form>
        <p className="mt-4 text-muted">
          New patient? <a href="#signup" className="text-accent underline">Create an account</a>
        </p>
      </Card>
      <Card className="bg-surface2">
        <h2 className="mb-1 text-lg font-semibold">Demo accounts</h2>
        <p className="mb-3 text-muted">
          Every account uses the password <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-sm">{Core.DEMO_PW}</code>. Pick one to fill the form.
        </p>
        <ul className="grid gap-2">
          {DEMO_ACCOUNTS.map(([label, mail]) => (
            <li key={mail} className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                onClick={() => {
                  setEmail(mail);
                  setPassword(Core.DEMO_PW);
                }}
              >
                {label}
              </Button>
              <span className="text-muted">{mail}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
