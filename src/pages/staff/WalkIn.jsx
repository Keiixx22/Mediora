import { useState } from 'react';
import Core from '../../lib/core.js';
import { money, shortDate } from '../../lib/ui.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useModal, useToast } from '../../context/UiContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import { useForm } from '../../hooks/useForm.js';
import Button from '../../components/ui/Button.jsx';
import { Card, Notice, PageHeader } from '../../components/ui/Card.jsx';
import { FormError, Hint, Input, Radio, Select } from '../../components/ui/Fields.jsx';
import Ticket from '../../components/ui/Ticket.jsx';
import { useInvoice } from '../../components/InvoiceDialog.jsx';

function Issued({ appt: a }) {
  const { close } = useModal();
  const showInvoice = useInvoice();
  return (
    <div className="[--notch:var(--color-surface)]">
      <Ticket label={a.label} kicker="Queue number" right={shortDate(a.dateLabel)} foot={<span>{a.doctorName}</span>} />
      <p className="mt-3">
        {a.patientName} is {a.status === 'Checked-in' ? 'checked in' : `booked for ${a.dateLabel}`}. {money(a.payment.amount)} paid by {a.payment.method}. Confirmation sent where contact details exist.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => showInvoice(a.payment.id)}>View invoice</Button>
        <Button variant="primary" onClick={close}>
          Done
        </Button>
      </div>
    </div>
  );
}

/**
 * 4.4 Walk-in: find or create the patient, pick a doctor, record payment, and the next queue number is issued.
 * When the day is full, staff see the capacity warning and can override with a reason or move to the next day.
 */
export default function WalkIn() {
  useCoreRev();
  const { sess, user } = useSession();
  const admin = user.role === 'admin';
  const { open } = useModal();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [method, setMethod] = useState(Core.PAY_ONSITE[0]);
  const [date, setDate] = useState('');
  const [full, setFull] = useState(null);
  const [reason, setReason] = useState('');

  const docs = Core.listDoctors();
  const board = user.role === 'staff' ? Core.board(sess) : [];
  const docId = docs.some((d) => d.id === doctorId) ? doctorId : docs[0]?.id;
  const fee = docs.find((d) => d.id === docId)?.fee || 0;
  const patients = Core.searchPatients(sess, search);

  const docOptions = docs.map((d) => {
    const b = board.find((x) => x.doctor.id === d.id);
    const label = b
      ? `${d.name} · ${b.working ? `${b.used}/${b.capacity} today${b.used >= b.capacity ? ' (full)' : ''}` : 'not on shift today'}`
      : admin
        ? `${d.name} · ${d.deptName}`
        : `${d.name} · not on shift today`;
    return [d.id, label];
  });

  const submit = (extra = {}) => {
    const a = Core.registerAppointment(sess, {
      patientId: selected.id,
      doctorId: docId,
      method,
      date: admin ? date || Core.today() : undefined,
      ...extra,
    });
    setSelected(null);
    setFull(null);
    setReason('');
    open('Number issued', <Issued appt={a} />);
  };

  const register = useForm(async () => {
    try {
      submit();
    } catch (e) {
      if (e.code !== 'FULL') throw e;
      setFull({ msg: e.message, next: e.data.next });
    }
  });
  const create = useForm(async (fd) => {
    const p = await Core.savePatient(sess, Object.fromEntries(fd));
    setSelected(p);
    setNewOpen(false);
    setSearch('');
    toast('Patient saved.', 'good');
  });

  const field = (set) => (e) => {
    set(e.target.value);
    setFull(null);
  };

  return (
    <>
      <PageHeader
        title={admin ? 'Register appointment' : 'Walk-in registration'}
        subtitle={admin ? 'Book a patient for any date, or add a walk-in to today.' : "Walk-ins join the end of today's queue and are checked in on the spot."}
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-lg font-semibold">1. Patient</h2>
          <Input id="wiq" type="search" label="Search by name, phone or email" autoComplete="off" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="mb-3 grid max-h-64 gap-1.5 overflow-auto">
            {patients.length === 0 && <p className="text-muted">No patient found. Create a new one.</p>}
            {patients.map((p) => (
              <Radio
                key={p.id}
                name="pid"
                checked={selected?.id === p.id}
                onChange={() => {
                  setSelected(p);
                  setFull(null);
                }}
                className="rounded-lg border border-line px-2.5"
              >
                <span>
                  <strong>{p.name}</strong> <span className="text-[13px] text-muted">{p.age} y · {p.gender} · {p.phone}</span>
                </span>
              </Radio>
            ))}
          </div>
          <Button size="sm" onClick={() => setNewOpen((v) => !v)}>
            {newOpen ? 'Hide new patient form' : 'New patient'}
          </Button>
          {newOpen && (
            <form onSubmit={create.onSubmit} noValidate className="mt-4 border-t border-line pt-4">
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Input id="name" label="Full name" required />
                <Input id="dob" type="date" label="Date of birth" required max={Core.today()} />
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
                <Input id="phone" type="tel" label="Phone" required />
                <Input id="email" type="email" label="Email (optional)" />
              </div>
              <FormError>{create.error}</FormError>
              <Button type="submit" variant="primary">
                Save patient
              </Button>
            </form>
          )}
        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-semibold">2. Doctor and payment</h2>
          <form onSubmit={register.onSubmit} noValidate>
            {selected ? <Notice>Patient: <strong>{selected.name}</strong></Notice> : <Hint className="mb-3">Choose a patient first.</Hint>}
            <Select id="doctorId" label="Doctor" options={docOptions} value={docId} onChange={field(setDoctorId)} />
            {admin && <Input id="date" type="date" label="Date" min={Core.today()} value={date || Core.today()} onChange={field(setDate)} />}
            <Select id="method" label="Paid by" options={Core.PAY_ONSITE.map((m) => [m, m])} value={method} onChange={field(setMethod)} />
            <p className="mb-3 text-base">
              Consultation fee <strong className="tabular-nums">{money(fee)}</strong>
            </p>
            <FormError>{register.error}</FormError>
            <Button type="submit" variant="primary" disabled={!selected || register.busy}>
              Register and issue number
            </Button>
          </form>

          {full && (
            <Notice tone="warn" role="alert" className="mt-4">
              <p className="mb-2 font-semibold">{full.msg}</p>
              <Input id="override" label="Override reason" maxLength={160} placeholder="e.g. Emergency referral" value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button variant="dangerOutline" onClick={() => submitSafely(submit, { overrideReason: reason }, toast)}>
                  Register anyway
                </Button>
                {full.next && <Button onClick={() => submitSafely(submit, { moveNext: true }, toast)}>Move to {Core.fmtDate(full.next)}</Button>}
              </div>
            </Notice>
          )}
        </Card>
      </div>
    </>
  );
}

/** Run submit(extra) from a button and show Core errors as a toast. */
function submitSafely(submit, extra, toast) {
  try {
    submit(extra);
  } catch (e) {
    if (e && e.code) toast(e.message, 'bad');
    else throw e;
  }
}
