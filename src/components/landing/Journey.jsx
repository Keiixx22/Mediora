import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { usePrefersReducedMotion } from '../../hooks/useMotion.js';

const Arrow = ({ dir }) => (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </svg>
);

const STEPS = [
  {
    name: 'Choose',
    title: 'Find the doctor you need',
    text: 'Search by name or department and pick a day the doctor is on shift. A full day says so before you spend a minute on it.',
    note: 'no phone calls',
  },
  {
    name: 'Pay',
    title: 'Settle it before you arrive',
    text: 'Your seat is held for fifteen minutes while you pay online. No payment, no number, so every number is a real person coming.',
    note: 'fifteen minutes to decide',
  },
  {
    name: 'Receive a number',
    title: 'A number, not a fixed time',
    text: 'Consultations never run to the minute, so you get a queue number for the day. Reception checks you in and the doctor calls numbers in order.',
    note: 'A-007',
  },
  {
    name: 'Wait anywhere',
    title: 'Go home, or have tea',
    text: 'Your place updates live. When you are five patients away we message you by email and WhatsApp, so you arrive just in time.',
    note: 'five ahead',
  },
];

/** Carousel of the patient journey. GSAP slides the track and lets each slide's parts rise in, 80 ms apart. */
export default function Journey() {
  const reduced = usePrefersReducedMotion();
  const [i, setI] = useState(0);
  const track = useRef(null);
  const root = useRef(null);
  const first = useRef(true);
  const touch = useRef(null);
  const last = STEPS.length - 1;
  const go = useCallback((n) => setI(Math.min(last, Math.max(0, n))), [last]);

  useEffect(() => {
    const instant = reduced || first.current;
    gsap.to(track.current, { xPercent: -100 * i, duration: instant ? 0 : 0.45, ease: 'power2.out' });
    if (!reduced && !first.current) {
      const items = root.current.querySelectorAll(`[data-slide="${i}"] [data-s]`);
      gsap.fromTo(items, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.42, stagger: 0.08, delay: 0.2, ease: 'power2.out', overwrite: true });
    }
    first.current = false;
  }, [i, reduced]);
  useEffect(() => () => gsap.killTweensOf(track.current), []);

  const onKey = (e) => {
    if (e.key === 'ArrowRight') go(i + 1);
    if (e.key === 'ArrowLeft') go(i - 1);
  };
  const btn = 'wabi-edge grid size-12 cursor-pointer place-items-center bg-cream text-charcoal transition-colors duration-200 hover:bg-blush disabled:cursor-not-allowed disabled:opacity-35';

  return (
    <div ref={root} aria-roledescription="carousel" aria-label="The patient journey" onKeyDown={onKey}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Steps" className="flex flex-wrap gap-2">
          {STEPS.map((s, n) => (
            <button
              key={s.name}
              type="button"
              role="tab"
              aria-selected={i === n}
              aria-controls={`step-${n}`}
              onClick={() => go(n)}
              className={`wabi-edge min-h-11 cursor-pointer px-4 text-lg transition-colors duration-200 ${i === n ? 'bg-clay font-semibold text-cream' : 'bg-cream text-charcoal hover:bg-blush'}`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous step" disabled={i === 0} onClick={() => go(i - 1)} className={btn}>
            <Arrow dir="left" />
          </button>
          <button type="button" aria-label="Next step" disabled={i === last} onClick={() => go(i + 1)} className={btn}>
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
        <div ref={track} className="flex items-stretch">
          {STEPS.map((s, n) => (
            <div key={s.name} id={`step-${n}`} data-slide={n} role="tabpanel" aria-roledescription="slide" aria-label={`${n + 1} of ${STEPS.length}: ${s.name}`} inert={i !== n} className="w-full shrink-0 px-1 py-1">
              <article className="wabi-edge grid min-h-[22rem] gap-8 bg-surface p-6 md:grid-cols-[1.4fr_1fr] md:p-12">
                <div>
                  <p data-s className="font-mono text-sm">Step {n + 1} of {STEPS.length}</p>
                  <h3 data-s className="mt-3 max-w-[16ch] font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[1.02]">{s.title}</h3>
                  <p data-s className="mt-5 max-w-[46ch] text-xl leading-relaxed">{s.text}</p>
                </div>
                <div data-s className="flex items-end justify-start md:justify-end">
                  <p className="hand font-display text-3xl text-clay md:text-4xl">
                    {s.note}
                    <span className="gold-line mt-2 block w-full" aria-hidden="true" />
                  </p>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{`Step ${i + 1} of ${STEPS.length}: ${STEPS[i].name}`}</p>
    </div>
  );
}
