"use client";

import React from 'react';
import { validatePasswordStrength } from '../lib/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showFeedback?: boolean;
}

export default function PasswordStrengthIndicator({
  password,
  showFeedback = true
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strength = validatePasswordStrength(password);

  return (
    <div className="mt-2 space-y-1.5">
      {/* Barre de progression */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 ease-out rounded-full"
            style={{
              width: `${strength.percentage}%`,
              backgroundColor: strength.color
            }}
          />
        </div>
        <span
          className="text-xs font-medium min-w-[70px] text-right"
          style={{ color: strength.color }}
        >
          {strength.label}
        </span>
      </div>

      {/* Messages de feedback */}
      {showFeedback && strength.feedback.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-0.5">
          {strength.feedback.map((msg, i) => (
            <li key={i} className="flex items-center gap-1">
              <span className="text-gray-400">•</span>
              {msg}
            </li>
          ))}
        </ul>
      )}

      {/* Message de succès */}
      {showFeedback && strength.feedback.length === 0 && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <span>✓</span>
          Mot de passe fort !
        </p>
      )}
    </div>
  );
}
