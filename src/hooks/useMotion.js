import { useEffect, useState } from 'react';

/** True when the visitor asked the OS for less motion. Re-evaluates if the setting changes. */
export function usePrefersReducedMotion() {
  const q = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const [v, setV] = useState(!!q?.matches);
  useEffect(() => {
    if (!q) return undefined;
    const on = () => setV(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, [q]);
  return v;
}

/** Entrance for every [data-r] inside root: fade + rise 16px over 420 ms, staggered 80 ms, once, when scrolled into view. */
export function useScrollReveal(root, reduced) {
  useEffect(() => {
    if (reduced || !root.current) return undefined;
    let ctx;
    let cancelled = false;
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, st]) => {
      if (cancelled) return;
      const gsap = g.default;
      gsap.registerPlugin(st.ScrollTrigger);
      ctx = gsap.context(() => {
        gsap.utils.toArray('[data-reveal-group]').forEach((grp) => {
          const items = grp.querySelectorAll('[data-r]');
          if (!items.length) return;
          gsap.from(items, { opacity: 0, y: 16, duration: 0.42, ease: 'power2.out', stagger: 0.08, scrollTrigger: { trigger: grp, start: 'top 85%', once: true } });
        });
      }, root);
    });
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [root, reduced]);
}
