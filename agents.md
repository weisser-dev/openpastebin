# OpenPasteBin - Agent Guide

## Project Overview
Modern open-source pastebin application with a React frontend and Node.js backend, using MongoDB for storage.

## Architecture

### Stack
- **Frontend**: React 18 + Vite + highlight.js + Modern CSS
- **Backend**: Node.js + Express + MongoDB + AES-256-GCM + bcrypt + Multer
- **Proxy**: Caddy reverse proxy
- **Container**: Docker Compose
- **Encryption**: AES-256-GCM for all paste content (application-level encryption)

### Deployment
- Frontend: `paste.weisser.dev` → `openpastebin-frontend:80`
- Backend API: `api.paste.weisser.dev` → `openpastebin-backend:5000`
- Caddy handles reverse proxy with gzip/zstd compression

## Project Structure

```
/opt/openpastebin/
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── index.css        # TailwindCSS styles
│   │   └── main.jsx
│   ├── Dockerfile           # Nginx-based frontend image
│   └── package.json
├── backend/
│   ├── server.js            # Express server + MongoDB
│   ├── Dockerfile           # Node.js backend image
│   └── package.json
├── docker-compose.yml       # Container orchestration
└── README.md
```

## Key Files

### docker-compose.yml
- **Networks**: `pastebin-network` (internal), `caddy-net` (external)
- **Volumes**: `mongodb_data` for persistence
- **Health checks**: MongoDB and backend have health checks
- **Important**: Frontend does NOT expose port 80 externally (only internal) - Caddy handles external access

### backend/server.js
- Express server on port 5000
- MongoDB connection: `mongodb://mongodb:27017/openpastebin`
- **AES-256-GCM encryption**: All paste content encrypted before storage with `encrypt()` / `decrypt()` functions
- bcrypt for password hashing (10 rounds) and edit password protection
- Multer for file uploads (5MB max, programming files only)
- Automatic language detection from content (auto re-detection after edits)
- Health endpoint: `/api/health`
- **Encryption key**: 32-byte hex key from ENCRYPTION_KEY environment variable
- Main endpoints:
  - `POST /api/paste` - Create new paste (supports password, split, maxViews, customUrl, allowEdit, editPassword)
  - `GET /api/paste/:id` - Get paste by ID (checks password protection, returns allowEdit flag)
  - `POST /api/paste/:id/verify` - Verify password and get content
  - `PUT /api/paste/:id` - Edit paste content (requires allowEdit=true, optional editPassword verification)
  - `POST /api/upload` - Upload file
  - `GET /api/raw/:id` - Get raw content
  - `DELETE /api/paste/:id` - Delete paste
  - `GET /api/stats` - Get statistics

### frontend/src/App.jsx
- Single-page React app
- API calls to backend (uses relative paths, Caddy proxies)
- highlight.js for syntax highlighting (15+ languages)
- Auto language detection from content
- Security features:
  - Password protection with bcrypt
  - Split token (content split into 2 parts)
  - Burn after read (max views)
  - Custom short URLs
  - Paste editing with optional edit password
  - Security modal for sensitive data detection
- UI features:
  - Light/Dark theme toggle with animated moon/sun transition
  - View Transitions API for smooth theme changes
  - PWA support with full favicon set
  - Modern CSS with GitHub Dark/Light themes
  - Desktop-optimized responsive layout
- LocalStorage for user preferences (theme, security warnings)

## Development Workflow

### Docker Commands
```bash
# Start all services
docker compose up -d

# Check status
docker ps -a

# View logs
docker logs openpastebin-frontend
docker logs openpastebin-backend
docker logs openpastebin-mongodb

# Restart services
docker compose restart

# Stop all services
docker compose down

# Rebuild and restart
docker compose up -d --build
```

### Making Changes

1. **Frontend changes**: Edit files in `frontend/src/`, then rebuild:
   ```bash
   docker compose up -d --build frontend
   ```

2. **Backend changes**: Edit `backend/server.js`, then rebuild:
   ```bash
   docker compose up -d --build backend
   ```

3. **Docker config changes**: Edit `docker-compose.yml`, then:
   ```bash
   docker compose down && docker compose up -d
   ```

## Common Issues

### Port Conflicts
- **Problem**: Port 80 already allocated
- **Cause**: Caddy or another service already using port 80
- **Solution**: Frontend should NOT expose port 80 externally in docker-compose.yml

### Container Not Starting
- Check logs: `docker logs <container-name>`
- Check health status: `docker ps -a`
- Verify dependencies (MongoDB must be healthy before backend starts)

### MongoDB Connection Issues
- Backend depends on MongoDB health check
- Connection string: `mongodb://mongodb:27017/openpastebin`
- Container name must match: `openpastebin-mongodb`

## Git Workflow

Current branch: `main`

Modified files (not committed yet):
- README.md
- backend/server.js
- docker-compose.yml
- frontend/src/App.jsx
- frontend/src/index.css

## Recent Changes

### ✅ PROJECT STATUS: FEATURE-COMPLETE (2026-03-22)

All planned features have been implemented. The project is now production-ready and actively maintained.

### Latest Features (2026-03-22)
- **Paste Editing**: Full edit functionality with optional edit password protection
  - PUT /api/paste/:id endpoint
  - Edit mode in view page with textarea
  - Auto language re-detection after edits
  - lastEditedAt timestamp tracking
  - **View Password**: Required to view paste content
  - **Edit Password**: Separate optional password for editing
  - Clear descriptions explaining the difference between passwords
- **Custom URL Security**: Enhanced security warnings for custom URLs
  - Visual warning (yellow border) on View Password field when custom URL used without password
  - Warning message explaining reduced entropy (900 combinations vs 281 trillion)
  - Green success indicator when password is set with custom URL
  - Strong recommendation to use password protection with custom URLs
- **Light/Dark Theme Toggle**: Animated moon/sun toggle with smooth transitions
  - View Transitions API for circular reveal animation
  - localStorage persistence
  - 26px x 26px animated toggle
  - Smooth theme switching across entire app
- **Favicon & PWA Support**: Full favicon set with all sizes
  - 16x16, 32x32, 192x192, 512x512, apple-touch-icon
  - site.webmanifest for PWA support
  - Flaticon license attribution in HTML
- **Custom Short URLs**: Users can specify custom URL slugs (format: `[2 digits][slug][1 digit]`)
- **UX Improvements**:
  - View buttons in success modal open in new tab
  - "by weisser-dev" branding in header (links to GitHub)
  - Checkbox styling with gray background (green when checked)
  - Split Token & Custom URL on one line

### Core Features (Previously Implemented)
- **Security Features**: Password protection, split token, burn after read
- **Syntax Highlighting**: highlight.js with 15+ languages
- **Auto Language Detection**: Automatic detection from content
- **Security Warnings**: Modal for detecting API keys, tokens, passwords
- **Prettify JSON**: One-click JSON formatting
- **Prettify Button**: Only shows when code is detected (not plaintext)
- **Whitespace Preservation**: 1:1 content preservation with tabs and newlines
- **File Upload Restrictions**: 5MB max, programming files only
- **Expiration Limits**: 30 days for text, 24 hours for files
- **Caddy Reverse Proxy**: Full Caddy support with external network
- **UI Improvements**: Wider desktop layout, copy notifications
- **Docker Networking**: Frontend no longer exposes port 80 externally

## Environment Variables

### Backend
- `NODE_ENV=production`
- `PORT=5000`
- `MONGO_URI=mongodb://mongodb:27017/openpastebin`
- `ENCRYPTION_KEY=<32-byte hex key>` - AES-256-GCM encryption key (64 hex characters)

### MongoDB
- `MONGO_INITDB_DATABASE=openpastebin`

**Security Note**: The ENCRYPTION_KEY must be kept secret and should never be committed to version control. All paste content is encrypted with this key before storage in MongoDB.

## Notes

- Always use `docker compose` (with space), not `docker-compose`
- Frontend is served by Nginx inside container
- Caddy provides HTTPS/SSL termination
- MongoDB data persists in Docker volume
- All services are in `unless-stopped` restart mode
