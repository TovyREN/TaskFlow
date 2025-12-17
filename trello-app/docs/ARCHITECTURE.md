# Architecture Documentation

## Table of Contents
1. [Project Structure](#project-structure)
2. [Global Application Architecture](#global-application-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Coding Standards & Style Guide](#coding-standards--style-guide)
6. [Best Practices](#best-practices)

---

## Project Structure

```
trello-app/
├── app/                          # Next.js App Router directory
│   ├── (auth)/                   # Authentication route group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Dashboard route group
│   │   ├── boards/
│   │   │   ├── [boardId]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── [...nextauth]/
│   │   ├── boards/
│   │   │   ├── [boardId]/
│   │   │   └── route.ts
│   │   ├── lists/
│   │   │   └── route.ts
│   │   └── cards/
│   │       └── route.ts
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
│
├── components/                   # Reusable components
│   ├── ui/                       # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── modal.tsx
│   │   ├── dropdown.tsx
│   │   └── card.tsx
│   ├── board/                    # Board-related components
│   │   ├── board-header.tsx
│   │   ├── board-list.tsx
│   │   ├── board-card.tsx
│   │   └── board-settings.tsx
│   ├── card/                     # Card-related components
│   │   ├── card-detail.tsx
│   │   ├── card-modal.tsx
│   │   ├── card-checklist.tsx
│   │   ├── card-comments.tsx
│   │   └── card-attachments.tsx
│   ├── list/                     # List-related components
│   │   ├── list-container.tsx
│   │   ├── list-header.tsx
│   │   └── list-form.tsx
│   ├── layout/                   # Layout components
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── footer.tsx
│   └── shared/                   # Shared components
│       ├── loading.tsx
│       ├── error-boundary.tsx
│       └── avatar.tsx
│
├── lib/                          # Utility libraries
│   ├── db/                       # Database configuration
│   │   ├── prisma.ts
│   │   └── migrations/
│   ├── auth/                     # Authentication utilities
│   │   ├── auth-options.ts
│   │   └── session.ts
│   ├── validations/              # Zod schemas
│   │   ├── board.ts
│   │   ├── card.ts
│   │   └── user.ts
│   ├── api/                      # API client utilities
│   │   ├── client.ts
│   │   └── endpoints.ts
│   └── utils/                    # Helper functions
│       ├── cn.ts                 # Class name utility
│       ├── date.ts
│       └── format.ts
│
├── hooks/                        # Custom React hooks
│   ├── use-board.ts
│   ├── use-card.ts
│   ├── use-list.ts
│   ├── use-auth.ts
│   ├── use-modal.ts
│   └── use-drag-drop.ts
│
├── store/                        # State management
│   ├── board-store.ts
│   ├── card-store.ts
│   ├── user-store.ts
│   └── ui-store.ts
│
├── types/                        # TypeScript type definitions
│   ├── board.ts
│   ├── card.ts
│   ├── list.ts
│   ├── user.ts
│   └── index.ts
│
├── actions/                      # Server actions
│   ├── board-actions.ts
│   ├── card-actions.ts
│   ├── list-actions.ts
│   └── user-actions.ts
│
├── config/                       # Configuration files
│   ├── site.ts
│   ├── constants.ts
│   └── env.ts
│
├── prisma/                       # Prisma ORM
│   ├── schema.prisma
│   └── seed.ts
│
├── public/                       # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── __tests__/                    # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.local                    # Environment variables
├── .eslintrc.json               # ESLint configuration
├── .prettierrc                  # Prettier configuration
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── next.config.js               # Next.js configuration
├── package.json
└── README.md
```

---

## Global Application Architecture

### Data Flow

```
User Interaction
    ↓
Component (Presentation)
    ↓
Custom Hook / State (Application Logic)
    ↓
Server Action / API Route (Backend Logic)
    ↓
Database Query (Prisma)
    ↓
PostgreSQL Database
    ↓
Response back up the chain
```

### Key Architectural Decisions

#### 1. **Next.js App Router**
- Server Components by default for better performance
- Client Components only when needed (interactivity, hooks)
- Nested layouts for consistent UI structure
- Route groups for logical organization

#### 2. **Server Actions vs API Routes**
- **Server Actions**: For form submissions, mutations
- **API Routes**: For RESTful endpoints, webhooks, external integrations

#### 3. **State Management Strategy**
- **Server State**: React Query / SWR for data fetching and caching
- **Client State**: Zustand for global UI state
- **Local State**: React useState/useReducer for component-specific state
- **Form State**: React Hook Form for complex forms

#### 4. **Authentication Flow**
```
User Login → NextAuth.js → Session Creation → JWT Token
                ↓
    Middleware validates token on protected routes
                ↓
    Session available in Server/Client Components
```

---

## Frontend Architecture

### Component Structure

#### Component Hierarchy
```
Page Component (Server Component)
    ├── Layout Component
    │   ├── Header
    │   ├── Sidebar
    │   └── Footer
    └── Feature Components (Client Components when needed)
        ├── Container Component
        │   ├── Presentational Components
        │   └── UI Components
        └── Business Logic (Hooks, Actions)
```

#### Component Types

1. **Server Components** (Default)
   - Data fetching
   - Static content
   - SEO-critical pages
   - Location: `app/**/*.tsx`

2. **Client Components** (`'use client'`)
   - Interactive elements
   - Event handlers
   - Browser APIs
   - State management
   - Location: `components/**/*.tsx`

3. **UI Components**
   - Reusable, atomic components
   - No business logic
   - Styled with Tailwind CSS
   - Location: `components/ui/**/*.tsx`

## Backend Architecture

### API Route Structure

#### RESTful API Design
```
GET    /api/boards              - Get all boards
POST   /api/boards              - Create board
GET    /api/boards/[id]         - Get board by ID
PATCH  /api/boards/[id]         - Update board
DELETE /api/boards/[id]         - Delete board

GET    /api/boards/[id]/lists   - Get lists in board
POST   /api/boards/[id]/lists   - Create list in board

GET    /api/lists/[id]/cards    - Get cards in list
POST   /api/lists/[id]/cards    - Create card in list

GET    /api/cards/[id]          - Get card by ID
PATCH  /api/cards/[id]          - Update card
DELETE /api/cards/[id]          - Delete card
```

### Error Handling

#### Frontend Error Handling
```typescript
// Use Error Boundaries for React errors
'use client';
```

### Git Workflow

```bash
# Branch naming convention
feature/board-creation
fix/card-drag-drop-bug
refactor/api-error-handling
docs/update-readme

# Commit message format
feat: add board creation functionality
fix: resolve card drag and drop issue
refactor: improve API error handling
docs: update architecture documentation
test: add unit tests for board component
chore: update dependencies

# Commit message structure
<type>(<scope>): <subject>

<body>

<footer>

# Example
feat(board): add ability to change board background

- Implement background color picker
- Add image upload for custom backgrounds
- Update board settings UI

Closes #123
```

### Environment Variables

```bash
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/trello"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# .env.example (committed to repo)
DATABASE_URL=""
NEXTAUTH_URL=""
NEXTAUTH_SECRET=""
```
