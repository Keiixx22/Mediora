import Home from './pages/public/Home.jsx';
import Login from './pages/public/Login.jsx';
import Signup from './pages/public/Signup.jsx';
import Forgot from './pages/public/Forgot.jsx';
import BookDoctor from './pages/patient/BookDoctor.jsx';
import MyQueue from './pages/patient/MyQueue.jsx';
import Appointments from './pages/patient/Appointments.jsx';
import Notifications from './pages/patient/Notifications.jsx';
import DoctorQueue from './pages/doctor/DoctorQueue.jsx';
import DoctorSchedule from './pages/doctor/DoctorSchedule.jsx';
import Board from './pages/staff/Board.jsx';
import WalkIn from './pages/staff/WalkIn.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import QueueRecords from './pages/admin/QueueRecords.jsx';
import AdminAppointments from './pages/admin/AdminAppointments.jsx';
import Doctors from './pages/admin/Doctors.jsx';
import Departments from './pages/admin/Departments.jsx';
import Schedules from './pages/admin/Schedules.jsx';
import Patients from './pages/admin/Patients.jsx';
import Billing from './pages/admin/Billing.jsx';
import Notify from './pages/admin/Notify.jsx';
import Audit from './pages/admin/Audit.jsx';

/** Routes anyone can open. Logged-in users are sent to their own home instead of login/signup/forgot. */
export const PUBLIC_ROUTES = {
  home: { title: 'Find a doctor', Page: Home },
  login: { title: 'Log in', Page: Login },
  signup: { title: 'Create account', Page: Signup },
  forgot: { title: 'Reset password', Page: Forgot },
};
export const GUEST_ONLY = ['login', 'signup', 'forgot'];

/** Per role: [path, label, title, Page]. The first listed path of a role is not its home; HOME says which one is. */
export const ROLE_ROUTES = {
  patient: [
    ['my-queue', 'My Queue', MyQueue],
    ['book', 'Book a doctor', BookDoctor],
    ['appointments', 'Appointments', Appointments],
    ['notifications', 'Notifications', Notifications],
  ],
  doctor: [
    ['doc-queue', "Today's queue", DoctorQueue],
    ['doc-schedule', 'My schedule', DoctorSchedule],
  ],
  staff: [
    ['board', 'Queue board', Board],
    ['walk-in', 'Walk-in', WalkIn],
  ],
  admin: [
    ['dashboard', 'Dashboard', Dashboard],
    ['board', 'Queue board', Board],
    ['walk-in', 'Register', WalkIn],
    ['queues', 'Queue records', QueueRecords],
    ['a-appts', 'Appointments', AdminAppointments],
    ['a-doctors', 'Doctors', Doctors],
    ['a-depts', 'Departments', Departments],
    ['a-schedules', 'Schedules', Schedules],
    ['a-patients', 'Patients', Patients],
    ['a-billing', 'Billing', Billing],
    ['a-notify', 'Notifications', Notify],
    ['a-audit', 'Audit log', Audit],
  ],
};

export const HOME = { patient: 'my-queue', doctor: 'doc-queue', staff: 'board', admin: 'dashboard' };
