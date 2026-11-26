/* MEDIORA core: data model, RBAC services, booking, queue, notifications, billing.
   An ES module with no UI dependency. It runs in the browser (persisting to localStorage) and in Node
   (in memory) so the same code is covered by tests/core.test.js.
   To use a real backend, replace this file with calls to your API that keep the same function names. */
const Core = (() => {
'use strict';
const TZ = 'Asia/Jakarta', OFF = 7 * 36e5, DAY = 864e5, KEY = 'mediora.v1';
const ACTIVE = ['Booked', 'Checked-in', 'In consultation'];
const STATUSES = ['Booked', 'Checked-in', 'In consultation', 'Completed', 'Cancelled', 'No-show'];
const PAY_ONLINE = ['QRIS', 'Virtual Account', 'E-wallet', 'Credit card'];
const PAY_ONSITE = ['Cash', 'Debit card', 'QRIS (on-site)'];
const RETRY_MAX = 3, BACKOFF = [3000, 6000, 12000];
const DEMO_PW = 'Mediora123!';
const HOSPITAL = 'MEDIORA Demo Hospital';

class Err extends Error { constructor(code, message, data) { super(message); this.code = code; this.data = data || {}; } }
const fail = (c, m, d) => { throw new Err(c, m, d); };

let S = null, store = null;
const listeners = new Set();
const emit = () => listeners.forEach((f) => f());

/* ---------- storage + transactions ---------- */
function memStore() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; }
function pickStore() { try { const t = '__mediora_t'; localStorage.setItem(t, '1'); localStorage.removeItem(t); return localStorage; } catch (e) { return memStore(); } }
function save() { S.rev = (S.rev || 0) + 1; try { store.setItem(KEY, JSON.stringify(S)); store.setItem(KEY + '.rev', String(S.rev)); } catch (e) { /* storage full or blocked: keep working in memory */ }
  emit(); }
function reload() {
  try {
    const r = store.getItem(KEY + '.rev');
    if (r !== null && (!S || Number(r) > (S.rev || 0))) { const raw = store.getItem(KEY); if (raw) S = JSON.parse(raw); }
  } catch (e) { /* ignore */ }
}
/* Every write runs in tx: re-read latest state, apply, commit; any throw rolls everything back. */
function tx(fn) {
  reload();
  const snap = JSON.stringify(S);
  try { const r = fn(); save(); return r; } catch (e) { S = JSON.parse(snap); throw e; }
}

/* ---------- time (all display in WIB, all stored timestamps in UTC ISO) ---------- */
const now = () => Date.now() + (S ? S.clock : 0);
/* The demo always opens during working hours: outside 08:00-13:00 WIB the demo clock is moved to 09:30 WIB
   of the same WIB date, so today's seeded queue is live and walk-ins and bookings behave as in a clinic day. */
function demoOffset() { const wibMs = (Date.now() + OFF) % DAY, h = wibMs / 36e5; return h >= 8 && h < 13 ? 0 : 9.5 * 36e5 - wibMs; }
const iso = () => new Date(now()).toISOString();
const dkey = ms => new Date(ms + OFF).toISOString().slice(0, 10);
const today = () => dkey(now());
const addDays = (k, n) => dkey(Date.parse(k + 'T12:00:00+07:00') + n * DAY);
const wday = k => new Date(k + 'T00:00:00Z').getUTCDay();
const startMs = (d, k) => Date.parse(`${k}T${d.shiftStart}:00+07:00`);
const endMs = (d, k) => startMs(d, k) + d.shiftHours * 36e5;
const pad = (n, w = 3) => String(n).padStart(w, '0');
const fmtDate = k => new Date(k + 'T12:00:00+07:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
const fmtTime = i => new Date(i).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const fmtDateTime = i => new Date(i).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ }) + ' WIB';
const fmtIDR = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtWait = m => (m <= 0 ? 'Your turn' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : ''));
const ageOf = dob => { const t = today(); let a = +t.slice(0, 4) - +dob.slice(0, 4); if (t.slice(5) < dob.slice(5)) a--; return a; };

/* ---------- validation ---------- */
const str = (v, max = 120) => String(v == null ? '' : v).trim().slice(0, max);
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneNorm = p => String(p || '').replace(/[\s\-().]/g, '');
const phoneRe = /^\+?[0-9]{9,15}$/;
function vDob(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(v + 'T00:00:00Z'))) fail('INVALID', 'Enter a valid date of birth.');
  if (v > today() || v < '1900-01-01') fail('INVALID', 'Date of birth must be in the past.');
}
function vPassword(p) { if (typeof p !== 'string' || p.length < 8 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) fail('INVALID', 'Password needs at least 8 characters with a letter and a number.'); }
function vPatient(d, opt = {}) {
  const o = { name: str(d.name, 80), dob: str(d.dob, 10), gender: str(d.gender, 10), phone: phoneNorm(d.phone), email: str(d.email, 120).toLowerCase() };
  if (o.name.length < 2) fail('INVALID', 'Enter the full name.');
  vDob(o.dob);
  if (!['Male', 'Female'].includes(o.gender)) fail('INVALID', 'Choose a gender.');
  if (!phoneRe.test(o.phone)) fail('INVALID', 'Enter a valid phone number (9 to 15 digits).');
  if (o.email ? !emailRe.test(o.email) : !opt.emailOptional) fail('INVALID', 'Enter a valid email address.');
  return o;
}

/* ---------- crypto (PBKDF2 here; a server build would use bcrypt/argon2) ---------- */
const randHex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
async function hashPw(pw, saltHex) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const salt = Uint8Array.from(saltHex.match(/../g).map(h => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function mkCred(pw) { const salt = randHex(16); return { salt, hash: await hashPw(pw, salt) }; }
const code6 = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));

/* ---------- lookups ---------- */
const nid = p => p + (++S.seq);
const U = id => S.users.find(u => u.id === id);
const D = id => S.doctors.find(d => d.id === id);
const A = id => S.appts.find(a => a.id === id);
const P = aid => S.pays.find(y => y.apptId === aid);
const DEP = id => S.depts.find(x => x.id === id);
const cap = d => Math.floor((d.shiftHours * 60) / d.consultMin);
const isHeld = a => { if (a.status !== 'Booked') return false; const y = P(a.id); return !!y && y.status === 'Pending'; };
const inQueue = a => ACTIVE.includes(a.status) && !isHeld(a);
const used = (docId, date) => S.appts.filter(a => a.doctorId === docId && a.date === date && a.status !== 'Cancelled').length;
const onLeave = (docId, date) => S.leaves.some(l => l.doctorId === docId && l.date === date);
const working = (d, k) => d.active && d.shiftDays.includes(wday(k)) && !onLeave(d.id, k);
const bookable = (d, k) => working(d, k) && (k > today() || (k === today() && now() < endMs(d, k)));
const left = (d, k) => cap(d) - used(d.id, k);
function nextAvailable(d, from) { let k = from || today(); for (let i = 0; i < 120; i++, k = addDays(k, 1)) if (bookable(d, k) && left(d, k) > 0) return k; return null; }
function availableDates(d, n = 7) {
  const out = []; let k = today();
  for (let i = 0; i < 120 && out.length < n; i++, k = addDays(k, 1)) if (bookable(d, k)) out.push({ date: k, left: Math.max(0, left(d, k)), capacity: cap(d) });
  return out;
}
const aheadOf = a => S.appts.filter(x => x.doctorId === a.doctorId && x.date === a.date && x.queueNo < a.queueNo && inQueue(x)).length;
function serving(docId, date) {
  const q = S.appts.filter(a => a.doctorId === docId && a.date === date);
  const c = q.find(a => a.status === 'In consultation');
  if (c) return { label: c.label, state: 'in-consultation' };
  const done = q.filter(a => a.status === 'Completed').sort((x, y) => y.queueNo - x.queueNo)[0];
  return done ? { label: done.label, state: 'last-completed' } : null;
}

/* ---------- access control ---------- */
function who(actor, roles) {
  reload();
  if (!actor) fail('AUTH', 'Please sign in.');
  const u = U(actor.id);
  if (!u || u.role !== actor.role) fail('AUTH', 'Your session is no longer valid. Please sign in again.');
  if (roles && !roles.includes(u.role)) fail('FORBIDDEN', 'You do not have permission to do that.');
  return u;
}
function logA(u, action, entity, entityId, detail) {
  if (u && u.role === 'patient') return;
  S.audit.unshift({ id: nid('l'), at: iso(), actorId: u ? u.id : null, actor: u ? u.name : 'System', role: u ? u.role : 'system', action, entity, entityId, detail: detail || '' });
  if (S.audit.length > 800) S.audit.length = 800;
}

/* ---------- notifications: in-app now, email + WhatsApp through an async job queue ---------- */
function queueMsg(channel, to, subject, body, extra) {
  S.jobs.push({ id: nid('j'), channel, to, subject, body, kind: (extra && extra.kind) || 'info', userId: extra && extra.userId, apptId: extra && extra.apptId, action: (extra && extra.action) || null, status: 'queued', attempts: 0, runAt: Date.now(), log: [], createdAt: iso() });
  if (S.jobs.length > 400) S.jobs = S.jobs.filter(j => j.status === 'queued').concat(S.jobs.filter(j => j.status !== 'queued').slice(-300));
}
function notify(userId, kind, subject, body, apptId) {
  const u = U(userId); if (!u) return;
  S.notifs.unshift({ id: nid('n'), userId, kind, subject, body, at: iso(), read: false, apptId: apptId || null });
  if (S.notifs.length > 600) S.notifs.length = 600;
  if (u.email) queueMsg('email', u.email, subject, body, { kind, userId, apptId });
  if (u.phone) queueMsg('whatsapp', u.phone, subject, body, { kind, userId, apptId });
}
const apptLine = a => { const d = D(a.doctorId); return `${d.name}, ${fmtDate(a.date)}, queue number ${a.label}`; };

function evaluateAlerts(docId, date) {
  if (date !== today()) return;
  const d = D(docId); if (!d) return;
  const q = S.appts.filter(a => a.doctorId === docId && a.date === date && ['Booked', 'Checked-in'].includes(a.status) && !isHeld(a)).sort((x, y) => x.queueNo - y.queueNo);
  for (const a of q) {
    const ahead = aheadOf(a);
    if (ahead <= S.cfg.alertThreshold && !a.flags.alert) {
      a.flags.alert = true;
      notify(a.patientId, 'queue-alert', `Your turn is near (${a.label})`, `${ahead} patient${ahead === 1 ? '' : 's'} ahead of you with ${d.name}. Estimated wait: ${fmtWait(ahead * d.consultMin)}. Please head to the hospital.`, a.id);
    }
    const waitingAhead = ahead - (S.appts.some(x => x.doctorId === docId && x.date === date && x.status === 'In consultation' && x.queueNo < a.queueNo) ? 1 : 0);
    if (waitingAhead === 0 && !a.flags.next) {
      a.flags.next = true;
      notify(a.patientId, 'queue-next', `You're next (${a.label})`, `You are next to see ${d.name}. Please wait near the consultation room.`, a.id);
    }
  }
}
const afterQueueChange = (docId, date) => evaluateAlerts(docId, date);

/* ---------- builders ---------- */
function nextNo(docId, date) { let m = 0; for (const a of S.appts) if (a.doctorId === docId && a.date === date && a.queueNo > m) m = a.queueNo; return m + 1; }
function mkAppt(p, d, date, o) {
  const no = nextNo(d.id, date);
  const a = { id: nid('a'), patientId: p.id, doctorId: d.id, date, queueNo: no, label: d.letter + '-' + pad(no), status: o.status || 'Booked', source: o.source || 'online', createdAt: o.at || iso(), flags: {} };
  S.appts.push(a); return a;
}
function markPaid(y, method, by, at) {
  y.status = 'Paid'; y.method = method; y.paidAt = at || iso(); y.recordedBy = by || null;
  y.invoiceNo = 'INV-' + dkey(Date.parse(y.paidAt)).replace(/-/g, '') + '-' + pad(++S.invSeq, 4);
}
function mkPay(a, d, o) {
  const y = { id: nid('y'), apptId: a.id, amount: d.fee, method: null, status: 'Pending', createdAt: o.at || iso(), paidAt: null, invoiceNo: null, recordedBy: null };
  S.pays.push(y);
  if (o.status === 'Paid') markPaid(y, o.method, o.by, o.at);
  if (o.status === 'Refunded') { markPaid(y, o.method, o.by, o.at); y.status = 'Refunded'; y.refundedAt = o.at || iso(); }
  return y;
}
function cancelCore(a, reason) {
  const y = P(a.id);
  a.status = 'Cancelled'; a.cancelledAt = iso(); a.cancelReason = reason; a.flags.unavailable = false; delete a.holdExpiresAt;
  if (y) { if (y.status === 'Paid') { y.status = 'Refunded'; y.refundedAt = iso(); } else if (y.status === 'Pending') S.pays = S.pays.filter(z => z !== y); }
}
function confirmNotice(a) { const d = D(a.doctorId); notify(a.patientId, 'booking', `Booking confirmed: ${a.label}`, `Your queue number is ${a.label} with ${d.name} (${DEP(d.deptId).name}) on ${fmtDate(a.date)}. Shift starts ${d.shiftStart} WIB. Open My Queue to follow your position.`, a.id); }

function view(a) {
  const d = D(a.doctorId), p = U(a.patientId), y = P(a.id), dep = d && DEP(d.deptId);
  const v = { ...a, doctorName: d && d.name, deptName: dep && dep.name, consultMin: d && d.consultMin, fee: d && d.fee, patientName: p && p.name, payment: y ? { ...y } : null, held: isHeld(a), dateLabel: fmtDate(a.date),
    patient: p ? { id: p.id, name: p.name, gender: p.gender, age: ageOf(p.dob) } : null };
  if (inQueue(a) && a.date === today()) { v.ahead = aheadOf(a); v.estWaitMin = v.ahead * d.consultMin; }
  v.cancelBy = startMs(d, a.date) - S.cfg.cutoffHours * 36e5;
  v.canCancel = a.status === 'Booked' && (!!a.flags.unavailable || now() <= v.cancelBy);
  return v;
}

/* ---------- seed ---------- */
async function seed() {
  S = { rev: 0, seq: 100, clock: 0, anchor: 0, invSeq: 0, cfg: { alertThreshold: 5, cutoffHours: 2, holdMinutes: 15, simFail: { email: false, whatsapp: false } },
    users: [], depts: [], doctors: [], appts: [], pays: [], notifs: [], jobs: [], messages: [], audit: [], leaves: [] };
  S.anchor = S.clock = demoOffset();
  const addUser = async (role, name, email, extra) => { const u = { id: nid('u'), role, name, email, phone: '', dob: '', gender: '', emailVerified: true, cred: await mkCred(DEMO_PW), createdAt: iso(), ...extra }; S.users.push(u); return u; };
  await addUser('admin', 'Hana Wijaya', 'admin@mediora.demo', { phone: '+6281200000001' });
  await addUser('staff', 'Rudi Hartanto', 'staff@mediora.demo', { phone: '+6281200000002' });
  const dep = n => { const x = { id: nid('p'), name: n[0], description: n[1] }; S.depts.push(x); return x; };
  const dg = dep(['General Medicine', 'Primary care, check-ups and everyday illness.']), dp = dep(['Pediatrics', 'Care for infants, children and teens.']),
    dc = dep(['Cardiology', 'Heart and blood-pressure care.']), dd = dep(['Dermatology', 'Skin, hair and nail conditions.']);
  const docDefs = [
    ['dr. Raka Pratama', dg, 'A', 150000, [0, 1, 2, 3, 4, 5, 6], '08:00', 7, 60, 'raka@mediora.demo'],
    ['dr. Sinta Maharani, Sp.A', dp, 'B', 200000, [1, 3, 5], '09:00', 6, 30, 'sinta@mediora.demo'],
    ['dr. Dimas Wicaksono, Sp.JP', dc, 'C', 350000, [1, 3, 5], '10:00', 6, 60, 'dimas@mediora.demo'],
    ['dr. Laras Anindya, Sp.KK', dd, 'D', 250000, [2, 4], '09:00', 4, 60, 'laras@mediora.demo'],
    ['dr. Bayu Santoso', dg, 'E', 150000, [2, 4, 6], '13:00', 5, 60, 'bayu@mediora.demo']];
  for (const r of docDefs) {
    const d = { id: nid('d'), name: r[0], deptId: r[1].id, letter: r[2], fee: r[3], shiftDays: r[4], shiftStart: r[5], shiftHours: r[6], consultMin: r[7], active: true };
    S.doctors.push(d); await addUser('doctor', d.name, r[8], { doctorId: d.id, phone: '+62812000001' + pad(S.doctors.length, 2) });
  }
  const pts = [['Dewi Lestari', 'patient@mediora.demo', '1994-03-12', 'Female'], ['Budi Hartono', 'budi@mediora.demo', '1981-07-30', 'Male'], ['Siti Aminah', 'siti@mediora.demo', '1990-11-02', 'Female'],
    ['Agus Setiawan', 'agus@mediora.demo', '1975-01-19', 'Male'], ['Rina Wulandari', 'rina@mediora.demo', '2001-05-23', 'Female'], ['Joko Prasetyo', 'joko@mediora.demo', '1968-09-08', 'Male'],
    ['Maya Putri', 'maya@mediora.demo', '1998-12-15', 'Female'], ['Eko Nugroho', 'eko@mediora.demo', '1986-04-27', 'Male']];
  const P_ = [];
  for (let i = 0; i < pts.length; i++) P_.push(await addUser('patient', pts[i][0], pts[i][1], { dob: pts[i][2], gender: pts[i][3], phone: '+62813000000' + pad(i + 1, 2) }));
  const [A_, B_, C_, D_] = S.doctors;
  const mk = (pt, d, date, status, pay, at) => { const a = mkAppt(pt, d, date, { status, at }); mkPay(a, d, { status: pay, method: pay === 'Pending' ? null : 'QRIS', at }); return a; };
  const t0 = today();
  // Dr. Raka's day today: 6 patients ahead of the demo patient (A-007 is the last slot)
  ['In consultation', 'Checked-in', 'Booked', 'Checked-in', 'Booked', 'Booked', 'Booked'].forEach((st, i) => mk(P_[i === 6 ? 0 : i + 1], A_, t0, st, 'Paid'));
  // Dr. Laras: her next working day is already full (shows automatic move to the next working day)
  let k = t0; while (!working(D_, k) || k === t0 && now() >= endMs(D_, k)) k = addDays(k, 1);
  for (let i = 0; i < 4; i++) mk(P_[i + 1], D_, k, 'Booked', 'Paid');
  // upcoming booking for the demo patient + partial days for others
  const nB = nextAvailable(C_, addDays(t0, 1)); mk(P_[0], C_, nB, 'Booked', 'Paid');
  const nS = nextAvailable(B_, addDays(t0, 1)); for (let i = 0; i < 3; i++) mk(P_[i + 2], B_, nS, 'Booked', 'Paid');
  // history for the dashboard and the demo patient
  const back = (d, n) => { let x = addDays(t0, -n); while (!d.shiftDays.includes(wday(x))) x = addDays(x, -1); return x; };
  const outcomes = ['Completed', 'Completed', 'Completed', 'No-show', 'Cancelled'];
  for (let i = 0; i < 16; i++) {
    const d = S.doctors[i % 5], date = back(d, 1 + Math.floor(i / 2)), st = outcomes[i % 5], at = new Date(Date.parse(date + 'T09:00:00+07:00')).toISOString();
    const a = mkAppt(P_[(i + 1) % 8], d, date, { status: st, at }); mkPay(a, d, { status: st === 'Cancelled' ? 'Refunded' : 'Paid', method: PAY_ONLINE[i % 4], at });
    if (st === 'Cancelled') a.cancelReason = 'Cancelled by patient';
  }
  mk(P_[0], B_, back(B_, 10), 'Completed', 'Paid', new Date(Date.parse(back(B_, 10) + 'T09:00:00+07:00')).toISOString());
  return S;
}

/* ---------- init / session ---------- */
async function init(opts = {}) {
  store = opts.store || pickStore();
  reload();
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('storage', (e) => { if (e.key && e.key.indexOf(KEY) === 0) { reload(); emit(); } });
  if (!S) { await seed(); save(); }
  return true;
}
async function resetDemo() { try { store.removeItem(KEY); store.removeItem(KEY + '.rev'); } catch (e) { /* ignore */ } S = null; await seed(); save(); }

async function login(email, pw) {
  reload();
  const u = S.users.find(x => x.email && x.email === str(email, 120).toLowerCase());
  const bad = () => fail('AUTH', 'Email or password is incorrect.');
  if (!u || !u.cred) { await hashPw('x', '00'.repeat(16)); bad(); }
  if (await hashPw(String(pw || ''), u.cred.salt) !== u.cred.hash) bad();
  return { id: u.id, role: u.role, name: u.name };
}
async function register(d) {
  const o = vPatient(d); vPassword(d.password);
  const cred = await mkCred(d.password);
  return tx(() => {
    if (S.users.some(u => u.email === o.email)) fail('INVALID', 'An account with this email already exists.');
    const u = { id: nid('u'), role: 'patient', ...o, emailVerified: false, cred, createdAt: iso() };
    S.users.push(u); sendCode(u, 'verify');
    return { id: u.id, role: u.role, name: u.name };
  });
}
function sendCode(u, type) {
  const code = code6(); const field = type === 'verify' ? 'verifyCode' : 'resetCode';
  u[field] = { code, exp: now() + 30 * 60000 };
  const subject = type === 'verify' ? 'Verify your MEDIORA email' : 'Reset your MEDIORA password';
  const body = type === 'verify' ? `Hello ${u.name}, confirm your email address to start booking. Your code is ${code}. It expires in 30 minutes.` : `Hello ${u.name}, use code ${code} to choose a new password. It expires in 30 minutes. If you did not ask for this, ignore this message.`;
  queueMsg('email', u.email, subject, body, { kind: type, userId: u.id, action: { type, code } });
}
function verifyEmail(email, code) {
  return tx(() => {
    const u = S.users.find(x => x.email === str(email, 120).toLowerCase());
    if (!u || !u.verifyCode || u.verifyCode.code !== str(code, 6) || u.verifyCode.exp < now()) fail('INVALID', 'That verification code is wrong or has expired.');
    u.emailVerified = true; delete u.verifyCode; return true;
  });
}
function resendVerification(actor) { return tx(() => { const u = who(actor, ['patient']); if (u.emailVerified) fail('INVALID', 'Your email is already verified.'); sendCode(u, 'verify'); return true; }); }
function requestReset(email) { return tx(() => { const u = S.users.find(x => x.email === str(email, 120).toLowerCase() && x.cred); if (u) sendCode(u, 'reset'); return true; }); }
async function resetPassword(email, code, pw) {
  vPassword(pw); const cred = await mkCred(pw);
  return tx(() => {
    const u = S.users.find(x => x.email === str(email, 120).toLowerCase());
    if (!u || !u.resetCode || u.resetCode.code !== str(code, 6) || u.resetCode.exp < now()) fail('INVALID', 'That reset code is wrong or has expired.');
    u.cred = cred; delete u.resetCode; return true;
  });
}
function me(actor) { const u = who(actor); return { id: u.id, role: u.role, name: u.name, email: u.email, emailVerified: u.emailVerified, doctorId: u.doctorId || null }; }

/* ---------- directory ---------- */
function decorateDoc(d) {
  const nx = nextAvailable(d);
  return { ...d, deptName: DEP(d.deptId) ? DEP(d.deptId).name : '', capacity: cap(d), nextDate: nx, nextLeft: nx ? left(d, nx) : 0, endTime: new Date(startMs(d, '2000-01-03') + d.shiftHours * 36e5).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) };
}
function listDoctors(f = {}) {
  reload(); const q = str(f.q, 60).toLowerCase();
  return S.doctors.filter(d => (f.all || d.active) && (!f.deptId || d.deptId === f.deptId) && (!q || d.name.toLowerCase().includes(q) || (DEP(d.deptId) && DEP(d.deptId).name.toLowerCase().includes(q)))).map(decorateDoc);
}
function listDepts() { reload(); return S.depts.map(x => ({ ...x, doctors: S.doctors.filter(d => d.deptId === x.id).length })); }
function doctorDates(doctorId) { reload(); const d = D(doctorId); if (!d) fail('NOT_FOUND', 'Doctor not found.'); return { doctor: decorateDoc(d), dates: availableDates(d, 7) }; }

/* ---------- patient booking + payment ---------- */
function book(actor, { doctorId, date }) {
  return tx(() => {
    const u = who(actor, ['patient']);
    if (!u.emailVerified) fail('UNVERIFIED', 'Verify your email before booking.');
    const d = D(doctorId); if (!d || !d.active) fail('NOT_FOUND', 'Doctor not found.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !bookable(d, date)) fail('NOT_AVAILABLE', 'The doctor is not available on that date.', { next: nextAvailable(d) });
    if (S.appts.some(a => a.patientId === u.id && a.doctorId === d.id && a.date === date && a.status !== 'Cancelled')) fail('DUPLICATE', 'You already have a booking with this doctor on that date.');
    if (left(d, date) <= 0) fail('FULL', 'That date just filled up.', { next: nextAvailable(d, addDays(date, 1)) });
    const a = mkAppt(u, d, date, {}); mkPay(a, d, {});
    a.holdExpiresAt = new Date(now() + S.cfg.holdMinutes * 60000).toISOString();
    return view(a);
  });
}
function pay(actor, apptId, { method, simulate }) {
  return tx(() => {
    const u = who(actor, ['patient']); const a = A(apptId);
    if (!a || a.patientId !== u.id) fail('NOT_FOUND', 'Booking not found.');
    const y = P(a.id);
    if (a.status === 'Cancelled') fail('EXPIRED', 'This booking was released because payment did not arrive in time. Please book again.');
    if (!y || y.status !== 'Pending') fail('INVALID', 'This booking is already paid.');
    if (!PAY_ONLINE.includes(method)) fail('INVALID', 'Choose a payment method.');
    if (simulate === 'fail') { y.lastError = 'Payment was declined by the sandbox gateway.'; fail('PAY_FAILED', 'The payment did not go through. Your booking is still held, so you can try again.', { holdExpiresAt: a.holdExpiresAt }); }
    markPaid(y, method, null); delete a.holdExpiresAt; delete y.lastError;
    confirmNotice(a); afterQueueChange(a.doctorId, a.date);
    return view(a);
  });
}
function cancel(actor, apptId, reason) {
  return tx(() => {
    const u = who(actor, ['patient', 'staff', 'admin']); const a = A(apptId);
    if (!a) fail('NOT_FOUND', 'Appointment not found.');
    if (u.role === 'patient') {
      if (a.patientId !== u.id) fail('NOT_FOUND', 'Appointment not found.');
      if (a.status !== 'Booked') fail('LOCKED', 'Only booked appointments can be cancelled.');
      if (!a.flags.unavailable && now() > startMs(D(a.doctorId), a.date) - S.cfg.cutoffHours * 36e5) fail('LATE', `Online cancellation closed ${S.cfg.cutoffHours} hours before the shift started. Please contact the hospital.`);
    } else if (!['Booked', 'Checked-in'].includes(a.status)) fail('LOCKED', 'Only booked or checked-in appointments can be cancelled.');
    const had = P(a.id) && P(a.id).status === 'Paid';
    cancelCore(a, str(reason, 120) || (u.role === 'patient' ? 'Cancelled by patient' : 'Cancelled by ' + u.role));
    notify(a.patientId, 'cancel', `Booking cancelled: ${a.label}`, `Your booking ${apptLine(a)} was cancelled.${had ? ' The payment is marked as refunded.' : ''}`, a.id);
    logA(u, 'cancel', 'appointment', a.id, `${a.label} on ${a.date}`); afterQueueChange(a.doctorId, a.date);
    return view(a);
  });
}

/* ---------- queue ---------- */
function canTouch(u, a) { if (u.role === 'doctor' && a.doctorId !== u.doctorId) fail('FORBIDDEN', 'This patient is in another doctor\'s queue.'); }
function callNext(actor, doctorId, date) {
  return tx(() => {
    const u = who(actor, ['doctor', 'admin']); date = date || today();
    const did = u.role === 'doctor' ? u.doctorId : doctorId; const d = D(did); if (!d) fail('NOT_FOUND', 'Doctor not found.');
    if (S.appts.some(a => a.doctorId === did && a.date === date && a.status === 'In consultation')) fail('BUSY', 'Finish the current consultation first.');
    const n = S.appts.filter(a => a.doctorId === did && a.date === date && ['Booked', 'Checked-in'].includes(a.status) && !isHeld(a)).sort((x, y) => x.queueNo - y.queueNo)[0];
    if (!n) fail('EMPTY', 'Nobody is waiting.');
    n.status = 'In consultation'; n.startedAt = iso();
    notify(n.patientId, 'queue-called', `Please enter now (${n.label})`, `${d.name} is ready to see you. Queue number ${n.label}.`, n.id);
    logA(u, 'call-next', 'queue', n.id, `${n.label} called`); afterQueueChange(did, date);
    return view(n);
  });
}
function done(actor, apptId) {
  return tx(() => {
    const u = who(actor, ['doctor', 'admin']); const a = A(apptId); if (!a) fail('NOT_FOUND', 'Appointment not found.'); canTouch(u, a);
    if (a.status !== 'In consultation') fail('LOCKED', 'Only a consultation in progress can be marked done.');
    a.status = 'Completed'; a.completedAt = iso(); logA(u, 'done', 'queue', a.id, `${a.label} completed`); afterQueueChange(a.doctorId, a.date);
    return view(a);
  });
}
function noShow(actor, apptId) {
  return tx(() => {
    const u = who(actor, ['doctor', 'staff', 'admin']); const a = A(apptId); if (!a) fail('NOT_FOUND', 'Appointment not found.'); canTouch(u, a);
    if (!['Booked', 'Checked-in'].includes(a.status) || isHeld(a)) fail('LOCKED', 'Only a waiting patient can be marked no-show.');
    a.status = 'No-show'; logA(u, 'no-show', 'queue', a.id, `${a.label} skipped`); afterQueueChange(a.doctorId, a.date);
    return view(a);
  });
}
function checkIn(actor, apptId) {
  return tx(() => {
    const u = who(actor, ['staff', 'admin']); const a = A(apptId); if (!a) fail('NOT_FOUND', 'Appointment not found.');
    if (a.status !== 'Booked' || isHeld(a)) fail('LOCKED', 'Only a paid, booked appointment can be checked in.');
    if (a.date !== today()) fail('LOCKED', 'Check-in opens on the day of the appointment.');
    a.status = 'Checked-in'; logA(u, 'check-in', 'appointment', a.id, a.label); return view(a);
  });
}
function reinsert(actor, apptId, reason) {
  return tx(() => {
    const u = who(actor, ['staff', 'admin']); const a = A(apptId); if (!a) fail('NOT_FOUND', 'Appointment not found.');
    if (a.status !== 'No-show') fail('LOCKED', 'Only a skipped patient can be re-inserted.');
    if (a.date !== today()) fail('LOCKED', 'Re-insert works on today\'s queue only.');
    const r = str(reason, 160); if (!r) fail('INVALID', 'Enter a reason for the override.');
    a.status = 'Checked-in'; a.flags.alert = a.flags.next = false;
    logA(u, 'reinsert', 'queue', a.id, `${a.label} re-inserted. Reason: ${r}`); afterQueueChange(a.doctorId, a.date);
    return view(a);
  });
}
function recordPayment(actor, apptId, method) {
  return tx(() => {
    const u = who(actor, ['staff', 'admin']); const a = A(apptId); const y = a && P(a.id);
    if (!y || y.status !== 'Pending' || a.status === 'Cancelled') fail('INVALID', 'There is no pending payment to record.');
    if (!PAY_ONSITE.includes(method)) fail('INVALID', 'Choose a payment method.');
    markPaid(y, method, u.id); delete a.holdExpiresAt; confirmNotice(a);
    logA(u, 'payment', 'payment', y.id, `${fmtIDR(y.amount)} by ${method} for ${a.label}`); afterQueueChange(a.doctorId, a.date);
    return view(a);
  });
}
function registerAppointment(actor, p) {
  return tx(() => {
    const u = who(actor, ['staff', 'admin']);
    const pt = U(p.patientId); if (!pt || pt.role !== 'patient') fail('NOT_FOUND', 'Choose a patient.');
    const d = D(p.doctorId); if (!d || !d.active) fail('NOT_FOUND', 'Choose a doctor.');
    let date = u.role === 'staff' ? today() : (p.date || today());
    if (date < today()) fail('INVALID', 'The date is in the past.');
    if (!PAY_ONSITE.includes(p.method)) fail('INVALID', 'Record how the patient paid.');
    if (!bookable(d, date)) fail('NOT_AVAILABLE', `${d.name} is not taking patients on ${fmtDate(date)}.`, { next: nextAvailable(d, addDays(date, 1)) });
    if (S.appts.some(a => a.patientId === pt.id && a.doctorId === d.id && a.date === date && a.status !== 'Cancelled')) fail('DUPLICATE', 'This patient already has a booking with this doctor on that date.');
    let note = '';
    if (used(d.id, date) >= cap(d)) {
      const nx = nextAvailable(d, addDays(date, 1)); const reason = str(p.overrideReason, 160);
      if (p.moveNext) { if (!nx) fail('FULL', 'No capacity in the next 90 days.'); date = nx; note = ' (moved to next day)'; }
      else if (reason) note = ` (capacity override: ${reason})`;
      else fail('FULL', `${d.name} is full on ${fmtDate(date)} (${cap(d)} of ${cap(d)} taken).`, { next: nx });
    }
    const a = mkAppt(pt, d, date, { status: u.role === 'staff' && date === today() ? 'Checked-in' : 'Booked', source: u.role === 'staff' ? 'walkin' : 'admin' });
    mkPay(a, d, { status: 'Paid', method: p.method, by: u.id }); confirmNotice(a);
    logA(u, 'register', 'appointment', a.id, `${a.label} for ${pt.name} on ${a.date}${note}`); afterQueueChange(d.id, date);
    return view(a);
  });
}
function adminSetStatus(actor, apptId, status, reason) {
  return tx(() => {
    const u = who(actor, ['admin']); const a = A(apptId); if (!a) fail('NOT_FOUND', 'Appointment not found.');
    if (!STATUSES.includes(status)) fail('INVALID', 'Unknown status.');
    if (status === a.status) return view(a);
    const r = str(reason, 160); if (!r) fail('INVALID', 'Enter a reason for the change.');
    const from = a.status;
    if (status === 'Cancelled') cancelCore(a, r);
    else {
      if (status === 'In consultation' && S.appts.some(x => x.doctorId === a.doctorId && x.date === a.date && x.status === 'In consultation')) fail('BUSY', 'Another consultation is already in progress for this doctor.');
      if (from === 'Cancelled') { if (used(a.doctorId, a.date) >= cap(D(a.doctorId))) fail('FULL', 'The day is full; a cancelled booking cannot be restored.'); const y = P(a.id); if (y && y.status === 'Refunded') y.status = 'Paid'; }
      a.status = status;
    }
    logA(u, 'set-status', 'appointment', a.id, `${a.label}: ${from} to ${status}. Reason: ${r}`); afterQueueChange(a.doctorId, a.date);
    return view(a);
  });
}
function deleteAppt(actor, apptId) {
  return tx(() => {
    const u = who(actor, ['admin']); const a = A(apptId); if (!a) fail('NOT_FOUND', 'Appointment not found.');
    S.pays = S.pays.filter(y => y.apptId !== a.id); S.appts = S.appts.filter(x => x !== a);
    logA(u, 'delete', 'appointment', a.id, `${a.label} on ${a.date} (${(U(a.patientId) || {}).name})`); afterQueueChange(a.doctorId, a.date); return true;
  });
}

/* ---------- reads ---------- */
function myAppts(actor) { const u = who(actor, ['patient']); return S.appts.filter(a => a.patientId === u.id).sort((x, y) => (y.date + pad(y.queueNo)).localeCompare(x.date + pad(x.queueNo))).map(view); }
function myQueue(actor) {
  const u = who(actor, ['patient']); const t = today();
  return S.appts.filter(a => a.patientId === u.id && (a.date >= t) && (ACTIVE.includes(a.status))).sort((x, y) => x.date.localeCompare(y.date)).map(a => {
    const v = view(a); const d = D(a.doctorId);
    v.live = a.date === t && inQueue(a); v.serving = v.live ? serving(a.doctorId, a.date) : null;
    v.shiftStartLabel = fmtTime(startMs(d, a.date)); v.shiftEndLabel = fmtTime(endMs(d, a.date)); return v;
  });
}
function queue(actor, doctorId, date) {
  const u = who(actor, ['doctor', 'staff', 'admin']); const did = u.role === 'doctor' ? u.doctorId : doctorId; const d = D(did); if (!d) fail('NOT_FOUND', 'Doctor not found.');
  date = date || today();
  const entries = S.appts.filter(a => a.doctorId === did && a.date === date).sort((x, y) => x.queueNo - y.queueNo).map(view);
  const waiting = entries.filter(e => ['Booked', 'Checked-in'].includes(e.status) && !e.held);
  return { doctor: decorateDoc(d), date, dateLabel: fmtDate(date), working: working(d, date), onLeave: onLeave(did, date), capacity: cap(d), used: used(did, date), serving: serving(did, date), entries, waitingCount: waiting.length, busy: entries.some(e => e.status === 'In consultation'), isToday: date === today() };
}
function board(actor) { who(actor, ['staff', 'admin']); const t = today(); return S.doctors.filter(d => d.active && (working(d, t) || used(d.id, t) > 0)).map(d => queue(actor, d.id, t)); }
function doctorSchedule(actor) {
  const u = who(actor, ['doctor']); const d = D(u.doctorId); const out = []; let k = today();
  for (let i = 0; i < 14; i++, k = addDays(k, 1)) out.push({ date: k, label: fmtDate(k), shift: d.shiftDays.includes(wday(k)), onLeave: onLeave(d.id, k), used: used(d.id, k), capacity: cap(d) });
  return { doctor: decorateDoc(d), days: out };
}
function listAppts(actor, f = {}) {
  who(actor, ['admin']); const q = str(f.q, 60).toLowerCase();
  return S.appts.filter(a => (!f.date || a.date === f.date) && (!f.doctorId || a.doctorId === f.doctorId) && (!f.status || a.status === f.status)).map(view)
    .filter(v => !q || (v.patientName || '').toLowerCase().includes(q) || v.label.toLowerCase().includes(q)).sort((x, y) => (y.date + pad(y.queueNo)).localeCompare(x.date + pad(x.queueNo))).slice(0, 300);
}
function searchPatients(actor, q) {
  who(actor, ['staff', 'admin']); q = str(q, 60).toLowerCase();
  return S.users.filter(u => u.role === 'patient' && (!q || u.name.toLowerCase().includes(q) || (u.phone || '').includes(q) || (u.email || '').includes(q))).slice(0, 50).map(pubPatient);
}
const pubPatient = u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, dob: u.dob, gender: u.gender, age: u.dob ? ageOf(u.dob) : null, hasLogin: !!u.cred, emailVerified: u.emailVerified });

/* ---------- notifications ---------- */
function myNotifs(actor) { const u = who(actor, ['patient']); return S.notifs.filter(n => n.userId === u.id).slice(0, 60); }
function markRead(actor) { return tx(() => { const u = who(actor, ['patient']); S.notifs.forEach(n => { if (n.userId === u.id) n.read = true; }); return true; }); }
function banners(actor) { const u = who(actor, ['patient']); return S.jobs.filter(j => j.userId === u.id && j.status === 'failed' && !j.dismissed).slice(-3).map(j => ({ id: j.id, channel: j.channel, subject: j.subject, body: j.body })); }
function dismissBanner(actor, jobId) { return tx(() => { const u = who(actor, ['patient']); const j = S.jobs.find(x => x.id === jobId && x.userId === u.id); if (j) j.dismissed = true; return true; }); }
function setThreshold(actor, n) {
  return tx(() => { const u = who(actor, ['admin']); n = Number(n); if (!Number.isInteger(n) || n < 1 || n > 50) fail('INVALID', 'Enter a whole number from 1 to 50.'); S.cfg.alertThreshold = n; logA(u, 'config', 'settings', 'alertThreshold', `Alert threshold set to ${n}`); return n; });
}
function listJobs(actor) { who(actor, ['admin']); return S.jobs.slice(-80).reverse().map(j => ({ ...j })); }
function config() { reload(); return { ...S.cfg, simFail: { ...S.cfg.simFail } }; }
function listAudit(actor, f = {}) { who(actor, ['admin']); return S.audit.filter(l => !f.entity || l.entity === f.entity).slice(0, 200); }

/* ---------- sandbox (stands in for the external email / WhatsApp / clock) ---------- */
function sandbox() { reload(); return { messages: S.messages.slice(0, 120), queued: S.jobs.filter(j => j.status === 'queued').length, failed: S.jobs.filter(j => j.status === 'failed').length, cfg: config(), now: iso(), clock: S.clock, shifted: S.clock !== 0 }; }
function setSimFail(channel, on) { return tx(() => { if (!['email', 'whatsapp'].includes(channel)) fail('INVALID', 'Unknown channel.'); S.cfg.simFail[channel] = !!on; return true; }); }
function advanceClock(ms) { tx(() => { S.clock += ms; }); return tick(); }
function resetClock() { tx(() => { S.clock = S.anchor || 0; }); return true; }
function realClock() { tx(() => { S.clock = 0; }); return true; }

/* ---------- background work: hold expiry, day-before reminders, notification jobs ---------- */
function tick() {
  reload(); if (!S) return false;
  const t = now(), tom = addDays(today(), 1);
  const exp = S.appts.some(a => isHeld(a) && a.holdExpiresAt && Date.parse(a.holdExpiresAt) <= t);
  const rem = S.appts.some(a => a.date === tom && ['Booked', 'Checked-in'].includes(a.status) && !isHeld(a) && !a.flags.reminder);
  const jobs = S.jobs.some(j => j.status === 'queued' && j.runAt <= Date.now());
  if (!exp && !rem && !jobs) return false;
  tx(() => {
    for (const a of S.appts.filter(x => isHeld(x) && x.holdExpiresAt && Date.parse(x.holdExpiresAt) <= t)) {
      cancelCore(a, 'Payment timed out');
      notify(a.patientId, 'cancel', `Booking released: ${a.label}`, `Payment for ${apptLine(a)} did not arrive within ${S.cfg.holdMinutes} minutes, so the slot was released.`, a.id);
      logA(null, 'hold-expired', 'appointment', a.id, `${a.label} released`); afterQueueChange(a.doctorId, a.date);
    }
    for (const a of S.appts.filter(x => x.date === tom && ['Booked', 'Checked-in'].includes(x.status) && !isHeld(x) && !x.flags.reminder)) {
      a.flags.reminder = true; const d = D(a.doctorId);
      notify(a.patientId, 'reminder', `Reminder: ${a.label} tomorrow`, `You have a visit tomorrow with ${d.name}. Queue number ${a.label}. Shift starts ${d.shiftStart} WIB.`, a.id);
    }
    for (const j of S.jobs) {
      if (j.status !== 'queued' || j.runAt > Date.now()) continue;
      j.attempts++;
      if (S.cfg.simFail[j.channel]) {
        j.log.push({ at: iso(), msg: `Attempt ${j.attempts} failed: gateway unavailable` });
        if (j.attempts > RETRY_MAX) { j.status = 'failed'; j.log.push({ at: iso(), msg: `Gave up after ${RETRY_MAX} retries. An in-app banner is shown instead.` }); logA(null, 'notification-failed', 'notification', j.id, `${j.channel} to ${j.to}: ${j.subject}`); }
        else j.runAt = Date.now() + BACKOFF[j.attempts - 1];
      } else {
        j.status = 'sent'; j.sentAt = iso(); j.log.push({ at: iso(), msg: j.attempts > 1 ? `Delivered on attempt ${j.attempts}` : 'Delivered' });
        S.messages.unshift({ id: nid('m'), channel: j.channel, to: j.to, subject: j.subject, body: j.body, at: iso(), action: j.action, jobId: j.id });
        if (S.messages.length > 300) S.messages.length = 300;
      }
    }
  });
  return true;
}

/* ---------- doctor unavailability ---------- */
function addLeave(actor, doctorId, date, reason) {
  return tx(() => {
    const u = who(actor, ['admin']); const d = D(doctorId); if (!d) fail('NOT_FOUND', 'Doctor not found.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || date < today()) fail('INVALID', 'Choose today or a future date.');
    if (onLeave(doctorId, date)) fail('INVALID', 'This date is already marked unavailable.');
    S.leaves.push({ id: nid('v'), doctorId, date, reason: str(reason, 80) });
    let n = 0;
    for (const a of S.appts.filter(x => x.doctorId === doctorId && x.date === date)) {
      if (isHeld(a)) { cancelCore(a, 'Doctor unavailable'); continue; }
      if (['Booked', 'Checked-in'].includes(a.status)) {
        a.flags.unavailable = true; n++; if (a.status === 'Checked-in') a.status = 'Booked';
        notify(a.patientId, 'unavailable', `Doctor unavailable on ${fmtDate(date)}`, `${d.name} cannot see patients on ${fmtDate(date)} (${a.label}). Open My appointments to rebook for the next available day or take a refund.`, a.id);
      }
    }
    logA(u, 'leave', 'schedule', doctorId, `${d.name} unavailable ${date}; ${n} appointment(s) need rebooking`); return { affected: n };
  });
}
function removeLeave(actor, id) {
  return tx(() => { const u = who(actor, ['admin']); const l = S.leaves.find(x => x.id === id); if (!l) fail('NOT_FOUND', 'Not found.'); S.leaves = S.leaves.filter(x => x !== l); S.appts.forEach(a => { if (a.doctorId === l.doctorId && a.date === l.date) a.flags.unavailable = false; }); logA(u, 'leave-removed', 'schedule', l.doctorId, `${l.date}`); return true; });
}
function moveAppt(a, d) {
  let k = addDays(a.date, 1), nx = null;
  for (let i = 0; i < 120; i++, k = addDays(k, 1)) if (bookable(d, k) && left(d, k) > 0 && !S.appts.some(x => x.patientId === a.patientId && x.doctorId === d.id && x.date === k && x.status !== 'Cancelled')) { nx = k; break; }
  if (!nx) return null;
  const old = a.date; a.date = nx; a.queueNo = nextNo(d.id, nx); a.label = d.letter + '-' + pad(a.queueNo); a.flags = {}; a.status = 'Booked';
  notify(a.patientId, 'rescheduled', `Rescheduled to ${fmtDate(nx)}`, `Your visit with ${d.name} moved from ${fmtDate(old)} to ${fmtDate(nx)}. New queue number: ${a.label}. Your payment carries over.`, a.id);
  return nx;
}
function rebook(actor, apptId) {
  return tx(() => {
    const u = who(actor, ['patient']); const a = A(apptId); if (!a || a.patientId !== u.id) fail('NOT_FOUND', 'Appointment not found.');
    if (!a.flags.unavailable) fail('INVALID', 'This appointment does not need rebooking.');
    if (!moveAppt(a, D(a.doctorId))) fail('FULL', 'No free day in the next 90 days. Take a refund instead.');
    return view(a);
  });
}
function bulkReschedule(actor, doctorId, date) {
  return tx(() => {
    const u = who(actor, ['admin']); const d = D(doctorId); if (!d) fail('NOT_FOUND', 'Doctor not found.');
    const list = S.appts.filter(a => a.doctorId === doctorId && a.date === date && a.flags.unavailable && a.status === 'Booked').sort((x, y) => x.queueNo - y.queueNo);
    let moved = 0; for (const a of list) if (moveAppt(a, d)) moved++;
    logA(u, 'bulk-reschedule', 'schedule', doctorId, `${moved} of ${list.length} moved from ${date}`); return { moved, remaining: list.length - moved };
  });
}
function listLeaves(actor) { who(actor, ['admin']); return S.leaves.map(l => ({ ...l, doctorName: (D(l.doctorId) || {}).name, pending: S.appts.filter(a => a.doctorId === l.doctorId && a.date === l.date && a.flags.unavailable && a.status === 'Booked').length })).sort((x, y) => x.date.localeCompare(y.date)); }

/* ---------- admin CRUD ---------- */
function saveDept(actor, d) {
  return tx(() => {
    const u = who(actor, ['admin']); const name = str(d.name, 60); if (name.length < 2) fail('INVALID', 'Enter a department name.');
    if (S.depts.some(x => x.id !== d.id && x.name.toLowerCase() === name.toLowerCase())) fail('INVALID', 'A department with this name already exists.');
    let x = d.id && DEP(d.id);
    if (x) { x.name = name; x.description = str(d.description, 200); } else { x = { id: nid('p'), name, description: str(d.description, 200) }; S.depts.push(x); }
    logA(u, d.id ? 'update' : 'create', 'department', x.id, name); return x;
  });
}
function deleteDept(actor, id) {
  return tx(() => { const u = who(actor, ['admin']); const x = DEP(id); if (!x) fail('NOT_FOUND', 'Not found.'); if (S.doctors.some(d => d.deptId === id)) fail('LOCKED', 'Move or remove this department\'s doctors first.'); S.depts = S.depts.filter(y => y !== x); logA(u, 'delete', 'department', id, x.name); return true; });
}
async function saveDoctor(actor, d) {
  const pw = d.password ? String(d.password) : ''; if (pw) vPassword(pw);
  const cred = pw ? await mkCred(pw) : null;
  return tx(() => {
    const u = who(actor, ['admin']); const ex = d.id && D(d.id);
    const o = ex ? { ...ex, ...d } : { ...d };
    const r = { name: str(o.name, 80), deptId: o.deptId, letter: str(o.letter, 1).toUpperCase(), fee: Number(o.fee), shiftDays: [...new Set((o.shiftDays || []).map(Number))].filter(n => n >= 0 && n <= 6).sort(), shiftStart: str(o.shiftStart, 5), shiftHours: Number(o.shiftHours), consultMin: Number(o.consultMin), active: o.active !== false };
    if (r.name.length < 3) fail('INVALID', 'Enter the doctor\'s name.');
    if (!DEP(r.deptId)) fail('INVALID', 'Choose a department.');
    if (!/^[A-Z]$/.test(r.letter) || S.doctors.some(x => x.id !== (ex && ex.id) && x.letter === r.letter)) fail('INVALID', 'Queue letter must be one unused letter A to Z.');
    if (!Number.isInteger(r.fee) || r.fee < 0 || r.fee > 10000000) fail('INVALID', 'Enter the fee in rupiah.');
    if (!r.shiftDays.length) fail('INVALID', 'Pick at least one shift day.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.shiftStart)) fail('INVALID', 'Enter the shift start as HH:MM.');
    if (!(r.shiftHours >= 1 && r.shiftHours <= 12)) fail('INVALID', 'Shift hours must be between 1 and 12.');
    if (!Number.isInteger(r.consultMin) || r.consultMin < 5 || r.consultMin > 240) fail('INVALID', 'Consultation time must be 5 to 240 minutes.');
    if (cap(r) < 1) fail('INVALID', 'The consultation time is longer than the shift.');
    const email = str(o.email, 120).toLowerCase();
    if (!ex) { if (!emailRe.test(email)) fail('INVALID', 'Enter the doctor\'s login email.'); if (!cred) fail('INVALID', 'Set a password for the doctor\'s login.'); }
    const du = ex && S.users.find(x => x.doctorId === ex.id);
    if (email && S.users.some(x => x.email === email && x !== du)) fail('INVALID', 'This email is already used.');
    let doc;
    if (ex) { Object.assign(ex, r); doc = ex; if (du) { du.name = r.name; if (email) du.email = email; if (cred) du.cred = cred; } }
    else { doc = { id: nid('d'), ...r }; S.doctors.push(doc); S.users.push({ id: nid('u'), role: 'doctor', name: r.name, email, phone: '', dob: '', gender: '', emailVerified: true, cred, doctorId: doc.id, createdAt: iso() }); }
    logA(u, ex ? 'update' : 'create', 'doctor', doc.id, `${r.name} (${r.letter}), ${cap(r)} patients/day`); return decorateDoc(doc);
  });
}
function doctorLogin(actor, id) { who(actor, ['admin']); const du = S.users.find(x => x.doctorId === id); return du ? du.email : ''; }
function deleteDoctor(actor, id) {
  return tx(() => {
    const u = who(actor, ['admin']); const d = D(id); if (!d) fail('NOT_FOUND', 'Not found.');
    if (S.appts.some(a => a.doctorId === id)) fail('LOCKED', 'This doctor has appointment records. Set the doctor inactive instead.');
    S.doctors = S.doctors.filter(x => x !== d); S.users = S.users.filter(x => x.doctorId !== id); S.leaves = S.leaves.filter(l => l.doctorId !== id); logA(u, 'delete', 'doctor', id, d.name); return true;
  });
}
async function savePatient(actor, d) {
  const pw = d.password ? String(d.password) : ''; if (pw) vPassword(pw);
  const cred = pw ? await mkCred(pw) : null; const o = vPatient(d, { emailOptional: true });
  return tx(() => {
    const u = who(actor, ['admin', 'staff']); const ex = d.id && U(d.id);
    if (ex && (ex.role !== 'patient' || u.role !== 'admin')) fail('FORBIDDEN', 'Only an administrator can edit patients.');
    if (o.email && S.users.some(x => x.email === o.email && x !== ex)) fail('INVALID', 'This email is already used.');
    let p;
    if (ex) { Object.assign(ex, o); if (cred) ex.cred = cred; p = ex; }
    else { p = { id: nid('u'), role: 'patient', ...o, emailVerified: !!o.email && u.role === 'admin' ? true : !o.email, cred, createdAt: iso() }; S.users.push(p); }
    logA(u, ex ? 'update' : 'create', 'patient', p.id, p.name); return pubPatient(p);
  });
}
function deletePatient(actor, id) {
  return tx(() => { const u = who(actor, ['admin']); const p = U(id); if (!p || p.role !== 'patient') fail('NOT_FOUND', 'Not found.'); if (S.appts.some(a => a.patientId === id)) fail('LOCKED', 'This patient has appointment records and cannot be deleted.'); S.users = S.users.filter(x => x !== p); S.notifs = S.notifs.filter(n => n.userId !== id); logA(u, 'delete', 'patient', id, p.name); return true; });
}

/* ---------- billing ---------- */
function payView(y) { const a = A(y.apptId) || {}; const d = D(a.doctorId) || {}; const p = U(a.patientId) || {}; return { ...y, label: a.label, date: a.date, apptStatus: a.status, doctorId: a.doctorId, doctorName: d.name, patientName: p.name }; }
function listPayments(actor, f = {}) {
  who(actor, ['admin']);
  const rows = S.pays.map(payView).filter(r => (!f.from || r.date >= f.from) && (!f.to || r.date <= f.to) && (!f.doctorId || r.doctorId === f.doctorId) && (!f.status || r.status === f.status)).sort((x, y) => (y.date + y.label).localeCompare(x.date + x.label));
  return { rows, total: rows.filter(r => r.status === 'Paid').reduce((s, r) => s + r.amount, 0), refunded: rows.filter(r => r.status === 'Refunded').reduce((s, r) => s + r.amount, 0) };
}
function setPayment(actor, id, { status, method }) {
  return tx(() => {
    const u = who(actor, ['admin']); const y = S.pays.find(x => x.id === id); if (!y) fail('NOT_FOUND', 'Not found.');
    if (!['Pending', 'Paid', 'Refunded'].includes(status)) fail('INVALID', 'Unknown payment status.');
    const a = A(y.apptId); const from = y.status;
    if (status === 'Paid' && from !== 'Paid') { const m = method || y.method || 'Cash'; markPaid(y, m, u.id); if (a) delete a.holdExpiresAt; }
    else if (status === 'Refunded' && from !== 'Refunded') { if (from === 'Pending') fail('INVALID', 'Only a paid record can be refunded.'); y.status = 'Refunded'; y.refundedAt = iso(); }
    else if (status === 'Pending') { y.status = 'Pending'; y.paidAt = null; }
    logA(u, 'payment-status', 'payment', id, `${y.invoiceNo || id}: ${from} to ${status}`); return payView(y);
  });
}
function deletePayment(actor, id) {
  return tx(() => { const u = who(actor, ['admin']); const y = S.pays.find(x => x.id === id); if (!y) fail('NOT_FOUND', 'Not found.'); const a = A(y.apptId); if (a && a.status !== 'Cancelled') fail('LOCKED', 'Cancel the appointment before deleting its payment record.'); S.pays = S.pays.filter(x => x !== y); logA(u, 'delete', 'payment', id, y.invoiceNo || ''); return true; });
}
function invoice(actor, payId) {
  const u = who(actor, ['patient', 'staff', 'admin']); const y = S.pays.find(x => x.id === payId); const a = y && A(y.apptId);
  if (!y || !a || (u.role === 'patient' && a.patientId !== u.id)) fail('NOT_FOUND', 'Invoice not found.');
  if (y.status === 'Pending') fail('INVALID', 'The invoice is available once the payment is made.');
  const d = D(a.doctorId), p = U(a.patientId);
  return { hospital: HOSPITAL, no: y.invoiceNo, paidAt: y.paidAt, status: y.status, method: y.method, amount: y.amount, refundedAt: y.refundedAt || null, patient: p.name, patientPhone: p.phone, doctor: d.name, dept: DEP(d.deptId).name, date: a.date, dateLabel: fmtDate(a.date), label: a.label, paidLabel: fmtDateTime(y.paidAt) };
}

/* ---------- dashboard ---------- */
function stats(actor, range = '7d') {
  who(actor, ['admin']); const t = today();
  const from = range === 'today' ? t : range === '7d' ? addDays(t, -6) : range === '30d' ? addDays(t, -29) : '0000-00-00';
  const inR = a => a.date >= from && a.date <= (range === 'all' ? '9999' : t);
  const rows = S.appts.filter(inR);
  const perDept = S.depts.map(dp => ({ name: dp.name, patients: new Set(rows.filter(a => a.status !== 'Cancelled' && (D(a.doctorId) || {}).deptId === dp.id).map(a => a.patientId)).size }));
  const pays = S.pays.filter(y => { const a = A(y.apptId); return a && inR(a); });
  return {
    range, from, today: S.appts.filter(a => a.date === t && a.status !== 'Cancelled').length, todayWaiting: S.appts.filter(a => a.date === t && inQueue(a) && a.status !== 'In consultation').length,
    outcomes: { Completed: rows.filter(a => a.status === 'Completed').length, Cancelled: rows.filter(a => a.status === 'Cancelled').length, 'No-show': rows.filter(a => a.status === 'No-show').length },
    perDept, revenue: pays.filter(y => y.status === 'Paid').reduce((s, y) => s + y.amount, 0), refunded: pays.filter(y => y.status === 'Refunded').reduce((s, y) => s + y.amount, 0),
    totalAppts: rows.length
  };
}

return { Err, init, resetDemo, login, register, verifyEmail, resendVerification, requestReset, resetPassword, me, tick, today, now, addDays, fmtDate, fmtTime, fmtDateTime, fmtIDR, fmtWait, wday,
  PAY_ONLINE, PAY_ONSITE, STATUSES, DEMO_PW, listDoctors, listDepts, doctorDates, book, pay, cancel, callNext, done, noShow, checkIn, reinsert, recordPayment, registerAppointment,
  adminSetStatus, deleteAppt, myAppts, myQueue, queue, board, doctorSchedule, listAppts, searchPatients, myNotifs, markRead, banners, dismissBanner, setThreshold, listJobs, config, listAudit,
  sandbox, setSimFail, advanceClock, resetClock, realClock, addLeave, removeLeave, rebook, bulkReschedule, listLeaves, saveDept, deleteDept, saveDoctor, doctorLogin, deleteDoctor, savePatient, deletePatient,
  listPayments, setPayment, deletePayment, invoice, stats, _state: () => S,
  subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }, rev: () => (S ? S.rev : 0), sync: () => { reload(); emit(); } };
})();
export default Core;
