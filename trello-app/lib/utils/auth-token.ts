/**
 * Récupère le token d'authentification de manière fiable
 * Cherche d'abord dans localStorage, puis dans les cookies
 */
export function getAuthToken(): string | null {
  // Vérifier localStorage
  let token = localStorage.getItem('token');
  
  // Si pas de token, chercher dans les cookies
  if (!token && typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(c => c.trim().startsWith('sb-access-token='));
    
    if (tokenCookie) {
      token = tokenCookie.split('=')[1];
      // Sauvegarder dans localStorage pour la prochaine fois
      localStorage.setItem('token', token);
    }
  }
  
  return token;
}

/**
 * Supprime le token d'authentification de localStorage et des cookies
 */
export function clearAuthToken(): void {
  localStorage.removeItem('token');
  
  if (typeof document !== 'undefined') {
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

/**
 * Sauvegarde le token d'authentification
 */
export function saveAuthToken(token: string): void {
  localStorage.setItem('token', token);
}
