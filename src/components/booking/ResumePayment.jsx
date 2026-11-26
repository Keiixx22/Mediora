import Core from '../../lib/core.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useModal } from '../../context/UiContext.jsx';
import { useCoreRev } from '../../hooks/useCore.js';
import PaymentStep from './PaymentStep.jsx';

/** Finish paying for a booking that is still on hold (from My Queue or Appointments). */
export default function ResumePayment({ apptId }) {
  useCoreRev();
  const { sess } = useSession();
  const { close } = useModal();
  const a = Core.myAppts(sess).find((x) => x.id === apptId);
  if (!a || !a.held) return <p>This booking is no longer waiting for payment.</p>;
  return <PaymentStep appt={a} onPaid={close} />;
}
