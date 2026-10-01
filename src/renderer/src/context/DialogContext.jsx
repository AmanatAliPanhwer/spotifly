import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Modal from '../components/Modal';

const DialogContext = createContext(null);

const IDLE = {
  mode: 'confirm',
  open: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'info',
  inputValue: '',
  inputPlaceholder: '',
};

export function DialogProvider({ children }) {
  const [state, setState] = useState(IDLE);
  const resolver = useRef(null);

  const close = useCallback((value) => {
    setState((s) => ({ ...s, open: false }));
    const resolve = resolver.current;
    resolver.current = null;
    resolve?.(value);
  }, []);

  const openDialog = useCallback((config) => {
    // Resolve any dialog still awaiting input so nothing is left dangling.
    resolver.current?.(undefined);
    resolver.current = null;
    setState({ ...IDLE, ...config, open: true });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const dialog = useMemo(
    () => ({
      confirm: (title, message, opts = {}) => openDialog({ mode: 'confirm', title, message, ...opts }),
      prompt: (title, inputPlaceholder = '', opts = {}) =>
        openDialog({ mode: 'prompt', title, inputPlaceholder, confirmText: 'Create', ...opts }),
      alert: (title, message, opts = {}) => openDialog({ mode: 'alert', title, message, ...opts }),
    }),
    [openDialog]
  );

  const handleConfirm = useCallback(
    (value) => {
      if (state.mode === 'prompt') {
        const trimmed = (value || '').trim();
        close(trimmed ? trimmed : undefined);
      } else {
        close(true);
      }
    },
    [state.mode, close]
  );

  const handleCancel = useCallback(() => close(undefined), [close]);

  return (
    <DialogContext.Provider value={dialog}>
      {children}
      <Modal
        open={state.open}
        mode={state.mode}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        variant={state.variant}
        inputValue={state.inputValue}
        inputPlaceholder={state.inputPlaceholder}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}