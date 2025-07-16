// PATH: backend/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import productRoutes from './routes/product.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'Ecolojia backend API running.' });
});

app.use('/api/products', productRoutes);

export default app;
// EOF