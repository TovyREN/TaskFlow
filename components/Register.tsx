"use client";

import React, { useState } from 'react';
import { User } from '../types';
import { registerUser } from '../app/actions/authActions';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { meetsMinimumRequirements } from '../lib/passwordValidation';
import { ArrowLeft } from 'lucide-react';

interface RegisterProps {
  onSwitchToLogin: () => void;
  onRegisterSuccess: (user: User) => void;
  onBack?: () => void;
}

export default function Register({ onSwitchToLogin, onRegisterSuccess, onBack }: RegisterProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordError(null);

    // Validate password strength
    if (!meetsMinimumRequirements(formData.password)) {
      setPasswordError('Le mot de passe ne répond pas aux exigences minimales');
      return;
    }

    setIsPending(true);

    const result = await registerUser(formData.name, formData.email, formData.password);

    if (result.success && result.user) {
      onRegisterSuccess(result.user);
    } else {
      setError(result.error || "Registration failed");
    }

    setIsPending(false);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-96 animate-fade-in">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        )}
        <h2 className="text-2xl font-bold mb-6 text-center text-slate-800">Create Account</h2>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-600 text-sm rounded border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
            disabled={isPending}
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
            disabled={isPending}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="Mot de passe"
              className={`w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 ${
                passwordError ? 'border-red-500' : ''
              }`}
              value={formData.password}
              onChange={(e) => {
                setFormData({...formData, password: e.target.value});
                setPasswordError(null);
              }}
              required
              disabled={isPending}
            />
            <PasswordStrengthIndicator
              password={formData.password}
              showFeedback={true}
            />
            {passwordError && (
              <p className="text-xs text-red-600 mt-1">{passwordError}</p>
            )}
          </div>
          <button 
            type="submit" 
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
            disabled={isPending}
          >
            {isPending ? 'Creating Account...' : 'Sign Up'}
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <button type="button" onClick={onSwitchToLogin} className="text-indigo-600 hover:underline">
            Log In
          </button>
        </p>
      </form>
    </div>
  );
}