'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Déconnecter l'utilisateur (côté serveur pour effacer le cookie HttpOnly)
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {
      // ignore
    });
    
    // Rediriger après un court délai
    setTimeout(() => {
      router.push('/auth/login');
      router.refresh();
    }, 1000);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Déconnexion en cours...</h1>
        <p className="mt-2 text-gray-600">Vous allez être redirigé vers la page de connexion.</p>
      </div>
    </div>
  );
}
