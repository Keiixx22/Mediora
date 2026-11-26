import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Core from '../../lib/core.js';
import { usePrefersReducedMotion } from '../../hooks/useMotion.js';
import DoctorDirectory from '../DoctorDirectory.jsx';

const Arrow = ({ dir }) => (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </svg>
);

const mark = (bg) => ({ backgroundColor: bg, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', padding: '0 0.12em', color: '#0a0a0a' });

/** The live thing: wait = patients ahead x minutes per patient, the same formula the real queue uses. */
function WaitCalc() {
  const docs = Core.listDoctors();
  const [doc, setDoc] = useState(docs[0]?.id);
  const [ahead, setAhead] = useState(5);
  const d = docs.find((x) => x.id === doc) || docs[0];
  if (!d) return null;
  const wait = ahead * d.consultMin;
  return (
    <div data-reveal className="grid items-end gap-6 rounded-[28px] bg-[#0a0a0a] p-6 text-white md:grid-cols-[1.1fr_1fr] md:p-8">
      <div>
        <h3 className="text-3xl leading-tight font-semibold md:text-4xl">How long would you wait?</h3>
        <p className="mt-2 max-w-[40ch] text-lg text-white/75">Pick a doctor and how many patients are ahead of you. This is the estimate your ticket shows.</p>
        <label htmlFor="calc-doc" className="mt-5 block text-base font-semibold">Doctor</label>
        <select id="calc-doc" value={doc} onChange={(e) => setDoc(e.target.value)} className="mt-1 min-h-12 w-full rounded-full bg-white px-5 text-base font-medium text-[#0a0a0a]">
          {docs.map((x) => (
            <option key={x.id} value={x.id}>{x.name} · {x.consultMin} min each</option>
          ))}
        </select>
        <label htmlFor="calc-n" className="mt-4 block text-base font-semibold">Patients ahead: <span className="tabular-nums">{ahead}</span></label>
        <input id="calc-n" type="range" min="0" max="20" value={ahead} onChange={(e) => setAhead(Number(e.target.value))} className="mt-2 h-11 w-full cursor-pointer accent-[#c3edce]" />
      </div>
      <div className="rounded-[24px] bg-[#c3edce] p-6 text-[#0a0a0a]" role="status" aria-live="polite">
        <p className="text-lg font-semibold">Estimated wait</p>
        <p className="mt-1 text-[clamp(3rem,7vw,5rem)] leading-none font-semibold tracking-[-0.04em] tabular-nums">{ahead === 0 ? 'You are next' : Core.fmtWait(wait)}</p>
        <p className="mt-3 text-base">{ahead} × {d.consultMin} min with {d.name}.{ahead <= Core.config().alertThreshold ? ' You would get the alert now.' : ` You get an alert at ${Core.config().alertThreshold} away.`}</p>
      </div>
    </div>
  );
}

function About() {
  const depts = Core.listDepts();
  const docs = Core.listDoctors();
  return (
    <div>
      <p data-reveal className="text-[clamp(1.35rem,2.1vw,2rem)] leading-[1.2] [hyphens:auto] md:columns-2 md:gap-10 md:text-justify">
        <strong className="font-semibold">MEDIORA</strong> is a hospital that does not make you sit in a waiting room. You <span style={mark('#ffffff')}>pick a doctor</span> from {docs.length} on shift across {depts.length} departments,{' '}
        <span style={mark('#f8c7c9')}>pay online</span> and receive a <span style={mark('#ffffff')}>digital queue number</span> for the day. It is a number, not a fixed time, because consultations never run to the minute.
        Your position updates live, and when you are <span style={mark('#f8c7c9')}>five patients away</span> we message you by email and WhatsApp so you can arrive just in time. Reception checks you in, the doctor calls the next number, and the{' '}
        <span style={mark('#ffffff')}>same queue</span> powers every screen in the building. If a doctor is on leave you are moved to the next free day or{' '}
        <span style={mark('#f8c7c9')}>refunded in one click</span>.
      </p>
      <div className="mt-8">
        <WaitCalc />
      </div>
    </div>
  );
}

const STEPS = [
  ['Choose', '#1f6b3a', '#ffffff', 'Search by name or department and pick a day the doctor is on shift. Full days say so before you pay.'],
  ['Pay', '#4f9a6a', '#0a0a0a', 'Your seat is held for 15 minutes while you pay online. No payment, no number.'],
  ['Get a number', '#98cfae', '#0a0a0a', 'Your queue number is yours for the day. Walk-ins join the end of the same queue.'],
  ['Wait anywhere', '#c3edce', '#0a0a0a', 'Follow your place live. We message you five patients before your turn.'],
];

function HowItWorks() {
  const [open, setOpen] = useState(0);
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-[5fr_1fr_5fr]">
        <h2 data-reveal className="text-[clamp(2.25rem,4.4vw,4rem)] leading-[1.02] font-semibold">Four steps, no waiting room</h2>
        <p data-reveal className="max-w-[44ch] text-lg leading-snug md:col-start-3">From the first search to the moment the doctor calls your number, everything happens on your phone.</p>
      </div>
      <ol className="mt-8 flex flex-col overflow-hidden rounded-[28px] md:h-[26rem] md:flex-row" data-reveal>
        {STEPS.map(([name, bg, fg, text], n) => {
          const on = open === n;
          return (
            <li key={name} className={`flex min-w-0 transition-[flex-grow] duration-500 ${on ? 'md:flex-[5_1_0%]' : 'md:flex-[1_1_0%]'}`} style={{ backgroundColor: bg, color: fg }}>
              <button
                type="button"
                aria-expanded={on}
                onClick={() => setOpen(n)}
                onMouseEnter={() => setOpen(n)}
                className="flex min-h-16 w-full cursor-pointer flex-col justify-between gap-6 p-5 text-left md:p-6"
              >
                <span className={`text-2xl font-semibold md:text-3xl ${on ? '' : 'md:[writing-mode:vertical-rl] md:rotate-180'}`}>{name}</span>
                {on && <span className="block max-w-[34ch] text-lg leading-snug">{text}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const ROLES = [
  ['Patients', 'Book, pay, follow the live queue, cancel before the cutoff, download invoices.', '#c3edce'],
  ['Doctors', 'See today’s queue, call the next patient, mark each consultation done.', '#f8c7c9'],
  ['Reception', 'Check in, skip no-shows, register walk-ins, take on-site payments.', '#f8c7c9'],
  ['Admins', 'Doctors, shifts, leave, billing and the full audit log.', '#f8c7c9'],
];

function Roles() {
  return (
    <div>
      <h2 data-reveal className="max-w-[18ch] text-[clamp(2.25rem,4.4vw,4rem)] leading-[1.02] font-semibold">One queue, four roles</h2>
      <ul className="mt-6">
        {ROLES.map(([name, text, c]) => (
          <li key={name} data-reveal className="group grid items-end gap-x-8 gap-y-1 py-1 md:grid-cols-[1fr_minmax(0,22rem)]">
            <span className="text-[clamp(3rem,10vw,9rem)] leading-[0.92] font-semibold tracking-[-0.05em] transition-colors duration-200 group-hover:text-[var(--c)]" style={{ '--c': c }}>
              {name}
            </span>
            <span className="pb-2 text-lg leading-snug text-white/80 md:pb-4">{text}</span>
          </li>
        ))}
      </ul>
      <p data-reveal className="mt-6 text-lg">
        Try every role with the demo accounts on the <a href="#login" className="font-semibold underline underline-offset-4">login page</a>.
      </p>
    </div>
  );
}

function Doctors() {
  return (
    <div>
      <h2 data-reveal className="mb-6 text-[clamp(2.25rem,4.4vw,4rem)] leading-[1.02] font-semibold">Find your doctor</h2>
      <DoctorDirectory />
    </div>
  );
}

// [tab name, Slide, field colour, text colour]
const SLIDES = [
  ['About MEDIORA', About, '#c3edce', '#0a0a0a'],
  ['How it works', HowItWorks, '#f8c7c9', '#0a0a0a'],
  ['Roles', Roles, '#0a0a0a', '#ffffff'],
  ['Find a doctor', Doctors, 'var(--bg)', 'var(--ink)'],
];

/** Chapter carousel: each slide is a full-width flat colour field. GSAP slides the track and staggers the active slide in. */
export default function InfoCarousel() {
  const reduced = usePrefersReducedMotion();
  const [i, setI] = useState(0);
  const track = useRef(null);
  const root = useRef(null);
  const first = useRef(true);
  const touch = useRef(null);
  const last = SLIDES.length - 1;
  const go = useCallback((n) => setI(Math.min(last, Math.max(0, n))), [last]);

  useEffect(() => {
    const dur = reduced || first.current ? 0 : 0.7;
    gsap.to(track.current, { xPercent: -100 * i, duration: dur, ease: 'power3.inOut' });
    const items = root.current.querySelectorAll(`[data-slide="${i}"] [data-reveal]`);
    if (reduced) gsap.set(items, { opacity: 1, y: 0 });
    else gsap.fromTo(items, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.65, stagger: 0.08, delay: first.current ? 0 : 0.3, ease: 'power2.out', overwrite: true });
    first.current = false;
  }, [i, reduced]);

  useEffect(() => () => gsap.killTweensOf(track.current), []);

  const onKey = (e) => {
    if (e.target.closest('input, select, textarea')) return;
    if (e.key === 'ArrowRight') go(i + 1);
    if (e.key === 'ArrowLeft') go(i - 1);
  };
  const [, , bg, fg] = SLIDES[i];
  const btn = 'grid size-12 cursor-pointer place-items-center rounded-full bg-current/10 transition-opacity duration-200 hover:bg-current/20 disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <section
      id="info"
      ref={root}
      aria-roledescription="carousel"
      aria-label="About MEDIORA"
      onKeyDown={onKey}
      className="scroll-mt-14 min-h-[90svh] py-10 transition-colors duration-500 md:py-16"
      style={{ backgroundColor: bg, color: fg }}
    >
      <div className="mx-auto max-w-[1320px] px-4">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Slides" className="flex flex-wrap gap-2">
            {SLIDES.map(([name], n) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={i === n}
                aria-controls={`slide-${n}`}
                onClick={() => go(n)}
                className={`min-h-11 cursor-pointer rounded-full px-5 text-base font-semibold transition-colors duration-200 ${i === n ? 'bg-current/100' : 'bg-current/10 hover:bg-current/20'}`}
              >
                <span className={i === n ? 'mix-blend-normal' : ''} style={i === n ? { color: bg } : undefined}>{name}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" aria-label="Previous slide" disabled={i === 0} onClick={() => go(i - 1)} className={btn}>
              <Arrow dir="left" />
            </button>
            <button type="button" aria-label="Next slide" disabled={i === last} onClick={() => go(i + 1)} className={btn}>
              <Arrow dir="right" />
            </button>
          </div>
        </div>

        <div
          className="overflow-hidden"
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current == null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            touch.current = null;
            if (Math.abs(dx) > 60) go(i + (dx < 0 ? 1 : -1));
          }}
        >
          <div ref={track} className="flex items-start">
            {SLIDES.map(([name, Slide], n) => (
              <div key={name} id={`slide-${n}`} data-slide={n} role="tabpanel" aria-roledescription="slide" aria-label={`${n + 1} of ${SLIDES.length}: ${name}`} inert={i !== n} className="w-full shrink-0 px-1 py-1">
                <Slide />
              </div>
            ))}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">{`Slide ${i + 1} of ${SLIDES.length}: ${SLIDES[i][0]}`}</p>
      </div>
    </section>
  );
}
