// PATH: backend/src/server.ts
import express from 'express';
import dotenv from 'dotenv';
import app from './app';

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = express();

// Middleware global (optionnel si déjà dans app.ts)
server.use(app);

server.listen(PORT, () => {
  console.log(`🌱 Serveur Ecolojia (IA Assistant Révolutionnaire) sur http://0.0.0.0:${PORT}`);
});

export default server;
// EOF
