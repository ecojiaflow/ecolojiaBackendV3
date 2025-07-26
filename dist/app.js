"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: src/app.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const body_parser_1 = __importDefault(require("body-parser"));
dotenv_1.default.config();
// 🔒 Sécurité + logs
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('dev'));
// 🔧 Middlewares
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
// ✅ Fonction de connexion MongoDB améliorée
const connectMongoDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }
        await mongoose_1.default.connect(uri);
        console.log('✅ MongoDB Atlas connected successfully');
        console.log(`📍 Connected to database: ${mongoose_1.default.connection.db?.databaseName || 'ecolojia'}`);
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
        // Ne pas faire process.exit(1) ici pour permettre au serveur de démarrer
        // même si MongoDB n'est pas disponible immédiatement
    }
};
// ✅ Connexion MongoDB au démarrage
connectMongoDB();
// ✅ Routes
const auth_1 = __importDefault(require("./routes/auth"));
const multiCategory_routes_1 = __importDefault(require("./routes/multiCategory.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
app.use('/api/auth', auth_1.default);
app.use('/api/products', product_routes_1.default);
app.use('/api/categories', multiCategory_routes_1.default);
app.use('/api/user', user_routes_1.default);
app.use('/api/payment', payment_routes_1.default);
// Route de santé pour vérifier le statut
app.get('/api/health', (req, res) => {
    const mongoStatus = mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected';
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
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});
exports.default = app;
