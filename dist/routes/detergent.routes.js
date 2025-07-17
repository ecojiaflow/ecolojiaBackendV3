"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/routes/detergent.routes.ts
const express_1 = __importDefault(require("express"));
const detergentController_1 = require("../controllers/detergentController");
const router = express_1.default.Router();
// Route pour analyser un produit détergent
router.post('/analyze', detergentController_1.analyzeDetergentController);
exports.default = router;
