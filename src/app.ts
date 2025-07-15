// PATH: src/app.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

/* --------------------------- Middleware de sécurité -------------------------- */
app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ------------------------------ Import des routes ----------------------------- */
import multiCategoryRoutes from './routes/multiCategory.routes';

app.use('/api/multi-category', multiCategoryRoutes);

/* ------------------------------- Routes système ------------------------------- */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Ecolojia backend alive',
    timestamp: Date.now()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Ecolojia backend alive',
    timestamp: Date.now()
  });
});

export default app;
// EOF
