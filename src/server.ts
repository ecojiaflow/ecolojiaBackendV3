// PATH: backend/src/server.ts
import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🌱 Serveur Ecolojia (IA Assistant Révolutionnaire) sur http://0.0.0.0:' + PORT);
  console.log('📱 Scanner API: http://localhost:' + PORT + '/api/scan/barcode');
  console.log('💄 Cosmetic API: http://localhost:' + PORT + '/api/cosmetic/analyze');
  console.log('🧽 Detergent API: http://localhost:' + PORT + '/api/detergent/analyze');
  console.log('⚙️ Admin Dashboard API: http://localhost:' + PORT + '/api/admin/dashboard');
});
// EOF
