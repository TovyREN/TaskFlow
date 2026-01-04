import { initDatabase } from './db/database';

// Initialiser la base de données au démarrage
try {
  initDatabase();
  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
}
