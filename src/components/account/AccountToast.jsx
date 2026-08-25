import { useEffect, useRef, useState } from 'react';
import { sanitizeToastMessage } from '../../utils/toast-sanitizer.js';

export function AccountToast({ msg, onClear }) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');
  const timerRef = useRef(null);
  const isHoveredRef = useRef(false);

  const startTimer = (duration = 6000) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!isHoveredRef.current) {
        setVisible(false);
        setTimeout(() => {
          setText('');
          if (onClear) onClear();
        }, 400);
      }
    }, duration);
  };

  useEffect(() => {
    if (msg) {
      const cleanMsg = sanitizeToastMessage(msg);
      setText(cleanMsg);
      setVisible(true);
      startTimer(6000);
    }
  }, [msg]);

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    clearTimeout(timerRef.current);
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        cursor: 'pointer',
      }}
    >
      {text}
    </div>
  );
}
