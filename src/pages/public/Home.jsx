import { useRef } from 'react';
import Core from '../../lib/core.js';
import Button from '../../components/ui/Button.jsx';
import DoctorDirectory from '../../components/DoctorDirectory.jsx';
import Journey from '../../components/landing/Journey.jsx';
import Vessel from '../../components/landing/Vessel.jsx';
import WaitCalc from '../../components/landing/WaitCalc.jsx';
import { usePrefersReducedMotion, useScrollReveal } from '../../hooks/useMotion.js';
import { useSession } from '../../context/SessionContext.jsx';

const GAP = 'py-[clamp(4rem,8vw,8rem)]';
const WRAP = 'mx-auto w-full max-w-[1280px] px-6';

/** Landing in the Wabi-Sabi ceramic style, written for a hospital: the crack is the point, and gold mends it. */
export default function Home() {
  const reduced = usePrefersReducedMotion();
  const root = useRef(null);
  useScrollReveal(root, reduced);
  const { user } = useSession();
  const docs = Core.listDoctors();
  const depts = Core.listDepts();

  return (
    <div ref={root}>
      {/* Hero: asymmetric, text weighted left, the mended bowl at the right */}
      <section className="crackle min-h-[calc(100dvh-57px)] bg-cream">
        <div className={`${WRAP} grid items-center gap-10 py-14 md:grid-cols-[7fr_5fr] md:py-20`}>
          <div>
            <p className="hand font-display text-2xl text-clay">a hospital that mends gently</p>
            <h1 className="mt-3 max-w-[14ch] font-display text-[clamp(2.75rem,6.4vw,5.5rem)] leading-[0.98]">Healing, without the waiting room.</h1>
            <p className="mt-6 max-w-[46ch] text-xl leading-relaxed">
              MEDIORA lets you book a doctor, pay online and keep a digital queue number in your pocket. Wait where you like. We tell you when it is nearly your turn.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => document.getElementById('doctors')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })}>
                Find a doctor
              </Button>
              {!user && <Button href="#signup">Create an account</Button>}
            </div>
            <div className="gold-line mt-10 w-48" aria-hidden="true" />
          </div>
          <Vessel className="mx-auto w-full max-w-[34rem] md:-mr-6" />
        </div>
      </section>

      {/* About: the philosophy, translated. Offset columns, no equal thirds */}
      <section id="about" className={`bg-surface2 ${GAP}`}>
        <div className={WRAP} data-reveal-group>
          <div className="grid gap-10 md:grid-cols-[5fr_1fr_6fr]">
            <blockquote data-r className="font-display text-[clamp(2rem,4.2vw,3.6rem)] leading-[1.05] font-bold">
              A crack is not hidden. It is mended in gold, and becomes the best part.
            </blockquote>
            <div className="hidden md:block" />
            <div data-r className="md:mt-24">
              <p className="max-w-[52ch] text-xl leading-relaxed">
                Hospitals treat the queue as a flaw to conceal. We treat it as part of the visit, and mend it. Every patient receives a number, every number is paid for, and everyone, from the front desk to the consulting room, sees the same live queue.
              </p>
              <p className="mt-4 max-w-[52ch] text-xl leading-relaxed">
                If a doctor is on leave, you are moved to the next free day or refunded in one click. Nothing is quietly dropped.
              </p>
              <dl className="mt-8 grid max-w-lg grid-cols-3 gap-6">
                {[
                  ['doctors on shift', docs.length],
                  ['departments', depts.length],
                  ['patients ahead at alert', 5],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col-reverse">
                    <dt className="hand mt-1 text-lg text-clay">{k}</dt>
                    <dd className="m-0 font-mono text-2xl font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Journey: the carousel */}
      <section id="journey" className={`bg-cream ${GAP}`}>
        <div className={WRAP} data-reveal-group>
          <h2 data-r className="max-w-[18ch] font-display text-[clamp(2.2rem,4.6vw,3.8rem)] leading-[1.02]">Four quiet steps from booking to the doctor</h2>
          <div data-r className="mt-10">
            <Journey />
          </div>
        </div>
      </section>

      {/* Live estimator, offset to the right */}
      <section className={`crackle bg-surface2 ${GAP}`}>
        <div className={`${WRAP} md:pl-[8%]`} data-reveal-group>
          <div data-r>
            <WaitCalc />
          </div>
        </div>
      </section>

      {/* Doctors */}
      <section id="doctors" className={`bg-cream ${GAP}`}>
        <div className={WRAP} data-reveal-group>
          <h2 data-r className="mb-8 max-w-[20ch] font-display text-[clamp(2.2rem,4.6vw,3.8rem)] leading-[1.02]">Choose who will see you</h2>
          <div data-r>
            <DoctorDirectory />
          </div>
        </div>
      </section>

      {/* Close: charcoal field, a gold seam, one action */}
      <section className="bg-charcoal py-[clamp(4rem,8vw,8rem)] text-cream">
        <div className={`${WRAP} grid items-end gap-10 md:grid-cols-[7fr_4fr]`} data-reveal-group>
          <div>
            <p data-r className="hand font-display text-2xl text-gold">begin gently</p>
            <h2 data-r className="mt-2 max-w-[14ch] font-display text-[clamp(2.6rem,6vw,5rem)] leading-[0.98]">Book your first visit.</h2>
            <div data-r className="gold-line mt-6 w-56" aria-hidden="true" />
          </div>
          <div data-r>
            <p className="max-w-[36ch] text-xl leading-relaxed">Create a free patient account, verify your email and choose a doctor. Your number arrives as soon as you pay.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#signup" className="inline-flex min-h-12 cursor-pointer items-center bg-clay px-6 font-semibold text-cream no-underline transition-colors duration-200 hover:bg-[#8a4524]">Create account</a>
              <a href="#login" className="wabi-edge inline-flex min-h-12 cursor-pointer items-center border-cream px-6 font-semibold text-cream no-underline transition-colors duration-200 hover:bg-white/10">Log in</a>
            </div>
            <p className="mt-8 font-mono text-sm">hello@mediora.demo</p>
          </div>
        </div>
      </section>
    </div>
  );
}
