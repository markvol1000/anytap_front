import { useEffect, useRef, useState } from 'react';
import { sanitizeToastMessage } from '../../utils/toast-sanitizer.js';

export function AccountToast({ msg, onClear }) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');
  const timerRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const isHoveredRef = useRef(false);

  const clearAllTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
  };

  const dismiss = () => {
    setVisible(false);
    fadeTimerRef.current = setTimeout(() => {
      setText('');
      if (onClear) onClear();
    }, 400);
  };

  const startTimer = (duration = 7000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!isHoveredRef.current) {
        dismiss();
      }
    }, duration);
  };

  useEffect(() => {
    if (msg) {
      const cleanMsg = sanitizeToastMessage(msg);
      setText(cleanMsg);
      setVisible(true);
      startTimer(7000);
    } else {
      setVisible(false);
      setText('');
    }
    return () => clearAllTimers();
  }, [msg]);

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    startTimer(3000);
  };

  if (!text) return null;

  return (
    <div
      className="portal-toast"
      role="status"
      tabIndex={0}
      onClick={dismiss}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      style={{
        zIndex: 999999,
        pointerEvents: 'auto',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate(-50%, 0)' : 'translate(-50%, -10px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        cursor: 'pointer',
      }}
    >
      {text}
    </div>
  );
}
