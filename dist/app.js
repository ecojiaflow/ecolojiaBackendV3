"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: backend/src/app.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const multiCategory_routes_1 = __importDefault(require("./routes/multiCategory.routes"));
const ultraProcessing_routes_1 = __importDefault(require("./routes/ultraProcessing.routes")); // ✅ IMPORT AJOUTÉ
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.use('/api/health', health_routes_1.default);
app.use('/api/chat', chat_routes_1.default);
app.use('/api/multi-category', multiCategory_routes_1.default);
app.use('/api/ultra-processing', ultraProcessing_routes_1.default); // ✅ ROUTE AJOUTÉE
exports.default = app;
// EOF
