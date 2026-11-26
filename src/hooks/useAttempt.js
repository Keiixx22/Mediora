import { useCallback } from 'react';
import { useSession } from '../context/SessionContext.jsx';
import { useToast } from '../context/UiContext.jsx';

/**
 * Run a button action and show Core errors as a toast:
 *   const attempt = useAttempt();
 *   <Button onClick={() => attempt(() => { Core.done(sess, id); toast('Done', 'good'); })} />
 */
export function useAttempt() {
  const toast = useToast();
  const { logout } = useSession();
  return useCallback(
    async (fn) => {
      try {
        return await fn();
      } catch (e) {
        if (e && e.code) {
          if (e.code === 'AUTH') logout();
          toast(e.message, 'bad');
        } else {
          console.error(e);
          toast('Something went wrong. Please try again.', 'bad');
        }
        return undefined;
      }
    },
    [toast, logout],
  );
}
