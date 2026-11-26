// Small formatting helpers shared by the pages. All domain logic lives in ./core.js.
import Core from './core.js';

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const money = (n) => Core.fmtIDR(n);
export const shiftLabel = (d) => `${d.shiftStart}–${d.endTime} (${d.shiftHours} h)`;
export const dayList = (d) => d.shiftDays.map((i) => DAYS[i]).join(' · ');
export const shortDate = (label) => String(label).replace(/ \d{4}$/, '');

export const clockTime = () =>
  new Date(Core.now()).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta',
  });

export const nowLabel = () => Core.fmtDateTime(new Date(Core.now()).toISOString());

/** Demo accounts shown on the login page (all use Core.DEMO_PW). */
export const DEMO_ACCOUNTS = [
  ['Patient', 'patient@mediora.demo'],
  ['Doctor (General)', 'raka@mediora.demo'],
  ['Receptionist', 'staff@mediora.demo'],
  ['Administrator', 'admin@mediora.demo'],
];
