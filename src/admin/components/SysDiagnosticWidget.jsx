import { useState, useRef, useEffect } from 'react';
import { apiPost } from '../../lib/api/httpClient.js';

const QUICK_PROMPTS = [
  '서버 상태 확인',
  '실시간 서버 에러 로그 점검',
  'KYC 및 회원 가입 현황',
  '디스크 및 메모리 사용량',
];

export function SysDiagnosticWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'system',
      text: 'AnyTap 시스템 운영 진단 콘솔이 활성화되었습니다.\n\n서버 상태, 실시간 에러 로그, KYC 심사 현황, 디스크/메모리 리소스 등을 실시간으로 진단 조회하실 수 있습니다.',
      at: new Date().toISOString(),
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [messages, open]);

  const handleSend = async (promptText) => {
    const query = (promptText || input).trim();
    if (!query || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setInput('');
    setLoading(true);

    try {
      const res = await apiPost('/admin/ai/chat', { message: query });
      const answer = res?.answer || res?.data?.answer || '시스템 진단 리포트를 가져오지 못했습니다.';

      const sysMsg = {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: answer,
        at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, sysMsg]);
    } catch (err) {
      console.error('Failed to get diagnostic report:', err);
      const errorMsg = {
        id: `sys-err-${Date.now()}`,
        sender: 'system',
        text: '⚠️ 진단 서비스 연결 중 오류가 발생했습니다. 백엔드 서버 상태를 확인해 주세요.',
        at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: 'inherit' }}>
      {/* Floating Toggle Button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            borderRadius: '28px',
            backgroundColor: '#0f172a',
            color: '#38bdf8',
            border: '1px solid #334155',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.5), 0 8px 10px -6px rgba(15, 23, 42, 0.3)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}>
          <span style={{ fontSize: '16px' }}>⚡</span>
          <span>시스템 관제 진단</span>
        </button>
      )}

      {/* Floating Chat Panel */}
      {open && (
        <div
          style={{
            width: '380px',
            height: '540px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>⚡</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', lineHeight: '1.2', color: '#f8fafc' }}>System Operations Terminal</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Real-time Diagnostic Daemon</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '2px',
              }}>
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#f8fafc',
            }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: m.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  backgroundColor: m.sender === 'user' ? '#0f172a' : '#ffffff',
                  color: m.sender === 'user' ? '#f8fafc' : '#1e293b',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  boxShadow: m.sender === 'user' ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                  border: m.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                  whiteSpace: 'pre-wrap',
                }}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '12px', padding: '6px' }}>
                <span style={{ fontSize: '14px' }}>⏳</span>
                <span>시스템 진단 분석 중...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              WebkitOverflowScrolling: 'touch',
            }}>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={loading}
                onClick={() => handleSend(p)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  fontSize: '11px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                }}>
                {p}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}>
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="진단 또는 조회할 항목을 입력하세요..."
              disabled={loading}
              style={{
                flex: 1,
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
                maxHeight: '80px',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              disabled={!input.trim() || loading}
              onClick={() => handleSend()}
              style={{
                padding: '8px 14px',
                backgroundColor: !input.trim() || loading ? '#cbd5e1' : '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
              }}>
              진단
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


