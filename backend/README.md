# GrowPath Backend API

Node.js + Express + MongoDB backend for GrowPathAI - Cannabis cultivation tracking and AI-powered grow assistance.

## Features

- 🔐 JWT Authentication with PRO subscription tiers
- 🌱 Multi-plant tracking with grow logs
- 📊 Social feed with posts, likes, and comments
- 🤖 AI-powered plant diagnosis (OpenAI Vision)
- 🧪 AI feeding schedule generator
- 🌡️ Environment optimizer with VPD calculations
- 📋 Task management with template-based workflows
- 📄 PDF grow reports export

## Tech Stack

- Express.js
- MongoDB + Mongoose
- JWT authentication
- OpenAI API (GPT-4o-mini with vision)
- PDFKit for exports
- Multer for file uploads

## Prerequisites

- Node.js v18+ or v20+ LTS
- MongoDB (local or Atlas)
- OpenAI API key

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# OpenAI API
OPENAI_API_KEY=sk-...

# Server
PORT=5000
NODE_ENV=development
```

## Installation

```bash
cd backend
npm install
```

## Running Locally

Development mode (with hot reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Server will start at `http://localhost:5000`

## API Endpoints

### Health Check

- `GET /health` - Service health status

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Plants & Grow Logs

- `GET /api/plants` - List user's plants
- `POST /api/plants` - Create new plant (1 max for free users)
- `GET /api/plants/:id` - Get plant with logs
- `POST /api/plants/:id/logs` - Add log entry
- `GET /api/plants/:id/stats` - Growth statistics
- `GET /api/plants/:id/export` - Export PDF report

### Social Feed

- `GET /posts/feed` - Paginated feed (PRO required for write)
- `POST /posts` - Create post (PRO only)
- `POST /posts/:id/like` - Like post (PRO only)
- `POST /posts/:id/comment` - Comment (PRO only)

### AI Tools (All PRO Only)

- `POST /diagnose` - AI plant diagnosis with photo
- `POST /feeding/label` - OCR nutrient label
- `POST /feeding/schedule` - Generate feeding schedule
- `POST /environment/analyze` - Analyze grow environment

### Tasks & Templates

- `GET /tasks/today` - Today's tasks
- `POST /tasks` - Create custom task (PRO only)
- `GET /templates` - Browse templates marketplace
- `POST /templates/:id/apply/:plantId` - Apply template (PRO only)

### Subscriptions

- `POST /subscribe/start` - Start trial or paid subscription
- `GET /subscribe/status` - Get subscription status
- `POST /subscribe/cancel` - Cancel subscription

## Freemium Model

### Free Tier

- 1 plant maximum
- View-only social feed
- Read-only templates/tasks
- No AI tools

### PRO Tier ($9.99/month)

- Unlimited plants
- Full social features
- AI diagnosis, feeding, environment tools
- Task management
- Template creation
- 7-day free trial (one-time)

## Deployment to Render

1. **Push to GitHub:**

```bash
git init
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/growpath-backend.git
git push -u origin main
```

2. **Create Render Web Service:**
   - Go to https://render.com
   - New → Web Service → Connect GitHub repo
   - Settings:
     - Name: `growpath-backend`
     - Environment: `Node`
     - Branch: `main`
     - Root Directory: `backend` (if monorepo) or leave blank
     - Build Command: `npm install`
     - Start Command: `node server.js`

3. **Set Environment Variables in Render:**
   - `MONGODB_URI` - MongoDB connection string
   - `JWT_SECRET` - Strong random secret
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `NODE_ENV` - `production`

4. **Deploy:**
   - Render auto-deploys on every push to main
   - Your API will be at: `https://growpath-backend.onrender.com`

## MongoDB Setup (MongoDB Atlas)

1. Go to https://cloud.mongodb.com
2. Create free cluster (M0 tier)
3. Database Access → Create database user
4. Network Access → Add IP → Allow Anywhere (0.0.0.0/0)
5. Connect → Drivers → Copy connection string
6. Replace `<password>` with your database user password

## Code Quality

Linting:

```bash
npm run lint
```

Auto-fix:

```bash
npm run lint:fix
```

Format:

```bash
npm run format
```

Pre-commit hooks via Husky automatically lint and format staged files.

## Project Structure

```
backend/
├── config/          # Database and service configs
├── middleware/      # Auth, proOnly, upload middleware
├── models/          # Mongoose schemas
├── routes/          # Express route handlers
├── utils/           # Helper functions (PDF export, etc.)
├── uploads/         # User uploaded files
├── exports/         # Generated PDF exports
├── server.js        # Express app entry point
├── package.json     # Dependencies and scripts
└── .env             # Environment variables (local only)
```

## Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

## License

Private - All Rights Reserved

## Support

For issues or questions, contact: support@growpathai.com
