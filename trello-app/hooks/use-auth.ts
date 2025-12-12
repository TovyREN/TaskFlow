'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/config/supabase';
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

      const { data: responseData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      console.log('📝 Réponse de connexion:', responseData);

      if (signInError) {
        console.error('🚨 Erreur:', signInError.message);
        setError('Email ou mot de passe incorrect');
        return false;
      }

      // Stocker le token dans les cookies pour le middleware
      if (responseData.session) {
        document.cookie = `sb-access-token=${responseData.session.access_token}; path=/; max-age=3600`;
        document.cookie = `sb-refresh-token=${responseData.session.refresh_token}; path=/; max-age=2592000`;
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

      const { data: responseData, error: signUpError } = await supabaseClient.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name || null,
          },
          emailRedirectTo: undefined,
        },
      });

      console.log('📦 Réponse inscription:', responseData);

      if (signUpError) {
        console.error('🚨 Erreur:', signUpError.message);
        setError(signUpError.message);
        return false;
      }

      if (!responseData.user) {
        console.warn('⚠️ Pas d\'utilisateur créé!');
        setError('Erreur lors de la création du compte');
        return false;
      }

      // Stocker le token dans les cookies
      if (responseData.session) {
        document.cookie = `sb-access-token=${responseData.session.access_token}; path=/; max-age=3600`;
        document.cookie = `sb-refresh-token=${responseData.session.refresh_token}; path=/; max-age=2592000`;
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
      await supabaseClient.auth.signOut();
      
      // Supprimer les cookies
      document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
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
