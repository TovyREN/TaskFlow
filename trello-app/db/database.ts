import Database from 'better-sqlite3';
import { join } from 'path';
import { readFileSync } from 'fs';

const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'trello.db');

// Créer ou ouvrir la base de données
const db = new Database(dbPath, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Activer les foreign keys
db.pragma('foreign_keys = ON');

// Fonction pour initialiser la base de données
export function initDatabase() {
  const schemaPath = join(process.cwd(), 'db', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Exécuter le schéma
  db.exec(schema);

  console.log('Database initialized successfully');
}

// Fonction pour générer un CUID simple
export function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomStr}`;
}

// Fonction utilitaire pour convertir les timestamps Unix en Date
export function timestampToDate(timestamp: number | null): Date | null {
  return timestamp ? new Date(timestamp * 1000) : null;
}

// Fonction utilitaire pour convertir Date en timestamp Unix
export function dateToTimestamp(date: Date | null): number | null {
  return date ? Math.floor(date.getTime() / 1000) : null;
}

// Fermer la connexion lors de l'arrêt du process
process.on('exit', () => db.close());
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});

export default db;
