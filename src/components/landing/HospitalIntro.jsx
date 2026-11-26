import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createHospitalScene } from './hospitalScene.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Pinned 3D stage. The page scrolls 400% of the viewport height while the stage stays fixed:
 * scroll progress (0..1) drives the camera through hospitalScene's path (outside -> doorway -> lobby),
 * and a scrubbed GSAP timeline fades the captions in and out on the same progress.
 */
export default function HospitalIntro({ onEnter }) {
  const wrap = useRef(null);
  const stage = useRef(null);
  const canvas = useRef(null);
  const labels = useRef(null);

  useEffect(() => {
    let scene;
    try {
      scene = createHospitalScene(canvas.current, labels.current);
    } catch (e) {
      // WebGL context lost or refused: tell the parent to show the static hero instead.
      onEnter?.('fallback');
      return undefined;
    }
    scene.start();

    const ctx = gsap.context(() => {
      const caps = gsap.utils.toArray('[data-cap]');
      gsap.set(caps, { autoAlpha: 0, y: 28 });

      // The pin and the camera share one ScrollTrigger so they can never drift apart.
      ScrollTrigger.create({
        trigger: wrap.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => scene.setProgress(self.progress),
        onToggle: (self) => (self.isActive ? scene.start() : scene.stop()),
      });

      // Captions: [data-cap] with data-in / data-out as positions on a 0..1 timeline.
      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        scrollTrigger: { trigger: wrap.current, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      });
      caps.forEach((el) => {
        const a = Number(el.dataset.in);
        const b = Number(el.dataset.out);
        tl.to(el, { autoAlpha: 1, y: 0, duration: 0.06 }, a);
        if (b < 1) tl.to(el, { autoAlpha: 0, y: -28, duration: 0.06, ease: 'power2.in' }, b);
      });
      tl.to('[data-hint]', { autoAlpha: 0, duration: 0.03 }, 0.03);
      tl.to('[data-bar]', { scaleX: 1, ease: 'none', duration: 1 }, 0);
      tl.set({}, {}, 1);
    }, wrap);

    return () => {
      ctx.revert();
      scene.dispose();
    };
  }, [onEnter]);

  return (
    // 500vh of scroll room; the sticky stage fills one screen while it plays.
    <section ref={wrap} aria-label="3D tour of MEDIORA hospital" className="relative h-[500svh]">
      <div ref={stage} className="sticky top-[57px] h-[calc(100svh-57px)] w-full overflow-hidden bg-[#eef2f3]">
        <canvas ref={canvas} className="block size-full" role="img" aria-label="Isometric miniature of the MEDIORA world: a house, a payment kiosk, the hospital and a consultation wing. Scroll to follow a patient through each step." />
        <div ref={labels} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" />

        <div className="pointer-events-none absolute inset-0 mx-auto flex max-w-[1320px] flex-col justify-end px-4 pb-16 md:justify-center md:pb-0">
          <div data-cap data-in="0" data-out="0.12" className="max-w-[min(100%,34rem)] rounded-[10px] bg-[#2d3142] p-6 text-[#eef2f3] md:p-9">
            <h1 className="text-[clamp(3.4rem,11vw,8rem)] leading-[0.84] font-semibold tracking-[-0.04em]">
              MEDI<br />
              <span className="text-[#ef8354]">ORA</span>
            </h1>
            <p className="mt-5 max-w-[30ch] text-lg leading-snug md:text-xl">Book a doctor, pay online and wait wherever you like. Scroll to follow one patient.</p>
          </div>
          <div data-cap data-in="0.14" data-out="0.32" className="max-w-sm rounded-[10px] bg-[#2d3142] p-6 text-[#eef2f3]">
            <h2 className="text-3xl leading-tight font-semibold">Book from home</h2>
            <p className="mt-2 text-lg leading-snug">Search a doctor, choose a day the doctor is on shift and reserve a seat.</p>
          </div>
          <div data-cap data-in="0.34" data-out="0.46" className="max-w-sm rounded-[10px] bg-[#2d3142] p-6 text-[#eef2f3]">
            <h2 className="text-3xl leading-tight font-semibold">Pay and hold your seat</h2>
            <p className="mt-2 text-lg leading-snug">Your seat is held for 15 minutes while you pay online.</p>
          </div>
          <div data-cap data-in="0.5" data-out="0.66" className="max-w-sm rounded-[10px] bg-[#2d3142] p-6 text-[#eef2f3]">
            <h2 className="text-3xl leading-tight font-semibold">Your number is waiting</h2>
            <p className="mt-2 text-lg leading-snug">Check in at reception or skip the desk. We message you five patients before your turn.</p>
          </div>
          <div data-cap data-in="0.7" data-out="0.86" className="max-w-sm rounded-[10px] bg-[#2d3142] p-6 text-[#eef2f3]">
            <h2 className="text-3xl leading-tight font-semibold">The doctor calls the next number</h2>
            <p className="mt-2 text-lg leading-snug">One live queue runs reception, doctors and your phone.</p>
          </div>
          <div data-cap data-in="0.88" data-out="1" className="mx-auto max-w-md rounded-[10px] bg-[#2d3142] p-6 text-center text-[#eef2f3] md:p-8">
            <h2 className="text-3xl leading-tight font-semibold">Welcome to MEDIORA</h2>
            <p className="mt-2 text-lg leading-snug text-[#bfc0c0]">See how the queue works, then book your first visit.</p>
            <button type="button" onClick={() => onEnter?.('go')} className="pointer-events-auto mt-5 min-h-12 cursor-pointer rounded-full bg-[#ef8354] px-7 text-base font-semibold text-[#2d3142] transition-opacity duration-200 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2d3142]">
              Meet MEDIORA
            </button>
          </div>
        </div>

        <div data-hint className="pointer-events-none absolute right-5 bottom-5 flex items-center gap-2 rounded-full bg-[#2d3142] px-4 py-2 text-sm font-semibold text-[#eef2f3]">
          <span>Scroll to enter</span>
          <svg viewBox="0 0 24 24" className="size-5 animate-bounce motion-reduce:animate-none" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/10" aria-hidden="true">
          <div data-bar className="h-full origin-left scale-x-0 bg-[#ef8354]" />
        </div>
      </div>
    </section>
  );
}
