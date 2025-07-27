"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongodb_1 = require("./config/mongodb");
const redis_1 = require("./config/redis");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware de base
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Route de santé simple
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Serveur Ecolojia en cours d\'exécution',
        timestamp: new Date().toISOString()
    });
});
// Route racine
app.get('/', (req, res) => {
    res.json({
        name: 'Ecolojia Backend',
        version: '1.0.0',
        status: 'Running',
        endpoints: {
            health: '/health',
            api: '/api'
        }
    });
});
// Routes API basiques
app.get('/api', (req, res) => {
    res.json({
        message: 'API Ecolojia',
        availableEndpoints: {
            health: '/health'
        }
    });
});
// Démarrage du serveur
async function startServer() {
    try {
        // Connexion MongoDB
        await (0, mongodb_1.connectMongoDB)();
        console.log('✅ MongoDB connecté');
        // Connexion Redis (optionnel)
        try {
            await (0, redis_1.connectRedis)();
            console.log('✅ Redis connecté');
        }
        catch (redisError) {
            console.log('⚠️ Redis non disponible, continuation sans cache');
        }
        // Démarrer le serveur
        app.listen(PORT, () => {
            console.log(`🚀 Serveur Ecolojia démarré sur http://localhost:${PORT}`);
            console.log(`📋 Endpoints disponibles:`);
            console.log(`   - Health: http://localhost:${PORT}/health`);
            console.log(`   - API: http://localhost:${PORT}/api`);
        });
    }
    catch (error) {
        console.error('❌ Erreur au démarrage:', error);
        process.exit(1);
    }
}
// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
// Démarrer l'application
startServer();
