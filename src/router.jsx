// A tiny hash router (no dependency). Routes look like #my-queue, so the app works on any static host.
import { useEffect, useState } from 'react';

const read = () => window.location.hash.slice(1);

export function useHashRoute() {
  const [hash, setHash] = useState(read);
  useEffect(() => {
    const on = () => setHash(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export function navigate(route) {
  if (read() !== route) window.location.hash = route;
}

export function replaceRoute(route) {
  window.history.replaceState(null, '', '#' + route);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function Link({ to, children, ...props }) {
  return (
    <a href={'#' + to} {...props}>
      {children}
    </a>
  );
}
