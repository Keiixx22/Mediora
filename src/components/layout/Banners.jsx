import Core from '../../lib/core.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useModal, useToast } from '../../context/UiContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import { useForm } from '../../hooks/useForm.js';
import Button from '../ui/Button.jsx';
import { FormError, inputCls } from '../ui/Fields.jsx';
import SandboxPanel from '../SandboxPanel.jsx';

function VerifyBanner() {
  const { sess, user } = useSession();
  const toast = useToast();
  const { open } = useModal();
  const { onSubmit, error } = useForm(async (fd) => {
    Core.verifyEmail(user.email, fd.get('code'));
    toast('Email verified. You can book now.', 'good');
  });
  return (
    <section aria-label="Email verification" className="mb-4 rounded-xl bg-warn-bg px-4 py-3 text-warn-fg">
      <p className="mb-2">
        <strong>Verify your email to book.</strong> We sent a 6-digit code to {user.email}. In this demo it lands in the Sandbox inbox.
      </p>
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
        <label htmlFor="vcode" className="sr-only">
          Verification code
        </label>
        <input
          id="vcode"
          name="code"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          autoComplete="one-time-code"
          required
          className={`${inputCls} !w-36 text-ink`}
        />
        <Button type="submit" variant="primary" size="sm">
          Verify
        </Button>
        <Button size="sm" onClick={() => open('Sandbox', <SandboxPanel />, { side: true })}>
          Open sandbox inbox
        </Button>
        <Button
          size="sm"
          onClick={() => {
            Core.resendVerification(sess);
            toast('A new code was sent. Check the Sandbox inbox.', 'good');
          }}
        >
          Resend code
        </Button>
      </form>
      <FormError>{error}</FormError>
    </section>
  );
}

/** Patient-only banners: email verification, and the in-app fallback when a message could not be delivered. */
export default function Banners() {
  useCoreRev();
  const { sess, user } = useSession();
  if (user.role !== 'patient') return null;
  const failed = Core.banners(sess);
  return (
    <>
      {!user.emailVerified && <VerifyBanner />}
      {failed.map((b) => (
        <section key={b.id} aria-label="Delivery problem" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-bad-bg px-4 py-3 text-bad-fg">
          <div>
            <strong>We could not reach you on {b.channel === 'email' ? 'email' : 'WhatsApp'}.</strong> {b.subject}: {b.body}
          </div>
          <Button size="sm" onClick={() => Core.dismissBanner(sess, b.id)}>
            Dismiss
          </Button>
        </section>
      ))}
    </>
  );
}
