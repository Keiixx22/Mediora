const TONE = {
  info: 'bg-ink text-bg',
  good: 'bg-good-fg text-surface',
  bad: 'bg-bad-fg text-surface',
  warn: 'bg-warn-fg text-surface',
};

export default function Toasts({ toasts }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[80] grid w-[min(92vw,460px)] -translate-x-1/2 gap-2"
    >
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto rounded-full px-5 py-3 font-semibold ${TONE[t.type] || TONE.info}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
