// PATH: src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';

dotenv.config();

// 🔒 Sécurité + logs
const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// 🔧 Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Fonction de connexion MongoDB améliorée
const connectMongoDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(uri);
    
    console.log('✅ MongoDB Atlas connected successfully');
    console.log(`📍 Connected to database: ${mongoose.connection.db?.databaseName || 'ecolojia'}`);
    
    // Event listeners pour monitoring
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    // Ne pas faire process.exit(1) ici pour permettre au serveur de démarrer
    // même si MongoDB n'est pas disponible immédiatement
  }
};

// ✅ Connexion MongoDB au démarrage
connectMongoDB();

// ✅ Routes
import authRoutes from './routes/auth';
import multiCategoryRoutes from './routes/multiCategory.routes';
import productRoutes from './routes/product.routes';
import userRoutes from './routes/user.routes';
import paymentRoutes from './routes/payment.routes';

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', multiCategoryRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payment', paymentRoutes);

// Route de santé pour vérifier le statut
app.get('/api/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    mongodb: mongoStatus,
    timestamp: new Date().toISOString()
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Gestion des erreurs globales
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

export default app;