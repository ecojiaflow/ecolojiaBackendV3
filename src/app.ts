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

// ✅ Routes
import authRoutes from './routes/auth';
import multiCategoryRoutes from './routes/multiCategory.routes';
import productRoutes from './routes/product.routes';
import userRoutes from './routes/user.routes';
import paymentRoutes from './routes/payment.routes'; // ✅ Lemon Squeezy

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', multiCategoryRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payment', paymentRoutes); // ✅ Doit venir après la déclaration app

// ✅ Connexion MongoDB
mongoose
  .connect(process.env.MONGODB_URI || '', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  } as mongoose.ConnectOptions)
  .then(() => {
    console.log('✅ Connexion MongoDB réussie');
  })
  .catch((err) => {
    console.error('❌ Erreur connexion MongoDB:', err);
  });

export default app;
// EOF
