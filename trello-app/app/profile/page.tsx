'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    avatar: '',
    bio: '',
    contactInfo: '',
  });

  useEffect(() => {
    if (authUser) {
      setFormData({
        name: authUser.name || '',
        avatar: authUser.avatar || '',
        bio: authUser.bio || '',
        contactInfo: authUser.contactInfo || '',
      });
    }
  }, [authUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      setSuccess('Profil mis à jour avec succès');

      // Rafraîchir les données server/client
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/boards')}
            >
              Retour aux boards
            </Button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (lecture seule) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={authUser.email}
                disabled
                className="mt-1 bg-gray-100"
              />
            </div>

            {/* Nom d'affichage */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nom d'affichage
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Votre nom"
                className="mt-1"
              />
            </div>

            {/* Avatar URL */}
            <div>
              <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">
                Avatar (URL)
              </label>
              <Input
                id="avatar"
                name="avatar"
                type="url"
                value={formData.avatar}
                onChange={handleChange}
                placeholder="https://exemple.com/avatar.jpg"
                className="mt-1"
              />
              {formData.avatar && (
                <div className="mt-2">
                  <img 
                    src={formData.avatar} 
                    alt="Aperçu de l'avatar" 
                    className="w-16 h-16 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                Bio / Description
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Parlez-nous de vous..."
                rows={4}
                maxLength={500}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                {formData.bio.length}/500 caractères
              </p>
            </div>

            {/* Informations de contact */}
            <div>
              <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700">
                Informations de contact
              </label>
              <Input
                id="contactInfo"
                name="contactInfo"
                type="text"
                value={formData.contactInfo}
                onChange={handleChange}
                placeholder="Téléphone, LinkedIn, etc."
                className="mt-1"
              />
            </div>

            {/* Messages d'erreur et de succès */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            {/* Bouton de soumission */}
            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour le profil'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
