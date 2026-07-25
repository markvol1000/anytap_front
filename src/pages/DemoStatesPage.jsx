import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  DEMO_GROUPS,
  demoEnterPath,
  demoLoginPrefillPath,
  demoStatesByGroup,
  getDemoStateBySlug,
} from '../lib/demo-states.js';
import {
  clearAdminSession,
  clearMockSession,
  establishLoginSession,
  hasMemberSession,
  setAdminSession,
  setMockSession,
} from '../lib/services/authService.js';
import { isHttpApi } from '../lib/api/config.js';
import {
  clearDemoAdminAccess,
  enableDemoAdminAccess,
  setActiveDemoSlug,
  startDemoMemberPreview,
} from '../lib/demo-session.js';

function DemoStateCard({ state, origin }) {
  const enter = `${origin}${demoEnterPath(state.slug)}`;
  return (
    <li
      style={{
        border: '1px solid var(--border-default, rgba(26,26,26,.1))',
        borderRadius: 12,
        padding: '14px 16px',
        background: 'var(--paper, #fff)',
      }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: 15 }}>{state.label}</strong>
        <Link to={demoEnterPath(state.slug)} className="btn btn--accent btn--sm">
          Open
        </Link>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--fg-muted, #6b6057)' }}>{state.note}</p>
      {state.path && state.path !== '/account' ? (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--fg-subtle)' }}>
          → <code>{state.path}</code>
        </p>
      ) : null}
      {state.apiNeeds?.length ? (
        <div style={{ marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--fg-subtle)' }}>
            API needs
          </p>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--ink, #1a1a1a)', lineHeight: 1.45 }}>
            {state.apiNeeds.map((need) => (
              <li key={need} style={{ marginBottom: 2 }}>
                <code style={{ fontSize: 11 }}>{need}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {state.group !== 'admin' ? (
        <>
          <p style={{ margin: '10px 0 0', fontSize: 12, wordBreak: 'break-all' }}>
            <span style={{ color: 'var(--fg-subtle)' }}>email </span>
            {state.email}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, wordBreak: 'break-all', color: 'var(--fg-subtle)' }}>
            {enter}
          </p>
        </>
      ) : (
        <p style={{ margin: '10px 0 0', fontSize: 11, wordBreak: 'break-all', color: 'var(--fg-subtle)' }}>
          {enter}
        </p>
      )}
    </li>
  );
}

export function DemoStatesPage() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <section className="login-screen" style={{ paddingBottom: 48 }}>
      <div className="shell login-screen__inner" style={{ maxWidth: 640 }}>
        <p className="verify-inbox__eyebrow">Preview · member states</p>
        <h1 className="login-screen__title">상태·페이지 바로가기</h1>
        <p className="login-screen__lede">
          링크를 열면 로그인 없이 해당 화면으로 바로 이동합니다. (UI 미리보기용 · API 데이터는 비어 있을 수 있음)
          페이지 항목의 <strong>API needs</strong>가 백엔드에 필요한 정보입니다.
        </p>
        {!isHttpApi && (
          <p className="login-screen__hint" style={{ marginBottom: 16 }}>
            지금 Mock 모드입니다. HTTP API(`VITE_API_MODE=http`)에서 시드 계정이 동작합니다.
          </p>
        )}

        {DEMO_GROUPS.map((group) => {
          const items = demoStatesByGroup(group.id);
          if (!items.length) return null;
          return (
            <div key={group.id} style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>{group.title}</h2>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--fg-muted)' }}>{group.lede}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                {items.map((state) => (
                  <DemoStateCard key={state.slug} state={state} origin={origin} />
                ))}
              </ul>
            </div>
          );
        })}

        <p className="login-screen__alt" style={{ marginTop: 28 }}>
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </section>
  );
}

function demoPathWithSlug(path, slug) {
  const base = path || '/account';
  const join = base.includes('?') ? '&' : '?';
  return `${base}${join}demo=${encodeURIComponent(slug)}`;
}

export function DemoStateEnterPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const state = getDemoStateBySlug(slug);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!state) {
      setError('Unknown state slug.');
      return;
    }

    clearDemoAdminAccess();

    // Admin preview: skip API/login — open /admin screens directly.
    if (state.group === 'admin') {
      clearMockSession();
      clearAdminSession();
      enableDemoAdminAccess(state.slug);
      try {
        setMockSession(state.email);
        setAdminSession(state.email);
        establishLoginSession(state.email);
      } catch { /* http stubs may no-op */ }
      navigate(state.path || '/admin', { replace: true });
      return;
    }

    // Member preview: overwrite session (do not clear first — avoids Strict Mode race
    // that wiped the demo session on mobile before /account mounted).
    if (isHttpApi) {
      startDemoMemberPreview(state);
    } else {
      clearMockSession();
      setMockSession(state.email);
      establishLoginSession(state.email);
      setActiveDemoSlug(state.slug);
    }

    if (!hasMemberSession()) {
      setError('Session could not be saved. Allow site data / disable private mode, then retry.');
      return;
    }
    navigate(demoPathWithSlug(state.path, state.slug), { replace: true });
  }, [state, navigate]);

  if (!state) {
    return (
      <section className="login-screen">
        <div className="shell login-screen__inner">
          <h1 className="login-screen__title">Not found</h1>
          <p className="login-screen__lede">{error || 'Unknown demo state.'}</p>
          <Link to="/demo/states">Back to state list</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="login-screen">
      <div className="shell login-screen__inner">
        <p className="verify-inbox__eyebrow">Demo preview</p>
        <h1 className="login-screen__title">{state.label}</h1>
        <p className="login-screen__lede">
          {error || 'Opening preview…'}
        </p>
        {error ? (
          <p style={{ marginTop: 16 }}>
            <Link to={demoLoginPrefillPath(state.email)}>Open login form</Link>
            {' · '}
            <Link to="/demo/states">All states</Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
