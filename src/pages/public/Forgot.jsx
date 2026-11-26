import { useState } from 'react';
import Core from '../../lib/core.js';
import { useModal, useToast } from '../../context/UiContext.jsx';
import { useForm } from '../../hooks/useForm.js';
import { navigate } from '../../router.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { FormError, Input } from '../../components/ui/Fields.jsx';
import SandboxPanel from '../../components/SandboxPanel.jsx';

/** FR-3: password reset by emailed code. In this demo the email arrives in the Sandbox inbox. */
export default function Forgot() {
  const toast = useToast();
  const { open } = useModal();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const ask = useForm(async (fd) => {
    Core.requestReset(fd.get('email'));
    setEmail(String(fd.get('email')));
    setSent(true);
  });
  const reset = useForm(async (fd) => {
    await Core.resetPassword(email, fd.get('code'), fd.get('password'));
    toast('Password updated. Log in with the new one.', 'good');
    navigate('login');
  });

  return (
    <Card className="mx-auto max-w-[520px]">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Reset your password</h1>
      <form onSubmit={ask.onSubmit} noValidate>
        <Input id="email" type="email" label="Account email" required defaultValue={email} />
        <FormError>{ask.error}</FormError>
        <Button type="submit" variant="primary" disabled={ask.busy}>
          Send reset code
        </Button>
      </form>
      {sent && (
        <>
          <hr className="my-5 border-line" />
          <p className="mb-3 text-muted">
            If that email has an account, a code is on its way. In this demo it arrives in the{' '}
            <button type="button" className="text-accent underline" onClick={() => open('Sandbox', <SandboxPanel />, { side: true })}>
              Sandbox inbox
            </button>
            .
          </p>
          <form onSubmit={reset.onSubmit} noValidate>
            <Input id="code" label="6-digit code" inputMode="numeric" maxLength={6} required />
            <Input id="password" type="password" label="New password" autoComplete="new-password" required />
            <FormError>{reset.error}</FormError>
            <Button type="submit" variant="primary" disabled={reset.busy}>
              Set new password
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}
