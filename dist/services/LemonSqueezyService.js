"use strict";
// PATH: backend/src/services/LemonSqueezyService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lemonSqueezyService = exports.LemonSqueezyService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
// Charger les variables d'environnement
dotenv_1.default.config();
class LemonSqueezyService {
    constructor() {
        this.baseUrl = 'https://api.lemonsqueezy.com/v1';
        // Debug pour voir les variables
        console.log('🔍 Vérification variables Lemon Squeezy:', {
            API_KEY: process.env.LEMONSQUEEZY_API_KEY ? '✅ Présent' : '❌ Manquant',
            STORE_ID: process.env.LEMONSQUEEZY_STORE_ID ? '✅ Présent' : '❌ Manquant',
            VARIANT_ID: process.env.LEMONSQUEEZY_VARIANT_ID ? '✅ Présent' : '❌ Manquant',
            WEBHOOK_SECRET: process.env.LEMONSQUEEZY_WEBHOOK_SECRET ? '✅ Présent' : '❌ Manquant'
        });
        // Configuration avec valeurs par défaut pour éviter le crash
        this.config = {
            apiKey: process.env.LEMONSQUEEZY_API_KEY || '',
            storeId: process.env.LEMONSQUEEZY_STORE_ID || '',
            variantId: process.env.LEMONSQUEEZY_VARIANT_ID || '',
            webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ''
        };
        // Avertissement si des variables manquent
        if (!this.config.apiKey || !this.config.storeId || !this.config.variantId || !this.config.webhookSecret) {
            console.warn('⚠️ ATTENTION: Variables Lemon Squeezy manquantes ou incomplètes');
            console.warn('Assurez-vous que le fichier .env est correctement configuré');
            console.warn('Les fonctionnalités de paiement seront désactivées');
        }
    }
    /**
     * Vérifie si le service est correctement configuré
     */
    isConfigured() {
        return !!(this.config.apiKey && this.config.storeId && this.config.variantId && this.config.webhookSecret);
    }
    /**
     * Crée une URL de checkout Lemon Squeezy
     */
    async createCheckoutUrl(data) {
        if (!this.isConfigured()) {
            throw new Error('Service Lemon Squeezy non configuré. Vérifiez vos variables d\'environnement.');
        }
        try {
            const checkoutData = {
                data: {
                    type: 'checkouts',
                    attributes: {
                        variant_id: parseInt(this.config.variantId),
                        custom_data: {
                            user_id: data.customData.userId
                        }
                    },
                    relationships: {
                        store: {
                            data: {
                                type: 'stores',
                                id: this.config.storeId
                            }
                        },
                        variant: {
                            data: {
                                type: 'variants',
                                id: this.config.variantId
                            }
                        }
                    }
                }
            };
            const response = await axios_1.default.post(`${this.baseUrl}/checkouts`, checkoutData, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/vnd.api+json',
                    'Accept': 'application/vnd.api+json'
                }
            });
            return response.data.data.attributes.url;
        }
        catch (error) {
            console.error('Erreur création checkout Lemon Squeezy:', error);
            throw new Error('Impossible de créer la session de paiement');
        }
    }
    /**
     * Vérifie la signature du webhook
     */
    verifyWebhookSignature(rawBody, signature) {
        if (!this.config.webhookSecret) {
            console.warn('⚠️ Webhook secret manquant, impossible de vérifier la signature');
            return false;
        }
        const hmac = crypto_1.default.createHmac('sha256', this.config.webhookSecret);
        const digest = hmac.update(rawBody).digest('hex');
        return digest === signature;
    }
    /**
     * Récupère les détails d'un abonnement
     */
    async getSubscription(subscriptionId) {
        if (!this.isConfigured()) {
            throw new Error('Service Lemon Squeezy non configuré');
        }
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Accept': 'application/vnd.api+json'
                }
            });
            return response.data.data;
        }
        catch (error) {
            console.error('Erreur récupération subscription:', error);
            throw error;
        }
    }
    /**
     * Annule un abonnement
     */
    async cancelSubscription(subscriptionId) {
        if (!this.isConfigured()) {
            throw new Error('Service Lemon Squeezy non configuré');
        }
        try {
            const response = await axios_1.default.delete(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Accept': 'application/vnd.api+json'
                }
            });
            return response.data.data;
        }
        catch (error) {
            console.error('Erreur annulation subscription:', error);
            throw error;
        }
    }
    /**
     * Récupère l'URL du portail client
     */
    async getCustomerPortalUrl(customerId) {
        if (!this.isConfigured()) {
            throw new Error('Service Lemon Squeezy non configuré');
        }
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/customers/${customerId}/portal`, {}, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Accept': 'application/vnd.api+json'
                }
            });
            return response.data.data.attributes.url;
        }
        catch (error) {
            console.error('Erreur création portail client:', error);
            throw error;
        }
    }
}
exports.LemonSqueezyService = LemonSqueezyService;
exports.lemonSqueezyService = new LemonSqueezyService();
