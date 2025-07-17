"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findClosestOption = void 0;
const similar_service_1 = require("../services/similar.service");
const similarService = new similar_service_1.SimilarService();
const findClosestOption = async (req, res) => {
    try {
        const { text, options } = req.body;
        if (!text || !Array.isArray(options)) {
            return res.status(400).json({ error: 'Requête invalide. "text" et "options[]" requis.' });
        }
        const closest = similarService.findClosest({ text, options });
        res.json({ closest });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Erreur interne similarité' });
    }
};
exports.findClosestOption = findClosestOption;
// EOF
