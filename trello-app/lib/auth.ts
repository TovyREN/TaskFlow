import bcrypt from 'bcryptjs';
import { userDb, sessionDb } from '@/db/db-helpers';
import type { User } from '@/db/db-helpers';
import { generateToken, verifyToken } from './jwt';

const SESSION_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Ré-exporter pour compatibilité
export { generateToken, verifyToken };

// Nouvelles fonctions pour gérer l'authentification avec SQLite
export async function registerUser(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
  // Vérifier si l'utilisateur existe déjà
  const existingUser = userDb.findByEmail(email);
  if (existingUser) {
    throw new Error('Un utilisateur avec cet email existe déjà');
  }

  // Hasher le mot de passe
  const passwordHash = await hashPassword(password);

  // Créer l'utilisateur
  const user = userDb.create(email, passwordHash, name);

  // Générer un token
  const token = generateToken(user.id);

  // Créer une session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  sessionDb.create(user.id, token, expiresAt);

  return { user, token };
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  // Trouver l'utilisateur
  const user = userDb.findByEmail(email);
  if (!user) {
    throw new Error('Email ou mot de passe incorrect');
  }

  // Vérifier le mot de passe
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Email ou mot de passe incorrect');
  }

  // Générer un token
  const token = generateToken(user.id);

  // Créer une session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  sessionDb.create(user.id, token, expiresAt);

  // Retourner l'utilisateur sans le hash du mot de passe
  const { passwordHash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
}

export function getUserFromToken(token: string): User | null {
  // Vérifier le token JWT
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  // Vérifier la session en base
  const session = sessionDb.findByToken(token);
  if (!session) {
    return null;
  }

  // Vérifier que la session n'est pas expirée
  if (session.expiresAt < new Date()) {
    sessionDb.deleteByToken(token);
    return null;
  }

  // Récupérer l'utilisateur
  return userDb.findById(payload.userId);
}

export function logoutUser(token: string): void {
  sessionDb.deleteByToken(token);
}

export function cleanupExpiredSessions(): void {
  sessionDb.deleteExpired();
}
