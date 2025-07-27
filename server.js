// server.js - Serveur principal Ecolojia
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Variable pour stocker l'état de la connexion DB
let dbConnected = false;

// Stockage en mémoire pour le mode sans DB
const memoryUsers = [];

// Routes de base
app.get('/', (req, res) => {
  res.json({
    message: 'API Ecolojia',
    version: '1.0.0',
    status: 'operational',
    database: dbConnected ? 'connected' : 'memory mode',
    timestamp: new Date()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

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

    // Vérifier si email existe
    if (memoryUsers.find(u => u.email === email)) {
      return res.status(400).json({
        success: false,
        message: 'Email déjà utilisé'
      });
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer utilisateur
    const user = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      tier: 'free',
      createdAt: new Date()
    };

    memoryUsers.push(user);

    res.json({
      success: true,
      message: 'Inscription réussie',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier
      }
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
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

    const user = memoryUsers.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

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

// Route 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.path
  });
});

// Gestion erreurs
app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  res.status(500).json({
    error: 'Erreur serveur interne',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// Connexion MongoDB (optionnelle)
async function connectDB() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connecté');
      dbConnected = true;
    } catch (error) {
      console.log('⚠️ MongoDB non connecté, mode mémoire activé');
      dbConnected = false;
    }
  }
}

// Démarrage serveur
async function start() {
  await connectDB();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur Ecolojia démarré sur port ${PORT}`);
    console.log(`📦 Mode: ${dbConnected ? 'MongoDB connecté' : 'Stockage mémoire'}`);
    console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();