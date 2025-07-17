"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/server.ts
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
app_1.default.listen(PORT, () => {
    console.log('🌱 Serveur Ecolojia (IA Assistant Révolutionnaire) sur http://0.0.0.0:' + PORT);
    console.log('📱 Scanner API: http://localhost:' + PORT + '/api/scan/barcode');
    console.log('💄 Cosmetic API: http://localhost:' + PORT + '/api/cosmetic/analyze');
    console.log('🧽 Detergent API: http://localhost:' + PORT + '/api/detergent/analyze');
    console.log('⚙️ Admin Dashboard API: http://localhost:' + PORT + '/api/admin/dashboard');
});
// EOF
