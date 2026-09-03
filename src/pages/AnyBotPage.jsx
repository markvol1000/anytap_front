import { useState, useRef, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Icon } from '../components/ui.jsx';
import { apiPost } from '../lib/api/httpClient.js';
import { RichMessageRenderer } from '../components/RichMessageRenderer.jsx';
import {
  hasAdminSession,
  hasMemberSession,
  hasMockSession,
  isAdminEmail,
  getMockSessionEmail,
} from '../lib/services/authService.js';
import { hasDemoAdminAccess } from '../lib/demo-session.js';
import { getHttpSession } from '../lib/api/httpSession.js';

const QUICK_PROMPTS = [
  '서버 상태 알려줘',
  'KYC 및 가입자 현황 알려줘',
  '충전 및 환불 이력 요약해 줘',
  '최근 시스템 오류 알려줘',
];

export function AnyBotPage() {
  const location = useLocation();
  const session = getHttpSession();
  const isMemberAdmin = hasMemberSession() && session && String(session.role).toUpperCase() === 'ADMIN';

  const canAccess = hasDemoAdminAccess()
    || isMemberAdmin
    || hasAdminSession()
    || (hasMockSession() && isAdminEmail(getMockSessionEmail()));

  if (!canAccess) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `안녕하세요! AnyBot AI 어시스턴트입니다. 🤖

시스템 운영 현황, 서버 가동 상태, KYC 심사 및 거래 데이터에 대해 HTML5 표 및 다양한 시각화 요소로 답변해 드립니다.

| 🟢 시스템 구분 | 📊 가동 상태 | ⏱️ 응답 속도 | 💡 비고 |
| :--- | :--- | :--- | :--- |
| **API Server** | Normal (Healthy) | 12ms | Spring Boot ALB |
| **Database** | Normal (Active) | 4ms | MariaDB RDS |
| **Payment Gateway** | Active | 45ms | Global Payment Rails |
| **Gemini AI** | Connected | 85ms | Gemini 3.6 Flash |

궁금하신 내용이나 시스템 질문을 편하게 입력해 주세요!`,
      at: new Date().toISOString(),
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

async function generateGeminiResponse(userQuery) {
  try {
    const res = await apiPost('/admin/ai/chat', { message: userQuery });
    const answer = res?.answer || res?.data?.answer;
    if (answer) return answer;
  } catch { /* Fallback to direct Gemini API call */ }

  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
  ];

  const systemInstruction = `You are AnyBot, the intelligent AI operational assistant for the AnyTap platform. 
Format your responses utilizing HTML5 & Markdown features to their fullest potential!
1. Whenever presenting lists, statistics, status reports, server metrics, or transaction history, ALWAYS format them using Markdown Tables (| Header 1 | Header 2 |).
2. Use bold text (**text**), inline code (\`code\`), syntax-highlighted code blocks (\`\`\`html ... \`\`\`), bullet lists, and HTML5 image tags (<img src="..." />) to present information visually.
3. Respond in helpful, polite Korean (or the prompt's language).`;

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userQuery }],
      },
    ],
  };

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (e) {
      console.warn('Direct Gemini API call failed for endpoint:', url, e);
    }
  }

  return '⚠️ AnyBot AI 서비스 응답을 생성하지 못했습니다. 네트워크 연결 상태를 확인하고 잠시 후 다시 시도해 주세요.';
}

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
      const answer = await generateGeminiResponse(query);
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
        text: '⚠️ AnyBot AI 서비스 연결 중 오류가 발생했습니다.',
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
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a',
      }}>
      {/* Top Header Bar */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '18px',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
            }}>
            🤖
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '700',
                letterSpacing: '-0.02em',
                color: '#0f172a',
              }}>
              anybot
            </h1>
            <span
              style={{
                fontSize: '12px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                }}
              />
              Online • AI Assistant
            </span>
          </div>
        </div>
      </header>

      {/* Main Chat Container */}
      <div
        style={{
          flex: 1,
          maxWidth: '860px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 64px)',
          backgroundColor: '#ffffff',
        }}>
        {/* Messages List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
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
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                  maxWidth: '85%',
                }}>
                {msg.sender === 'ai' && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      flexShrink: 0,
                    }}>
                    🤖
                  </div>
                )}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    backgroundColor: msg.sender === 'user' ? '#2563eb' : '#f8fafc',
                    color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    boxShadow: msg.sender === 'user' ? '0 2px 8px rgba(37, 99, 235, 0.2)' : '0 1px 2px rgba(0,0,0,0.03)',
                  }}>
                  <RichMessageRenderer content={msg.text} />
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#64748b',
                fontSize: '13px',
                padding: '8px 4px',
              }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                }}>
                🤖
              </div>
              <span>AnyBot Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: '#ffffff',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            borderTop: '1px solid #f1f5f9',
          }}>
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={loading}
              onClick={() => handleSend(p)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontSize: '12px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                  e.currentTarget.style.borderColor = '#93c5fd';
                  e.currentTarget.style.color = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.color = '#334155';
                }
              }}>
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}>
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message to AnyBot..."
            disabled={loading}
            style={{
              flex: 1,
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              outline: 'none',
              resize: 'none',
              maxHeight: '120px',
              fontFamily: 'inherit',
              lineHeight: '1.4',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
            }}
          />
          <button
            type="button"
            disabled={!input.trim() || loading}
            onClick={() => handleSend()}
            style={{
              height: '44px',
              padding: '0 20px',
              backgroundColor: !input.trim() || loading ? '#cbd5e1' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: !input.trim() || loading ? 'none' : '0 2px 6px rgba(37, 99, 235, 0.25)',
              transition: 'background-color 0.2s ease',
            }}>
            <span>Send</span>
            <Icon name="arrowRight" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
