# AutoVoice Frontend

Browser extension frontend for AutoVoice, built with WXT, React, and TypeScript. Provides a popup UI for managing text-to-speech rules and playback controls.

## Tech Stack

- **Framework**: WXT (Web Extension Tools)
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui (Radix UI primitives)

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/               # Authentication components
│   │   │   ├── SignIn.tsx      # Login form
│   │   │   ├── SignUp.tsx      # Registration form
│   │   │   └── index.ts        # Exports
│   │   ├── navMenu.tsx/        # Main navigation tabs
│   │   ├── playback/           # Audio playback controls
│   │   ├── rules/              # Rules management
│   │   ├── options/            # Extension options
│   │   └── ui/                 # Reusable UI components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── tabs.tsx
│   │       └── ...
│   ├── entrypoints/
│   │   ├── popup/              # Extension popup
│   │   │   ├── App.tsx         # Main app component
│   │   │   ├── main.tsx        # React entry point
│   │   │   └── popup.css       # Styles & theme
│   │   ├── background.ts       # Service worker
│   │   └── content.ts          # Content script
│   ├── hooks/
│   │   ├── use-audio.tsx       # Audio playback hook
│   │   └── use-auth.tsx        # Authentication context
│   └── lib/
│       ├── api.ts              # Backend API client
│       ├── types.ts            # TypeScript types
│       ├── data.ts             # Default data
│       └── utils.ts            # Utility functions
├── public/                     # Static assets
├── wxt.config.ts               # WXT configuration
├── tsconfig.json               # TypeScript config
└── package.json                # Dependencies
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

This will:
- Start the WXT dev server at `http://localhost:3000`
- Build the extension to `.output/chrome-mv3-dev/`
- Watch for file changes and rebuild automatically

### 3. Load Extension in Browser

**Chrome/Edge:**
1. Go to `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `.output/chrome-mv3-dev/` folder

**Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in `.output/firefox-mv2-dev/`

## Building for Production

```bash
# Build for Chrome
npm run build

# Build for Firefox
npm run build:firefox

# Create distributable zip
npm run zip
npm run zip:firefox
```

## Authentication System

The extension includes a complete authentication flow:

### Components

- **`AuthProvider`** (`hooks/use-auth.tsx`): React context that manages auth state
- **`SignIn`** (`components/auth/SignIn.tsx`): Login form
- **`SignUp`** (`components/auth/SignUp.tsx`): Registration form

### API Client (`lib/api.ts`)

The API client handles:
- JWT token storage in `browser.storage.local` (browser-agnostic)
- Automatic token attachment to authenticated requests
- Fallback to `localStorage` for development/testing

**Auth Functions:**
```typescript
signup(username, email, password)  // Create account
login(username, password)          // Login
logout()                           // Clear token
getCurrentUser()                   // Get user profile
isAuthenticated()                  // Check auth status
```

**Rules Functions:**
```typescript
getRules()              // List user's rules
createRule(rule)        // Create rule
getRule(id)             // Get single rule
updateRule(id, rule)    // Update rule
deleteRule(id)          // Delete rule
```

### Authentication Flow

```
App Loads
    │
    ▼
AuthProvider checks for stored token
    │
    ├─ No token ──────────► Show SignIn/SignUp
    │                              │
    │                              ▼
    │                        User submits form
    │                              │
    │                              ▼
    │                        API returns JWT
    │                              │
    │                              ▼
    │                        Token stored in
    │                        browser.storage.local
    │                              │
    └─ Token exists ──────────────┴──► Validate with /auth/me
                                              │
                                   ┌──────────┴──────────┐
                                   │                     │
                                Valid                 Invalid
                                   │                     │
                                   ▼                     ▼
                              Show Main App        Clear token
                              (NavMenu)            Show SignIn
```

## Browser Storage

The extension uses the WebExtensions `browser.storage.local` API for token persistence:

```typescript
import { browser } from 'wxt/browser';

// Store token
await browser.storage.local.set({ authToken: token });

// Retrieve token
const result = await browser.storage.local.get('authToken');

// Remove token
await browser.storage.local.remove('authToken');
```

This is browser-agnostic and works across Chrome, Firefox, Edge, and Safari.

## Styling

The extension uses a custom **Mid-Century Modern** theme with:
- Warm cream backgrounds
- Mustard gold primary color
- Teal accents
- Olive secondary color
- Both light and dark mode support

Theme variables are defined in `src/entrypoints/popup/popup.css`.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (Chrome) |
| `npm run dev:firefox` | Start dev server (Firefox) |
| `npm run build` | Production build (Chrome) |
| `npm run build:firefox` | Production build (Firefox) |
| `npm run zip` | Create Chrome extension zip |
| `npm run zip:firefox` | Create Firefox extension zip |
| `npm run compile` | TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |

## Configuration

### Backend URL

The backend API URL is configured in `src/lib/api.ts`:

```typescript
const API_BASE_URL = 'http://localhost:8000';
```

For production, update this to your deployed backend URL.

### Extension Manifest

WXT auto-generates the manifest. Configuration is in `wxt.config.ts`.

## Development Notes

- The popup has a minimum size of 700x600px (set in `popup.css`)
- Use `cn()` helper for conditional Tailwind classes
- Follow shadcn/ui patterns for new components
- Use `browser.*` API (not `chrome.*`) for browser-agnostic code
