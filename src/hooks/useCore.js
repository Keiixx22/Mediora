import { useEffect, useState, useSyncExternalStore } from 'react';
import Core from '../lib/core.js';

/** Re-render when anything in the Core store changes (any tab). Call it in components that read Core. */
export const useCoreRev = () => useSyncExternalStore(Core.subscribe, Core.rev);

/** Current demo time in ms, refreshed every `ms`. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Core.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Core.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** FR-18: live queue status by polling (default every 15 s). Re-reads shared storage, then re-renders. */
export function useLivePoll(ms = 15000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      Core.sync();
      setTick((t) => t + 1);
    }, ms);
    return () => clearInterval(id);
  }, [ms]);
}
