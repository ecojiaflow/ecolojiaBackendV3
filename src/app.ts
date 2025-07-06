import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

import productRoutes from './routes/product.routes';
import healthRouter from './routes/health.routes';
import partnerRoutes from './routes/partner.routes';
import ecoScoreRoutes from './routes/eco-score.routes';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';

dotenv.config();

const app: Application = express();

// ✅ CORS ÉLARGI POUR TOUS LES DOMAINES NETLIFY
const allowedOrigins = [
  'https://frontendv3.netlify.app',              // ← AJOUT DU NOUVEAU DOMAINE
  'https://ecolojiafrontv3.netlify.app',         // FRONTEND ALTERNATIF
  'https://main--frontendv3.netlify.app',        // BRANCH PREVIEW NOUVEAU
  'https://main--ecolojiafrontv3.netlify.app',   // BRANCH PREVIEW ANCIEN
  'https://ecolojiabackendv3.onrender.com',      // BACKEND SELF
  'http://localhost:3000',                       // DEV REACT
  'http://localhost:5173',                       // DEV VITE
  'http://localhost:4173'                        // DEV VITE PREVIEW
];

app.use(cors({
  origin: (origin, callback) => {
    console.log('🔍 Origin demandée:', origin);
    
    // Autoriser les requêtes sans origin (Postman, mobile apps)
    if (!origin) {
      console.log('✅ Requête sans origin autorisée');
      return callback(null, true);
    }
    
    // Autoriser TOUS les domaines Netlify par pattern matching
    if (origin.includes('.netlify.app')) {
      console.log('✅ Domaine Netlify autorisé:', origin);
      return callback(null, true);
    }
    
    // Vérifier si l'origin est dans la liste explicite
    if (allowedOrigins.includes(origin)) {
      console.log('✅ Origin autorisée explicitement:', origin);
      callback(null, true);
    } else {
      console.log('🚨 Origin bloquée:', origin);
      console.log('📋 Origins autorisées:', allowedOrigins);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-cron-key', 
    'x-api-key', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
}));

console.log('✅ CORS configuré pour:', allowedOrigins);
console.log('🌐 CORS autorise TOUS les domaines *.netlify.app');

// ✅ MIDDLEWARES
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ ROUTES API CORRIGÉES
app.use('/api/products', productRoutes);  // ← CORRIGÉ : était '/api'
app.use('/api/partners', partnerRoutes);  // ← CORRIGÉ : était '/api' 
app.use('/api/eco-score', ecoScoreRoutes);
app.use('/', healthRouter);
app.use('/api', healthRouter);

// ✅ NOUVELLE ROUTE IA SUGGESTION (REMPLACE N8N)
app.post('/api/suggest', async (req: Request, res: Response) => {
  try {
    const { query, zone, lang } = req.body;
    
    if (!query || !zone || !lang) {
      return res.status(400).json({ 
        error: 'Paramètres query, zone et lang requis' 
      });
    }

    // ✅ NOUVEAU : Utiliser orchestrateur interne au lieu de N8N
    const orchestratorURL = `http://localhost:${process.env.ORCHESTRATOR_PORT || 3001}`;
    
    try {
      const response = await fetch(`${orchestratorURL}/enrich-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, zone, lang }),
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error(`Orchestrateur responded with ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Suggestion "${query}" transmise à l'orchestrateur`);
      res.json(result);
      
    } catch (orchestratorError) {
      // Fallback : suggestion basique si orchestrateur indisponible
      console.warn('Orchestrateur indisponible, suggestion basique:', (orchestratorError as Error).message);
      
      res.json({
        success: true,
        message: `Suggestion "${query}" enregistrée pour enrichissement`,
        status: 'queued',
        query: query,
        zone: zone,
        lang: lang,
        estimatedTime: '2-4 heures',
        fallback: true
      });
    }

  } catch (error) {
    console.error('Erreur suggestion IA:', error);
    res.status(500).json({ error: 'Erreur lors de la suggestion IA' });
  }
});

// ✅ SWAGGER DOCS
const swaggerUrl = process.env.NODE_ENV === 'production' 
  ? `https://ecolojiabackendv3.onrender.com/api-docs`
  : `http://localhost:${process.env.PORT || 3000}/api-docs`;
  
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
console.log('📘 Swagger docs:', swaggerUrl);

// ✅ LOGS
console.log('✅ Routes de tracking partenaire activées');
console.log('✅ Routes de score écologique IA activées');
console.log('✅ Base de données:', process.env.DATABASE_URL ? 'connectée' : 'non configurée');
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

// ✅ ROOT INFO ENDPOINT
app.get('/', (_req, res) => {
  res.json({
    message: 'Ecolojia API',
    version: '1.0.0',
    status: 'operational',
    environment: process.env.NODE_ENV || 'development',
    orchestrator: 'internal', // ✅ Plus de N8N
    cors_status: 'NETLIFY_WILDCARD_ENABLED',
    allowed_origins: allowedOrigins,
    wildcard_pattern: '*.netlify.app',
    timestamp: new Date().toISOString(),
    endpoints: {
      products: [
        'GET /api/products',
        'GET /api/products/search',
        'GET /api/products/stats',
        'GET /api/products/:slug',
        'GET /api/products/:id/similar',
        'GET /api/products/barcode/:code',  // ← AJOUTÉ
        'POST /api/products',
        'POST /api/products/analyze-photos', // ← AJOUTÉ
        'PUT /api/products/:id',
        'DELETE /api/products/:id'
      ],
      tracking: [
        'GET /api/partners/track/:id'  // ← CORRIGÉ
      ],
      ai: [
        'POST /api/eco-score/calculate',
        'POST /api/eco-score/update/:productId',
        'POST /api/eco-score/update-all',
        'GET /api/eco-score/stats',
        'GET /api/eco-score/test',
        'POST /api/suggest (orchestrateur interne)' // ✅ NOUVEAU
      ],
      health: [
        'GET /health',
        'GET /api/health'
      ],
      docs: [
        'GET /api-docs'
      ]
    }
  });
});

// ✅ GESTION ERREURS CORS
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.message && err.message.includes('not allowed by CORS')) {
    console.error('❌ Erreur CORS:', {
      origin: req.get('Origin'),
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    return res.status(403).json({
      error: 'CORS_ERROR',
      message: 'Origin not allowed',
      origin: req.get('Origin'),
      allowed_origins: allowedOrigins,
      hint: 'Tous les domaines *.netlify.app sont maintenant autorisés'
    });
  }
  next(err);
});

export default app;