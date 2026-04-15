import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AutoLogin() {
  const { login } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authEmail = urlParams.get('auth_email');

    if (!authEmail) return;

    setIsChecking(true);

    async function performAutoLogin() {
      try {
        if (authEmail) {
          await login(authEmail);

          // Remover o parâmetro da URL
          const url = new URL(window.location.href);
          url.searchParams.delete('auth_email');
          window.history.replaceState({}, '', url.pathname + url.search);
        }
      } catch (error) {
        console.error('Auto-login failed:', error);
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
