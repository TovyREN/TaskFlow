import React, { useState } from 'react';
import { Layout, UserPlus, ArrowLeft } from 'lucide-react';

interface RegisterProps {
  onRegister: (name: string, email: string, password: string) => void;
  onSwitchToLogin: () => void;
  error?: string | null;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onSwitchToLogin, error }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && password) {
      onRegister(name, email, password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="mb-6">
             <button onClick={onSwitchToLogin} className="flex items-center text-sm text-slate-500 hover:text-slate-800 transition-colors">
                 <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
             </button>
        </div>

        <div className="flex justify-center mb-4">
          <div className="p-3 bg-indigo-100 rounded-full">
            <Layout className="w-10 h-10 text-indigo-600" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">Create Account</h2>
        <p className="text-center text-slate-500 mb-8">Join TaskFlow to organize your life.</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
           <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              id="name"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              id="email"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              id="password"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Create Account</span>
            <UserPlus className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;