"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
// Configuration serveur
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
// Démarrage serveur
app_1.default.listen(PORT, HOST, () => {
    console.log(`🌱 Serveur Ecolojia démarré sur http://${HOST}:${PORT}`);
    console.log(`🌐 Accessible via: https://ecolojiabackendv3.onrender.com`);
    console.log(`📋 Routes disponibles:`);
    console.log(`   GET /health`);
    console.log(`   GET /api/health`);
    console.log(`   GET /api/products`);
    console.log(`   GET /api-docs`);
});
