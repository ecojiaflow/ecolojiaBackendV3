// backend/src/config/db.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectMongo = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI is required in environment variables');
    }

    // Options de connexion optimisées pour production
    const options = {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4
      retryWrites: true,
      w: 'majority'
    };

    await mongoose.connect(uri, options);

    // Event listeners pour monitoring
    mongoose.connection.on('connected', () => {
      logger.info('[MongoDB] Connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('[MongoDB] Connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('[MongoDB] Disconnected from database');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('[MongoDB] Connection closed through app termination');
      process.exit(0);
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('[MongoDB] Initial connection failed:', error);
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