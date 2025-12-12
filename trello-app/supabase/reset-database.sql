-- ============================================
-- SCRIPT DE RÉINITIALISATION COMPLÈTE DE LA BASE DE DONNÉES
-- ============================================
-- Ce script supprime toutes les tables et les recrée
-- À exécuter dans le SQL Editor de Supabase

-- ============================================
-- ÉTAPE 1 : SUPPRESSION DE TOUT
-- ============================================

-- Désactiver RLS temporairement
ALTER TABLE IF EXISTS user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS board_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS card_assignees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS labels DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS card_labels DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS checklists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS checklist_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comments DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques RLS
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view boards they own or are members of" ON boards;
DROP POLICY IF EXISTS "Users can create boards" ON boards;
DROP POLICY IF EXISTS "Users can update boards they own" ON boards;
DROP POLICY IF EXISTS "Users can delete boards they own" ON boards;

-- Supprimer les triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_boards_updated_at ON boards;
DROP TRIGGER IF EXISTS update_lists_updated_at ON lists;
DROP TRIGGER IF EXISTS update_cards_updated_at ON cards;
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_cuid() CASCADE;

-- Supprimer les tables (dans l'ordre inverse des dépendances)
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

-- ============================================
-- ÉTAPE 2 : CRÉATION DES EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ÉTAPE 3 : CRÉATION DES FONCTIONS UTILITAIRES
-- ============================================

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

-- ============================================
-- ÉTAPE 4 : CRÉATION DES TABLES
-- ============================================

-- Table user_profiles (complément de auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table boards
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

-- Table board_members
CREATE TABLE board_members (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(board_id, user_id)
);

-- Table lists
CREATE TABLE lists (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE
);

-- Table cards
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

-- Table card_assignees
CREATE TABLE card_assignees (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(card_id, user_id)
);

-- Table labels
CREATE TABLE labels (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

-- Table card_labels
CREATE TABLE card_labels (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  UNIQUE(card_id, label_id)
);

-- Table checklists
CREATE TABLE checklists (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE
);

-- Table checklist_items
CREATE TABLE checklist_items (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  content TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL,
  checklist_id TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE
);

-- Table attachments
CREATE TABLE attachments (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE
);

-- Table comments
CREATE TABLE comments (
  id TEXT PRIMARY KEY DEFAULT generate_cuid(),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================
-- ÉTAPE 5 : CRÉATION DES INDEX
-- ============================================

CREATE INDEX idx_user_profiles_id ON user_profiles(id);
CREATE INDEX idx_boards_owner ON boards(owner_id);
CREATE INDEX idx_boards_visibility ON boards(visibility);
CREATE INDEX idx_board_members_board ON board_members(board_id);
CREATE INDEX idx_board_members_user ON board_members(user_id);
CREATE INDEX idx_lists_board ON lists(board_id);
CREATE INDEX idx_lists_position ON lists(board_id, position);
CREATE INDEX idx_cards_list ON cards(list_id);
CREATE INDEX idx_cards_position ON cards(list_id, position);
CREATE INDEX idx_cards_due_date ON cards(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_card_assignees_card ON card_assignees(card_id);
CREATE INDEX idx_card_assignees_user ON card_assignees(user_id);
CREATE INDEX idx_card_labels_card ON card_labels(card_id);
CREATE INDEX idx_card_labels_label ON card_labels(label_id);
CREATE INDEX idx_checklists_card ON checklists(card_id);
CREATE INDEX idx_checklist_items_checklist ON checklist_items(checklist_id);
CREATE INDEX idx_attachments_card ON attachments(card_id);
CREATE INDEX idx_comments_card ON comments(card_id);
CREATE INDEX idx_comments_user ON comments(user_id);

-- ============================================
-- ÉTAPE 6 : CRÉATION DES TRIGGERS
-- ============================================

-- Trigger pour créer un profil utilisateur lors de l'inscription
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- ============================================
-- ÉTAPE 7 : ACTIVATION DE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 8 : CRÉATION DES POLITIQUES RLS
-- ============================================

-- Politiques pour user_profiles
CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Politiques pour boards
CREATE POLICY "Users can view boards they own or are members of"
  ON boards FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR visibility = 'public'
    OR EXISTS (
      SELECT 1 FROM board_members 
      WHERE board_members.board_id = boards.id 
      AND board_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create boards"
  ON boards FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update boards they own"
  ON boards FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete boards they own"
  ON boards FOR DELETE
  USING (owner_id = auth.uid());

-- Politiques pour board_members
CREATE POLICY "Users can view board members of boards they have access to"
  ON board_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE boards.id = board_members.board_id 
      AND (
        boards.owner_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM board_members bm2 
          WHERE bm2.board_id = boards.id 
          AND bm2.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Board owners can manage members"
  ON board_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE boards.id = board_members.board_id 
      AND boards.owner_id = auth.uid()
    )
  );

-- Politiques pour lists
CREATE POLICY "Users can view lists of boards they have access to"
  ON lists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE boards.id = lists.board_id 
      AND (
        boards.owner_id = auth.uid() 
        OR boards.visibility = 'public'
        OR EXISTS (
          SELECT 1 FROM board_members 
          WHERE board_members.board_id = boards.id 
          AND board_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Board members can manage lists"
  ON lists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE boards.id = lists.board_id 
      AND (
        boards.owner_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM board_members 
          WHERE board_members.board_id = boards.id 
          AND board_members.user_id = auth.uid()
        )
      )
    )
  );

-- Politiques pour cards (similaires à lists)
CREATE POLICY "Users can view cards of lists they have access to"
  ON cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lists 
      JOIN boards ON boards.id = lists.board_id
      WHERE lists.id = cards.list_id 
      AND (
        boards.owner_id = auth.uid() 
        OR boards.visibility = 'public'
        OR EXISTS (
          SELECT 1 FROM board_members 
          WHERE board_members.board_id = boards.id 
          AND board_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Board members can manage cards"
  ON cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lists 
      JOIN boards ON boards.id = lists.board_id
      WHERE lists.id = cards.list_id 
      AND (
        boards.owner_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM board_members 
          WHERE board_members.board_id = boards.id 
          AND board_members.user_id = auth.uid()
        )
      )
    )
  );

-- Politiques pour comments
CREATE POLICY "Users can view comments on cards they have access to"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cards 
      JOIN lists ON lists.id = cards.list_id
      JOIN boards ON boards.id = lists.board_id
      WHERE cards.id = comments.card_id 
      AND (
        boards.owner_id = auth.uid() 
        OR boards.visibility = 'public'
        OR EXISTS (
          SELECT 1 FROM board_members 
          WHERE board_members.board_id = boards.id 
          AND board_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create comments on cards they have access to"
  ON comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM cards 
      JOIN lists ON lists.id = cards.list_id
      JOIN boards ON boards.id = lists.board_id
      WHERE cards.id = comments.card_id 
      AND (
        boards.owner_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM board_members 
          WHERE board_members.board_id = boards.id 
          AND board_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- ÉTAPE 9 : INSERTION DE DONNÉES DE TEST (OPTIONNEL)
-- ============================================

-- Insérer quelques labels par défaut
INSERT INTO labels (id, name, color) VALUES
  (generate_cuid(), 'Urgent', '#EF4444'),
  (generate_cuid(), 'Important', '#F59E0B'),
  (generate_cuid(), 'En cours', '#3B82F6'),
  (generate_cuid(), 'Terminé', '#10B981'),
  (generate_cuid(), 'Bug', '#DC2626'),
  (generate_cuid(), 'Feature', '#8B5CF6');

-- ============================================
-- ÉTAPE 10 : VÉRIFICATION
-- ============================================

-- Afficher toutes les tables créées
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Afficher les fonctions créées
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Afficher les triggers créés
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Message de confirmation
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Base de données réinitialisée avec succès !';
  RAISE NOTICE '📊 Tables créées : user_profiles, boards, board_members, lists, cards, etc.';
  RAISE NOTICE '🔐 Row Level Security activé sur toutes les tables';
  RAISE NOTICE '🎯 Triggers configurés pour updated_at et création de profils';
  RAISE NOTICE '🏷️  6 labels par défaut insérés';
END $$;
