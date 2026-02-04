"use client";

import React from 'react';
import { User } from '../types';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
          <span className="text-white font-bold">T</span>
        </div>
        <h1 className="text-xl font-bold text-gray-800">TaskFlow</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
            {user.name.charAt(0)}
          </div>
          <span className="text-sm font-medium text-gray-700">{user.name}</span>
        </div>
        <button 
          onClick={onLogout}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}