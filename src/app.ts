// PATH: backend/src/app.ts
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import favoritesRoutes from './routes/favorites';
import historyRoutes from './routes/history';
import exportRoutes from './routes/export';
import ultraProcessingRoutes from './routes/ultraProcessing.routes';

// ✅ Import manquant ajouté :
const dashboardRoutes = require('./routes/dashboard');

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

// ✅ Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ✅ Routes principales
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/ultra', ultraProcessingRoutes);

// ✅ Route dashboard ajoutée ici :
app.use('/api/dashboard', dashboardRoutes);

// ✅ Route de test
app.get('/api/ping', (req, res) => {
  res.json({ success: true, message: 'pong' });
});

export default app;
// EOF
