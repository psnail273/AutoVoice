# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoVoice is a browser extension that provides text-to-speech services with user authentication and content extraction rules. It consists of two main parts:

1. **Backend** (`backend/`): FastAPI server providing TTS, authentication, and rules management
2. **Frontend** (`frontend/`): WXT-based browser extension with React UI

## Backend (FastAPI + PostgreSQL)

### Tech Stack
- FastAPI with async/await
- PostgreSQL (Neon) via SQLAlchemy 2.0 async + asyncpg
- JWT authentication with bcrypt
- Alembic for migrations

### Development Commands

```bash
# From backend/ directory
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Database migrations
alembic upgrade head  # Apply migrations
alembic revision --autogenerate -m "Description"  # Create new migration

# Development server
fastapi dev src/main.py  # Runs on http://localhost:8000
```

### Project Structure

Backend follows a layered architecture:
- **`src/routers/`**: API endpoint handlers (auth.py, rules.py)
- **`src/models/`**: SQLAlchemy ORM models (user.py, rule.py)
- **`src/schemas/`**: Pydantic request/response schemas
- **`src/services/`**: Business logic (auth.py - password hashing, JWT)
- **`src/tts/`**: Text-to-speech modules (Kokoro TTS)
- **`src/database.py`**: Async database session management
- **`src/dependencies.py`**: FastAPI dependency injection
- **`src/config.py`**: Environment configuration via pydantic-settings
- **`src/main.py`**: Application entry point, CORS, router registration

### API Design Patterns

**HTTP Methods & Status Codes:**
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Return proper status codes (200, 201, 204, 400, 401, 404, etc.)
- Use `Response` or `StreamingResponse` for binary data (audio, files)
- Group related endpoints with router tags

**Pydantic Request/Response Models:**
```python
from pydantic import BaseModel

class MyRequest(BaseModel):
    """Request body with validation."""
    field: str
    optional_field: str | None = None

@router.post("/endpoint")
async def my_endpoint(request: MyRequest):
    # Pydantic auto-validates incoming data
    return {"result": request.field}
```

### Database Patterns

Always use SQLAlchemy 2.0 async with asyncpg driver:

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends
from src.database import get_db

@router.get("/items")
async def get_items(db: AsyncSession = Depends(get_db)):
    # Use async context manager for transaction safety
    result = await db.execute(select(Item))
    return result.scalars().all()
```

**Database connection:**
- Connection string in `DATABASE_URL` environment variable
- Convert `postgres://` to `postgresql+asyncpg://` for async driver
- Use `Depends(get_db)` to inject database sessions into endpoints
- Define all models in `src/models/` directory

### Environment Variables

Backend requires `.env.local` in `backend/` directory:
- `DATABASE_URL`: PostgreSQL connection string (with SSL)
- `SECRET_KEY`: JWT secret (generate with `openssl rand -hex 32`)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration (default: 1440)
- `CORS_ORIGINS`: Comma-separated origins (or `*`)

### API Architecture

- **Authentication** (`/auth/*`): signup, login, /me endpoint
- **Rules** (`/rules/*`): CRUD operations for content extraction rules
- **TTS** (`/text`, `/stream`): Text-to-speech conversion (non-authenticated)
- **Health** (`/health`): Health check

Routes are organized in separate router files and registered with prefixes and tags in `main.py`.

### Security Notes

- Passwords hashed with bcrypt before storage
- JWT tokens with 24-hour expiration
- Users can only access their own rules (enforced in routers)
- Database requires SSL connection

## Frontend (WXT + React + TypeScript)

### Tech Stack
- WXT (Web Extension Tools framework)
- React 19 with hooks
- TypeScript
- Tailwind CSS v4
- shadcn/ui components (Radix UI primitives)

### Development Commands

```bash
# From frontend/ directory
npm install

# Development
npm run dev          # Chrome dev build (loads to .output/chrome-mv3-dev/)
npm run dev:firefox  # Firefox dev build

# Production builds
npm run build          # Chrome production
npm run build:firefox  # Firefox production
npm run zip            # Create Chrome .zip
npm run zip:firefox    # Create Firefox .zip

# Code quality
npm run compile   # TypeScript type checking
npm run lint      # ESLint
npm run lint:fix  # Auto-fix ESLint errors
```

### Project Structure

WXT enforces specific directories:
- **`src/entrypoints/`**: Extension entry points
  - `popup/` - Extension popup (App.tsx, main.tsx, popup.css)
  - `background.ts` - Service worker
  - `content.ts` - Content script
- **`src/components/`**: React components
  - `auth/` - SignIn.tsx, SignUp.tsx
  - `navMenu.tsx/` - Main navigation tabs
  - `playback/` - Audio controls
  - `rules/` - Rules management
  - `options/` - Extension settings
  - `ui/` - Reusable shadcn/ui components
- **`src/hooks/`**: Custom React hooks
  - `use-auth.tsx` - AuthProvider context
  - `use-audio.tsx` - Audio playback
- **`src/lib/`**: Utilities and API client
  - `api.ts` - Backend API client
  - `types.ts` - TypeScript type definitions
  - `utils.ts` - Utility functions (cn helper)

### Browser-Agnostic Development

**CRITICAL**: Always use `browser.*` API (WebExtensions standard), NOT `chrome.*`:

```typescript
// ✅ Correct - browser-agnostic
import { browser } from 'wxt/browser';
await browser.storage.local.set({ key: value });

// ❌ Wrong - Chrome-only
chrome.storage.local.set({ key: value });
```

WXT automatically polyfills `browser.*` for Chrome, Firefox, Edge, and Safari.

### Authentication Architecture

The auth system uses a context provider pattern:

1. **`AuthProvider`** (`hooks/use-auth.tsx`): React context managing auth state
2. JWT tokens stored in `browser.storage.local` (with localStorage fallback for dev)
3. **API Client** (`lib/api.ts`): Handles token storage/retrieval, automatic token attachment
4. Auth flow validates token on app load via `/auth/me` endpoint

```typescript
// API client auto-attaches stored token to requests
const user = await getCurrentUser();  // Uses stored token
await logout();  // Removes token from storage
```

### Styling System

Uses **Mid-Century Modern** theme with warm tones:
- Cream backgrounds
- Mustard gold primary
- Teal accents
- Olive secondary
- Light/dark mode support

Theme defined in `src/entrypoints/popup/popup.css`. Use `cn()` helper for conditional Tailwind classes:

```typescript
import { cn } from '@/lib/utils';

<div className={cn("base-class", conditionalClass && "conditional-class")} />
```

### Component Patterns

**React Component Structure:**
```typescript
import { cn } from "@/lib/utils"

interface MyComponentProps {
  title: string
  className?: string
}

export function MyComponent({ title, className }: MyComponentProps) {
  return (
    <div className={cn("p-4 rounded-lg", className)}>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  )
}
```

**Guidelines:**
- Use functional components with hooks only
- Keep components small and focused
- Extract reusable logic into custom hooks (in `src/hooks/`)
- Define explicit TypeScript types for all props
- Use interfaces for object shapes, types for unions/primitives
- Avoid `any` - use proper types
- Follow shadcn/ui patterns for new components
- Import UI components from `@/components/ui/`
- Use Tailwind utility classes directly in JSX
- Only add necessary Tailwind classes - keep it simple

## Code Style Guidelines

### Backend (Python)
- **Follow PEP 8** conventions
- **Type hints**: Use for all function parameters and return values
- **Async functions**: Use `async def` for all endpoint handlers
- **String formatting**: Prefer f-strings over `.format()` or `%`
- **Docstrings**: Add to all functions explaining purpose and parameters
- **Router organization**: Organize routes in separate files under `src/routers/`
- **Router registration**: Register in `main.py` with appropriate prefixes and tags

### Frontend (TypeScript)
- **Type safety**: Define explicit types, avoid `any`
- **Interfaces vs types**: Use interfaces for object shapes, types for unions/primitives
- **Components**: Functional components with hooks only
- **Styling**: Use `cn()` helper for conditional Tailwind classes
- **Browser APIs**: Import from `wxt/browser` for type safety and cross-browser support
- **Path aliases**: Use `@/` for imports (configured in `wxt.config.ts`)

### General Principles

**Code Quality:**
- Write clear, readable code with meaningful variable and function names
- Keep functions focused and single-purpose
- Add comments only when the "why" isn't obvious from the code
- Prefer explicit over implicit behavior

**Git & Commits:**
- Write descriptive commit messages
- Keep commits atomic and focused on a single change

**Documentation:**
- Document public APIs and complex logic
- Keep README files up to date when adding new features

**Error Handling:**
- Handle errors gracefully with meaningful messages
- Log errors appropriately for debugging
- Avoid exposing sensitive information in error messages

**Security (CRITICAL):**
- Never hardcode secrets, API keys, or credentials - use environment variables
- Sanitize and validate all user input before processing
- Use parameterized queries to prevent SQL injection
- Avoid exposing sensitive information in error messages or logs
- Apply principle of least privilege for permissions and access
- Keep dependencies updated to patch known vulnerabilities
- Review code changes for potential security issues before committing
- Always consider security implications when making any change
