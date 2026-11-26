import { useState } from 'react';
import Core from '../../lib/core.js';

/** The live thing: wait = patients ahead x minutes per patient, the same formula the real queue uses. */
export default function WaitCalc() {
  const docs = Core.listDoctors();
  const [doc, setDoc] = useState(docs[0]?.id);
  const [ahead, setAhead] = useState(5);
  const d = docs.find((x) => x.id === doc) || docs[0];
  if (!d) return null;
  const alert = Core.config().alertThreshold;
  return (
    <div className="wabi-edge grid gap-8 bg-surface p-6 md:grid-cols-[1.1fr_1fr] md:p-10">
      <div>
        <h3 className="font-display text-3xl leading-tight md:text-4xl">How long would you wait?</h3>
        <p className="mt-2 max-w-[40ch] text-lg">Choose a doctor and how many patients are ahead of you. This is the estimate on your ticket.</p>
        <label htmlFor="calc-doc" className="mt-6 block font-semibold">Doctor</label>
        <select id="calc-doc" value={doc} onChange={(e) => setDoc(e.target.value)} className="wabi-edge mt-1 min-h-12 w-full bg-cream px-4 text-lg">
          {docs.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} · {x.consultMin} min each
            </option>
          ))}
        </select>
        <label htmlFor="calc-n" className="mt-5 block font-semibold">
          Patients ahead: <span className="font-mono">{ahead}</span>
        </label>
        <input id="calc-n" type="range" min="0" max="20" value={ahead} onChange={(e) => setAhead(Number(e.target.value))} className="mt-2 h-11 w-full cursor-pointer accent-clay" />
      </div>
      <div className="flex flex-col justify-center bg-charcoal p-6 text-cream" role="status" aria-live="polite">
        <p className="hand text-xl text-gold">estimated wait</p>
        <p className="mt-1 font-display text-[clamp(3.2rem,8vw,5.5rem)] leading-none font-bold">{ahead === 0 ? 'You are next' : Core.fmtWait(ahead * d.consultMin)}</p>
        <p className="mt-4 font-mono text-sm leading-relaxed">
          {ahead} × {d.consultMin} min with {d.name}.
          <br />
          {ahead <= alert ? 'The alert would already be sent.' : `The alert is sent at ${alert} ahead.`}
        </p>
        <div className="gold-line mt-5 w-2/3" aria-hidden="true" />
      </div>
    </div>
  );
}
