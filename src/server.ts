// PATH: backend/src/server.ts
import dotenv from 'dotenv';

// IMPORTANT: Charger les variables d'environnement EN PREMIER
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 3000;

// Debug des variables d'environnement
console.log('🔧 Variables d\'environnement chargées:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: PORT,
  LEMON_SQUEEZY: {
    API_KEY: process.env.LEMONSQUEEZY_API_KEY ? '✅' : '❌',
    STORE_ID: process.env.LEMONSQUEEZY_STORE_ID || '❌',
    VARIANT_ID: process.env.LEMONSQUEEZY_VARIANT_ID || '❌',
    WEBHOOK_SECRET: process.env.LEMONSQUEEZY_WEBHOOK_SECRET ? '✅' : '❌'
  }
});

app.listen(PORT, () => {
  console.log('🌱 Serveur Ecolojia (IA Assistant Révolutionnaire) sur http://0.0.0.0:' + PORT);
  console.log('📱 Scanner API: http://localhost:' + PORT + '/api/scan/barcode');
  console.log('💄 Cosmetic API: http://localhost:' + PORT + '/api/cosmetic/analyze');
  console.log('🧽 Detergent API: http://localhost:' + PORT + '/api/detergent/analyze');
  console.log('⚙️ Admin Dashboard API: http://localhost:' + PORT + '/api/admin/dashboard');
  console.log('💳 Payment API: http://localhost:' + PORT + '/api/payment');
});
// EOF