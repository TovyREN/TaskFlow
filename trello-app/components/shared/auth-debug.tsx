'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '@/lib/utils/auth-token';

export function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState<{
    userLoaded: boolean;
  }>({
    userLoaded: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      // Legacy only; HttpOnly cookie auth is the source of truth.
      void getAuthToken();

      let userLoaded = false;
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        userLoaded = response.ok;
      } catch (err) {
        console.error('Auth debug error:', err);
      }

      setDebugInfo({
        userLoaded,
      });
    };

    checkAuth();
    const interval = setInterval(checkAuth, 2000);
    return () => clearInterval(interval);
  }, []);

  // En production, ne pas afficher
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg shadow-lg max-w-xs z-50">
      <div className="font-bold mb-2">🔍 Auth Debug</div>
      <div className="space-y-1">
        <div>Cookie HttpOnly: non lisible en JS</div>
        <div>User chargé: {debugInfo.userLoaded ? '✅' : '❌'}</div>
      </div>
      <div className="mt-2 pt-2 border-t border-white/20">
        <a href="/logout" className="text-blue-300 hover:text-blue-100 underline">
          Se déconnecter (fallback)
        </a>
      </div>
    </div>
  );
}
