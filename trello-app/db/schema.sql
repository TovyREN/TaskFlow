-- ============================================
-- SCHÉMA SQLITE POUR TRELLO
-- ============================================

-- Table des utilisateurs (remplace auth.users de Supabase)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  bio TEXT,
  contact_info TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Table des sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Table des boards
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  background TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'team')),
  owner_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_boards_owner_id ON boards(owner_id);

-- Table des membres du board
CREATE TABLE IF NOT EXISTS board_members (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(board_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);

-- Table des listes
CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  title TEXT NOT NULL,
  background TEXT DEFAULT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lists_board_id ON lists(board_id);

-- Table des cartes
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  due_date INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cards_list_id ON cards(list_id);

-- Table des labels
CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_labels_board_id ON labels(board_id);

-- Table des cartes_labels (relation many-to-many)
CREATE TABLE IF NOT EXISTS card_labels (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  label_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
  UNIQUE(card_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_card_labels_card_id ON card_labels(card_id);
CREATE INDEX IF NOT EXISTS idx_card_labels_label_id ON card_labels(label_id);

-- Table des assignés (relation many-to-many)
CREATE TABLE IF NOT EXISTS card_assignees (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(card_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_card_assignees_card_id ON card_assignees(card_id);
CREATE INDEX IF NOT EXISTS idx_card_assignees_user_id ON card_assignees(user_id);

-- Table des checklists
CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checklists_card_id ON checklists(card_id);

-- Table des éléments de checklist
CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  checklist_id TEXT NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);

-- Table des pièces jointes
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER,
  type TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_card_id ON attachments(card_id);

-- Table des commentaires
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_card_id ON comments(card_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Triggers pour mettre à jour updated_at automatiquement
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
  AFTER UPDATE ON users
  FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_boards_updated_at
  AFTER UPDATE ON boards
  FOR EACH ROW
BEGIN
  UPDATE boards SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_lists_updated_at
  AFTER UPDATE ON lists
  FOR EACH ROW
BEGIN
  UPDATE lists SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_cards_updated_at
  AFTER UPDATE ON cards
  FOR EACH ROW
BEGIN
  UPDATE cards SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_checklists_updated_at
  AFTER UPDATE ON checklists
  FOR EACH ROW
BEGIN
  UPDATE checklists SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_checklist_items_updated_at
  AFTER UPDATE ON checklist_items
  FOR EACH ROW
BEGIN
  UPDATE checklist_items SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_comments_updated_at
  AFTER UPDATE ON comments
  FOR EACH ROW
BEGIN
  UPDATE comments SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;
