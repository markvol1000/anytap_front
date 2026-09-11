import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { hasMemberSession } from '../lib/services/authService.js';
import { apiGet, forceLogoutAndRedirect } from '../lib/api/httpClient.js';
import { isHttpApi } from '../lib/api/config.js';

const HEALTH_CHECK_INTERVAL_MS = 10000; // 10초마다 서버 생존 여부 감시

export function ServerHealthGuard() {
  const location = useLocation();
  const checkingRef = useRef(false);

  useEffect(() => {
    // HTTP API 모드가 아니거나 로그인된 세션이 없으면 헬스체크 스킵
    if (!isHttpApi) return;

    const publicAuthPaths = ['/login', '/sign-up', '/forgot-password', '/sign-up/verify'];
    const isPublicAuthPage = publicAuthPaths.some((p) =>
      location.pathname === p || location.pathname.startsWith(p)
    );
    if (isPublicAuthPage) return;

    let isMounted = true;

    const checkServerHealth = async () => {
      if (!isMounted || checkingRef.current) return;
      if (!hasMemberSession()) return;

      checkingRef.current = true;
      try {
        // 백엔드 /api/v1/auth/session 엔드포인트로 경량 세션 및 서버 생존 확인
        await apiGet('/auth/session', { timeout: 4000 });
      } catch (err) {
        // err 발생 시 httpClient.js의 apiRequest에서 이미 forceLogoutAndRedirect가 트리거됨
        // 만약 처리되지 않은 경우를 대비한 2차 안전장치
        if (isMounted && hasMemberSession()) {
          console.warn('[ServerHealthGuard] Backend server unreachable or session lost. Evacuating to login...', err);
          forceLogoutAndRedirect('server_unreachable');
        }
      } finally {
        checkingRef.current = false;
      }
    };

    // 1. 주기적 감시 (10초마다)
    const intervalId = setInterval(checkServerHealth, HEALTH_CHECK_INTERVAL_MS);

    // 2. 브라우저 탭 활성화 시 즉시 확인
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkServerHealth();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname]);

  return null;
}
