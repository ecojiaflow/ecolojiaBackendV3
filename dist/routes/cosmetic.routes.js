"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/routes/cosmetic.routes.ts
const express_1 = __importDefault(require("express"));
const cosmeticController_1 = require("../controllers/cosmeticController");
const router = express_1.default.Router();
// Route pour analyser un produit cosmétique
router.post('/analyze', cosmeticController_1.analyzeCosmeticController);
exports.default = router;
