// server-postgres-fixed.js - Serveur avec PostgreSQL amélioré
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration PostgreSQL avec parsing de l'URL
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ecolojia_db_user:Mj2kdVH9LJKTQLvLQ2HIrdJjsqThJmBI@dpg-d11f1849c44c73f9jmf0-a.frankfurt-postgres.render.com:5432/ecolojia_db';

// Configuration du pool PostgreSQL
const poolConfig = {
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10
};

const pool = new Pool(poolConfig);

// Variable pour stocker l'état de la connexion
let dbConnected = false;

// Middleware
app.use(cors());
app.use(express.json());

// Test connexion DB avec retry
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('? PostgreSQL connecté:', result.rows[0].now);
    dbConnected = true;
    return true;
  } catch (err) {
    console.error('? Erreur connexion PostgreSQL:', err.message);
    dbConnected = false;
    return false;
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'API Ecolojia',
    version: '1.0.0',
    database: dbConnected ? 'PostgreSQL connecté' : 'Mode sans base de données',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({ 
    status: 'healthy',
    database: dbStatus ? 'connected' : 'disconnected',
    type: 'PostgreSQL',
    mode: dbStatus ? 'full' : 'limited'
  });
});

// Créer les tables si elles n'existent pas
async function createTables() {
  if (!dbConnected) {
    console.log('?? Base de données non connectée, tables non créées');
    return;
  }
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        tier VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('? Tables créées/vérifiées');
  } catch (error) {
    console.error('? Erreur création tables:', error.message);
  }
}

// Stockage en mémoire pour le mode sans DB
const memoryUsers = [];

// Route inscription
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }

    // Si DB connectée, utiliser PostgreSQL
    if (dbConnected) {
      try {
        // Vérifier si utilisateur existe
        const userCheck = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );

        if (userCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Email déjà utilisé'
          });
        }

        // Hash du mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Créer utilisateur
        const result = await pool.query(
          'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, tier',
          [email, hashedPassword, name]
        );

        res.json({
          success: true,
          message: 'Inscription réussie (PostgreSQL)',
          user: result.rows[0]
        });
      } catch (dbError) {
        console.error('Erreur DB, bascule sur mémoire:', dbError.message);
        dbConnected = false;
      }
    }
    
    // Si DB non connectée, utiliser le stockage mémoire
    if (!dbConnected) {
      // Vérifier si email existe
      if (memoryUsers.find(u => u.email === email)) {
        return res.status(400).json({
          success: false,
          message: 'Email déjà utilisé'
        });
      }

      // Hash du mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      // Créer utilisateur en mémoire
      const user = {
        id: memoryUsers.length + 1,
        email,
        password: hashedPassword,
        name,
        tier: 'free',
        created_at: new Date()
      };

      memoryUsers.push(user);

      res.json({
        success: true,
        message: 'Inscription réussie (stockage mémoire)',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier
        }
      });
    }

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// Route connexion
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    let user = null;

    // Si DB connectée, chercher dans PostgreSQL
    if (dbConnected) {
      try {
        const result = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );
        if (result.rows.length > 0) {
          user = result.rows[0];
        }
      } catch (dbError) {
        console.error('Erreur DB:', dbError.message);
        dbConnected = false;
      }
    }

    // Si DB non connectée, chercher en mémoire
    if (!dbConnected) {
      user = memoryUsers.find(u => u.email === email);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier mot de passe
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    res.json({
      success: true,
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier
      }
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour lister les utilisateurs (test)
app.get('/api/users', async (req, res) => {
  try {
    let users = [];

    if (dbConnected) {
      try {
        const result = await pool.query('SELECT id, email, name, tier, created_at FROM users');
        users = result.rows;
      } catch (dbError) {
        console.error('Erreur DB:', dbError.message);
        dbConnected = false;
      }
    }

    if (!dbConnected) {
      users = memoryUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        tier: u.tier,
        created_at: u.created_at
      }));
    }

    res.json({
      count: users.length,
      users,
      storage: dbConnected ? 'PostgreSQL' : 'Memory'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur récupération utilisateurs'
    });
  }
});

// Démarrage
async function start() {
  // Tenter la connexion DB
  console.log('?? Tentative de connexion à PostgreSQL...');
  const connected = await testConnection();
  
  if (connected) {
    await createTables();
  } else {
    console.log('?? Démarrage en mode sans base de données (stockage mémoire)');
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`?? Serveur Ecolojia démarré sur http://localhost:${PORT}`);
    console.log(`?? Mode: ${dbConnected ? 'PostgreSQL' : 'Stockage mémoire'}`);
    console.log(`?? Endpoints disponibles:`);
    console.log(`   - GET  http://localhost:${PORT}/`);
    console.log(`   - GET  http://localhost:${PORT}/health`);
    console.log(`   - POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   - POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   - GET  http://localhost:${PORT}/api/users`);
  });
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

start();
