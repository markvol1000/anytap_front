import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL, isHttpApi } from '../lib/api/config.js';
import { forceLogoutAndRedirect } from '../lib/api/httpClient.js';
import { hasMemberSession } from '../lib/services/authService.js';

const HEALTH_CHECK_INTERVAL_MS = 15000; // 15초마다 서버 생존 여부 확인

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const baseUrl = (API_BASE_URL || '').replace(/\/$/, '');
        const pingUrl = baseUrl.endsWith('/api/v1')
          ? `${baseUrl}/common/regions`
          : `${baseUrl}/api/v1/common/regions`;

        const res = await fetch(pingUrl, {
          method: 'GET',
          signal: controller.signal,
        });

        // 502, 503, 504 등 게이트웨이 다운 상태일 때만 서버 다운으로 판단
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          if (isMounted && hasMemberSession()) {
            console.warn('[ServerHealthGuard] Server down (HTTP ' + res.status + '). Evacuating to login...');
            forceLogoutAndRedirect('server_unreachable');
          }
        }
        // 응답이 온 경우(200, 400 등)는 서버가 정상 작동 중이므로 로그인 유지!
      } catch (err) {
        // 서버 프로세스가 종료되어 연결 거부(ERR_CONNECTION_REFUSED) 또는 타임아웃된 경우
        if (isMounted && hasMemberSession()) {
          console.warn('[ServerHealthGuard] Server unreachable. Evacuating to login...', err);
          forceLogoutAndRedirect('server_unreachable');
        }
      } finally {
        clearTimeout(timeoutId);
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
