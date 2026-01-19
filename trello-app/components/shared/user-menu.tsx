'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  bio: string | null;
  contactInfo: string | null;
}

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Charger les données utilisateur
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Cookie auth: le navigateur enverra automatiquement sb-access-token
        const response = await fetch('/api/auth/me', { credentials: 'include' });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Erreur lors du chargement de l\'utilisateur:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();

    return () => {};
  }, []);

  // Fermer le menu si on clique à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setIsOpen(false);
    router.push('/profile');
  };

  const handleLogout = async () => {
    setIsOpen(false);
    setUser(null);
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {
      // ignore
    });
    router.push('/auth/login');
    router.refresh();
  };

  // Afficher un placeholder pendant le chargement
  if (isLoading) {
    return (
      <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
    );
  }

  // Si pas d'utilisateur, afficher un bouton de connexion
  if (!user) {
    return (
      <a
        href="/auth/login"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium inline-block"
      >
        Se connecter
      </a>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border border-gray-200"
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name || user.email}
            className="h-6 w-6 rounded-full object-cover"
          />
        ) : (
          <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden sm:inline">{user.name || user.email}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {/* Info utilisateur */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{user.name || 'Utilisateur'}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>

            {/* Mon Profil */}
            <button
              onClick={handleProfileClick}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Mon Profil
            </button>

            {/* Déconnexion */}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
