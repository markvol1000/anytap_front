import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const AdminRefreshContext = createContext({
  refreshHandler: null,
  isRefreshing: false,
  registerRefresh: () => {},
  unregisterRefresh: () => {},
});

export function AdminRefreshProvider({ children }) {
  const [refreshState, setRefreshState] = useState({
    handler: null,
    isRefreshing: false,
  });

  const registerRefresh = useCallback((handler, isRefreshing = false) => {
    setRefreshState({
      handler: typeof handler === 'function' ? handler : null,
      isRefreshing: Boolean(isRefreshing),
    });
  }, []);

  const unregisterRefresh = useCallback(() => {
    setRefreshState({
      handler: null,
      isRefreshing: false,
    });
  }, []);

  return (
    <AdminRefreshContext.Provider
      value={{
        refreshHandler: refreshState.handler,
        isRefreshing: refreshState.isRefreshing,
        registerRefresh,
        unregisterRefresh,
      }}
    >
      {children}
    </AdminRefreshContext.Provider>
  );
}

export function useAdminRefresh() {
  return useContext(AdminRefreshContext);
}
