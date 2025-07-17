"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const PORT = Math.floor(Math.random() * (60000 - 50000) + 50000); // Choisit un port libre entre 50000 et 60000
app.get('/', (req, res) => res.send(`✅ Serveur test actif sur http://localhost:${PORT}`));
app.listen(PORT, () => {
    console.log(`🧪 Serveur test Express lancé sur http://localhost:${PORT}`);
});
