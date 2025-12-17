-- ============================================
-- SUPPRESSION DES ANCIENNES STRUCTURES
-- ============================================

-- Supprimer les triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_boards_updated_at ON boards;
DROP TRIGGER IF EXISTS update_lists_updated_at ON lists;
DROP TRIGGER IF EXISTS update_cards_updated_at ON cards;
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;

-- Supprimer les anciennes tables (dans l'ordre inverse des dépendances)
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS checklists CASCADE;
DROP TABLE IF EXISTS card_labels CASCADE;
DROP TABLE IF EXISTS labels CASCADE;
DROP TABLE IF EXISTS card_assignees CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS lists CASCADE;
DROP TABLE IF EXISTS board_members CASCADE;
DROP TABLE IF EXISTS boards CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Supprimer les anciennes fonctions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_cuid() CASCADE;

-- ============================================
-- CRÉATION DES EXTENSIONS ET FONCTIONS
-- ============================================

-- Activer les extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fonction pour générer des CUIDs (compatible Prisma)
CREATE OR REPLACE FUNCTION generate_cuid() RETURNS TEXT AS $$
DECLARE
  timestamp TEXT;
  counter TEXT;
  random_part TEXT;
BEGIN
  timestamp := LPAD(TO_HEX(FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT), 12, '0');
  counter := LPAD(TO_HEX(FLOOR(RANDOM() * 65536)::INT), 4, '0');
  random_part := ENCODE(gen_random_bytes(12), 'hex');
  RETURN 'c' || SUBSTRING(timestamp FROM 1 FOR 8) || counter || SUBSTRING(random_part FROM 1 FOR 12);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, avatar, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar', NULL),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Table user_profiles (complément de auth.users)
-- Supabase Auth gère l'authentification, cette table stocke les infos supplémentaires
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
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
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'team')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table des membres de board
CREATE TABLE board_members (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
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

-- Trigger pour créer automatiquement user_profiles lors de l'inscription
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Triggers pour updated_at
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
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
