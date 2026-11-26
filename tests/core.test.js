import Core from '../src/lib/core.js';
let pass = 0, failN = 0;
const ok = (c, m) => { if (c) pass++; else { failN++; console.log('FAIL:', m); } };
const throwsCode = (fn, code, m) => { try { fn(); failN++; console.log('FAIL (no throw):', m); } catch (e) { if (e.code === code) pass++; else { failN++; console.log('FAIL (code ' + e.code + ' != ' + code + '):', m, e.message); } } };
const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; };

(async () => {
  await Core.init({ store: mem() });
  const L = async e => Core.login(e, Core.DEMO_PW);
  const admin = await L('admin@mediora.demo'), staff = await L('staff@mediora.demo'), raka = await L('raka@mediora.demo'), sinta = await L('sinta@mediora.demo');
  const dewi = await L('patient@mediora.demo');
  const pats = []; for (const e of ['budi', 'siti', 'agus', 'rina', 'joko', 'maya', 'eko']) pats.push(await L(e + '@mediora.demo'));
  const docs = Core.listDoctors(); const A = docs.find(d => d.letter === 'A'), B = docs.find(d => d.letter === 'B'), D = docs.find(d => d.letter === 'D');
  const today = Core.today();

  // login failures + RBAC
  try { await Core.login('admin@mediora.demo', 'wrong'); ok(false, 'bad login'); } catch (e) { ok(e.code === 'AUTH', 'bad login rejected'); }
  throwsCode(() => Core.listPayments(dewi), 'FORBIDDEN', 'patient cannot read billing');
  throwsCode(() => Core.stats(staff), 'FORBIDDEN', 'staff cannot read stats');
  throwsCode(() => Core.callNext(staff, A.id), 'FORBIDDEN', 'staff cannot call next');
  throwsCode(() => Core.queue(dewi, A.id), 'FORBIDDEN', 'patient cannot read queue board');
  throwsCode(() => Core.done(sinta, Core.queue(admin, A.id).entries[0].id), 'FORBIDDEN', 'doctor B cannot touch doctor A queue');
  throwsCode(() => Core.myAppts({ id: dewi.id, role: 'admin' }), 'AUTH', 'forged role rejected');

  // capacity math FR-9
  ok(A.capacity === 7, 'capacity 7h/60m = 7'); ok(B.capacity === 12, 'capacity 6h/30m = 12');

  // seeded queue state for the demo patient
  let q = Core.myQueue(dewi).find(x => x.live);
  ok(q && q.label === 'A-007' && q.ahead === 6 && q.estWaitMin === 360, 'demo patient A-007 has 6 ahead, 360 min');

  // FR-18/20 doctor flow: Done on A-001 -> ahead 5 -> alert (FR-23) once
  const board = Core.queue(raka, null);
  const inCons = board.entries.find(e => e.status === 'In consultation');
  throwsCode(() => Core.callNext(raka), 'BUSY', 'call next blocked while busy');
  Core.done(raka, inCons.id);
  q = Core.myQueue(dewi).find(x => x.live); ok(q.ahead === 5, 'ahead 5 after done');
  let n = Core.myNotifs(dewi).filter(x => x.kind === 'queue-alert'); ok(n.length === 1, 'alert at 5 ahead sent once');
  Core.callNext(raka); Core.tick();
  n = Core.myNotifs(dewi).filter(x => x.kind === 'queue-alert'); ok(n.length === 1, 'no duplicate alert');
  const sb = Core.sandbox(); ok(sb.messages.some(m => m.channel === 'email' && /Your turn is near/.test(m.subject)) && sb.messages.some(m => m.channel === 'whatsapp' && /Your turn is near/.test(m.subject)), 'email and WhatsApp alert delivered via job queue');

  // drain the line to "You're next"
  for (let i = 0; i < 5; i++) { const cur = Core.queue(raka).entries.find(e => e.status === 'In consultation'); Core.done(raka, cur.id); Core.callNext(raka); }
  ok(Core.myNotifs(dewi).some(x => x.kind === 'queue-next'), "'You're next' sent");
  ok(Core.queue(raka).serving.label === 'A-007', 'serving A-007');

  // no-show + reinsert (FR-21, edge)
  const cur7 = Core.queue(raka).entries.find(e => e.status === 'In consultation'); Core.done(raka, cur7.id);
  throwsCode(() => Core.callNext(raka), 'EMPTY', 'empty queue');

  // booking: duplicate, full, hold, pay, timeout (FR-12..14, 4.1)
  const tomorrow = Core.addDays(today, 1);
  const results = await Promise.all([dewi, ...pats].map(async p => { try { return Core.book(p, { doctorId: A.id, date: tomorrow }); } catch (e) { return e; } }));
  const booked = results.filter(r => r.id);
  ok(booked.length === 7, 'never more than capacity under concurrent booking (' + booked.length + ')');
  ok(new Set(booked.map(b => b.queueNo)).size === booked.length, 'queue numbers unique');
  const lastFail = results.find(r => r.code === 'FULL'); ok(lastFail && lastFail.data.next === Core.addDays(tomorrow, 1), 'loser offered next date');
  throwsCode(() => Core.book(dewi, { doctorId: A.id, date: tomorrow }), 'DUPLICATE', 'duplicate booking blocked');

  // payment hold timeout
  const bk = booked[0]; const owner = [dewi, ...pats].find(p => p.id === bk.patientId);
  const left0 = Core.doctorDates(A.id).dates.find(d => d.date === tomorrow).left;
  Core.advanceClock(16 * 60000);
  ok(Core.listAppts(admin, { date: tomorrow, doctorId: A.id }).every(a => a.status === 'Cancelled'), 'unpaid holds released after 15 min');
  ok(Core.doctorDates(A.id).dates.find(d => d.date === tomorrow).left === 7, 'capacity restored (' + left0 + ' -> 7)');
  throwsCode(() => Core.pay(owner, bk.id, { method: 'QRIS' }), 'EXPIRED', 'paying a released booking fails');
  Core.resetClock();

  // pay fail then success; confirmation notice
  const b2 = Core.book(dewi, { doctorId: B.id, date: Core.doctorDates(B.id).dates[0].date });
  throwsCode(() => Core.pay(dewi, b2.id, { method: 'QRIS', simulate: 'fail' }), 'PAY_FAILED', 'payment failure keeps hold');
  const paid = Core.pay(dewi, b2.id, { method: 'QRIS' }); ok(paid.payment.status === 'Paid' && /^INV-/.test(paid.payment.invoiceNo), 'paid + invoice number');
  ok(Core.myNotifs(dewi).some(x => x.kind === 'booking' && x.apptId === b2.id), 'booking confirmation in-app');
  ok(Core.invoice(dewi, paid.payment.id).amount === B.fee, 'invoice amount = fee');
  throwsCode(() => Core.invoice(pats[0], paid.payment.id), 'NOT_FOUND', 'other patient cannot read invoice');

  // FR-10: full day -> nearest available skips it
  const dd = Core.doctorDates(D.id); ok(dd.dates[0].left === 0, 'Dr D first day is full'); const nearest = dd.dates.find(x => x.left > 0);
  ok(nearest && nearest.date > dd.dates[0].date, 'nearest available skips the full day');
  const fullTry = (() => { try { Core.book(dewi, { doctorId: D.id, date: dd.dates[0].date }); } catch (e) { return e; } })(); ok(fullTry && fullTry.code === 'FULL' && fullTry.data.next === nearest.date, 'booking a full day returns the next available date');

  // cancel cutoff (FR-15) + refund (FR-31)
  const t2 = Core.addDays(today, 2); const b3 = Core.book(dewi, { doctorId: A.id, date: t2 }); Core.pay(dewi, b3.id, { method: 'E-wallet' });
  const cutoff = Core.myAppts(dewi).find(a => a.id === b3.id).cancelBy;
  Core.advanceClock(cutoff - Core.now() + 60000); // one minute after cutoff
  throwsCode(() => Core.cancel(dewi, b3.id), 'LATE', 'late cancellation blocked');
  Core.resetClock();
  const b4 = Core.book(dewi, { doctorId: B.id, date: Core.doctorDates(B.id).dates[1].date }); Core.pay(dewi, b4.id, { method: 'QRIS' });
  const c4 = Core.cancel(dewi, b4.id); ok(c4.status === 'Cancelled' && c4.payment.status === 'Refunded', 'cancel before cutoff refunds');
  throwsCode(() => Core.cancel(pats[0], b3.id), 'NOT_FOUND', "cannot cancel someone else's booking");

  // reminder day before (FR-24): jump a day so t2 becomes tomorrow
  Core.advanceClock(DAYMS());
  ok(Core.myNotifs(dewi).some(x => x.kind === 'reminder' && x.apptId === b3.id), 'day-before reminder sent');
  Core.resetClock();

  // walk-in + capacity override (edge) FR-22/FR-29
  const eko = Core.searchPatients(staff, 'Eko')[0];
  throwsCode(() => Core.registerAppointment(staff, { patientId: eko.id, doctorId: A.id, method: 'Cash' }), 'FULL', 'walk-in on a full day warns staff');
  const ov = Core.registerAppointment(staff, { patientId: eko.id, doctorId: A.id, method: 'Cash', overrideReason: 'Emergency referral' });
  ok(ov.status === 'Checked-in' && ov.payment.status === 'Paid' && ov.payment.method === 'Cash', 'override walk-in: checked in, paid in cash');
  ok(Core.listAudit(admin).some(l => /capacity override/.test(l.detail)), 'override is audited');
  const newP = await Core.savePatient(staff, { name: 'Tono Wijaya', dob: '1970-02-02', gender: 'Male', phone: '081234567890' });
  const mv = Core.registerAppointment(staff, { patientId: newP.id, doctorId: A.id, method: 'Cash', moveNext: true });
  ok(mv.date === Core.addDays(today, 1) && mv.status === 'Booked', 'walk-in moved to next day when full');

  // no-show + reinsert (edge)
  const waiting = Core.queue(raka).entries.find(e => ['Booked', 'Checked-in'].includes(e.status) && !e.held);
  if (waiting) { Core.noShow(staff, waiting.id); throwsCode(() => Core.reinsert(staff, waiting.id, ''), 'INVALID', 'reinsert needs reason'); Core.reinsert(staff, waiting.id, 'Arrived late'); ok(Core.queue(raka).entries.find(e => e.id === waiting.id).status === 'Checked-in', 'reinserted'); }

  // doctor unavailable -> rebook / refund / bulk (FR-11, edge)
  const t3 = Core.addDays(today, 3); const x1 = Core.book(pats[0], { doctorId: A.id, date: t3 }); Core.pay(pats[0], x1.id, { method: 'QRIS' });
  const x2 = Core.book(pats[1], { doctorId: A.id, date: t3 }); Core.pay(pats[1], x2.id, { method: 'QRIS' });
  const lv = Core.addLeave(admin, A.id, t3, 'Sick'); ok(lv.affected === 2, 'leave flags 2 appointments');
  ok(Core.doctorDates(A.id).dates.every(d => d.date !== t3), 'leave date no longer bookable');
  const rb = Core.rebook(pats[0], x1.id); ok(rb.date === Core.addDays(t3, 1) && rb.payment.status === 'Paid', 'patient rebooks, payment carries');
  const bulk = Core.bulkReschedule(admin, A.id, t3); ok(bulk.moved === 1, 'admin bulk-reschedule');
  const x3 = Core.book(pats[2], { doctorId: A.id, date: Core.addDays(t3, 2) }); Core.pay(pats[2], x3.id, { method: 'QRIS' });
  Core.addLeave(admin, A.id, Core.addDays(t3, 2)); const rf = Core.cancel(pats[2], x3.id); ok(rf.payment.status === 'Refunded', 'refund when doctor unavailable, even past cutoff');

  // notification retries (edge)
  Core.setSimFail('whatsapp', true);
  const x4 = Core.book(pats[3], { doctorId: B.id, date: Core.doctorDates(B.id).dates[2].date }); Core.pay(pats[3], x4.id, { method: 'QRIS' });
  for (let i = 0; i < 6; i++) { Core._state().jobs.forEach(j => { if (j.status === 'queued') j.runAt = 0; }); Core.tick(); }
  const failed = Core.listJobs(admin).filter(j => j.status === 'failed' && j.channel === 'whatsapp'); ok(failed.length >= 1 && failed[0].attempts === 4, 'WhatsApp retried 3 times then failed (' + (failed[0] && failed[0].attempts) + ')');
  ok(Core.banners(pats[3]).length >= 1, 'in-app banner fallback');
  ok(Core.listAudit(admin).some(l => l.action === 'notification-failed'), 'failure logged');
  Core.setSimFail('whatsapp', false);

  // auth: register, verify, reset (FR-1, FR-3)
  const s = await Core.register({ name: 'Nia Kusuma', dob: '1999-09-09', gender: 'Female', phone: '+6281299990000', email: 'nia@example.com', password: 'Secret123' });
  throwsCode(() => Core.book(s, { doctorId: B.id, date: Core.doctorDates(B.id).dates[0].date }), 'UNVERIFIED', 'unverified cannot book');
  Core.tick(); const vm = Core.sandbox().messages.find(m => m.to === 'nia@example.com' && m.action && m.action.type === 'verify'); ok(!!vm, 'verification email delivered');
  Core.verifyEmail('nia@example.com', vm.action.code); ok(Core.me(s).emailVerified, 'email verified');
  try { await Core.register({ name: 'X', dob: '1999-09-09', gender: 'Female', phone: '1', email: 'bad', password: '1' }); ok(false, 'validation'); } catch (e) { ok(e.code === 'INVALID', 'registration validates input'); }
  Core.requestReset('nia@example.com'); Core.tick(); const rm = Core.sandbox().messages.find(m => m.action && m.action.type === 'reset');
  await Core.resetPassword('nia@example.com', rm.action.code, 'NewPass456'); ok((await Core.login('nia@example.com', 'NewPass456')).id === s.id, 'password reset works');
  ok(!JSON.stringify(Core.searchPatients(admin, 'Nia')).includes('hash'), 'password hash never leaves core');

  // admin CRUD + stats + billing
  const dep = Core.saveDept(admin, { name: 'Neurology', description: 'Brain' }); throwsCode(() => Core.saveDept(admin, { name: 'neurology' }), 'INVALID', 'dept name unique');
  const nd = await Core.saveDoctor(admin, { name: 'dr. Test Neuro', deptId: dep.id, letter: 'F', fee: 300000, shiftDays: [1, 2], shiftStart: '08:00', shiftHours: 7, consultMin: 60, email: 'neuro@mediora.demo', password: 'Doctor123' });
  ok(nd.capacity === 7, 'doctor created'); throwsCode(() => Core.deleteDept(admin, dep.id), 'LOCKED', 'cannot delete dept with doctors');
  Core.deleteDoctor(admin, nd.id); Core.deleteDept(admin, dep.id);
  const st = Core.stats(admin, '30d'); ok(st.revenue > 0 && st.outcomes.Completed > 0 && st.perDept.length === 4, 'dashboard stats');
  const bl = Core.listPayments(admin, { status: 'Paid' }); ok(bl.rows.length && bl.rows.every(r => r.status === 'Paid'), 'billing filter by status');
  ok(Core.listAudit(admin).length > 5, 'audit log populated');
  Core.setThreshold(admin, 3); throwsCode(() => Core.setThreshold(admin, 0), 'INVALID', 'threshold validated');

  console.log(`\n${pass} passed, ${failN} failed`); process.exit(failN ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
function DAYMS() { return 864e5; }
