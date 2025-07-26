// PATH: frontend/ecolojiaFrontV3/src/services/paymentService.ts
import axios from 'axios';

const API_BASE_URL = 'https://ecolojia-backend-working.onrender.com/api';

interface CheckoutResponse {
  checkoutUrl: string;
}

interface PortalResponse {
  portalUrl: string;
}

interface SubscriptionStatus {
  isActive: boolean;
  status: string;
  currentPeriodEnd?: Date;
  cancelledAt?: Date;
}

class PaymentService {
  private getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  private getHeaders(): any {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  /**
   * Créer une session de checkout Lemon Squeezy
   */
  async createCheckout(): Promise<string> {
    try {
      const response = await axios.post<CheckoutResponse>(
        `${API_BASE_URL}/payment/create-checkout`,
        {},
        { headers: this.getHeaders() }
      );

      if (!response.data.checkoutUrl) {
        throw new Error('URL de paiement non reçue');
      }

      return response.data.checkoutUrl;
    } catch (error) {
      console.error('Create checkout error:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Veuillez vous connecter pour continuer');
        }
        if (error.response?.status === 404) {
          throw new Error('Service de paiement non disponible');
        }
        throw new Error(error.response?.data?.message || 'Erreur lors de la création du paiement');
      }
      throw new Error('Erreur de connexion');
    }
  }

  /**
   * Obtenir l'URL du portail client Lemon Squeezy
   */
  async getCustomerPortal(): Promise<string> {
    try {
      // Vérifier d'abord si l'utilisateur a un abonnement actif
      const status = await this.checkSubscriptionStatus();
      if (!status.isActive) {
        throw new Error('Aucun abonnement actif. Veuillez d\'abord souscrire à un abonnement.');
      }

      const response = await axios.get<PortalResponse>(
        `${API_BASE_URL}/payment/customer-portal`,
        { headers: this.getHeaders() }
      );

      if (!response.data.portalUrl) {
        throw new Error('URL du portail non reçue');
      }

      return response.data.portalUrl;
    } catch (error) {
      console.error('Get portal error:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          // Si l'endpoint n'existe pas, essayer de créer un checkout à la place
          console.warn('Portal endpoint not found, redirecting to checkout...');
          throw new Error('Redirection vers la page d\'abonnement...');
        }
        if (error.response?.status === 401) {
          throw new Error('Veuillez vous connecter pour accéder au portail');
        }
        throw new Error(error.response?.data?.message || 'Erreur lors de l\'accès au portail');
      }
      throw error;
    }
  }

  /**
   * Vérifier le statut de l'abonnement
   */
  async checkSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/user/subscription-status`,
        { headers: this.getHeaders() }
      );

      return {
        isActive: response.data.isActive || false,
        status: response.data.status || 'inactive',
        currentPeriodEnd: response.data.currentPeriodEnd ? new Date(response.data.currentPeriodEnd) : undefined,
        cancelledAt: response.data.cancelledAt ? new Date(response.data.cancelledAt) : undefined
      };
    } catch (error) {
      console.error('Check subscription error:', error);
      // En cas d'erreur, considérer comme non Premium
      return {
        isActive: false,
        status: 'inactive'
      };
    }
  }

  /**
   * Gérer le retour après paiement
   */
  async handlePaymentReturn(sessionId?: string): Promise<boolean> {
    try {
      if (!sessionId) {
        // Vérifier simplement le statut
        const status = await this.checkSubscriptionStatus();
        return status.isActive;
      }

      // Vérifier la session de paiement
      const response = await axios.post(
        `${API_BASE_URL}/payment/verify-session`,
        { sessionId },
        { headers: this.getHeaders() }
      );

      return response.data.success === true;
    } catch (error) {
      console.error('Handle payment return error:', error);
      return false;
    }
  }

  /**
   * Annuler l'abonnement
   */
  async cancelSubscription(): Promise<void> {
    try {
      await axios.post(
        `${API_BASE_URL}/payment/cancel-subscription`,
        {},
        { headers: this.getHeaders() }
      );
    } catch (error) {
      console.error('Cancel subscription error:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Fonction non disponible pour le moment');
        }
        throw new Error(error.response?.data?.message || 'Erreur lors de l\'annulation');
      }
      throw new Error('Erreur de connexion');
    }
  }

  /**
   * Réactiver l'abonnement
   */
  async resumeSubscription(): Promise<void> {
    try {
      await axios.post(
        `${API_BASE_URL}/payment/resume-subscription`,
        {},
        { headers: this.getHeaders() }
      );
    } catch (error) {
      console.error('Resume subscription error:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Fonction non disponible pour le moment');
        }
        throw new Error(error.response?.data?.message || 'Erreur lors de la réactivation');
      }
      throw new Error('Erreur de connexion');
    }
  }

  /**
   * Obtenir l'historique des paiements
   */
  async getPaymentHistory(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payment/history`,
        { headers: this.getHeaders() }
      );

      return response.data.payments || [];
    } catch (error) {
      console.error('Get payment history error:', error);
      return [];
    }
  }

  /**
   * Méthode de fallback pour gérer l'abonnement
   * Redirige vers le checkout si pas d'abonnement actif
   */
  async manageSubscription(): Promise<string> {
    try {
      // Essayer d'abord d'accéder au portail
      return await this.getCustomerPortal();
    } catch (error: any) {
      console.warn('Portal not accessible, trying checkout...', error.message);
      
      // Si le portail n'est pas accessible, créer un checkout
      try {
        return await this.createCheckout();
      } catch (checkoutError) {
        console.error('Both portal and checkout failed:', checkoutError);
        throw new Error('Service de paiement temporairement indisponible');
      }
    }
  }
}

export const paymentService = new PaymentService();