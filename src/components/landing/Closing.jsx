import Button from '../ui/Button.jsx';

/** The action tile: one accent tile flanked by two tiles cropped off the viewport edges. */
export function ActionTiles() {
  return (
    <section aria-label="Get started" className="overflow-hidden bg-bg py-16 md:py-24">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_6fr_1fr] md:gap-4">
        <div className="order-2 h-28 rounded-[28px] bg-[#f8c7c9] md:order-1 md:-ml-24 md:h-[22rem]" aria-hidden="true" />
        <div className="order-1 col-span-2 flex min-h-[19rem] flex-col justify-center rounded-[28px] bg-[#1f6b3a] p-8 text-white md:order-2 md:col-span-1 md:min-h-[22rem] md:p-12">
          <h2 className="max-w-[16ch] text-[clamp(2.25rem,4.4vw,4rem)] leading-[1.02] font-semibold">Book your first visit</h2>
          <p className="mt-3 max-w-[44ch] text-lg leading-snug text-white/85">Create a free patient account, verify your email and choose a doctor. Your queue number arrives as soon as you pay.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="#signup" className="!bg-[#c3edce] !text-[#0a0a0a]">Create account</Button>
            <Button href="#login" className="!bg-white/15 !text-white hover:!bg-white/25">Log in</Button>
          </div>
        </div>
        <div className="order-3 h-28 rounded-[28px] bg-[#c3edce] md:h-[22rem] md:-mr-24" aria-hidden="true" />
      </div>
    </section>
  );
}

/** Closing chapter: the way to get in touch is the display line. */
export function ContactChapter() {
  return (
    <section aria-label="Contact" className="flex min-h-[90svh] flex-col justify-between bg-[#f8c7c9] px-4 py-10 text-[#0a0a0a] md:px-10 md:py-12">
      <div className="flex flex-wrap items-start justify-between gap-6 text-base">
        <p className="max-w-[26ch]">MEDIORA Demo Hospital. A queue and appointment system with fictional data.</p>
        <p className="max-w-[26ch]">Each doctor’s queue opens when their shift starts. Times are in WIB.</p>
        <a href="#home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="font-semibold underline underline-offset-4">Back to top</a>
      </div>
      <a href="mailto:hello@mediora.demo" className="block text-[clamp(2.6rem,9.4vw,9rem)] leading-[0.95] font-semibold tracking-[-0.05em] no-underline">
        hello
        <br />
        @mediora.demo
      </a>
    </section>
  );
}
