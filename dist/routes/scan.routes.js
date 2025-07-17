"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/routes/scan.routes.ts
const express_1 = __importDefault(require("express"));
const scanController_1 = require("../controllers/scanController");
const router = express_1.default.Router();
// Route pour scanner un code-barres
router.post('/barcode', scanController_1.scanBarcodeController);
exports.default = router;
