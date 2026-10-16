# 🔥 IronForge — Plataforma Social Fitness

Rede social fitness com feed, calendário de treinos, fichas de musculação e frequência em tempo real.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Hospedagem:** Netlify

---

## Configuração do Supabase

### 1. Criar projeto
Acesse [supabase.com](https://supabase.com) e crie um novo projeto.

### 2. Executar migration SQL
No dashboard do Supabase, vá em **SQL Editor** e execute o conteúdo de:
```
supabase/migrations/001_initial_schema.sql
```

### 3. Criar buckets de Storage
No dashboard, vá em **Storage** e crie os buckets:
- `avatars` — Público
- `post-images` — Público
- `post-videos` — Público

### 4. Habilitar Realtime
No dashboard, vá em **Database > Replication** e habilite as tabelas:
- `posts`, `post_likes`, `comments`, `workout_logs`

### 5. Variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```
As chaves estão em **Settings > API** no dashboard do Supabase.

---

## Desenvolvimento local

```bash
npm install
npm run dev
```

---

## Deploy no Netlify

### Via interface
1. Conecte o repositório no [netlify.com](https://netlify.com)
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Adicione as variáveis de ambiente no painel do Netlify

### Via CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

---

## Estrutura do projeto

```
src/
├── components/
│   ├── ui/           # Componentes reutilizáveis (Button, Input, Modal...)
│   ├── layout/       # AppLayout, ProtectedRoute
│   └── feed/         # PostCard, CreatePostModal
├── lib/
│   ├── supabase.js   # Cliente Supabase
│   └── AuthContext   # Contexto de autenticação
├── pages/            # Páginas da aplicação
├── services/         # Lógica de negócio (posts, storage)
└── styles/           # CSS global
```

---

## Criar admin

Para promover um usuário a admin, execute no SQL Editor:
```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE username = 'seu_username';
```

---

## Funcionalidades implementadas

- ✅ Autenticação (login, cadastro, recuperação de senha)
- ✅ Perfil de usuário com foto, bio e edição
- ✅ Feed com fotos, vídeos e texto
- ✅ Curtidas e comentários em tempo real
- ✅ Calendário de treinos mensal
- ✅ Frequência pública da comunidade
- ✅ Fichas de musculação (criar, editar, duplicar, excluir)
- ✅ Filtro de fichas por dia da semana
- ✅ Sincronização em tempo real via Supabase Realtime
- ✅ Upload de imagens e vídeos
- ✅ Row Level Security em todas as tabelas
- ✅ Layout responsivo (desktop + mobile)
- ✅ Configurações de privacidade
- ✅ Página de comunidade com busca
- ✅ Dashboard com resumo da semana
