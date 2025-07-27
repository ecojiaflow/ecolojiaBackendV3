"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongoDB = void 0;
// backend/src/config/mongodb.ts
const mongoose_1 = __importDefault(require("mongoose"));
const connectMongoDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }
        // Options de connexion recommandées
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
        };
        await mongoose_1.default.connect(uri, options);
        console.log('✅ MongoDB Atlas connected successfully');
        console.log(`📍 Connected to database: ${mongoose_1.default.connection.db?.databaseName || "ecolojia"}`);
        // Event listeners pour monitoring
        mongoose_1.default.connection.on('error', (error) => {
            console.error('❌ MongoDB connection error:', error);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected');
        });
    }
    catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
};
exports.connectMongoDB = connectMongoDB;
