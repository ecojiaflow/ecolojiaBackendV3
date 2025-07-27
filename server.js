// server.js - Serveur avec dotenv
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Serveur Ecolojia OK!',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Route de test auth (simple)
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: 'Email, mot de passe et nom requis'
    });
  }
  
  // Pour le test, on simule une création réussie
  res.json({
    success: true,
    message: 'Utilisateur créé (mode test)',
    user: {
      email,
      name,
      tier: 'free'
    }
  });
});

// MongoDB avec options de connexion
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecolojia';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('✅ MongoDB Atlas connecté avec succès');
    
    // Démarrer serveur
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur Ecolojia démarré sur http://localhost:${PORT}`);
      console.log(`📡 Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Endpoints disponibles:`);
      console.log(`   - GET  http://localhost:${PORT}/`);
      console.log(`   - GET  http://localhost:${PORT}/health`);
      console.log(`   - POST http://localhost:${PORT}/api/auth/register`);
    });
  })
  .catch(err => {
    console.error('❌ Erreur MongoDB:', err.message);
    
    // Démarrer quand même le serveur sans MongoDB
    console.log('⚠️  Démarrage du serveur sans MongoDB...');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT} (sans DB)`);
    });
  });

// Gestion erreurs
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
