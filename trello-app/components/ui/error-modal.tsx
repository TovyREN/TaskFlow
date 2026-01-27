'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Modal } from './modal';
import { Button } from './button';

interface ErrorModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'error' | 'unauthorized' | 'readonly';
}

interface ErrorModalContextType {
  showError: (title: string, message: string, type?: 'error' | 'unauthorized' | 'readonly') => void;
  showUnauthorized: (message?: string) => void;
  showReadonlyError: () => void;
  closeError: () => void;
}

const ErrorModalContext = createContext<ErrorModalContextType | null>(null);

export function useErrorModal() {
  const context = useContext(ErrorModalContext);
  if (!context) {
    throw new Error('useErrorModal must be used within an ErrorModalProvider');
  }
  return context;
}

interface ErrorModalProviderProps {
  children: ReactNode;
}

export function ErrorModalProvider({ children }: ErrorModalProviderProps) {
  const [state, setState] = useState<ErrorModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  });

  const showError = useCallback((title: string, message: string, type: 'error' | 'unauthorized' | 'readonly' = 'error') => {
    setState({ isOpen: true, title, message, type });
  }, []);

  const showUnauthorized = useCallback((message?: string) => {
    setState({
      isOpen: true,
      title: 'Action non autorisée',
      message: message || "Vous n'avez pas la permission d'effectuer cette action.",
      type: 'unauthorized',
    });
  }, []);

  const showReadonlyError = useCallback(() => {
    setState({
      isOpen: true,
      title: 'Accès en lecture seule',
      message: "Vous avez un accès en lecture seule sur ce board. Vous ne pouvez pas modifier son contenu. Contactez un administrateur si vous avez besoin de droits supplémentaires.",
      type: 'readonly',
    });
  }, []);

  const closeError = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const iconColors = {
    error: 'text-red-600 bg-red-100',
    unauthorized: 'text-orange-600 bg-orange-100',
    readonly: 'text-yellow-600 bg-yellow-100',
  };

  const icons = {
    error: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    unauthorized: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    readonly: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  };

  return (
    <ErrorModalContext.Provider value={{ showError, showUnauthorized, showReadonlyError, closeError }}>
      {children}
      
      <Modal isOpen={state.isOpen} onClose={closeError} size="sm">
        <div className="flex flex-col items-center text-center">
          <div className={`p-3 rounded-full ${iconColors[state.type]} mb-4`}>
            {icons[state.type]}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{state.title}</h3>
          <p className="text-sm text-gray-600 mb-6">{state.message}</p>
          
          <Button
            className="w-full"
            onClick={closeError}
          >
            Compris
          </Button>
        </div>
      </Modal>
    </ErrorModalContext.Provider>
  );
}
