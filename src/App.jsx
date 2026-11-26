import { useEffect } from 'react';
import Core from './lib/core.js';
import { SessionProvider, useSession } from './context/SessionContext.jsx';
import { UiProvider } from './context/UiContext.jsx';
import { replaceRoute, useHashRoute } from './router.jsx';
import AppShell, { PublicLayout } from './components/layout/AppShell.jsx';
import { GUEST_ONLY, HOME, PUBLIC_ROUTES, ROLE_ROUTES } from './routes.jsx';

function Routes() {
  const { user } = useSession();
  const hash = useHashRoute() || 'home';
  const role = user?.role;
  const own = role ? ROLE_ROUTES[role] : null;
  const ownEntry = own?.find(([p]) => p === hash);
  const pub = PUBLIC_ROUTES[hash];

  // Where this URL should really go: guests never see role pages, signed-in users skip login pages.
  let redirect = null;
  if (!ownEntry && !pub) redirect = role ? HOME[role] : 'home';
  else if (!ownEntry && pub && role && GUEST_ONLY.includes(hash)) redirect = HOME[role];
  else if (!role && ownEntry) redirect = 'login';

  useEffect(() => {
    if (redirect) replaceRoute(redirect);
  }, [redirect]);

  useEffect(() => {
    const label = ownEntry ? ownEntry[1] : pub?.title;
    document.title = label ? `${label} · MEDIORA` : 'MEDIORA';
  }, [ownEntry, pub]);

  if (redirect) return null;

  if (ownEntry) {
    const Page = ownEntry[2];
    return (
      <AppShell route={hash} nav={own.map(([p, l]) => [p, l])} home={HOME[role]}>
        <Page key={hash} />
      </AppShell>
    );
  }
  const { Page } = pub;
  return (
    <PublicLayout route={hash}>
      <Page key={hash} />
    </PublicLayout>
  );
}

export default function App() {
  // Drives the 15-minute payment holds, no-show timers and notification retries.
  useEffect(() => {
    const id = setInterval(() => Core.tick(), 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <SessionProvider>
      <UiProvider>
        <Routes />
      </UiProvider>
    </SessionProvider>
  );
}
