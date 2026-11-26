# MEDIORA (React + Tailwind)

Hospital queue and appointment web app built from the MEDIORA PRD v1.0.
Vite, React 19 (JavaScript/JSX) and Tailwind CSS v4. No router library, no UI kit.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm test         # 64 checks on the domain logic (no browser needed)
```

## Demo accounts

All use the password `Mediora123!`:

| Role | Email |
| --- | --- |
| Patient | patient@mediora.demo |
| Doctor | raka@mediora.demo |
| Receptionist | staff@mediora.demo |
| Administrator | admin@mediora.demo |

The **Sandbox** button in the top bar opens the fake inbox (verification codes, email and WhatsApp copies), the payment gateway switch (simulate a failed payment) and a demo clock (+1 hour, +1 day) so you can see no-show timers, payment holds and queue alerts without waiting.

## Structure

```
src/
  lib/core.js          All business rules, no React. Swap this for your API.
  lib/ui.js            Formatting helpers and demo account list
  hooks/               useCoreRev, useNow, useLivePoll, useForm, useAttempt
  context/             SessionContext (login state), UiContext (toasts, modals)
  router.jsx           Tiny hash router (#my-queue, #dashboard ...)
  routes.jsx           Which pages each role can open
  components/ui/       Button, Pill, Table, Fields, Card, Ticket, Modal ...
  components/layout/   AppShell, banners
  components/booking/  Booking flow and payment step
  components/queue/    Queue panel shared by doctor, reception and admin
  pages/{public,patient,doctor,staff,admin}/
tests/core.test.js
```

## Data and backend

`core.js` stores everything in `localStorage` (in memory under Node) and exposes functions like `Core.book(session, ...)`. Every function receives the logged-in session and checks the role, so permission rules already live in one place. To use a real backend, keep the function names and replace the bodies with `fetch` calls (make them async and `await` them in the pages). Passwords are hashed with PBKDF2 here; a real server should do this itself.

## Look

Bold editorial: one typeface (Chillax, with Figtree as fallback), flat colour fields in mint, pink and deep green on near-white and black, pill buttons, no gradients, glass or resting shadows. The tokens live at the top of `src/index.css` (`--mint`, `--pink`, `--accent`); every component reads them, so changing a colour there changes the whole app. Dark mode follows the system setting.

## Landing page (Wabi-Sabi ceramic, GSAP)

- `pages/public/Home.jsx` composes the sections: hero, about, journey carousel, wait estimator, doctors, closing. The `wabi` class (added by `PublicLayout` on the home route) re-maps the design tokens in `index.css`, so shared components such as the doctor directory restyle themselves.
- `components/landing/Vessel.jsx` is the SVG bowl. GSAP draws the gold seams with stroke-dashoffset and fades in the handwritten notes.
- `components/landing/Journey.jsx` is the carousel (tabs, arrows, swipe, left/right keys). `WaitCalc.jsx` is the live estimator using the same formula as the queue.
- `hooks/useMotion.js` has `useScrollReveal`: fade plus 16px rise over 420 ms, 80 ms stagger, once. Everything stays visible without JavaScript or with reduced motion.
- Colours, fonts and utilities (`.crackle`, `.wabi-edge`, `.hand`, `.gold-line`) are at the end of `index.css`.

## Notes and assumptions

- Items the PRD left open are marked `[A]` there and kept as simple defaults: 15 minute payment hold, 5 patients alert threshold, 3 delivery retries, WIB time zone.
- Email, WhatsApp and the payment gateway are simulated by the Sandbox.
- Sample doctors, patients and bookings are fictional.
