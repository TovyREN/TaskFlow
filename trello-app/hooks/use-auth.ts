'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { LoginInput, RegisterInput } from '@/lib/validations/auth';
import type { AuthUser } from '@/types/auth';
import { clearAuthToken } from '@/lib/utils/auth-token';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  // Charger les données utilisateur au montage du composant
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Erreur lors du chargement de l\'utilisateur:', err);
      }
    };

    loadUser();
  }, []);

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
        credentials: 'include',
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
      console.log('🔑 Token reçu:', responseData.token ? `${responseData.token.substring(0, 20)}...` : 'AUCUN');
      setUser(responseData.user);

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
        credentials: 'include',
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
      console.log('🔑 Token reçu:', responseData.token ? `${responseData.token.substring(0, 20)}...` : 'AUCUN');
      setUser(responseData.user);

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

      // Clear cookie + session server-side
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });

      // Best-effort cleanup if any legacy token exists
      clearAuthToken();
      setUser(null);
      
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
    user,
    login,
    register,
    logout,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}
