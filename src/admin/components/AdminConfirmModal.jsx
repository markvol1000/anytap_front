import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ConfirmContext = createContext(null);

export function AdminConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setState({
      ...options,
      resolve,
    });
  }), []);

  const close = useCallback((result) => {
    setState((prev) => {
      prev?.resolve?.(result);
      return null;
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state ? (
        <div className="admin-modal-backdrop" role="presentation" onClick={() => close(false)}>
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-confirm-title"
            onClick={(e) => e.stopPropagation()}>
            <h2 id="admin-confirm-title" className="admin-modal__title">{state.title}</h2>
            {state.message ? <p className="admin-modal__msg">{state.message}</p> : null}
            {state.showInput ? (
              <textarea
                className="admin-modal__input"
                placeholder={state.inputPlaceholder ?? ''}
                rows={3}
                value={state.inputValue ?? ''}
                onChange={(e) => setState((s) => ({ ...s, inputValue: e.target.value }))}
              />
            ) : null}
            <div className="admin-modal__actions">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => close(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={`admin-btn ${state.danger ? 'admin-btn--danger' : 'admin-btn--primary'}`}
                onClick={() => close(state.showInput ? { confirmed: true, value: state.inputValue ?? '' } : true)}>
                {state.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useAdminConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useAdminConfirm must be used within AdminConfirmProvider');
  return ctx.confirm;
}

/** Helper — returns input value when showInput, else boolean */
export async function runConfirm(confirm, options) {
  const result = await confirm(options);
  if (options.showInput) {
    if (!result?.confirmed) return null;
    return result.value ?? '';
  }
  return Boolean(result);
}
