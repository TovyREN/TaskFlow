import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

function findTrelloAppRoot(startDir: string): string {
  // Walk up to find a directory containing db/schema.sql.
  let current = startDir;
  for (let i = 0; i < 15; i++) {
    const schemaAtCurrent = join(current, 'db', 'schema.sql');
    if (existsSync(schemaAtCurrent)) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // Monorepo fallback: repoRoot/trello-app/db/schema.sql
  const monorepoCandidate = join(startDir, 'trello-app');
  if (existsSync(join(monorepoCandidate, 'db', 'schema.sql'))) {
    return monorepoCandidate;
  }

  // Last resort: use cwd (keeps previous behavior).
  return startDir;
}

const appRoot = findTrelloAppRoot(process.cwd());

// Résoudre le chemin DB de manière robuste
function resolveDbPathFinal(): string {
  const envPath = process.env.DATABASE_PATH;
  
  // Si DATABASE_PATH est défini ET est un chemin absolu, l'utiliser
  if (envPath && (envPath.startsWith('/') || /^[a-zA-Z]:[\\\/]/.test(envPath))) {
    return envPath;
  }
  
  // Sinon, toujours utiliser appRoot/trello.db (chemin absolu)
  return join(appRoot, 'trello.db');
}

const dbPath = resolveDbPathFinal();

if (process.env.NODE_ENV === 'development') {
  // Useful to diagnose monorepo root/cwd issues.
  console.log('[db] cwd=', process.cwd());
  console.log('[db] appRoot=', appRoot);
  console.log('[db] dbPath=', dbPath);
  console.log('[db] DATABASE_PATH env=', process.env.DATABASE_PATH || 'non défini');
}

// Créer ou ouvrir la base de données
const db = new Database(dbPath, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Activer les foreign keys
db.pragma('foreign_keys = ON');

// Fonction pour initialiser la base de données
export function initDatabase() {
  const schemaPath = join(appRoot, 'db', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Exécuter le schéma
  db.exec(schema);

  // Migrations légères (pour les DB déjà existantes)
  migrateExistingDatabase();

  console.log('Database initialized successfully');
}

export function getDatabaseDebugInfo() {
  return {
    cwd: process.cwd(),
    appRoot,
    dbPath,
    databasePathEnv: process.env.DATABASE_PATH || null,
    dbPathIsAbsolute: dbPath.startsWith('/') || /^[a-zA-Z]:[\\\/]/.test(dbPath),
  };
}

function migrateExistingDatabase() {
  // users.bio / users.contact_info ont été ajoutés après les premières versions.
  // CREATE TABLE IF NOT EXISTS ne modifie pas une table existante, donc on ALTER si nécessaire.
  try {
    const userColumns = db
      .prepare("PRAGMA table_info('users')")
      .all() as Array<{ name: string }>;

    const columnNames = new Set(userColumns.map(c => c.name));

    if (!columnNames.has('bio')) {
      db.exec('ALTER TABLE users ADD COLUMN bio TEXT');
    }

    if (!columnNames.has('contact_info')) {
      db.exec('ALTER TABLE users ADD COLUMN contact_info TEXT');
    }

    // Ajouter la colonne status à board_members si elle n'existe pas
    const membersCols = db.prepare('PRAGMA table_info(board_members)').all() as Array<{ name: string }>;
    const membersColumnNames = new Set(membersCols.map(c => c.name));
    
    if (!membersColumnNames.has('status')) {
      // Ajouter la colonne avec défaut 'accepted' pour les membres existants
      db.exec('ALTER TABLE board_members ADD COLUMN status TEXT NOT NULL DEFAULT \'accepted\' CHECK (status IN (\'pending\', \'accepted\', \'rejected\'))');
    }

    // Migration pour ajouter le rôle 'readonly' à la contrainte CHECK
    // SQLite ne permet pas de modifier une contrainte CHECK, il faut recréer la table
    migrateRoleConstraint();
  } catch (error) {
    // Best-effort: ne pas bloquer le démarrage si la migration échoue.
    console.warn('Database migration warning:', error);
  }
}

function migrateRoleConstraint() {
  // Vérifier si la migration est nécessaire en testant si 'readonly' est accepté
  try {
    // Essayer d'insérer une valeur 'readonly' temporaire pour tester
    const testResult = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='board_members'
    `).get() as { sql: string } | undefined;

    // Si la table existe et ne contient pas 'readonly' dans sa définition
    if (testResult && !testResult.sql.includes('readonly')) {
      console.log('[migration] Updating board_members table to support readonly role...');
      
      db.exec(`
        -- Désactiver temporairement les foreign keys
        PRAGMA foreign_keys = OFF;
        
        -- Créer la nouvelle table avec la contrainte mise à jour
        CREATE TABLE IF NOT EXISTS board_members_new (
          id TEXT PRIMARY KEY,
          board_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'readonly')),
          status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'rejected')),
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(board_id, user_id)
        );
        
        -- Copier les données existantes
        INSERT OR IGNORE INTO board_members_new (id, board_id, user_id, role, status, created_at)
        SELECT id, board_id, user_id, role, status, created_at FROM board_members;
        
        -- Supprimer l'ancienne table
        DROP TABLE board_members;
        
        -- Renommer la nouvelle table
        ALTER TABLE board_members_new RENAME TO board_members;
        
        -- Recréer les index
        CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
        CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);
        
        -- Réactiver les foreign keys
        PRAGMA foreign_keys = ON;
      `);
      
      console.log('[migration] board_members table updated successfully');
    }
  } catch (error) {
    console.warn('[migration] Role constraint migration warning:', error);
  }
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
