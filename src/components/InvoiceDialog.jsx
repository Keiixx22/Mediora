import { useState } from 'react';
import Core from '../lib/core.js';
import { money } from '../lib/ui.js';
import { useSession } from '../context/SessionContext.jsx';
import { useModal } from '../context/UiContext.jsx';
import Button from './ui/Button.jsx';
import Pill from './ui/Pill.jsx';
import { Hint } from './ui/Fields.jsx';

async function downloadPdf(v) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(v.hospital, 14, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Receipt for consultation', 14, 24);
  doc.text(v.no, 134, 18, { align: 'right' });
  doc.text(v.status.toUpperCase(), 134, 24, { align: 'right' });
  doc.line(14, 29, 134, 29);
  const rows = [
    ['Patient', v.patient],
    ['Doctor', v.doctor],
    ['Department', v.dept],
    ['Visit date', v.dateLabel],
    ['Queue number', v.label],
    ['Paid on', v.paidLabel],
    ['Payment method', v.method || ''],
  ];
  let y = 38;
  rows.forEach(([k, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(k, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val), 54, y);
    y += 8;
  });
  doc.line(14, y, 134, y);
  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Consultation fee', 14, y);
  doc.text(money(v.amount), 134, y, { align: 'right' });
  if (v.refundedAt) {
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Refunded on ${Core.fmtDateTime(v.refundedAt)} (status only, no transfer).`, 14, y);
  }
  doc.setFontSize(8);
  doc.text('Demo hospital with fictional data.', 14, 140);
  doc.save(`${v.no}.pdf`);
}

function Row({ k, children }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{k}</dt>
      <dd className="m-0 font-semibold">{children}</dd>
    </div>
  );
}

export function InvoiceView({ payId }) {
  const { sess } = useSession();
  const [note, setNote] = useState('');
  const v = Core.invoice(sess, payId); // FR-30: receipt per appointment
  return (
    <>
      <div className="rounded-xl border border-line p-4">
        <div className="mb-3 flex justify-between gap-4">
          <div>
            <strong>{v.hospital}</strong>
            <span className="block text-[13px] text-muted">Receipt for consultation</span>
          </div>
          <div className="text-right">
            <span className="tabular-nums font-bold">{v.no}</span>
            <br />
            <Pill status={v.status} />
          </div>
        </div>
        <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-3">
          <Row k="Patient">{v.patient}</Row>
          <Row k="Doctor">
            {v.doctor}
            <span className="block text-[13px] font-normal text-muted">{v.dept}</span>
          </Row>
          <Row k="Visit date">{v.dateLabel}</Row>
          <Row k="Queue number">
            <span className="tabular-nums">{v.label}</span>
          </Row>
          <Row k="Paid">{v.paidLabel}</Row>
          <Row k="Method">{v.method}</Row>
        </dl>
        <div className="flex justify-between border-t-2 border-ink pt-2.5 text-lg">
          <span>Consultation fee</span>
          <strong className="tabular-nums">{money(v.amount)}</strong>
        </div>
        {v.refundedAt && <Hint className="mt-2">Refunded on {Core.fmtDateTime(v.refundedAt)} (recorded as a status only).</Hint>}
      </div>
      <div className="mt-3">
        <Button
          variant="primary"
          onClick={async () => {
            try {
              await downloadPdf(v);
              setNote('PDF saved.');
            } catch (e) {
              console.error(e);
              setNote('The PDF could not be created. Run npm install to add jspdf.');
            }
          }}
        >
          Download PDF
        </Button>
        {note && <Hint className="mt-2">{note}</Hint>}
      </div>
    </>
  );
}

/** const showInvoice = useInvoice(); showInvoice(payment.id) */
export function useInvoice() {
  const { open } = useModal();
  return (payId) => open('Invoice', <InvoiceView payId={payId} />);
}
