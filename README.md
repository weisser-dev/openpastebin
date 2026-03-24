<img src="frontend/public/favicon-32x32.png" alt="OpenPasteBin Logo" width="32" height="32" align="left" style="margin-right: 10px;">

# OpenPasteBin

A **lightweight, privacy-focused** open-source pastebin with temporary storage. Share code snippets, text, and files securely with automatic expiration.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)

## Privacy & Lightweight Philosophy

**OpenPasteBin is designed with privacy and minimalism at its core:**

- 🔒 **Zero Logging**: No logs are written to disk - neither access logs, application logs, nor error logs
- 🚫 **No Tracking**: No analytics, no cookies, no user tracking whatsoever
- 💾 **Temporary Only**: All data is automatically deleted after expiration - nothing persists permanently
- 🔐 **End-to-End Encryption**: All paste content is encrypted with AES-256-GCM before storage - never stored in cleartext
- 🪶 **Lightweight**: Minimal resource footprint, fast performance
- 🔐 **Privacy-First**: No accounts, no authentication, complete anonymity

**Data is encrypted at the application level with AES-256-GCM, stored temporarily in MongoDB, and automatically removed upon expiration. Nothing is logged, tracked, or stored in cleartext.**

## Features

### Core Features
- **Text & Code Sharing**: Share code snippets with syntax highlighting for 15+ languages (JavaScript, Python, Java, Go, Rust, PHP, HTML, CSS, JSON, SQL, Bash, and more)
- **File Uploads**: Upload programming files up to 5MB (only text/code files allowed)
- **Temporary Storage**: All pastes automatically expire (30 days max for text, 24 hours max for files)
- **Auto Language Detection**: Automatically detects programming language from content
- **Syntax Highlighting**: Powered by highlight.js with GitHub Dark/Light themes
- **Prettify JSON**: One-click JSON formatting with proper indentation
- **Paste Editing**: Edit pastes after creation with optional edit password protection
- **Light/Dark Theme**: Animated theme toggle with smooth moon/sun transition (View Transitions API)
- **Raw View**: Direct access to raw content
- **Download Files**: Easy file download functionality
- **Responsive Design**: Modern "hacker-lite" theme optimized for desktop and mobile
- **PWA Support**: Full favicon set and web manifest for Progressive Web App

### Security Features
- 🔐 **AES-256-GCM Encryption**: All paste content encrypted at application level before database storage - never stored in cleartext
- 🔐 **Password Protection**: Protect pastes with bcrypt-hashed passwords (10 rounds)
  - **View Password**: Required to view the paste content
  - **Edit Password**: Optional separate password for editing (independent from view password)
- ✂️ **Split Token**: Split sensitive content into 2 separate URLs for extra security
- 🔥 **Burn After Read**: Set max views (1, 2, 5, 10) - paste auto-deletes when limit reached
- ⚠️ **Security Warnings**: Automatic detection of API keys, tokens, and passwords with best practice recommendations
- 🔒 **Multi-Channel Sharing**: Guidance for splitting tokens across different communication channels
- ⚡ **Custom URL Warning**: Visual warning when using custom URLs without password protection (yellow border + warning message)

### URL Features
- **Short URLs**: Clean, 8-character URLs using nanoid (281 trillion combinations)
- **Custom Short URLs**: Personalize your paste URLs with custom slugs (format: `[2 digits][your-slug][1 digit]`)
  - Minimum 6 characters
  - Must contain at least 1 number or special character
  - Not compatible with Split Token feature
  - ⚠️ **Security Note**: Custom URLs have only 900 combinations per slug - password protection is strongly recommended

### Developer Features
- **RESTful API**: Full API for programmatic access (create, view, edit, delete)
- **Paste Editing API**: PUT endpoint for updating paste content with password verification
- **Auto-Cleanup**: Automatic deletion of expired pastes every minute
- **No Accounts Required**: Completely anonymous usage
- **1:1 Content Preservation**: Perfect whitespace, tab, and newline preservation
- **Auto Language Re-detection**: Language automatically re-detected after edits

## Tech Stack

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose for data storage
- **AES-256-GCM** for content encryption (Node.js crypto module)
- **bcrypt** for password hashing (10 rounds)
- **Multer** for file uploads
- **Nanoid** for URL generation
- Automatic cleanup of expired pastes

### Frontend
- **React 18** with Vite
- **Axios** for API calls
- **highlight.js** for syntax highlighting (15+ languages)
- **Modern CSS** with GitHub Dark/Light themes
- **View Transitions API** for smooth theme switching
- **LocalStorage** for user preferences (theme, security warnings)
- **PWA ready** with full favicon set and web manifest

### Deployment
- **Docker** & Docker Compose
- **Caddy** or **Nginx** as reverse proxy
- Health checks and auto-restart
- External `caddy-net` network support

## Quick Start

### Prerequisites
- **Docker** and **Docker Compose** installed
- **Git** (optional, for cloning)

### Local Development / Testing

**Just one command to start everything:**

```bash
docker compose up
```

This will automatically:
- ✅ Build all containers (frontend, backend, MongoDB)
- ✅ Start all services
- ✅ Create necessary networks and volumes
- ✅ Make the app accessible at `http://localhost` (frontend) and `http://localhost:5000` (backend API)

**Note:** The first run might take a few minutes to build. Subsequent starts are instant.

**Common commands:**
```bash
# Run in background (detached mode)
docker compose up -d

# Stop all containers
docker compose down

# Rebuild after code changes
docker compose up --build

# View logs
docker compose logs -f

# Remove everything including volumes
docker compose down -v
```

**If you see a caddy-net error:** Simply create it once:
```bash
docker network create caddy-net
```
(You don't need Caddy installed, just the network needs to exist)

### Production Deployment

1. Clone the repository:
```bash
git clone https://github.com/weisser-dev/openpastebin.git
cd openpastebin
```

2. For Caddy reverse proxy, ensure `caddy-net` network exists:
```bash
docker network create caddy-net
```

3. Start the application:
```bash
docker compose up -d
```

4. Configure your reverse proxy (see Production Deployment section below)

That's it! The application will be running with all services connected.

## API Documentation

### Create Paste
```bash
POST /api/paste
Content-Type: application/json

{
  "content": "Your text or code here",
  "title": "My Paste",
  "type": "text",
  "language": "javascript",
  "expiresValue": 15,
  "expiresUnit": "minutes",
  "password": "optional-password",
  "isSplit": false,
  "maxViews": null,
  "customUrl": "mylink123"
}
```

**Response (Regular Paste):**
```json
{
  "success": true,
  "id": "abc12345",
  "url": "http://localhost/abc12345",
  "expiresAt": "2024-01-01T12:30:00.000Z",
  "detectedLanguage": "javascript"
}
```

**Response (Split Token):**
```json
{
  "success": true,
  "isSplit": true,
  "id1": "abc12345",
  "id2": "xyz67890",
  "url1": "http://localhost/abc12345",
  "url2": "http://localhost/xyz67890",
  "expiresAt": "2024-01-01T12:30:00.000Z"
}
```

**Response (Custom URL):**
```json
{
  "success": true,
  "id": "42mylink!7",
  "url": "http://localhost/42mylink!7",
  "expiresAt": "2024-01-01T12:30:00.000Z",
  "detectedLanguage": "javascript"
}
```

### Upload File
```bash
POST /api/upload
Content-Type: multipart/form-data

file: [binary file]
expiresValue: 15
expiresUnit: "minutes"
```

**Note:** Files are limited to 5MB and must be programming/text files only. Max expiration: 24 hours.

### Get Paste
```bash
GET /api/paste/:id
```

**Response (Password Protected):**
```json
{
  "id": "abc12345",
  "title": "My Paste",
  "passwordProtected": true,
  "expiresAt": "2024-01-01T12:30:00.000Z"
}
```

### Verify Password
```bash
POST /api/paste/:id/verify
Content-Type: application/json

{
  "password": "your-password"
}
```

### Get Raw Content
```bash
GET /api/raw/:id
```

### Delete Paste
```bash
DELETE /api/paste/:id
```

### Stats
```bash
GET /api/stats
```

## Configuration

### Environment Variables

Backend (`backend/.env`):
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://mongodb:27017/openpastebin
```

### Customization

**Expiration Times**: Edit `frontend/src/App.jsx` to modify available expiration options

**File Size Limit**: Edit `backend/server.js` line 29 to change the 10MB limit

**MongoDB Cleanup**: Edit `backend/server.js` line 40 to change cleanup interval

## Production Deployment

### With Caddy (Recommended)

This project is configured to work with Caddy reverse proxy out of the box.

1. Ensure your Caddy is running and has the `caddy-net` Docker network:
```bash
docker network create caddy-net
```

2. Add this configuration to your Caddyfile:
```
paste.weisser.dev {
    reverse_proxy openpastebin-frontend:80
    encode gzip zstd
}
```

Or use the provided `Caddyfile.example` as a template.

3. Start OpenPasteBin:
```bash
docker-compose up -d
```

The frontend container will automatically join the `caddy-net` network and be accessible to Caddy. HTTPS is automatically configured by Caddy.

### With Nginx

For deployment behind Nginx:

1. Update `docker-compose.yml` to expose the frontend port:
```yaml
services:
  frontend:
    ports:
      - "127.0.0.1:3000:80"
```

2. Configure Nginx:
```nginx
server {
    listen 80;
    server_name paste.weisser.dev;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Enable SSL with Let's Encrypt:
```bash
certbot --nginx -d paste.weisser.dev
```

### Security Best Practices

- Always use HTTPS in production
- Keep Docker images updated
- Use strong MongoDB credentials if exposing the database
- Implement rate limiting on the reverse proxy
- Monitor logs regularly
- Set up backup for MongoDB data

## Development

### Run in Development Mode

Backend:
```bash
cd backend
npm install
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

### Project Structure
```
openpastebin/
├── backend/
│   ├── server.js          # Express server & API
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   ├── main.jsx       # Entry point
│   │   └── index.css      # Styles
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf         # Nginx configuration
├── docker-compose.yml     # Docker orchestration
└── README.md
```

## Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Check Health
```bash
curl http://localhost:5000/api/health
```

### View Stats
```bash
curl http://localhost:5000/api/stats
```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

### MongoDB connection issues
- Ensure MongoDB service is healthy: `docker-compose ps`
- Check MongoDB logs: `docker-compose logs mongodb`
- Verify network connectivity

### Port conflicts
If ports 80 or 5000 are already in use, modify `docker-compose.yml` to use different ports.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Roadmap

### ✅ All Core Features Implemented!

OpenPasteBin is feature-complete with all planned functionality:

- ✅ **Syntax highlighting** for 15+ programming languages (JavaScript, Python, Java, Go, Rust, PHP, HTML, CSS, JSON, SQL, Bash, and more)
- ✅ **Password protection** with bcrypt encryption
- ✅ **Custom expiration times** (seconds, minutes, hours, days - max 30 days for text, 24h for files)
- ✅ **Burn After Read** with max views (1, 2, 5, 10 views)
- ✅ **Auto language detection** from content
- ✅ **Custom short URLs** with personalized slugs
- ✅ **Split Token** security feature (content split into 2 parts)
- ✅ **Security warnings** for API keys, tokens, and passwords
- ✅ **Paste editing** with optional edit password protection
- ✅ **Light/Dark theme toggle** with animated moon/sun transition
- ✅ **Favicon** with PWA support
- ✅ **File uploads** (5MB max, programming files only)
- ✅ **1:1 content preservation** (whitespace, tabs, newlines)
- ✅ **Prettify JSON** with one-click formatting
- ✅ **View Transitions API** for smooth theme changes

The project is now production-ready and actively maintained. Future updates will focus on bug fixes, performance improvements, and security enhancements.

## Support

For issues, questions, or suggestions:
- Open an issue on [GitHub](https://github.com/weisser-dev/openpastebin/issues)
- Check existing issues for solutions

## Acknowledgments

Built with modern web technologies and a focus on privacy and simplicity.

---

Made with ❤️ by the open-source community
