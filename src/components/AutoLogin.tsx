import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AutoLogin() {
  const { login } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authEmail = urlParams.get('auth_email');

    if (!authEmail) return;

    console.log('[AutoLogin] Detectado auth_email:', authEmail);
    setIsChecking(true);

    async function performAutoLogin() {
      try {
        if (authEmail) {
          console.log('[AutoLogin] Tentando login com:', authEmail);
          const result = await login(authEmail);
          console.log('[AutoLogin] Resultado do login:', result);

          if (result.success) {
            // Remover o parâmetro da URL apenas se login foi bem-sucedido
            const url = new URL(window.location.href);
            url.searchParams.delete('auth_email');
            window.history.replaceState({}, '', url.pathname + url.search);
          } else {
            console.error('[AutoLogin] Login falhou:', result.message);
            // Remover parâmetro mesmo se falhou para não ficar em loop
            const url = new URL(window.location.href);
            url.searchParams.delete('auth_email');
            window.history.replaceState({}, '', url.pathname + url.search);
          }
        }
      } catch (error) {
        console.error('[AutoLogin] Erro no auto-login:', error);
      } finally {
        setIsChecking(false);
      }
    }

    performAutoLogin();
  }, [login]);

  if (!isChecking) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'white'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 16px',
          border: '4px solid #e0e0e0',
          borderTopColor: '#638CA6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ fontSize: '14px', color: '#666' }}>Autenticando...</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
