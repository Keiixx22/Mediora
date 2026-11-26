import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Accessible dialog: focus moves in, Tab is trapped, Esc and the scrim close it, the page behind does not scroll. */
export default function Modal({ title, wide, side, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    const body = root.querySelector('[data-modal-body]');
    const first = body.querySelector(FOCUSABLE) || root.querySelector('button');
    if (first) first.focus();

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const size = side ? 'ml-auto h-full max-w-[460px]' : wide ? 'max-w-[720px]' : 'max-w-[520px]';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-[24px] bg-surface text-ink shadow-2xl [--notch:var(--color-surface)] ${size}`}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <h2 id="modal-title" className="m-0 text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-md px-2 text-2xl leading-none text-muted hover:text-ink"
          >
            &times;
          </button>
        </div>
        <div data-modal-body className="overflow-auto px-5 pt-2 pb-5">
          {children}
        </div>
      </div>
    </div>
  );
}
