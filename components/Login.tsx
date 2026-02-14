"use client";

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { loginUser } from '../app/actions/authActions';
import { ArrowLeft } from 'lucide-react';
import GoogleLoginButton from './GoogleLoginButton';

interface LoginProps {
  onLogin: (user: User) => void;
  onBack?: () => void;
}

export default function Login({ onLogin, onBack }: LoginProps) {
  useEffect(() => {
    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    // Call login with both email AND password
    const result = await loginUser(formData.email, formData.password);

    if (result.success && result.user) {
      onLogin(result.user);
    } else {
      setError(result.error || "Something went wrong");
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
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">TaskFlow Login</h2>
          
          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-600 text-sm rounded border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                disabled={isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                disabled={isPending}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isPending}
              className={`w-full py-2 rounded text-white font-medium transition-colors ${
                isPending ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isPending ? 'Checking...' : 'Sign In'}
            </button>
          </div>

          <GoogleLoginButton 
            onLogin={onLogin} 
            onError={(error) => setError(error)}
            disabled={isPending}
          />
        </form>
      </div>
    );
  }