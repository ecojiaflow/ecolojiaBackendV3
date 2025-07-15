// PATH: backend/src/app.ts
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import healthRoutes from './routes/health.routes';
import chatRoutes from './routes/chat.routes';
import multiCategoryRoutes from './routes/multiCategory.routes';
import ultraProcessingRoutes from './routes/ultraProcessing.routes'; // 👈 AJOUT

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/api/health', healthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/multi-category', multiCategoryRoutes);
app.use('/api/ultra-processing', ultraProcessingRoutes); // 👈 AJOUT

export default app;
// EOF
