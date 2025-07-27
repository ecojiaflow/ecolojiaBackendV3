// server-postgres.js - Serveur Ecolojia avec PostgreSQL
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration PostgreSQL
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ecolojia_db_user:Mj2kdVH9LJKTQLvLQ2HIrdJjsqThJmBI@dpg-d11f1849c44c73f9jmf0-a.frankfurt-postgres.render.com:5432/ecolojia_db';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Test connexion DB
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('? Erreur connexion PostgreSQL:', err.message);
  } else {
    console.log('? PostgreSQL connecté:', res.rows[0].now);
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'API Ecolojia avec PostgreSQL',
    version: '1.0.0',
    database: 'PostgreSQL',
    timestamp: new Date()
  });
});

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy',
      database: 'connected',
      type: 'PostgreSQL'
    });
  } catch (error) {
    res.json({ 
      status: 'healthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Créer les tables si elles n'existent pas
async function createTables() {
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
      message: 'Inscription réussie',
      user: result.rows[0]
    });

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

    // Trouver utilisateur
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const user = result.rows[0];

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
    const result = await pool.query('SELECT id, email, name, tier, created_at FROM users');
    res.json({
      count: result.rowCount,
      users: result.rows
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
  await createTables();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`?? Serveur Ecolojia démarré sur http://localhost:${PORT}`);
    console.log(`?? Base de données: PostgreSQL`);
    console.log(`?? Endpoints disponibles:`);
    console.log(`   - GET  http://localhost:${PORT}/`);
    console.log(`   - GET  http://localhost:${PORT}/health`);
    console.log(`   - POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   - POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   - GET  http://localhost:${PORT}/api/users`);
  });
}

start();
