'use client';

import { useState, useEffect } from 'react';
import { getAuthToken, saveAuthToken, clearAuthToken } from '@/lib/utils/auth-token';

export default function AuthTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('password123');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
  };

  const testLogin = async () => {
    addLog('🔐 Test de connexion...');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      const data = await response.json();
      addLog(`Réponse: ${response.status} ${response.statusText}`);
      addLog(`Données: ${JSON.stringify(data).substring(0, 100)}...`);

      if (data.token) {
        saveAuthToken(data.token);
        addLog('✅ Token sauvegardé!');
      } else {
        addLog('❌ Pas de token dans la réponse');
      }
    } catch (error) {
      addLog(`❌ Erreur: ${error}`);
    }
  };

  const checkAuth = () => {
    const token = getAuthToken();
    addLog(`Token actuel: ${token ? `${token.substring(0, 30)}...` : 'AUCUN'}`);
    
    const cookies = document.cookie.split(';');
    const hasCookie = cookies.some(c => c.trim().startsWith('sb-access-token='));
    addLog(`Cookie présent: ${hasCookie ? 'OUI' : 'NON'}`);
    
    const lsToken = localStorage.getItem('token');
    addLog(`localStorage token: ${lsToken ? `${lsToken.substring(0, 30)}...` : 'AUCUN'}`);
  };

  const clearAuth = () => {
    clearAuthToken();
    addLog('🧹 Auth nettoyée');
  };

  useEffect(() => {
    addLog('Page de test chargée');
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Test d'Authentification</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contrôles */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Contrôles</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Mot de passe</label>
                <input
                  type="password"
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={testLogin}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Tester la connexion
                </button>
                
                <button
                  onClick={checkAuth}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Vérifier l'état
                </button>
                
                <button
                  onClick={clearAuth}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Nettoyer
                </button>
                
                <a
                  href="/boards"
                  className="block w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-center"
                >
                  Aller aux Boards
                </a>
              </div>
            </div>
          </div>
          
          {/* Logs */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Logs</h2>
              <button
                onClick={() => setLogs([])}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Effacer
              </button>
            </div>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">Aucun log...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
