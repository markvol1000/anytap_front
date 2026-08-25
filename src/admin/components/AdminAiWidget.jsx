import { useState, useRef, useEffect } from 'react';
import { Icon } from '../../components/ui.jsx';
import { apiPost } from '../../lib/api/httpClient.js';

const QUICK_PROMPTS = [
  '서버 상태 알려줘',
  '운영서버 리포트 오류 확인해 줘',
  'KYC 및 가입자 현황 알려줘',
  '충전 및 환불 이력 요약해 줘',
];

export function AdminAiWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: '안녕하세요! AnyTap 어드민 AI 어시스턴트입니다. 🤖\n\n서버 가동 상태, 최근 오류 분석, KYC 심사 및 거래 현황에 대해 자유롭게 질문해 보세요.',
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
      const answer = res?.answer || res?.data?.answer || '답변을 불러오는 데 실패했습니다.';

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: answer,
        at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Failed to get AI response:', err);
      const errorMsg = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: '⚠️ AI 서비스 연결 중 오류가 발생했습니다. 서버 연결 상태를 확인해 주세요.',
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
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '30px',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3), 0 8px 10px -6px rgba(15, 23, 42, 0.2)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}>
          <span style={{ fontSize: '18px' }}>🤖</span>
          <span>Admin AI Assistant</span>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', marginLeft: '2px' }} />
        </button>
      )}

      {/* Floating Chat Panel */}
      {open && (
        <div
          style={{
            width: '380px',
            height: '560px',
            maxHeight: 'calc(100vh - 40px)',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeInUp 0.2s ease-out',
          }}>
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🤖</span>
              <div>
                <strong style={{ display: 'block', fontSize: '14px', lineHeight: 1.2 }}>AnyTap Admin AI</strong>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Gemini Operational Assistant</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}>
              <Icon name="close" size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: '14px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#f8fafc',
            }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                }}>
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    backgroundColor: msg.sender === 'user' ? '#2563eb' : '#ffffff',
                    color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    boxShadow: msg.sender === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                  }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '12px', padding: '6px' }}>
                <span style={{ fontSize: '14px', animation: 'spin 1s infinite linear' }}>⏳</span>
                <span>Gemini AI 분석 중...</span>
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
              placeholder="질문을 입력하세요..."
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
                backgroundColor: !input.trim() || loading ? '#cbd5e1' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
              }}>
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
