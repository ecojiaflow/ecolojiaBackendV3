"use strict";
const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult, param, query } = require('express-validator');
const conversationalAI = require('../services/ai/conversationalAI');
const alternativesEngine = require('../services/ai/alternativesEngine');
const insightsGenerator = require('../services/ai/insightsGenerator');
const router = express.Router();
// Rate limiting pour éviter abus API
const chatRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 messages par 15 min par IP
    message: {
        error: 'Trop de messages envoyés. Réessayez dans 15 minutes.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});
const quickResponseLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes  
    max: 20, // 20 réponses rapides par 5 min
    message: {
        error: 'Trop de demandes rapides. Réessayez dans 5 minutes.',
        code: 'QUICK_RATE_LIMIT_EXCEEDED'
    }
});
// Validation middleware
const validateChatMessage = [
    body('message')
        .isString()
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Le message doit contenir entre 1 et 500 caractères'),
    body('product_context')
        .optional()
        .isObject()
        .withMessage('Le contexte produit doit être un objet'),
    body('user_profile')
        .optional()
        .isObject()
        .withMessage('Le profil utilisateur doit être un objet'),
    body('session_id')
        .optional()
        .isString()
        .isLength({ max: 100 })
        .withMessage('Session ID invalide')
];
const validateQuickResponse = [
    param('questionType')
        .isIn(['how_calculated', 'why_this_score', 'alternatives', 'ingredients_concern', 'healthier_choice'])
        .withMessage('Type de question non supporté'),
    body('product_context')
        .isObject()
        .withMessage('Le contexte produit est requis'),
    body('user_profile')
        .optional()
        .isObject()
        .withMessage('Le profil utilisateur doit être un objet')
];
/**
 * POST /api/chat/message
 * Envoie un message au chat IA avec contexte produit
 */
router.post('/message', chatRateLimit, validateChatMessage, async (req, res) => {
    try {
        // Validation des entrées
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Données invalides',
                details: errors.array()
            });
        }
        const { message, product_context = {}, user_profile = {}, session_id = generateSessionId() } = req.body;
        // Vérification que le message n'est pas vide après nettoyage
        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Le message ne peut pas être vide'
            });
        }
        // Validation basique du contexte produit
        if (product_context && !isValidProductContext(product_context)) {
            return res.status(400).json({
                success: false,
                error: 'Contexte produit invalide'
            });
        }
        // Traitement du message par l'IA conversationnelle
        const startTime = Date.now();
        const response = await conversationalAI.processUserQuestion(message.trim(), product_context, user_profile, session_id);
        const processingTime = Date.now() - startTime;
        // Log pour monitoring
        console.log(`Chat response generated in ${processingTime}ms for session ${session_id}`);
        // Réponse structurée
        res.json({
            success: true,
            data: {
                message: response.message,
                sources: response.sources || [],
                alternatives_mentioned: response.alternatives_mentioned || [],
                follow_up_questions: response.follow_up_questions || [],
                metadata: {
                    confidence: response.confidence,
                    response_type: response.response_type,
                    processing_time_ms: processingTime,
                    session_id: session_id,
                    timestamp: new Date().toISOString()
                }
            }
        });
    }
    catch (error) {
        console.error('Error in chat message endpoint:', error);
        // Réponse d'erreur différente selon le type d'erreur
        if (error.message.includes('DeepSeek')) {
            return res.status(503).json({
                success: false,
                error: 'Service IA temporairement indisponible',
                code: 'AI_SERVICE_UNAVAILABLE'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Erreur lors du traitement du message',
            code: 'INTERNAL_ERROR'
        });
    }
});
/**
 * POST /api/chat/quick/:questionType
 * Réponses rapides pré-formatées pour questions courantes
 */
router.post('/quick/:questionType', quickResponseLimit, validateQuickResponse, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Données invalides',
                details: errors.array()
            });
        }
        const { questionType } = req.params;
        const { product_context, user_profile = {} } = req.body;
        const startTime = Date.now();
        const response = await conversationalAI.getQuickResponse(questionType, product_context, user_profile);
        const processingTime = Date.now() - startTime;
        res.json({
            success: true,
            data: {
                message: response.message,
                sources: response.sources || [],
                alternatives_mentioned: response.alternatives_mentioned || [],
                follow_up_questions: response.follow_up_questions || [],
                metadata: {
                    question_type: questionType,
                    confidence: response.confidence,
                    processing_time_ms: processingTime,
                    timestamp: new Date().toISOString()
                }
            }
        });
    }
    catch (error) {
        console.error('Error in quick response endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la génération de la réponse rapide',
            code: 'QUICK_RESPONSE_ERROR'
        });
    }
});
/**
 * GET /api/chat/suggestions/:category
 * Obtient des suggestions de questions par catégorie
 */
router.get('/suggestions/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const suggestions = getSuggestionsByCategory(category);
        res.json({
            success: true,
            data: {
                category,
                suggestions,
                count: suggestions.length
            }
        });
    }
    catch (error) {
        console.error('Error getting chat suggestions:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des suggestions'
        });
    }
});
/**
 * DELETE /api/chat/history/:sessionId
 * Supprime l'historique d'une session
 */
router.delete('/history/:sessionId', [
    param('sessionId').isString().isLength({ min: 1, max: 100 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Session ID invalide'
            });
        }
        const { sessionId } = req.params;
        conversationalAI.clearConversationHistory(sessionId);
        res.json({
            success: true,
            message: 'Historique supprimé avec succès'
        });
    }
    catch (error) {
        console.error('Error clearing chat history:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de l\'historique'
        });
    }
});
/**
 * GET /api/chat/context/alternatives
 * Obtient les alternatives pour enrichir le contexte de chat
 */
router.post('/context/alternatives', [
    body('product_data').isObject().withMessage('Données produit requises'),
    body('user_profile').optional().isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Données invalides',
                details: errors.array()
            });
        }
        const { product_data, user_profile = {} } = req.body;
        const alternatives = await alternativesEngine.getAlternativesForProduct(product_data, user_profile);
        res.json({
            success: true,
            data: {
                alternatives: alternatives.slice(0, 3), // Top 3 pour contexte chat
                count: alternatives.length
            }
        });
    }
    catch (error) {
        console.error('Error getting alternatives for chat context:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des alternatives'
        });
    }
});
/**
 * GET /api/chat/context/insights
 * Obtient les insights pour enrichir le contexte de chat
 */
router.post('/context/insights', [
    body('product_data').isObject().withMessage('Données produit requises'),
    body('user_profile').optional().isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Données invalides',
                details: errors.array()
            });
        }
        const { product_data, user_profile = {} } = req.body;
        const insights = await insightsGenerator.getInsightsForProduct(product_data, user_profile);
        res.json({
            success: true,
            data: {
                insights: insights.slice(0, 2), // Top 2 pour contexte chat
                count: insights.length
            }
        });
    }
    catch (error) {
        console.error('Error getting insights for chat context:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des insights'
        });
    }
});
/**
 * GET /api/chat/health
 * Health check pour le service de chat
 */
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                conversational_ai: 'operational',
                alternatives_engine: 'operational',
                insights_generator: 'operational'
            },
            memory_usage: process.memoryUsage(),
            active_sessions: conversationalAI.conversationHistory.size
        };
        res.json({
            success: true,
            data: health
        });
    }
    catch (error) {
        console.error('Error in chat health check:', error);
        res.status(500).json({
            success: false,
            error: 'Service de chat indisponible'
        });
    }
});
// Fonctions utilitaires
function generateSessionId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
function isValidProductContext(context) {
    // Validation basique de la structure du contexte produit
    if (typeof context !== 'object' || context === null) {
        return false;
    }
    // Le contexte peut être vide (nouveau produit en cours d'analyse)
    if (Object.keys(context).length === 0) {
        return true;
    }
    // Si présent, vérifier structure minimale
    const requiredFields = ['name', 'score'];
    const hasRequiredFields = requiredFields.some(field => context.hasOwnProperty(field));
    return hasRequiredFields;
}
function getSuggestionsByCategory(category) {
    const suggestionsByCategory = {
        nutrition: [
            "Comment lire une étiquette nutritionnelle ?",
            "Que signifie la classification NOVA ?",
            "Quels additifs faut-il éviter ?",
            "Comment équilibrer ses repas ?",
            "Quelle est la différence entre Nutri-Score et index glycémique ?"
        ],
        alternatives: [
            "Comment remplacer les produits ultra-transformés ?",
            "Quelles sont les meilleures alternatives naturelles ?",
            "Comment faire ses cosmétiques maison ?",
            "Recettes simples pour remplacer les plats préparés ?",
            "Où acheter des alternatives plus saines ?"
        ],
        environment: [
            "Comment réduire mon empreinte carbone alimentaire ?",
            "Local vs bio : que choisir ?",
            "Comment limiter les emballages ?",
            "Quels sont les labels environnementaux fiables ?",
            "Comment faire du compost en appartement ?"
        ],
        health: [
            "Comment cette alimentation impacte ma santé ?",
            "Quels sont les effets de l'ultra-transformation ?",
            "Comment préserver mon microbiote ?",
            "Alimentation et inflammation : quels liens ?",
            "Comment adapter mon alimentation à mes besoins ?"
        ],
        general: [
            "Comment commencer une transition alimentaire ?",
            "Quelles sont les bases d'une alimentation responsable ?",
            "Comment faire des courses plus éthiques ?",
            "Quel budget prévoir pour manger sainement ?",
            "Comment convaincre ma famille de changer ?"
        ]
    };
    return suggestionsByCategory[category] || suggestionsByCategory.general;
}
// Middleware de nettoyage périodique (appelé toutes les heures)
// En mode test, ne pas démarrer le timer automatique pour éviter handles ouverts
if (process.env.NODE_ENV !== 'test') {
    const cleanupInterval = setInterval(() => {
        try {
            conversationalAI.cleanup();
            console.log('Chat cleanup completed successfully');
        }
        catch (error) {
            console.error('Error during chat cleanup:', error);
        }
    }, 60 * 60 * 1000); // 1 heure
    // Nettoyage propre à la fermeture du processus
    process.on('SIGTERM', () => {
        clearInterval(cleanupInterval);
        console.log('Chat cleanup interval cleared');
    });
    process.on('SIGINT', () => {
        clearInterval(cleanupInterval);
        console.log('Chat cleanup interval cleared');
    });
}
module.exports = router;
