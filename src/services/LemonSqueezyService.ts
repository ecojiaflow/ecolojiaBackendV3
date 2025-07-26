// PATH: backend/src/services/LemonSqueezyService.ts

import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

interface LemonSqueezyConfig {
  apiKey: string;
  storeId: string;
  variantId: string;
  webhookSecret: string;
}

interface CheckoutData {
  email: string;
  name: string;
  customData: {
    userId: string;
  };
}

interface WebhookPayload {
  meta: {
    event_name: string;
    custom_data?: {
      user_id: string;
    };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      status: string;
      customer_id: number;
      variant_id: number;
      variant_name: string;
      user_email: string;
      user_name: string;
      ends_at?: string;
      renews_at?: string;
      created_at: string;
      updated_at: string;
    };
  };
}

export class LemonSqueezyService {
  private config: LemonSqueezyConfig;
  private baseUrl = 'https://api.lemonsqueezy.com/v1';

  constructor() {
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
  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.storeId && this.config.variantId && this.config.webhookSecret);
  }

  /**
   * Crée une URL de checkout Lemon Squeezy
   */
  async createCheckoutUrl(data: CheckoutData): Promise<string> {
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

      const response = await axios.post(
        `${this.baseUrl}/checkouts`,
        checkoutData,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          }
        }
      );

      return response.data.data.attributes.url;
    } catch (error) {
      console.error('Erreur création checkout Lemon Squeezy:', error);
      throw new Error('Impossible de créer la session de paiement');
    }
  }

  /**
   * Vérifie la signature du webhook
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      console.warn('⚠️ Webhook secret manquant, impossible de vérifier la signature');
      return false;
    }

    const hmac = crypto.createHmac('sha256', this.config.webhookSecret);
    const digest = hmac.update(rawBody).digest('hex');
    return digest === signature;
  }

  /**
   * Récupère les détails d'un abonnement
   */
  async getSubscription(subscriptionId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Service Lemon Squeezy non configuré');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/subscriptions/${subscriptionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Accept': 'application/vnd.api+json'
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Erreur récupération subscription:', error);
      throw error;
    }
  }

  /**
   * Annule un abonnement
   */
  async cancelSubscription(subscriptionId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Service Lemon Squeezy non configuré');
    }

    try {
      const response = await axios.delete(
        `${this.baseUrl}/subscriptions/${subscriptionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Accept': 'application/vnd.api+json'
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Erreur annulation subscription:', error);
      throw error;
    }
  }

  /**
   * Récupère l'URL du portail client
   */
  async getCustomerPortalUrl(customerId: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Service Lemon Squeezy non configuré');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/customers/${customerId}/portal`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Accept': 'application/vnd.api+json'
          }
        }
      );

      return response.data.data.attributes.url;
    } catch (error) {
      console.error('Erreur création portail client:', error);
      throw error;
    }
  }
}

export const lemonSqueezyService = new LemonSqueezyService();