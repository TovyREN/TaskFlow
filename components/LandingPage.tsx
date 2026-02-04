"use client";

import React from 'react';
import { Layout, Zap, Users } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export default function LandingPage({ onLoginClick, onRegisterClick }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex flex-col font-sans text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 font-bold text-2xl tracking-tight">
          <Layout className="w-8 h-8" />
          <span>TaskFlow</span>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={onLoginClick}
            className="text-white hover:underline font-medium"
          >
            Log in
          </button>
          <button 
            onClick={onRegisterClick}
            className="bg-white text-indigo-600 px-5 py-2 rounded font-bold hover:bg-gray-100 transition-colors shadow-sm"
          >
            Register
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight max-w-4xl">
          TaskFlow brings all your tasks, teammates, and tools together
        </h1>
        <p className="text-lg md:text-xl mb-10 max-w-2xl text-indigo-100">
          Keep everything in the same place—even if your team isn’t.
        </p>

        <form className="flex flex-col sm:flex-row gap-3 w-full max-w-md mb-8" onSubmit={(e) => { e.preventDefault(); onRegisterClick(); }}>
          <button 
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded font-semibold transition-colors flex items-center justify-center gap-2"
          >
            Register Now
          </button>
        </form>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-12 max-w-5xl text-left">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
            <Layout className="w-10 h-10 mb-4 text-blue-300" />
            <h3 className="text-xl font-bold mb-2">Boards & Lists</h3>
            <p className="text-indigo-100 text-sm">Organize projects of any size with our intuitive drag-and-drop interface.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
            <Zap className="w-10 h-10 mb-4 text-yellow-300" />
            <h3 className="text-xl font-bold mb-2">Automation</h3>
            <p className="text-indigo-100 text-sm">Let our AI handle the busy work so you can focus on what matters.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
            <Users className="w-10 h-10 mb-4 text-green-300" />
            <h3 className="text-xl font-bold mb-2">Teamwork</h3>
            <p className="text-indigo-100 text-sm">Collaborate in real-time with comments, assignments, and file attachments.</p>
          </div>
        </div>
      </main>
    </div>
  );
}