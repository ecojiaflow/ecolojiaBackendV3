// PATH: backend/src/index.ts
import express from 'express';
import cors from 'cors';
import { connectMongoDB } from './config/mongodb';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de base
app.use(cors());
app.use(express.json());

// Route de test
app.get('/', (req, res) => {
  res.json({
    message: 'Serveur Ecolojia fonctionnel !',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Route health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Démarrage
async function start() {
  try {
    // Connexion MongoDB
    await connectMongoDB();
    console.log('✅ MongoDB connecté');
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

start();
