# 🌱 Ecolojia Backend V3

> API Node.js pour le moteur de recherche écoresponsable

[![Deploy Status](https://img.shields.io/badge/deploy-success-brightgreen)]()
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)]()

## 🚀 API Live
[🔗 API Base URL](https://ecolojia-backend-v3.herokuapp.com)

## ✨ Features

- 🔍 **Search Engine** - Algolia + IA fallback intelligent
- 🧠 **IA Integration** - DeepSeek pour scoring & conseils
- 🌍 **Multi-région** - Adaptation FR/EU/UK/US
- 💾 **Database** - PostgreSQL + Prisma ORM
- 🔐 **Auth System** - JWT + freemium logic
- 📊 **Analytics** - Tracking utilisateurs et recherches
- ⚡ **Performance** - Cache Redis + optimisations

## 🏗️ Architecture

\\\
Backend Stack:
├── Runtime:      Node.js 18+ + TypeScript
├── Framework:    Express.js + CORS + Helmet
├── Database:     PostgreSQL + Prisma ORM
├── Search:       Algolia + IA Fallback
├── AI:           DeepSeek API integration
├── Cache:        Redis (production)
├── Deploy:       Heroku + Railway
└── Monitoring:   Winston logs + Sentry
\\\

## 🛠️ Setup Local

\\\ash
# Clone
git clone https://github.com/ecojiaflow/ecolojiaBackendV3.git
cd ecolojiaBackendV3

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Configurer DATABASE_URL, ALGOLIA_*, DEEPSEEK_API_KEY

# Database setup
npx prisma generate
npx prisma db push
npx prisma db seed

# Start development
npm run dev
\\\

## 🔧 Environment Variables

\\\env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ecolojia

# Algolia Search
ALGOLIA_APP_ID=your_app_id
ALGOLIA_API_KEY=your_api_key
ALGOLIA_INDEX_NAME=products

# AI Integration
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# JWT Auth
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d

# External APIs
CORS_ORIGIN=http://localhost:3000,https://ecolojia-v3.netlify.app

# Production
NODE_ENV=production
PORT=5000
\\\

## 📡 API Endpoints

### 🔍 Search & Products
\\\
GET    /api/search?q={query}&region={FR|EU|UK|US}
GET    /api/products/:id
GET    /api/products/category/:category
GET    /api/categories
GET    /api/suggestions?q={query}
\\\

### 🧠 AI Features
\\\
POST   /api/ai/analyze-product
POST   /api/ai/get-alternatives  
GET    /api/ai/eco-score/:productId
POST   /api/ai/nutrition-advice
\\\

### 👤 User & Freemium
\\\
POST   /api/auth/register
POST   /api/auth/login
GET    /api/user/profile
GET    /api/user/search-count
POST   /api/user/upgrade-premium
\\\

### 📊 Analytics
\\\
POST   /api/analytics/search
POST   /api/analytics/product-view
GET    /api/analytics/stats
\\\

## 🗄️ Database Schema

\\\prisma
model Product {
  id           String   @id @default(cuid())
  name         String
  brand        String
  category     String
  ecoScore     Int
  priceEUR     Float?
  priceGBP     Float?
  priceUSD     Float?
  region       String[] // ['FR', 'EU', 'UK', 'US']
  labels       String[]
  resumeIA     String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  premium      Boolean  @default(false)
  searchCount  Int      @default(0)
  lastReset    DateTime @default(now())
  region       String   @default("FR")
  language     String   @default("fr")
}
\\\

## 🚀 Deployment

### Heroku
\\\ash
# Install Heroku CLI
heroku create ecolojia-backend-v3
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret

# Deploy
git push heroku main

# Setup database
heroku run npx prisma db push
heroku run npx prisma db seed
\\\

### Railway (Alternative)
\\\ash
# Install Railway CLI
railway login
railway init
railway add postgresql
railway add redis

# Deploy
railway up
\\\

## 🧪 Testing

\\\ash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# API tests avec curl
curl http://localhost:5000/api/health
curl "http://localhost:5000/api/search?q=huile+olive&region=FR"
\\\

## 📊 Monitoring & Logs

\\\ash
# View logs
npm run logs

# Health check
curl http://localhost:5000/api/health

# Database status
npx prisma studio
\\\

## 🔄 Scripts Disponibles

\\\json
{
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "db:generate": "prisma generate",
  "db:push": "prisma db push", 
  "db:seed": "tsx src/scripts/seed.ts",
  "test": "jest",
  "logs": "heroku logs --tail"
}
\\\

## 🤝 API Response Format

\\\	ypescript
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "region": "FR",
    "language": "fr"
  }
}

// Error Response  
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR", 
    "message": "Invalid search query",
    "details": { ... }
  }
}
\\\

## 🛡️ Security Features

- 🔐 JWT Authentication
- 🛡️ Helmet.js security headers
- 🚦 Rate limiting per IP
- 🔍 Input validation (Zod)
- 🔒 CORS configured
- 📝 Request logging
- 🚨 Error monitoring

## 📈 Performance

- ⚡ Response time < 200ms
- 📊 Cache hit ratio > 80%
- 🔄 Auto-scaling ready
- 📈 Horizontal scaling support
- 🔧 Database connection pooling

## 🎯 Roadmap

- [ ] GraphQL API
- [ ] Real-time notifications  
- [ ] Advanced analytics dashboard
- [ ] ML-based recommendations
- [ ] Elasticsearch integration
- [ ] Microservices architecture

---

Made with 💚 for sustainable consumption
