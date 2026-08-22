import { useCallback, useEffect, useRef, useState } from 'react';

export function useAuthToast(duration = 6000) {
  const [toast, setToast] = useState('');
  const timer = useRef(null);

  const clearToast = useCallback(() => {
    clearTimeout(timer.current);
    setToast('');
  }, []);

  const showToast = useCallback((message) => {
    if (!message) return;
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), duration);
  }, [duration]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { toast, showToast, clearToast };
}
