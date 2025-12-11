# Architecture Documentation

## Table of Contents
1. [Project Structure](#project-structure)
2. [Global Application Architecture](#global-application-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Coding Standards & Style Guide](#coding-standards--style-guide)
6. [Naming Conventions](#naming-conventions)
7. [Best Practices](#best-practices)

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

### Architecture Pattern
The application follows a **modular, layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│            (React Components + UI Logic)                 │
├─────────────────────────────────────────────────────────┤
│                   Application Layer                      │
│         (Hooks, State Management, Business Logic)        │
├─────────────────────────────────────────────────────────┤
│                      API Layer                           │
│              (Next.js API Routes + Actions)              │
├─────────────────────────────────────────────────────────┤
│                    Data Access Layer                     │
│                  (Prisma ORM + Database)                 │
├─────────────────────────────────────────────────────────┤
│                     Database Layer                       │
│                      (PostgreSQL)                        │
└─────────────────────────────────────────────────────────┘
```

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

### Component Pattern Example

```typescript
// components/board/board-card.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/types';
import { useCardStore } from '@/store/card-store';
import { Button } from '@/components/ui/button';

interface BoardCardProps {
  card: Card;
  onEdit?: (id: string) => void;
}

export function BoardCard({ card, onEdit }: BoardCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const updateCard = useCardStore((state) => state.updateCard);

  const handleEdit = () => {
    onEdit?.(card.id);
  };

  return (
    <div
      className="board-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3>{card.title}</h3>
      {isHovered && <Button onClick={handleEdit}>Edit</Button>}
    </div>
  );
}
```

### State Management Architecture

#### Zustand Store Pattern
```typescript
// store/board-store.ts
import { create } from 'zustand';
import { Board } from '@/types';

interface BoardState {
  boards: Board[];
  currentBoard: Board | null;
  setBoards: (boards: Board[]) => void;
  setCurrentBoard: (board: Board | null) => void;
  addBoard: (board: Board) => void;
  updateBoard: (id: string, data: Partial<Board>) => void;
  deleteBoard: (id: string) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  boards: [],
  currentBoard: null,
  setBoards: (boards) => set({ boards }),
  setCurrentBoard: (board) => set({ currentBoard: board }),
  addBoard: (board) => set((state) => ({ boards: [...state.boards, board] })),
  updateBoard: (id, data) =>
    set((state) => ({
      boards: state.boards.map((b) => (b.id === id ? { ...b, ...data } : b)),
    })),
  deleteBoard: (id) =>
    set((state) => ({ boards: state.boards.filter((b) => b.id !== id) })),
}));
```

### Custom Hooks Pattern

```typescript
// hooks/use-board.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoard, updateBoard } from '@/actions/board-actions';

export function useBoard(boardId: string) {
  const queryClient = useQueryClient();

  const { data: board, isLoading, error } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => getBoard(boardId),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Board>) => updateBoard(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  return {
    board,
    isLoading,
    error,
    updateBoard: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
```

---

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

#### API Route Pattern
```typescript
// app/api/boards/[boardId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { boardSchema } from '@/lib/validations/board';

export async function GET(
  req: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Authorization
    const board = await prisma.board.findUnique({
      where: { id: params.boardId },
      include: { members: true },
    });

    if (!board || !board.members.some((m) => m.userId === session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Business Logic
    const data = await prisma.board.findUnique({
      where: { id: params.boardId },
      include: {
        lists: {
          include: {
            cards: {
              include: { assignees: true, labels: true },
            },
          },
        },
      },
    });

    // 4. Response
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching board:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validation
    const body = await req.json();
    const validatedData = boardSchema.partial().parse(body);

    // Update
    const updatedBoard = await prisma.board.update({
      where: { id: params.boardId },
      data: validatedData,
    });

    return NextResponse.json(updatedBoard);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

### Server Actions Pattern

```typescript
// actions/board-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';
import { boardSchema } from '@/lib/validations/board';

export async function createBoard(formData: FormData) {
  const session = await getServerSession();
  if (!session) throw new Error('Unauthorized');

  const data = {
    name: formData.get('name'),
    description: formData.get('description'),
  };

  const validated = boardSchema.parse(data);

  const board = await prisma.board.create({
    data: {
      ...validated,
      ownerId: session.user.id,
    },
  });

  revalidatePath('/boards');
  return board;
}

export async function updateBoard(boardId: string, data: Partial<Board>) {
  const session = await getServerSession();
  if (!session) throw new Error('Unauthorized');

  const validated = boardSchema.partial().parse(data);

  const board = await prisma.board.update({
    where: { id: boardId },
    data: validated,
  });

  revalidatePath(`/boards/${boardId}`);
  return board;
}
```

### Database Schema (Prisma)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String
  avatar        String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  ownedBoards   Board[]   @relation("BoardOwner")
  memberBoards  BoardMember[]
  assignedCards CardAssignee[]
  comments      Comment[]
  
  @@map("users")
}

model Board {
  id          String    @id @default(cuid())
  name        String
  description String?
  background  String?
  visibility  String    @default("private")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  ownerId     String
  owner       User      @relation("BoardOwner", fields: [ownerId], references: [id])
  
  lists       List[]
  members     BoardMember[]
  
  @@map("boards")
}

model BoardMember {
  id        String   @id @default(cuid())
  role      String   @default("member")
  joinedAt  DateTime @default(now())
  
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  
  @@unique([boardId, userId])
  @@map("board_members")
}

model List {
  id        String   @id @default(cuid())
  name      String
  position  Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  
  cards     Card[]
  
  @@map("lists")
}

model Card {
  id          String   @id @default(cuid())
  title       String
  description String?
  position    Int
  dueDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  listId      String
  list        List     @relation(fields: [listId], references: [id], onDelete: Cascade)
  
  assignees   CardAssignee[]
  labels      CardLabel[]
  checklists  Checklist[]
  attachments Attachment[]
  comments    Comment[]
  
  @@map("cards")
}

model CardAssignee {
  id        String   @id @default(cuid())
  
  cardId    String
  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  
  @@unique([cardId, userId])
  @@map("card_assignees")
}

model Label {
  id        String   @id @default(cuid())
  name      String
  color     String
  
  cards     CardLabel[]
  
  @@map("labels")
}

model CardLabel {
  id        String   @id @default(cuid())
  
  cardId    String
  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  
  labelId   String
  label     Label    @relation(fields: [labelId], references: [id])
  
  @@unique([cardId, labelId])
  @@map("card_labels")
}

model Checklist {
  id        String   @id @default(cuid())
  title     String
  position  Int
  
  cardId    String
  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  
  items     ChecklistItem[]
  
  @@map("checklists")
}

model ChecklistItem {
  id          String    @id @default(cuid())
  content     String
  isCompleted Boolean   @default(false)
  position    Int
  
  checklistId String
  checklist   Checklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  
  @@map("checklist_items")
}

model Attachment {
  id        String   @id @default(cuid())
  name      String
  url       String
  type      String
  size      Int
  uploadedAt DateTime @default(now())
  
  cardId    String
  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  
  @@map("attachments")
}

model Comment {
  id        String   @id @default(cuid())
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  cardId    String
  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  
  @@map("comments")
}
```

---

## Coding Standards & Style Guide

### TypeScript Standards

#### Type Definitions
```typescript
// types/board.ts

// Use interfaces for object shapes
export interface Board {
  id: string;
  name: string;
  description: string | null;
  background: string | null;
  visibility: 'private' | 'public' | 'team';
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  lists?: List[];
  members?: BoardMember[];
}

// Use types for unions, intersections, utilities
export type BoardVisibility = 'private' | 'public' | 'team';
export type BoardWithLists = Board & { lists: List[] };
export type CreateBoardInput = Omit<Board, 'id' | 'createdAt' | 'updatedAt'>;

// Use enums sparingly, prefer union types
export const BOARD_VISIBILITY = {
  PRIVATE: 'private',
  PUBLIC: 'public',
  TEAM: 'team',
} as const;
```

#### Strict Type Safety
```typescript
// Enable strict mode in tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}

// Always type function parameters and returns
function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// Use type guards
function isBoard(obj: unknown): obj is Board {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj
  );
}
```

### React Best Practices

#### Component Organization
```typescript
// 1. Imports (grouped and ordered)
import { useState, useEffect, useMemo } from 'react'; // React
import { useRouter } from 'next/navigation'; // Next.js
import { useQuery } from '@tanstack/react-query'; // Third-party
import { Button } from '@/components/ui/button'; // Internal components
import { useBoard } from '@/hooks/use-board'; // Hooks
import { Board } from '@/types'; // Types
import { cn } from '@/lib/utils/cn'; // Utils

// 2. Types/Interfaces
interface BoardListProps {
  boards: Board[];
  onSelect?: (board: Board) => void;
  className?: string;
}

// 3. Component
export function BoardList({ boards, onSelect, className }: BoardListProps) {
  // 3a. Hooks (in order)
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ ... });

  // 3b. Computed values
  const sortedBoards = useMemo(
    () => boards.sort((a, b) => a.name.localeCompare(b.name)),
    [boards]
  );

  // 3c. Effects
  useEffect(() => {
    // Effect logic
  }, []);

  // 3d. Event handlers
  const handleSelect = (board: Board) => {
    setSelectedId(board.id);
    onSelect?.(board);
  };

  // 3e. Early returns
  if (isLoading) return <LoadingSpinner />;
  if (!boards.length) return <EmptyState />;

  // 3f. Render
  return (
    <div className={cn('board-list', className)}>
      {sortedBoards.map((board) => (
        <BoardCard
          key={board.id}
          board={board}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
```

#### Hooks Guidelines
```typescript
// Custom hooks should start with 'use'
// Should be pure and reusable
// Should handle their own error states

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);
```

### Styling Guidelines

#### Tailwind CSS Standards
```typescript
// Use Tailwind utility classes
<div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
  <h2 className="text-xl font-semibold text-gray-900">Board Title</h2>
</div>

// Use cn utility for conditional classes
import { cn } from '@/lib/utils/cn';

<button
  className={cn(
    'rounded-md px-4 py-2 font-medium',
    isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700',
    disabled && 'opacity-50 cursor-not-allowed'
  )}
>
  Click me
</button>

// Create component variants with class-variance-authority
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
        ghost: 'hover:bg-gray-100',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  // ... other props
}
```

### Error Handling

#### Frontend Error Handling
```typescript
// Use Error Boundaries for React errors
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>;
    }

    return this.props.children;
  }
}

// Try-catch in async functions
async function fetchBoard(id: string) {
  try {
    const response = await fetch(`/api/boards/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch board:', error);
    throw error; // Re-throw or handle appropriately
  }
}
```

#### Backend Error Handling
```typescript
// Custom error classes
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

// Global error handler utility
export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.errors },
      { status: 400 }
    );
  }

  console.error('Unexpected error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

---

## Naming Conventions

### File Naming
```
✅ Correct:
- board-card.tsx (kebab-case for components)
- use-board.ts (kebab-case for hooks)
- board-actions.ts (kebab-case for utilities)
- BoardCard.tsx (PascalCase acceptable for components)
- page.tsx (Next.js convention)
- route.ts (Next.js convention)

❌ Incorrect:
- boardCard.tsx (camelCase)
- Board_Card.tsx (snake_case)
- BOARD-CARD.tsx (UPPER-CASE)
```

### Variable Naming
```typescript
// Use camelCase for variables and functions
const boardName = 'My Board';
const userId = '123';

function calculateProgress() { }
function handleSubmit() { }

// Use PascalCase for classes and components
class BoardManager { }
function BoardCard() { }

// Use UPPER_SNAKE_CASE for constants
const API_BASE_URL = 'https://api.example.com';
const MAX_BOARD_NAME_LENGTH = 100;

// Use descriptive names
✅ const isCardDragging = true;
❌ const isDragging = true; // Too vague

✅ const filteredBoards = boards.filter(...);
❌ const arr = boards.filter(...);

// Boolean variables should be prefixed with is/has/should
const isLoading = true;
const hasPermission = false;
const shouldRender = true;

// Event handlers should start with 'handle'
const handleClick = () => { };
const handleSubmit = () => { };
const handleCardDrop = () => { };

// Arrays should be plural
const boards = [];
const cards = [];
const users = [];
```

### Function Naming
```typescript
// Use verb + noun pattern
function getBoard(id: string) { }
function createCard(data: CardData) { }
function updateList(id: string, data: ListData) { }
function deleteBoard(id: string) { }
function fetchUserBoards() { }

// Boolean-returning functions
function isValidEmail(email: string): boolean { }
function hasPermission(userId: string): boolean { }
function canEditBoard(boardId: string): boolean { }

// Async functions should indicate async nature if not obvious
async function fetchBoards() { } // 'fetch' implies async
async function loadUserData() { } // 'load' implies async
```

### Component Naming
```typescript
// Use PascalCase
export function BoardCard() { }
export function CardDetailModal() { }
export function UserAvatar() { }

// Props interface should match component name + Props
interface BoardCardProps { }
interface CardDetailModalProps { }
interface UserAvatarProps { }

// Specialized component variants
export function BoardCardSkeleton() { }
export function BoardCardError() { }
```

---

## Best Practices

### Performance Optimization

```typescript
// 1. Use React.memo for expensive components
import { memo } from 'react';

export const BoardCard = memo(function BoardCard({ board }: BoardCardProps) {
  return <div>{board.name}</div>;
});

// 2. Use useMemo for expensive computations
const sortedAndFilteredBoards = useMemo(() => {
  return boards
    .filter((board) => board.name.includes(searchTerm))
    .sort((a, b) => a.name.localeCompare(b.name));
}, [boards, searchTerm]);

// 3. Use useCallback for functions passed as props
const handleCardClick = useCallback((cardId: string) => {
  setSelectedCard(cardId);
}, []);

// 4. Lazy load components
import dynamic from 'next/dynamic';

const CardDetailModal = dynamic(() => import('@/components/card/card-detail-modal'), {
  loading: () => <LoadingSpinner />,
});

// 5. Optimize images
import Image from 'next/image';

<Image
  src="/board-bg.jpg"
  alt="Board background"
  width={800}
  height={600}
  priority={false}
  placeholder="blur"
/>
```

### Security Best Practices

```typescript
// 1. Validate all inputs with Zod
import { z } from 'zod';

const boardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(['private', 'public', 'team']),
});

// 2. Sanitize user input
import DOMPurify from 'isomorphic-dompurify';

const sanitizedContent = DOMPurify.sanitize(userInput);

// 3. Use environment variables for secrets
const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error('API_KEY is not defined');

// 4. Implement rate limiting
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

// 5. Always validate session/authentication
const session = await getServerSession();
if (!session) {
  throw new UnauthorizedError();
}
```

### Testing Standards

```typescript
// Unit test example (Jest + React Testing Library)
// __tests__/components/board-card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BoardCard } from '@/components/board/board-card';

describe('BoardCard', () => {
  const mockBoard = {
    id: '1',
    name: 'Test Board',
    description: 'Test description',
  };

  it('renders board name', () => {
    render(<BoardCard board={mockBoard} />);
    expect(screen.getByText('Test Board')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const handleEdit = jest.fn();
    render(<BoardCard board={mockBoard} onEdit={handleEdit} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    expect(handleEdit).toHaveBeenCalledWith('1');
  });
});

// Integration test example
describe('Board API', () => {
  it('should create a new board', async () => {
    const response = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Board',
        description: 'Test board',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.name).toBe('New Board');
  });
});
```

### Code Documentation

```typescript
/**
 * Represents a board in the Trello application.
 * A board contains multiple lists and can be shared with team members.
 */
export interface Board {
  /** Unique identifier for the board */
  id: string;
  /** Display name of the board */
  name: string;
  /** Optional description providing context */
  description: string | null;
  // ... rest of properties
}

/**
 * Fetches a board by ID with all associated lists and cards.
 * 
 * @param boardId - The unique identifier of the board
 * @returns Promise resolving to the board data or null if not found
 * @throws {UnauthorizedError} If the user doesn't have access
 * @throws {NotFoundError} If the board doesn't exist
 * 
 * @example
 * ```typescript
 * const board = await getBoard('board-123');
 * console.log(board.name);
 * ```
 */
export async function getBoard(boardId: string): Promise<Board | null> {
  // Implementation
}
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

```typescript
// config/env.ts - Type-safe environment variables
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const env = envSchema.parse(process.env);
```

---

## Code Review Checklist

### Before Submitting PR
- [ ] Code follows style guide and naming conventions
- [ ] All TypeScript types are properly defined
- [ ] Components are properly organized and documented
- [ ] Error handling is implemented
- [ ] Tests are written and passing
- [ ] No console.logs or debugging code
- [ ] Environment variables are documented
- [ ] Performance optimizations applied where needed
- [ ] Accessibility considerations addressed
- [ ] Security best practices followed

### Reviewing PR
- [ ] Code is readable and maintainable
- [ ] Logic is sound and efficient
- [ ] Edge cases are handled
- [ ] No unnecessary dependencies added
- [ ] Breaking changes are documented
- [ ] Database migrations are safe
- [ ] API changes are backward compatible
- [ ] UI/UX is consistent with design

---

**Document Version:** 1.0  
**Last Updated:** December 11, 2025  
**Status:** Living Document
