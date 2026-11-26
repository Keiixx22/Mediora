import { PageHeader } from '../../components/ui/Card.jsx';
import DoctorDirectory from '../../components/DoctorDirectory.jsx';

export default function BookDoctor() {
  return (
    <>
      <PageHeader title="Book a doctor" subtitle="Pick a doctor and a day. You get a queue number, not a fixed time." />
      <DoctorDirectory />
    </>
  );
}
