// PATH: src/services/LemonSqueezyService.ts
import axios from 'axios';

const LEMON_API_BASE = 'https://api.lemonsqueezy.com/v1';
const STORE_ID = process.env.LEMON_STORE_ID;
const PRODUCT_ID = process.env.LEMON_PRODUCT_ID;
const API_KEY = process.env.LEMON_API_KEY;
const DOMAIN = process.env.FRONTEND_URL || 'http://localhost:5173';

if (!STORE_ID || !PRODUCT_ID || !API_KEY) {
  throw new Error('❌ Variables d’environnement Lemon Squeezy manquantes');
}

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  Accept: 'application/vnd.api+json',
  'Content-Type': 'application/json'
};

export const LemonSqueezyService = {
  async createCheckoutSession(userId: string, email: string): Promise<string> {
    const response = await axios.post(
      `${LEMON_API_BASE}/checkouts`,
      {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email,
              custom: { userId }
            },
            product_id: PRODUCT_ID,
            custom_price: null,
            expires_at: null,
            redirect_url: `${DOMAIN}/dashboard`,
            cancel_url: `${DOMAIN}/premium`
          }
        }
      },
      { headers }
    );

    const url = response.data.data?.attributes?.url;
    if (!url) throw new Error('❌ Impossible de créer la session Lemon Squeezy');
    return url;
  },

  async getCustomerPortal(customerId: string): Promise<string> {
    if (!customerId) throw new Error('Customer ID requis');

    const response = await axios.post(
      `${LEMON_API_BASE}/customers/${customerId}/portal`,
      {},
      { headers }
    );

    const url = response.data.data?.attributes?.url;
    if (!url) throw new Error('❌ Portail client indisponible');
    return url;
  }
};
// EOF
