export interface PasswordStrength {
  score: number; // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  percentage: number;
  feedback: string[];
}

export function validatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) {
    score++;
  } else {
    feedback.push('Au moins 8 caractères requis');
  }

  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push('Ajouter des majuscules');
  }

  if (/[a-z]/.test(password)) {
    score++;
  } else {
    feedback.push('Ajouter des minuscules');
  }

  if (/\d/.test(password)) {
    score++;
  } else {
    feedback.push('Ajouter des chiffres');
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score++;
  } else {
    feedback.push('Ajouter des caractères spéciaux (!@#$...)');
  }

  // Mapping score vers label/couleur
  const strengthMap = {
    0: { label: 'Very Weak' as const, color: '#ef4444', percentage: 0 },
    1: { label: 'Weak' as const, color: '#f97316', percentage: 25 },
    2: { label: 'Fair' as const, color: '#eab308', percentage: 50 },
    3: { label: 'Good' as const, color: '#22c55e', percentage: 75 },
    4: { label: 'Strong' as const, color: '#16a34a', percentage: 100 },
  };

  const mappedScore = Math.min(score, 4) as keyof typeof strengthMap;
  const { label, color, percentage } = strengthMap[mappedScore];

  return { score, label, color, percentage, feedback };
}

export function meetsMinimumRequirements(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  );
}
