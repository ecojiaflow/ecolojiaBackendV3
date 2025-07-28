// backend/src/config/db.js
const mongoose = require('mongoose');

const connectMongo = async () => {
  try {
    // Utiliser l'URI MongoDB depuis les variables d'environnement
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecolojia';
    
    if (!uri || uri.includes('YOUR_MONGODB_PASSWORD')) {
      console.error('⚠️  MONGODB_URI is not properly configured!');
      console.error('Please follow these steps:');
      console.error('1. Go to https://cloud.mongodb.com');
      console.error('2. Create a free cluster');
      console.error('3. Get your connection string');
      console.error('4. Update MONGODB_URI in .env file');
      throw new Error('MongoDB configuration required');
    }

    // Options de connexion optimisées
    const options = {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4 // Force IPv4
    };

    // Connexion
    await mongoose.connect(uri, options);

    // Event listeners
    mongoose.connection.on('connected', () => {
      console.log('[MongoDB] Connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected from database');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('[MongoDB] Connection closed through app termination');
      process.exit(0);
    });

    return mongoose.connection;
  } catch (error) {
    console.error('[MongoDB] Initial connection failed:', error);
    throw error;
  }
};

// Helper pour vérifier la connexion
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Helper pour obtenir des stats de connexion
const getConnectionStats = () => {
  const { readyState, host, port, name } = mongoose.connection;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  return {
    status: states[readyState],
    host,
    port,
    database: name,
    collections: mongoose.connection.collections ? Object.keys(mongoose.connection.collections).length : 0
  };
};

module.exports = {
  connectMongo,
  isConnected,
  getConnectionStats
};