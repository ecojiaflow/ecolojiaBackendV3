import { Router, Request, Response } from 'express';

const router = Router();

// Route health à la racine
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Ecolojia Backend is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'connected' : 'not configured'
  });
});

// Route health avec préfixe /api
router.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Ecolojia API Health Check',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'connected' : 'not configured',
    cors_origins: process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || []
  });
});

export default router;