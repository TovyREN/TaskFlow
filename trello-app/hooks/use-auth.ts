'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LoginInput, RegisterInput } from '@/lib/validations/auth';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const login = async (data: LoginInput) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔐 Tentative de connexion avec:', data.email);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      console.log('📝 Réponse de connexion:', responseData);

      if (!response.ok) {
        console.error('🚨 Erreur:', responseData.error);
        setError(responseData.error || 'Email ou mot de passe incorrect');
        return false;
      }

      console.log('✅ Connexion réussie! User ID:', responseData.user?.id);

      router.push('/boards');
      router.refresh();
      return true;
    } catch (err) {
      console.error('💥 Erreur inattendue:', err);
      setError('Une erreur inattendue est survenue');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterInput) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📝 Inscription:', { email: data.email, name: data.name });

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      console.log('📦 Réponse inscription:', responseData);

      if (!response.ok) {
        console.error('🚨 Erreur:', responseData.error);
        setError(responseData.error);
        return false;
      }

      if (!responseData.user) {
        console.warn('⚠️ Pas d\'utilisateur créé!');
        setError('Erreur lors de la création du compte');
        return false;
      }

      console.log('✅ Compte créé! User ID:', responseData.user.id);

      router.push('/boards');
      router.refresh();
      return true;
    } catch (err) {
      console.error('💥 Erreur inattendue:', err);
      setError('Une erreur inattendue est survenue');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      console.log('👋 Déconnexion...');
      
      // Supprimer les cookies
      document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      console.log('✅ Déconnexion réussie');
      router.push('/auth/login');
      router.refresh();
    } catch (err) {
      console.error('💥 Erreur déconnexion:', err);
      setError('Erreur lors de la déconnexion');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    register,
    logout,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}
