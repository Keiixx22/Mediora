import { useCallback, useState } from 'react';
import { useSession } from '../context/SessionContext.jsx';

/**
 * Wire a <form> to an async handler: const { onSubmit, error, busy } = useForm(async (formData, form) => { ... }).
 * Errors thrown by Core (they carry a `code`) are shown under the form; an AUTH error signs the user out.
 */
export function useForm(handler) {
  const { logout } = useSession();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      setBusy(true);
      try {
        await handler(new FormData(form), form);
        setError('');
      } catch (err) {
        if (err && err.code) {
          setError(err.message);
          if (err.code === 'AUTH') logout();
        } else {
          console.error(err);
          setError('Something went wrong. Please try again.');
        }
      } finally {
        setBusy(false);
      }
    },
    [handler, logout],
  );

  return { onSubmit, error, busy };
}
