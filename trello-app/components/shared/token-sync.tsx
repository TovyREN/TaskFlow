'use client';

import { useEffect } from 'react';

/**
 * Composant pour synchroniser le token entre les cookies et localStorage
 * Doit être utilisé dans le layout racine
 */
export function TokenSync() {
  useEffect(() => {
    const syncToken = () => {
      // Synchroniser le token depuis le cookie vers localStorage
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(c => c.trim().startsWith('sb-access-token='));
      
      if (tokenCookie) {
        const token = tokenCookie.split('=')[1];
        const currentToken = localStorage.getItem('token');
        
        // Mettre à jour si différent
        if (currentToken !== token) {
          console.log('🔄 Synchronisation du token depuis le cookie');
          localStorage.setItem('token', token);
          // Déclencher un événement pour informer les autres composants
          window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: { token } }));
        }
      } else {
        // Pas de cookie, vérifier si on doit nettoyer localStorage
        const currentToken = localStorage.getItem('token');
        if (currentToken) {
          console.log('🧹 Nettoyage du token obsolète');
          localStorage.removeItem('token');
        }
      }
    };

    // Synchroniser immédiatement
    syncToken();
    
    // Puis périodiquement toutes les secondes
    const interval = setInterval(syncToken, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return null;
}
