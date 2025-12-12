-- Activer l'extension pour générer des IDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fonction pour générer des CUIDs (compatible avec Prisma)
CREATE OR REPLACE FUNCTION generate_cuid() RETURNS TEXT AS $$
DECLARE
  timestamp TEXT;
  counter TEXT;
  random_part TEXT;
BEGIN
  timestamp := LPAD(TO_HEX(EXTRACT(EPOCH FROM NOW())::BIGINT), 8, '0');
  counter := LPAD(TO_HEX(FLOOR(RANDOM() * 65536)::INT), 4, '0');
  random_part := ENCODE(gen_random_bytes(12), 'hex');
  RETURN 'c' || timestamp || counter || random_part;
END;
$$ LANGUAGE plpgsql;

-- Table des utilisateurs
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des boards
CREATE TABLE boards (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  name TEXT NOT NULL,
  description TEXT,
  background TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Table des membres de board
CREATE TABLE board_members (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(board_id, user_id)
);

-- Table des listes
CREATE TABLE lists (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE
);

-- Table des cartes
CREATE TABLE cards (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE
);

-- Table des assignations de cartes
CREATE TABLE card_assignees (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(card_id, user_id)
);

-- Table des labels
CREATE TABLE labels (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

-- Table de liaison cartes-labels
CREATE TABLE card_labels (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  UNIQUE(card_id, label_id)
);

-- Table des checklists
CREATE TABLE checklists (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE
);

-- Table des items de checklist
CREATE TABLE checklist_items (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  content TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL,
  checklist_id TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE
);

-- Table des pièces jointes
CREATE TABLE attachments (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE
);

-- Table des commentaires
CREATE TABLE comments (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX idx_boards_owner ON boards(owner_id);
CREATE INDEX idx_board_members_board ON board_members(board_id);
CREATE INDEX idx_board_members_user ON board_members(user_id);
CREATE INDEX idx_lists_board ON lists(board_id);
CREATE INDEX idx_lists_position ON lists(board_id, position);
CREATE INDEX idx_cards_list ON cards(list_id);
CREATE INDEX idx_cards_position ON cards(list_id, position);
CREATE INDEX idx_card_assignees_card ON card_assignees(card_id);
CREATE INDEX idx_card_assignees_user ON card_assignees(user_id);
CREATE INDEX idx_card_labels_card ON card_labels(card_id);
CREATE INDEX idx_card_labels_label ON card_labels(label_id);
CREATE INDEX idx_checklists_card ON checklists(card_id);
CREATE INDEX idx_checklist_items_checklist ON checklist_items(checklist_id);
CREATE INDEX idx_attachments_card ON attachments(card_id);
CREATE INDEX idx_comments_card ON comments(card_id);
CREATE INDEX idx_comments_user ON comments(user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at 
  BEFORE UPDATE ON boards 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lists_updated_at 
  BEFORE UPDATE ON lists 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at 
  BEFORE UPDATE ON cards 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at 
  BEFORE UPDATE ON comments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Vérification : afficher toutes les tables créées
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
