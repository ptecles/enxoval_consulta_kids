import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    if (type === 'success') {
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      showMessage('Por favor, digite seu email.', 'error');
      return;
    }

    if (!trimmedEmail.includes('@')) {
      showMessage('Por favor, digite um email válido.', 'error');
      return;
    }

    setMessage(null);
    setLoading(true);

    try {
      const result = await login(trimmedEmail);

      if (result.success) {
        showMessage('Acesso autorizado! Redirecionando...', 'success');
      } else {
        showMessage(
          result.message || 'Email não encontrado. Entre em contato com o suporte.',
          'error'
        );
      }
    } catch (error) {
      showMessage('Erro de conexão. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      backgroundColor: 'white',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <style>{`
        @keyframes loginSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loginSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes loginPulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        .login-input:focus {
          border-color: #638ca6 !important;
          box-shadow: 0 0 0 3px rgba(99, 140, 166, 0.15) !important;
          outline: none;
          background: white !important;
        }
        .login-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .login-btn:hover:not(:disabled) {
          background-color: #527a94 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(99, 140, 166, 0.4) !important;
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>

      {/* Header igual ao site */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '32px',
        animation: 'loginSlideUp 0.5s ease-out'
      }}>
        <img
          src="https://enxovalinteligente.com.br/wp-content/uploads/2026/02/depois_do_enxoval_transparente.png"
          alt="Depois do Enxoval"
          style={{ height: '70px', width: 'auto', objectFit: 'contain' }}
        />
      </div>

      {/* Card de login */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(99, 140, 166, 0.12), 0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f2b88a',
        width: '100%',
        maxWidth: '480px',
        overflow: 'hidden',
        animation: 'loginSlideUp 0.5s ease-out 0.1s both'
      }}>

        {/* Topo do card */}
        <div style={{
          background: 'linear-gradient(135deg, #638ca6 0%, #527a94 100%)',
          padding: '32px 36px 28px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '22px'
          }}>
            🔒
          </div>
          <h2 style={{
            margin: '0 0 8px',
            color: 'white',
            fontSize: '20px',
            fontWeight: '600',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '-0.3px'
          }}>
            Área exclusiva
          </h2>
          <p style={{
            margin: 0,
            color: 'rgba(255,255,255,0.85)',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.5
          }}>
            Use o e-mail cadastrado na Hotmart para acessar
          </p>
        </div>

        {/* Formulário */}
        <div style={{ padding: '32px 36px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#444',
                  fontFamily: 'Inter, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                E-mail
              </label>
              <input
                className="login-input"
                type="email"
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                autoFocus
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  border: '1.5px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  transition: 'all 0.25s ease',
                  background: '#fafafa',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  color: '#333'
                }}
              />
            </div>

            <button
              className="login-btn"
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: '#638ca6',
                color: 'white',
                border: 'none',
                padding: '14px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.2px',
                boxShadow: '0 2px 8px rgba(99, 140, 166, 0.25)'
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'loginSpin 0.8s linear infinite'
                  }} />
                  Verificando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          {/* Mensagem de feedback */}
          {message && (
            <div style={{
              padding: '13px 16px',
              borderRadius: '10px',
              marginTop: '18px',
              textAlign: 'center',
              fontWeight: '500',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.5,
              background: message.type === 'success'
                ? 'rgba(40, 167, 69, 0.08)'
                : 'rgba(230, 126, 64, 0.08)',
              border: message.type === 'success'
                ? '1px solid rgba(40, 167, 69, 0.25)'
                : '1px solid rgba(230, 126, 64, 0.35)',
              color: message.type === 'success' ? '#28a745' : '#c05a1a'
            }}>
              {message.type === 'error' ? '⚠️ ' : '✅ '}{message.text}
            </div>
          )}
        </div>

        {/* Rodapé do card */}
        <div style={{
          padding: '16px 36px 20px',
          borderTop: '1px solid #f2b88a',
          textAlign: 'center'
        }}>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: '#999',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.5
          }}>
            Acesso restrito às alunas do Depois do Enxoval
          </p>
        </div>
      </div>

      {/* Copyright igual ao footer do site */}
      <p style={{
        marginTop: '28px',
        fontSize: '12px',
        color: '#aaa',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center'
      }}>
        Copyright © 2025 Inc. Todos os direitos reservados. Edufe Digital CNPJ: 48.796.931/0001-74
      </p>
    </div>
  );
};

export default Login;
