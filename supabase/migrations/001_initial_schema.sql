-- ═══════════════════════════════════════════════════════════════
-- IRONFORGE — Schema inicial do banco de dados
-- Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT,
  full_name     TEXT,
  bio           TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  is_public     BOOLEAN NOT NULL DEFAULT true,
  show_frequency BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- ─── POSTS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT,
  media_url   TEXT,
  media_type  TEXT CHECK (media_type IN ('image', 'video', NULL)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);

-- ─── POST LIKES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_likes (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id   UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)  -- Impede curtida dupla
);

CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS post_likes_user_id_idx ON public.post_likes(user_id);

-- ─── COMMENTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id   UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content   TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_post_id_idx ON public.comments(post_id);

-- ─── WORKOUT LOGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date  DATE NOT NULL,
  notes     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, log_date)  -- Um treino por dia
);

CREATE INDEX IF NOT EXISTS workout_logs_user_id_idx ON public.workout_logs(user_id);
CREATE INDEX IF NOT EXISTS workout_logs_log_date_idx ON public.workout_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS workout_logs_user_date_idx ON public.workout_logs(user_id, log_date DESC);

-- ─── WORKOUT PLANS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  days        INTEGER[] DEFAULT '{}',  -- 0=Dom, 1=Seg, ..., 6=Sáb
  exercises   JSONB DEFAULT '[]',      -- [{name, sets, reps, weight, notes}]
  is_public   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_plans_user_id_idx ON public.workout_plans(user_id);

-- ─── USER SETTINGS ───────────────────────────────────────────────
-- (integrado em profiles para simplicidade)

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Auto-criar perfil quando usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER workout_plans_updated_at
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ─────────────────────────────────────────────────────
-- Leitura: perfis públicos visíveis por todos; privados apenas pelo dono
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    is_public = true
    OR auth.uid() = id
  );

-- Inserção: apenas pelo próprio usuário (via trigger)
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Atualização: apenas o dono pode atualizar, e não pode mudar role/id
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin pode ver e atualizar qualquer perfil
CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── POSTS ────────────────────────────────────────────────────────
-- Leitura: posts públicos (de perfis públicos ou do próprio usuário)
CREATE POLICY "posts_select" ON public.posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = posts.user_id
      AND (p.is_public = true OR p.id = auth.uid())
    )
  );

-- Inserção: apenas usuários autenticados criando seus próprios posts
CREATE POLICY "posts_insert" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Atualização: apenas o dono
CREATE POLICY "posts_update" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Exclusão: dono ou admin
CREATE POLICY "posts_delete" ON public.posts
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── POST LIKES ───────────────────────────────────────────────────
CREATE POLICY "likes_select" ON public.post_likes
  FOR SELECT USING (true);

CREATE POLICY "likes_insert" ON public.post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes_delete" ON public.post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ── COMMENTS ────────────────────────────────────────────────────
CREATE POLICY "comments_select" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "comments_insert" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete" ON public.comments
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── WORKOUT LOGS ────────────────────────────────────────────────
-- Leitura: próprios logs + logs de usuários com frequência pública
CREATE POLICY "workout_logs_select" ON public.workout_logs
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = workout_logs.user_id
      AND p.is_public = true
      AND p.show_frequency = true
    )
  );

CREATE POLICY "workout_logs_insert" ON public.workout_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workout_logs_delete" ON public.workout_logs
  FOR DELETE USING (auth.uid() = user_id);

-- ── WORKOUT PLANS ───────────────────────────────────────────────
-- Leitura: planos públicos + próprios planos
CREATE POLICY "workout_plans_select" ON public.workout_plans
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_public = true
  );

CREATE POLICY "workout_plans_insert" ON public.workout_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workout_plans_update" ON public.workout_plans
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workout_plans_delete" ON public.workout_plans
  FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- REALTIME
-- Habilitar realtime para as tabelas necessárias
-- ═══════════════════════════════════════════════════════════════

-- Execute no Dashboard do Supabase: Database > Replication
-- Ou via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_logs;

-- ═══════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- Execute no Dashboard > Storage, ou via API
-- ═══════════════════════════════════════════════════════════════
-- Crie os seguintes buckets públicos:
-- - avatars       (imagens de perfil)
-- - post-images   (fotos dos posts)
-- - post-videos   (vídeos dos posts)
