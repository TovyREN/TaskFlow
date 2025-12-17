'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RegisterPage() {
  const { register: registerUser, isLoading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterInput) => {
    await registerUser(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Créer un compte
          </h1>
          <p className="text-gray-600">
            Rejoignez Trello et organisez vos projets
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Error Alert */}
            {error && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Name Input */}
            <div>
              <Input
                label="Nom complet (optionnel)"
                type="text"
                placeholder="Jean Dupont"
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            {/* Email Input */}
            <div>
              <Input
                label="Email"
                type="email"
                placeholder="nom@exemple.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showPassword ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Au moins 6 caractères"
                error={errors.password?.message}
                {...register('password')}
              />
              
              {/* Password Strength Indicator */}
              {password && password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    <div
                      className={`h-1 flex-1 rounded ${
                        password.length >= 6 ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                    <div
                      className={`h-1 flex-1 rounded ${
                        password.length >= 8 && /[A-Z]/.test(password)
                          ? 'bg-green-500'
                          : 'bg-gray-200'
                      }`}
                    />
                    <div
                      className={`h-1 flex-1 rounded ${
                        password.length >= 10 &&
                        /[A-Z]/.test(password) &&
                        /[0-9]/.test(password)
                          ? 'bg-green-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {password.length < 6
                      ? 'Faible'
                      : password.length < 8
                      ? 'Moyen'
                      : 'Fort'}
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Créer mon compte
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">OU</span>
            </div>
          </div>

          {/* Login Link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Vous avez déjà un compte ?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
