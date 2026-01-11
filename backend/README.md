# AutoVoice Backend

FastAPI backend for the AutoVoice browser extension, providing text-to-speech services, user authentication, and rules management.

## Tech Stack

- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (Neon) with SQLAlchemy 2.0 async
- **Authentication**: JWT tokens with bcrypt password hashing
- **Migrations**: Alembic

## Project Structure

```
backend/
├── alembic/                    # Database migrations
│   ├── versions/               # Migration files
│   └── env.py                  # Migration environment config
├── src/
│   ├── models/                 # SQLAlchemy models
│   │   ├── user.py             # User model
│   │   └── rule.py             # Rule model
│   ├── routers/                # API route handlers
│   │   ├── auth.py             # Authentication endpoints
│   │   └── rules.py            # Rules CRUD endpoints
│   ├── schemas/                # Pydantic request/response models
│   │   ├── user.py             # Auth schemas
│   │   └── rule.py             # Rule schemas
│   ├── services/               # Business logic
│   │   └── auth.py             # Password hashing, JWT tokens
│   ├── tts/                    # Text-to-speech modules
│   ├── config.py               # Environment configuration
│   ├── database.py             # Database connection
│   ├── dependencies.py         # FastAPI dependencies
│   └── main.py                 # Application entry point
├── alembic.ini                 # Alembic configuration
└── requirements.txt            # Python dependencies
```

## Setup

### 1. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env.local` file in the `backend/` directory:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# JWT Secret - generate with: openssl rand -hex 32
SECRET_KEY=your-secret-key-here

# Token expiration (minutes) - default 24 hours
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS origins (comma-separated)
CORS_ORIGINS=*
```

### 4. Run Database Migrations

```bash
alembic upgrade head
```

### 5. Start Development Server

```bash
fastapi dev src/main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/signup` | Create new account | No |
| POST | `/auth/login` | Login and get JWT token | No |
| GET | `/auth/me` | Get current user profile | Yes |

### Rules

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/rules` | List all user's rules | Yes |
| POST | `/rules` | Create a new rule | Yes |
| GET | `/rules/{id}` | Get specific rule | Yes |
| PUT | `/rules/{id}` | Update a rule | Yes |
| DELETE | `/rules/{id}` | Delete a rule | Yes |

### Text-to-Speech

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/text` | Convert text to WAV audio | No |
| POST | `/stream` | Stream audio as it generates | No |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

## API Documentation

When running, interactive API docs are available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Authentication Flow

1. **Signup**: `POST /auth/signup` with `{username, email, password}`
   - Returns JWT access token
   - Password is hashed with bcrypt before storage

2. **Login**: `POST /auth/login` with `{username, password}`
   - Returns JWT access token
   - Username can be either username or email

3. **Authenticated Requests**: Include header `Authorization: Bearer <token>`

## Database Models

### User

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| username | String(50) | Unique username |
| email | String(255) | Unique email |
| hashed_password | String(255) | bcrypt hash |
| created_at | DateTime | Account creation time |
| updated_at | DateTime | Last update time |

### Rule

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| user_id | Integer | Foreign key to users |
| url_pattern | String(500) | URL pattern to match |
| keep_selectors | String[] | CSS selectors to keep |
| ignore_selectors | String[] | CSS selectors to ignore |
| enabled | Boolean | Whether rule is active |
| auto_extract | Boolean | Auto-extract content |
| created_at | DateTime | Creation time |
| updated_at | DateTime | Last update time |

## Creating New Migrations

After modifying models:

```bash
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

## Security Notes

- Passwords are hashed using bcrypt (never stored in plain text)
- JWT tokens expire after 24 hours by default
- Users can only access their own rules (enforced at API level)
- SSL is required for database connections
- Keep `SECRET_KEY` secure and never commit it to git
