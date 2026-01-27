# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoVoice is a browser extension that converts web page content to speech using a custom TTS backend. Users can define "rules" that specify which parts of a page to read using CSS selectors, enabling targeted content extraction and audio generation.

- **Backend** (`backend/`): FastAPI server providing TTS, authentication, and rules management
- **Frontend** (`frontend/`): WXT-based browser extension with React UI

## Backend (FastAPI + PostgreSQL)

### Development Commands

**Do not run `fastapi dev src/main.py`** - the user will manage the dev server themselves.

```bash
# From backend/ directory
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Database migrations
alembic upgrade head                              # Apply migrations
alembic revision --autogenerate -m "Description"  # Create new migration

# Development server (user-managed)
fastapi dev src/main.py  # Runs on http://localhost:8000
```

### Environment Variables

Backend requires `.env.local` in `backend/` directory:
- `DATABASE_URL`: PostgreSQL connection string (with SSL)
- `SECRET_KEY`: JWT secret (generate with `openssl rand -hex 32`)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration (default: 1440)
- `CORS_ORIGINS`: Comma-separated origins (or `*`)
- `RESEND_KEY`: Resend API key for email service
- `RESEND_DOMAIN`: Domain configured in Resend for sending emails

### API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/signup` | POST | No | Create account, returns JWT |
| `/auth/login` | POST | No | Authenticate, returns JWT |
| `/auth/me` | GET | Yes | Get current user profile |
| `/rules` | GET | Yes | List user's rules |
| `/rules` | POST | Yes | Create new rule |
| `/rules/{id}` | GET/PUT/DELETE | Yes | CRUD single rule |
| `/text` | POST | No | Convert text to WAV (full file) |
| `/stream` | POST | No | Stream text as MP3 chunks |
| `/health` | GET | No | Health check |

### Database Patterns

Always use SQLAlchemy 2.0 async with asyncpg driver:

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends
from src.database import get_db

@router.get("/items")
async def get_items(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item))
    return result.scalars().all()
```

- Convert `postgres://` to `postgresql+asyncpg://` for async driver
- Use `Depends(get_db)` to inject database sessions

### Code Style (Python)

- Follow PEP 8, use type hints for all function parameters and return values
- Use `async def` for all endpoint handlers
- Prefer f-strings for string formatting
- Organize routes in `src/routers/`, register in `main.py` with prefixes and tags

## Frontend (WXT + React + TypeScript)

### Development Commands

**Do not run `npm run dev` or `npm run start`** - the user will manage the dev server themselves.

```bash
# From frontend/ directory
npm install

# Development (user-managed)
npm run dev          # Chrome dev build
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

### Environment Variables

Frontend uses `.env` file (not committed):
- `VITE_API_URL`: Backend URL (default: http://localhost:8000)

### Browser-Agnostic Development

**CRITICAL**: Always use `browser.*` API (WebExtensions standard), NOT `chrome.*`:

```typescript
// ✅ Correct
import { browser } from 'wxt/browser';
await browser.storage.local.set({ key: value });

// ❌ Wrong - Chrome-only
chrome.storage.local.set({ key: value });
```

### Code Style (TypeScript)

- Define explicit types, avoid `any`
- Use interfaces for object shapes, types for unions/primitives
- Use `cn()` helper (from `@/lib/utils`) for conditional Tailwind classes
- Use `@/` path aliases for imports
- Follow shadcn/ui patterns, import from `@/components/ui/`

## Architecture

### Extension Entry Points

| File | Context | Purpose |
|------|---------|---------|
| `src/entrypoints/popup/App.tsx` | Popup | Main UI (auth, rules, playback controls) |
| `src/entrypoints/background.ts` | Background | Audio stream proxy, cross-tab coordination, context menus |
| `src/entrypoints/content.ts` | Content | DOM interaction, text extraction, audio playback |

### Text-to-Speech Flow

```
┌──────────┐  1. loadAndPlay()   ┌────────────┐
│  Popup   │ ──────────────────► │ Background │
└──────────┘                     └────────────┘
                                       │
                                       │ 2. AUDIO_LOAD_COMMAND
                                       ▼
                                ┌──────────────┐
                                │Content Script│
                                └──────────────┘
                                       │
     3. EXTRACT_TEXT                   │
     (get page content)                │
                                       ▼
                                ┌──────────────┐
                                │  Page DOM    │
                                │ (selectors)  │
                                └──────────────┘
                                       │
                                       │ 4. extracted text
                                       ▼
┌──────────────┐  5. port: start  ┌────────────┐
│Content Script│ ───────────────► │ Background │
│(AudioPlayer) │                  │  (proxy)   │
└──────────────┘                  └────────────┘
                                       │
                                       │ 6. POST /stream
                                       ▼
                                 ┌─────────┐
                                 │ Backend │
                                 │  (TTS)  │
                                 └─────────┘
                                       │
                                       │ 7. MP3 chunks
                                       ▼
┌──────────────┐  8. port: chunk  ┌────────────┐
│Content Script│ ◄─────────────── │ Background │
│(MediaSource) │                  └────────────┘
└──────────────┘
       │
       │ 9. AUDIO_STATE_UPDATE
       ▼
┌──────────────┐
│   Popup      │ (updates UI)
└──────────────┘
```

**Why Background Proxies Audio**: Content scripts cannot directly fetch from the backend due to CORS restrictions. The background script acts as a proxy: content script connects via `browser.runtime.connect()`, background fetches from `/stream` endpoint and forwards chunks through the port.

### Rules System

Rules define how to extract content from specific websites:

```typescript
interface Rule {
  url_pattern: string;      // e.g., "https://example.com/*"
  keep_selectors: string[]; // CSS selectors to extract
  ignore_selectors: string[]; // CSS selectors to exclude
  enabled: boolean;
  auto_extract: boolean;
}
```

**Extraction Algorithm** (in `content.ts`):
1. If `keep_selectors` provided, query those elements
2. Clone each element (avoid DOM mutation)
3. Remove any `ignore_selectors` from clones
4. Extract and combine `textContent`
5. Clean whitespace

### Message Types

All messages defined in `src/lib/messages.ts`:

| Message Type | Direction | Purpose |
|--------------|-----------|---------|
| `GET_SELECTOR_FOR_SELECTION` | Background → Content | Get CSS selector for right-clicked element |
| `EXTRACT_TEXT` | Popup → Content | Extract text using rule selectors |
| `AUDIO_LOAD` | Any → Content | Load and play audio from text |
| `AUDIO_PLAY/PAUSE/STOP` | Any → Content | Playback control |
| `AUDIO_STATE_UPDATE` | Content → Background/Popup | Broadcast current state |
| `AUDIO_COMMAND` | Popup → Background | Route command to active audio tab |
| `AUDIO_LOAD_COMMAND` | Popup → Background | Load audio on specific tab |

### Storage Keys

Browser extension storage (`browser.storage.local`):

| Key | Purpose |
|-----|---------|
| `authToken` | JWT access token |
| `cachedRules` | Offline rules cache |
| `pendingRule` | Pre-fill data for AddRule form |
| `audioPlaybackState` | Persisted audio state |

## Adding New Features

### Adding a New API Endpoint

1. Create/update router in `backend/src/routers/`
2. Add Pydantic schemas in `backend/src/schemas/`
3. Register router in `backend/src/main.py` if new file
4. Add API function in `frontend/src/lib/api.ts`
5. Create/update React hook if stateful

### Adding a New Extension Message

1. Define message interface in `frontend/src/lib/messages.ts`
2. Add to `ExtensionMessage` union type
3. Handle in `background.ts` and/or `content.ts`
4. Use from popup via `browser.runtime.sendMessage()`

### Adding a New Database Model

1. Create model in `backend/src/models/`
2. Add relationship to existing models if needed
3. Create Alembic migration: `alembic revision --autogenerate -m "description"`
4. Run migration: `alembic upgrade head`
5. Create schemas in `backend/src/schemas/`
6. Create router in `backend/src/routers/`
