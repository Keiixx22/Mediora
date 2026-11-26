import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { usePrefersReducedMotion } from '../../hooks/useMotion.js';

/**
 * A cracked tea bowl mended with gold (kintsugi) and a healing cross. Handwritten notes point at it with thin
 * leader lines. The gold seams draw themselves in once, so the mending is what you watch.
 */
export default function Vessel({ className = '' }) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-seam]', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: 0.25, delay: 0.6 });
      gsap.from('[data-note]', { opacity: 0, y: 12, duration: 0.5, ease: 'power2.out', stagger: 0.15, delay: 1.6 });
      gsap.from('[data-bowl]', { opacity: 0, y: 16, duration: 0.6, ease: 'power2.out' });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  const seam = { fill: 'none', stroke: '#d4af37', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round', pathLength: 1, strokeDasharray: 1 };
  const note = { fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontSize: 21, fill: '#36454f' };
  const leader = { stroke: '#36454f', strokeWidth: 1, fill: 'none' };

  return (
    <svg ref={ref} viewBox="0 0 560 420" className={className} role="img" aria-label="A ceramic bowl mended with gold seams and a small gold cross, with handwritten notes: mended with gold, your number A-007, five ahead and we will message you.">
      <ellipse cx="280" cy="372" rx="170" ry="14" fill="#e8c4b8" />
      <g data-bowl>
        <path d="M120 150 C120 270 190 350 280 350 C370 350 440 270 440 150 Z" fill="#a0522d" />
        <path d="M120 150 C124 200 140 250 170 290 C150 240 140 200 140 150 Z" fill="#8a4524" />
        <rect x="225" y="344" width="110" height="18" fill="#7a3b1f" />
        <ellipse cx="280" cy="150" rx="160" ry="38" fill="#36454f" />
        <ellipse cx="280" cy="150" rx="160" ry="38" fill="none" stroke="#faf0e6" strokeWidth="5" />
        <ellipse cx="280" cy="162" rx="120" ry="22" fill="#2a363f" />
        <path d="M150 200 C170 250 215 300 260 320" fill="none" stroke="#e8c4b8" strokeWidth="3" strokeOpacity=".45" />
      </g>
      <path data-seam d="M196 188 L226 232 L208 270 L246 322" {...seam} />
      <path data-seam d="M356 184 L338 228 L372 268 L350 318" {...seam} />
      <path data-seam d="M280 192 L290 240 L268 284" {...seam} />
      <path data-seam d="M226 232 L170 246 M372 268 L420 258" {...seam} strokeWidth="3" />
      <path data-seam d="M308 262 V296 M292 279 H324" {...seam} strokeWidth="5" />

      <g data-note>
        <text x="20" y="70" {...note}>mended with gold</text>
        <path d="M60 80 C90 110 140 150 200 190" {...leader} />
        <circle cx="200" cy="190" r="3.5" fill="#d4af37" />
      </g>
      <g data-note>
        <text x="372" y="62" {...note}>your number, A-007</text>
        <path d="M430 72 C440 110 400 150 360 186" {...leader} />
        <circle cx="360" cy="186" r="3.5" fill="#d4af37" />
      </g>
      <g data-note>
        <text x="300" y="402" {...note}>five ahead, we message you</text>
        <path d="M360 384 C390 350 350 316 330 292" {...leader} />
        <circle cx="330" cy="290" r="3.5" fill="#d4af37" />
      </g>
    </svg>
  );
}
