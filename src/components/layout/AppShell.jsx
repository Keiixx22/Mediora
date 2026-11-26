import { useEffect } from 'react';
import Core from '../../lib/core.js';
import { nowLabel } from '../../lib/ui.js';
import { useSession } from '../../context/SessionContext.jsx';
import { useModal } from '../../context/UiContext.jsx';
import { useCoreRev, useNow } from '../../hooks/useCore.js';
import { Link } from '../../router.jsx';
import Button from '../ui/Button.jsx';
import SandboxPanel from '../SandboxPanel.jsx';
import Banners from './Banners.jsx';

function Logo() {
  return (
    <svg className="size-[30px]" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--accent)" />
      <path d="M13 8h6v5h5v6h-5v5h-6v-5H8v-6h5z" fill="var(--accent-ink)" />
    </svg>
  );
}

function TopBar({ home }) {
  const { user, logout } = useSession();
  const { open } = useModal();
  return (
    <header className="sticky top-0 z-20 bg-bg">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to={home} className="flex items-center gap-2.5 text-xl font-semibold tracking-[-0.04em] text-ink no-underline">
          <Logo />
          <span>MEDIORA</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => open('Sandbox', <SandboxPanel />, { side: true })}>
            Sandbox
          </Button>
          {user ? (
            <>
              <span className="hidden flex-col text-right leading-tight md:flex">
                <span className="text-sm font-bold">{user.name}</span>
                <span className={`mt-0.5 self-end rounded-full px-2.5 py-0.5 text-xs font-semibold text-[#0a0a0a] capitalize ${user.role === 'patient' ? 'bg-mint' : 'bg-pink'}`}>{user.role}</span>
              </span>
              <Button size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" href="#login">
                Log in
              </Button>
              <Button size="sm" variant="primary" href="#signup">
                Create account
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  useNow(1000);
  useCoreRev();
  const shifted = Core.sandbox().shifted;
  return (
    <footer className="mx-auto flex w-full max-w-[1320px] flex-wrap justify-between gap-2 px-4 py-6 text-sm text-muted">
      <span>
        {nowLabel()}
        {shifted ? ' (demo clock)' : ''}
      </span>
      <span>Demo hospital with fictional data. Times in WIB.</span>
    </footer>
  );
}

/** Focus the main region and scroll to top whenever the route changes. */
function useRouteFocus(route) {
  useEffect(() => {
    const el = document.getElementById('main');
    if (el) el.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [route]);
}

const skip = () => document.getElementById('main')?.focus();
const SkipLink = () => (
  <button
    type="button"
    onClick={skip}
    className="sr-only rounded-md bg-accent px-3 py-2 font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
  >
    Skip to content
  </button>
);

export function PublicLayout({ route, children }) {
  useRouteFocus(route);
  return (
    <div className={`flex min-h-screen flex-col ${route === 'home' ? 'wabi' : ''}`}>
      <SkipLink />
      <TopBar home="home" />
      <main id="main" tabIndex={-1} className={`flex-1 outline-none ${route === 'home' ? 'w-full' : 'mx-auto w-full max-w-[1180px] px-4 py-6'}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default function AppShell({ route, nav, home, children }) {
  useCoreRev();
  const { sess, user } = useSession();
  useRouteFocus(route);
  const unread = user.role === 'patient' ? Core.myNotifs(sess).filter((n) => !n.read).length : 0;
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <TopBar home={home} />
      <div className="mx-auto grid w-full max-w-[1320px] flex-1 grid-cols-1 gap-3 px-4 py-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6">
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto border-b border-line pb-1.5 md:sticky md:top-[72px] md:flex-col md:self-start md:border-b-0 md:pb-0">
          {nav.map(([path, label]) => {
            const on = route === path;
            return (
              <Link
                key={path}
                to={path}
                aria-current={on ? 'page' : undefined}
                className={`flex shrink-0 items-center justify-between gap-2 rounded-full px-4 py-2.5 whitespace-nowrap no-underline transition-colors duration-200 ${
                  on ? 'bg-accent-soft font-semibold text-ink' : 'font-medium text-muted hover:bg-surface2 hover:text-ink'
                }`}
              >
                {label}
                {path === 'notifications' && unread > 0 && (
                  <span aria-label={`${unread} unread`} className="min-w-5 rounded-full bg-bad-fg px-1.5 text-center text-xs text-surface">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <main id="main" tabIndex={-1} className="min-w-0 outline-none">
          <Banners />
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
