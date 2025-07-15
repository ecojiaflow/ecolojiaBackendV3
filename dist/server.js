"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/server.ts
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
const server = (0, express_1.default)();
// Middleware global (optionnel si déjà dans app.ts)
server.use(app_1.default);
server.listen(PORT, () => {
    console.log(`🌱 Serveur Ecolojia (IA Assistant Révolutionnaire) sur http://0.0.0.0:${PORT}`);
});
exports.default = server;
// EOF
