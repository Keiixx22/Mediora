import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Core from '../lib/core.js';
import { useCoreRev } from '../hooks/useCore.js';

const KEY = 'mediora.sess';
const Ctx = createContext(null);

const load = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
};

export function SessionProvider({ children }) {
  const [sess, setSess] = useState(load);
  useCoreRev();

  // `sess` is {id, role, name}; every Core call takes it as the actor and checks it server-side style.
  let user = null;
  if (sess) {
    try {
      user = Core.me(sess);
    } catch {
      user = null;
    }
  }

  const store = useCallback((s) => {
    setSess(s);
    try {
      if (s) sessionStorage.setItem(KEY, JSON.stringify(s));
      else sessionStorage.removeItem(KEY);
    } catch {
      /* private mode: keep the session in memory only */
    }
  }, []);

  useEffect(() => {
    if (sess && !user) store(null); // the account vanished (for example after a demo reset)
  });

  const value = useMemo(
    () => ({ sess: user ? sess : null, user, login: store, logout: () => store(null) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sess, user && user.id, user && user.emailVerified, store],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
