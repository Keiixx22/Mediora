import { useState } from 'react';
import Core from '../lib/core.js';
import { useSession } from '../context/SessionContext.jsx';
import { useModal, useToast } from '../context/UiContext.jsx';
import { useCoreRev } from '../hooks/useCore.js';
import { useAttempt } from '../hooks/useAttempt.js';
import { useForm } from '../hooks/useForm.js';
import { navigate } from '../router.jsx';
import Button from './ui/Button.jsx';
import { Check, FormError, Hint, Input, inputCls } from './ui/Fields.jsx';
import { Tabs } from './ui/Chips.jsx';
import Pill from './ui/Pill.jsx';

function ResetForm({ message }) {
  const toast = useToast();
  const { onSubmit, error } = useForm(async (fd, form) => {
    await Core.resetPassword(message.to, message.action.code, fd.get('password'));
    toast('Password updated. You can log in with it.', 'good');
    form.reset();
  });
  return (
    <form onSubmit={onSubmit} className="mt-2">
      <div className="flex flex-wrap gap-2">
        <label htmlFor={`rp${message.id}`} className="sr-only">
          New password
        </label>
        <input id={`rp${message.id}`} name="password" type="password" placeholder="New password" autoComplete="new-password" required className={`${inputCls} flex-1`} />
        <Button type="submit" variant="primary" size="sm">
          Choose new password
        </Button>
      </div>
      <FormError>{error}</FormError>
    </form>
  );
}

function Inbox() {
  const [channel, setChannel] = useState('');
  const [to, setTo] = useState('');
  const toast = useToast();
  const attempt = useAttempt();
  const msgs = Core.sandbox().messages.filter((m) => (!channel || m.channel === channel) && (!to || m.to.toLowerCase().includes(to.toLowerCase())));
  return (
    <>
      <div className="flex gap-3">
        <div className="mb-3 flex flex-col gap-1">
          <label htmlFor="sb-ch" className="text-sm font-semibold">
            Channel
          </label>
          <select id="sb-ch" className={inputCls} value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">All</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
        <Input id="sb-to" type="search" label="Recipient" fieldClass="flex-1" placeholder="email or phone" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <ul className="grid gap-2">
        {msgs.length === 0 && <li className="rounded-xl border border-dashed border-line p-6 text-center text-muted">No messages yet.</li>}
        {msgs.map((m) => (
          <li key={m.id} className="rounded-xl border border-line bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <Pill tone={m.channel === 'email' ? 'info' : 'good'}>{m.channel === 'email' ? 'Email' : 'WhatsApp'}</Pill>
              <span className="text-[13px] text-muted">{Core.fmtDateTime(m.at)}</span>
            </div>
            <p className="mt-1 text-[13px] text-muted">To {m.to}</p>
            <strong>{m.subject}</strong>
            <p className="mt-1">{m.body}</p>
            {m.action?.type === 'verify' && (
              <Button
                size="sm"
                variant="primary"
                className="mt-2"
                onClick={() =>
                  attempt(() => {
                    Core.verifyEmail(m.to, m.action.code);
                    toast('Email verified.', 'good');
                  })
                }
              >
                Verify my email
              </Button>
            )}
            {m.action?.type === 'reset' && <ResetForm message={m} />}
          </li>
        ))}
      </ul>
    </>
  );
}

function Gateway() {
  const { logout } = useSession();
  const { close, confirm } = useModal();
  const toast = useToast();
  const sb = Core.sandbox();
  return (
    <>
      <p className="mb-2 text-muted">Stand-ins for the services a real deployment would call. Nothing leaves this browser.</p>
      <h3 className="mt-4 mb-1 text-sm font-semibold text-muted">Notification gateway</h3>
      <Check checked={sb.cfg.simFail.email} onChange={(e) => Core.setSimFail('email', e.target.checked)}>
        Simulate an email outage
      </Check>
      <Check checked={sb.cfg.simFail.whatsapp} onChange={(e) => Core.setSimFail('whatsapp', e.target.checked)}>
        Simulate a WhatsApp outage
      </Check>
      <Hint className="mt-1">
        Failed sends retry 3 times (3 s, 6 s, 12 s). After that the patient sees an in-app banner. Queued now: {sb.queued}. Gave up: {sb.failed}.
      </Hint>

      <h3 className="mt-5 mb-1 text-sm font-semibold text-muted">Clock</h3>
      <p>
        Demo time: <strong>{Core.fmtDateTime(sb.now)}</strong> {sb.shifted && <Pill tone="warn">demo clock</Pill>}
      </p>
      <div className="my-2 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => Core.advanceClock(3600000)}>
          +1 hour
        </Button>
        <Button size="sm" onClick={() => Core.advanceClock(86400000)}>
          +1 day
        </Button>
        <Button size="sm" onClick={() => Core.resetClock()}>
          Reset demo time
        </Button>
        <Button size="sm" onClick={() => Core.realClock()}>
          Use real time
        </Button>
      </div>
      <Hint>
        The demo opens at 09:30 WIB so today's clinic day is live. Move time to test the 15-minute payment hold, the cancellation cutoff and day-before reminders.
      </Hint>

      <h3 className="mt-5 mb-1 text-sm font-semibold text-muted">Demo data</h3>
      <Button
        size="sm"
        variant="dangerOutline"
        onClick={async () => {
          if (!(await confirm('Reset everything back to the demo data? Accounts, bookings and messages you made will be removed.', 'Reset data'))) return;
          await Core.resetDemo();
          logout();
          navigate('home');
          toast('Demo data restored.', 'good');
          close();
        }}
      >
        Reset all demo data
      </Button>
    </>
  );
}

export default function SandboxPanel() {
  useCoreRev();
  const [tab, setTab] = useState('inbox');
  return (
    <>
      <Tabs
        tabs={[
          ['inbox', 'Inbox'],
          ['gateway', 'Gateway & clock'],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'inbox' ? <Inbox /> : <Gateway />}
    </>
  );
}
