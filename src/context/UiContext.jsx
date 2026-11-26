import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Modal from '../components/ui/Modal.jsx';
import Toasts from '../components/ui/Toasts.jsx';
import Button from '../components/ui/Button.jsx';

const Ctx = createContext(null);
let toastId = 0;

function ConfirmBody({ message, label, danger, onYes, onNo }) {
  return (
    <>
      <p className="mb-4">{message}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onNo}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onYes}>
          {label}
        </Button>
      </div>
    </>
  );
}

export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const isOpen = useRef(false);
  const opener = useRef(null);
  const resolver = useRef(null);

  const toast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5500);
  }, []);

  const finish = useCallback((value) => {
    isOpen.current = false;
    setModal(null);
    const r = resolver.current;
    resolver.current = null;
    if (r) r(value);
    const el = opener.current;
    opener.current = null;
    if (el && document.contains(el)) el.focus();
  }, []);
  const close = useCallback(() => finish(false), [finish]);

  /** open(title, content, { wide, side }); content is an element or ({ close }) => element */
  const open = useCallback((title, content, opts = {}) => {
    if (resolver.current) {
      resolver.current(false);
      resolver.current = null;
    }
    if (!isOpen.current) opener.current = document.activeElement;
    isOpen.current = true;
    setModal({ title, content, key: ++toastId, ...opts });
  }, []);

  /** await confirm('Delete this?', 'Delete') -> true | false */
  const confirm = useCallback(
    (message, label = 'Confirm', danger = true) =>
      new Promise((resolve) => {
        open(
          'Please confirm',
          <ConfirmBody message={message} label={label} danger={danger} onYes={() => finish(true)} onNo={() => finish(false)} />,
        );
        resolver.current = resolve;
      }),
    [open, finish],
  );

  const value = useMemo(() => ({ toast, open, close, confirm }), [toast, open, close, confirm]);
  const body = modal && (typeof modal.content === 'function' ? modal.content({ close }) : modal.content);

  return (
    <Ctx.Provider value={value}>
      {children}
      {modal && (
        <Modal key={modal.key} title={modal.title} wide={modal.wide} side={modal.side} onClose={close}>
          {body}
        </Modal>
      )}
      <Toasts toasts={toasts} />
    </Ctx.Provider>
  );
}

const useUi = () => useContext(Ctx);
export const useToast = () => useUi().toast;
export const useModal = () => {
  const { open, close, confirm } = useUi();
  return { open, close, confirm };
};
