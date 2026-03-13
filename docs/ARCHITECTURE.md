# TaskFlow - Schema d'Architecture

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Navigateur)                         │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │  React       │  │  Socket.IO   │  │  localStorage /           │  │
│  │  Components  │  │  Client      │  │  sessionStorage           │  │
│  │  (Next.js)   │  │              │  │  (session utilisateur)    │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────────────────┘  │
│         │                  │                                        │
└─────────┼──────────────────┼────────────────────────────────────────┘
          │ Server Actions   │ WebSocket (ws://)
          │ (HTTP POST)      │
┌─────────┼──────────────────┼────────────────────────────────────────┐
│         ▼                  ▼            SERVEUR (Node.js)           │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │                  server.js (HTTP + Socket.IO)           │        │
│  │                                                         │        │
│  │  ┌────────────────────┐    ┌──────────────────────────┐ │        │
│  │  │   Next.js App      │    │   Socket.IO Server       │ │        │
│  │  │   Router           │    │                          │ │        │
│  │  │                    │    │  Rooms:                  │ │        │
│  │  │  ┌──────────────┐  │    │  ├─ user:{userId}        │ │        │
│  │  │  │Server Actions│  │    │  ├─ workspace:{id}       │ │        │
│  │  │  │              │──┼────┼─►│  └─ board:{id}        │ │        │
│  │  │  │ auth         │  │    │                          │ │        │
│  │  │  │ workspace    │  │    │  global.io               │ │        │
│  │  │  │ board        │  │    └──────────────────────────┘ │        │
│  │  │  │ card         │  │                                 │        │
│  │  │  │ notification │  │                                 │        │
│  │  │  └──────┬───────┘  │                                 │        │
│  │  └─────────┼──────────┘                                 │        │
│  └────────────┼────────────────────────────────────────────┘        │
│               │                                                     │
│               ▼                                                     │
│  ┌─────────────────────┐                                            │
│  │   Prisma ORM        │                                            │
│  │   (lib/prisma.ts)   │                                            │
│  └──────────┬──────────┘                                            │
│             │                                                       │
└─────────────┼───────────────────────────────────────────────────────┘
              │ TCP (port 5432)
              ▼
┌──────────────────────────┐
│    PostgreSQL Database   │
│                          │
│    14 tables / 3 enums   │
└──────────────────────────┘
```

---

## Stack technique

| Couche      | Technologie                   | Version    |
|-------------|-------------------------------|------------|
| Frontend    | Next.js (React + TypeScript)  | App Router |
| UI          | Tailwind CSS + Lucide Icons   | -          |
| Drag & Drop | @hello-pangea/dnd             | -          |
| Temps réel  | Socket.IO                     | 4.8.x      |
| ORM         | Prisma                        | 6.19.x     |
| Base de données | PostgreSQL                | -          |
| Auth        | Bcrypt + Google OAuth2        | -          |
| Déploiement | Docker                        | -          |

---

## Architecture applicative

```
┌──────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE 3 COUCHES                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    COUCHE PRÉSENTATION                     │  │
│  │                                                            │  │
│  │  components/              app/page.tsx                     │  │
│  │  ├─ Login.tsx             (routing & layout)               │  │
│  │  ├─ Register.tsx                                           │  │
│  │  ├─ Header.tsx            app/layout.tsx                   │  │
│  │  ├─ WorkspaceView.tsx     (providers & global styles)      │  │
│  │  ├─ NotificationsView.tsx                                  │  │
│  │  ├─ SocketProvider.tsx    services/                        │  │
│  │  └─ board/                └─ storageService.ts             │  │
│  │     ├─ BoardView.tsx                                       │  │
│  │     ├─ BoardColumn.tsx                                     │  │
│  │     ├─ TaskCard.tsx                                        │  │
│  │     └─ TaskDetailModal.tsx                                 │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                    Appels Server Actions                         │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    COUCHE MÉTIER (Server Actions)          │  │
│  │                                                            │  │
│  │  app/actions/                                              │  │
│  │  ├─ authActions.ts          Authentification               │  │
│  │  ├─ workspaceActions.ts     Workspaces, Membres, Invit.    │  │
│  │  ├─ boardActions.ts         Boards, Listes, Tâches         │  │
│  │  ├─ cardActions.ts          Détails tâche, Labels, etc.    │  │
│  │  └─ notificationActions.ts  Notifications                  │  │
│  │                                                            │  │
│  │  lib/                                                      │  │
│  │  ├─ socket.ts               Émission événements temps réel │  │
│  │  ├─ password.ts             Hashing bcrypt                 │  │
│  │  └─ passwordValidation.ts   Validation force mot de passe  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                        Prisma Client                             │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    COUCHE DONNÉES                          │  │
│  │                                                            │  │
│  │  prisma/                                                   │  │
│  │  ├─ schema.prisma           Modèles de données             │  │
│  │  ├─ migrations/             Historique des migrations      │  │
│  │  └─ seed.ts                 Données initiales              │  │
│  │                                                            │  │
│  │  lib/prisma.ts              Singleton Prisma Client        │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Schema de base de données (ERD)

```
┌──────────────┐       ┌─────────────────────┐       ┌──────────────┐
│    User      │       │   WorkspaceMember   │       │  Workspace   │
├──────────────┤       ├─────────────────────┤       ├──────────────┤
│ id       PK  │◄──┐   │ id              PK  │   ┌──►│ id       PK  │
│ email    UQ  │   ├───│ userId          FK  │   │   │ name         │
│ name         │   │   │ workspaceId     FK  │───┘   │ description  │
│ password     │   │   │ role (enum)         │       │ color        │
│ googleId UQ  │   │   │ joinedAt            │       │ ownerId  FK  │──┐
│ googleImage  │   │   └─────────────────────┘       │ createdAt    │  │
│ createdAt    │   │   UQ(workspaceId, userId)       │ updatedAt    │  │
└──────┬───────┘   │                                 └──────┬───────┘  │
       │           │                                        │          │
       │           │   ┌─────────────────────┐              │          │
       │           │   │ WorkspaceInvitation  │             │          │
       │           │   ├─────────────────────┤              │          │
       │           ├───│ inviterId       FK  │              │          │
       │           ├───│ inviteeId       FK  │              │          │
       │           │   │ workspaceId     FK  │──────────────┘          │
       │           │   │ inviteeEmail        │                         │
       │           │   │ role (enum)         │                         │
       │           │   │ status (enum)       │                         │
       │           │   │ expiresAt           │                         │
       │           │   └──────────┬──────────┘                         │
       │           │   UQ(workspaceId, inviteeEmail)                   │
       │           │              │                                    │
       │           │              │                                    │
       │           │   ┌──────────┴──────────┐                         │
       │           │   │   Notification      │                         │
       │           │   ├─────────────────────┤                         │
       │           ├───│ userId          FK  │                         │
       │           ├───│ actorId         FK  │                         │
       │           │   │ taskId          FK  │──┐                      │
       │           │   │ workspaceInvit. FK  │  │                      │
       │           │   │ type (enum)         │  │                      │
       │           │   │ message             │  │                      │
       │           │   │ isRead              │  │                      │
       │           │   └─────────────────────┘  │                      │
       │           │                            │                      │
       │◄──────────┘                            │                      │
       │                                        │                      │
       │   Workspace ──► Board ──► TaskList ──► Task                   │
       │                                         │                     │
       │           ┌────────────────┐            │                     │
       │           │     Board      │            │     Owner           │
       │           ├────────────────┤            │     relation        │
       │           │ id         PK  │            │         │           │
       │           │ title          │            │         │           │
       │           │ color          │            │         │           │
       │           │ backgroundImage│            │         └───────────┘
       │           │ workspaceId FK │            │
       │           └───────┬────────┘            │
       │                   │                     │
       │                   │ 1:N                 │
       │                   ▼                     │
       │           ┌────────────────┐            │
       │           │   TaskList     │            │
       │           ├────────────────┤            │
       │           │ id         PK  │            │
       │           │ title          │            │
       │           │ order          │            │
       │           │ boardId    FK  │            │
       │           └───────┬────────┘            │
       │                   │                     │
       │                   │ 1:N                 │
       │                   ▼                     │
       │           ┌────────────────┐            │
       │           │     Task       │◄───────────┘
       │           ├────────────────┤
       │           │ id         PK  │
       │           │ title          │
       │           │ description    │
       │           │ order          │
       │           │ startDate      │
       │           │ dueDate        │
       │           │ listId     FK  │
       │           └──┬──┬──┬──┬───┘
       │              │  │  │  │
       │              │  │  │  │
       │  ┌───────────┘  │  │  └──────────────┐
       │  │              │  │                  │
       │  ▼              │  ▼                  ▼
       │  ┌───────────┐  │  ┌───────────┐  ┌───────────────┐
       │  │TaskAssignee│ │  │ TaskLabel │  │   Comment     │
       │  ├───────────┤  │  ├───────────┤  ├───────────────┤
       ├──│ userId  FK│  │  │ taskId FK │  │ id        PK  │
       │  │ taskId  FK│  │  │ labelId FK│  │ text          │
       │  └───────────┘  │  └─────┬─────┘  │ userId    FK  │──►User
       │  UQ(task,user)  │  UQ(task,label) │ taskId    FK  │
       │                 │        │        └───────────────┘
       │                 │        ▼
       │                 │  ┌────────────────┐
       │                 │  │  BoardLabel    │
       │                 │  ├────────────────┤
       │                 │  │ id         PK  │
       │                 │  │ name           │
       │                 │  │ color          │
       │                 │  │ boardId    FK  │──► Board
       │                 │  └────────────────┘
       │                 │
       │                 ▼
       │          ┌────────────────┐
       │          │   Checklist    │
       │          ├────────────────┤
       │          │ id         PK  │
       │          │ title          │
       │          │ taskId     FK  │
       │          └───────┬────────┘
       │                  │
       │                  │ 1:N
       │                  ▼
       │          ┌────────────────┐
       │          │ ChecklistItem  │
       │          ├────────────────┤
       │          │ id         PK  │
       │          │ title          │
       │          │ isChecked      │
       │          │ order          │
       │          │ checklistId FK │
       │          └────────────────┘
       │
       └──────────────────────────────────────────
```

### Enums

```
MemberRole:          InvitationStatus:      NotificationType:
├─ ADMIN             ├─ PENDING             ├─ TASK_ASSIGNED
├─ MEMBER            ├─ ACCEPTED            ├─ DUE_DATE_APPROACHING
└─ VIEWER            └─ DECLINED            └─ WORKSPACE_INVITATION
```

---

## Flux de communication temps réel

```
┌───────────┐     Server Action      ┌───────────────┐     Prisma      ┌────────────┐
│  Client A │ ──────────────────────► │ Server Action  │ ──────────────► │ PostgreSQL │
│ (auteur)  │   (HTTP POST auto)     │ (boardActions) │   (query/mut)  │            │
└───────────┘                        └───────┬───────┘                 └────────────┘
                                             │
                                             │ emitToBoard() / emitToWorkspace()
                                             │ via global.io
                                             ▼
                                     ┌───────────────┐
                                     │  Socket.IO    │
                                     │  Server       │
                                     │               │
                                     │  Rooms:       │
                                     │  board:abc    │──────────┐
                                     │  workspace:xy │───┐      │
                                     │  user:123     │─┐ │      │
                                     └───────────────┘ │ │      │
                                                       │ │      │
                    ┌──────────────────────────────────┘ │      │
                    │       ┌────────────────────────────┘      │
                    │       │       ┌───────────────────────────┘
                    ▼       ▼       ▼
             ┌───────────┐ ┌───────────┐ ┌───────────┐
             │  Client B │ │  Client C │ │  Client D │
             │ (membre)  │ │ (membre)  │ │ (viewer)  │
             └───────────┘ └───────────┘ └───────────┘

             Tous reçoivent l'événement en temps réel
             et mettent à jour leur UI automatiquement
```

### Cycle de vie d'une action avec Socket.IO

```
1. Utilisateur clique "Créer tâche"
       │
       ▼
2. Composant React appelle createTask(listId, title, userId)
       │
       ▼
3. Server Action s'exécute côté serveur
       │
       ├──► Vérifie les permissions (getUserRoleInBoard)
       │
       ├──► Crée la tâche en BDD (prisma.task.create)
       │
       ├──► Émet l'événement Socket.IO
       │    emitToBoard(boardId, 'task:created', { task })
       │
       └──► Retourne { success: true, task } au composant
              │
              ▼
4. Le composant met à jour son state local

5. Les autres clients reçoivent 'task:created'
   via leur listener Socket.IO et rechargent les données
```

---

## Système d'authentification

```
┌─────────────────────────────────────────────────────────┐
│                  FLUX D'AUTHENTIFICATION                 │
│                                                         │
│  ┌─────────────────┐    ┌─────────────────────────────┐│
│  │ Email / Password │    │      Google OAuth2          ││
│  │                  │    │                             ││
│  │ 1. Formulaire    │    │ 1. Bouton "Sign in"        ││
│  │ 2. registerUser()│    │ 2. Google Consent Screen   ││
│  │    ou loginUser()│    │ 3. Token ID reçu           ││
│  │ 3. Bcrypt hash   │    │ 4. loginWithGoogle(token)  ││
│  │    ou verify     │    │ 5. Vérification serveur    ││
│  │ 4. Retour user   │    │ 6. Création/liaison compte ││
│  └────────┬─────────┘    └──────────┬─────────────────┘│
│           │                          │                  │
│           └──────────┬───────────────┘                  │
│                      ▼                                  │
│           ┌──────────────────┐                          │
│           │  localStorage    │                          │
│           │  { user object } │                          │
│           └──────────────────┘                          │
│                      │                                  │
│                      ▼                                  │
│           Chaque Server Action reçoit                   │
│           userId en paramètre pour                      │
│           vérifier les permissions                      │
└─────────────────────────────────────────────────────────┘
```

---

## Système de permissions (RBAC)

```
┌──────────────────────────────────────────────────────────────┐
│                    HIÉRARCHIE DES RÔLES                      │
│                                                              │
│  OWNER (propriétaire du workspace)                           │
│  │  Tout pouvoir sur le workspace                            │
│  │  Peut promouvoir en ADMIN                                 │
│  │  Peut supprimer le workspace                              │
│  │                                                           │
│  ├── ADMIN                                                   │
│  │   │  Gérer les membres (inviter, modifier rôles)          │
│  │   │  Créer/supprimer des boards                           │
│  │   │  Modifier paramètres board                            │
│  │   │                                                       │
│  │   ├── MEMBER                                              │
│  │   │   │  Créer/modifier/supprimer des tâches              │
│  │   │   │  Gérer labels, checklists, commentaires           │
│  │   │   │  Déplacer/réordonner des tâches                   │
│  │   │   │                                                   │
│  │   │   └── VIEWER                                          │
│  │   │       │  Lecture seule                                │
│  │   │       │  Voir workspace, boards, tâches               │
│  │   │       └  Aucune action de modification                │
│  │   │                                                       │
│  └───┘                                                       │
│                                                              │
│  Vérification dans chaque Server Action :                    │
│  getUserRoleInBoard(boardId, userId) → ADMIN|MEMBER|VIEWER   │
│  getUserRole(workspaceId, userId)    → ADMIN|MEMBER|VIEWER   │
└──────────────────────────────────────────────────────────────┘
```

---

## Structure des fichiers

```
Trello/
├── app/
│   ├── actions/                    # Couche métier (Server Actions)
│   │   ├── authActions.ts          # Login, Register, Google OAuth
│   │   ├── workspaceActions.ts     # CRUD Workspace, Membres, Invitations
│   │   ├── boardActions.ts         # CRUD Board, Listes, Tâches
│   │   ├── cardActions.ts          # Détails tâche, Labels, Checklists, Commentaires
│   │   └── notificationActions.ts  # Notifications CRUD + due date check
│   ├── page.tsx                    # Page principale (SPA routing)
│   ├── layout.tsx                  # Layout racine (providers)
│   └── globals.css                 # Styles globaux Tailwind
│
├── components/                     # Couche présentation
│   ├── board/                      # Composants du board Kanban
│   │   ├── BoardView.tsx           # Vue principale du board
│   │   ├── BoardColumn.tsx         # Colonne (TaskList)
│   │   ├── TaskCard.tsx            # Carte de tâche
│   │   └── TaskDetailModal.tsx     # Modal détails tâche
│   ├── Login.tsx                   # Formulaire connexion
│   ├── Register.tsx                # Formulaire inscription
│   ├── Header.tsx                  # Barre de navigation
│   ├── WorkspaceView.tsx           # Vue workspace
│   ├── SocketProvider.tsx          # Provider Socket.IO (Context API)
│   └── NotificationsView.tsx       # Centre de notifications
│
├── lib/                            # Utilitaires serveur
│   ├── prisma.ts                   # Singleton Prisma Client
│   ├── socket.ts                   # Helpers émission Socket.IO
│   ├── password.ts                 # Bcrypt hash/verify
│   └── passwordValidation.ts       # Validation force mot de passe
│
├── services/                       # Services client
│   └── storageService.ts           # Wrapper localStorage
│
├── types/                          # Types TypeScript
│   └── index.ts                    # Interfaces & types partagés
│
├── prisma/                         # Couche données
│   ├── schema.prisma               # Schéma de la base de données
│   ├── seed.ts                     # Script de seed
│   └── migrations/                 # Migrations Prisma
│
├── server.js                       # Serveur HTTP + Socket.IO
├── package.json                    # Dépendances
├── tsconfig.json                   # Configuration TypeScript
├── tailwind.config.ts              # Configuration Tailwind
├── Dockerfile                      # Image Docker
└── .env                            # Variables d'environnement
```

---

## Variables d'environnement

```env
# Base de données
DATABASE_URL=postgresql://user:password@localhost:5432/taskflow

# Serveur
NODE_ENV=development|production
PORT=3000

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Prisma
PRISMA_SCHEMA_PATH=./prisma/schema.prisma
```

---

## Diagramme de déploiement

```
┌─────────────────────────────────────────┐
│              Docker Host                │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │         Container: App            │  │
│  │                                   │  │
│  │   Node.js + Next.js + Socket.IO   │  │
│  │         Port 3000                 │  │
│  │                                   │  │
│  │   server.js                       │  │
│  │   ├─ HTTP Server (Next.js)        │  │
│  │   └─ WebSocket Server (Socket.IO) │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│                  │ TCP :5432             │
│                  ▼                       │
│  ┌───────────────────────────────────┐  │
│  │      Container: PostgreSQL        │  │
│  │                                   │  │
│  │      Base: taskflow               │  │
│  │      14 tables, 3 enums           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```
