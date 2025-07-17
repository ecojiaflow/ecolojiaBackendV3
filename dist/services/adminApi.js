"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminApiService = void 0;
// PATH: frontend/ecolojiaFrontV3/src/services/adminApi.ts
const axios_1 = __importDefault(require("axios"));
// Configuration API backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ecolojia-backend-working.onrender.com';
const adminApi = axios_1.default.create({
    baseURL: `${API_BASE_URL}/api/admin`,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    }
});
// Intercepteur pour la gestion des erreurs
adminApi.interceptors.response.use((response) => response, (error) => {
    console.error('❌ Erreur API Admin:', error.response?.data || error.message);
    return Promise.reject(error);
});
class AdminApiService {
    // Dashboard - Statistiques principales
    static async getDashboardStats() {
        try {
            const response = await adminApi.get('/dashboard');
            if (!response.data.success) {
                throw new Error(response.data.error || 'Erreur lors de la récupération des statistiques');
            }
            return response.data.data;
        }
        catch (error) {
            console.error('❌ Erreur getDashboardStats:', error);
            throw new Error('Impossible de récupérer les statistiques du dashboard');
        }
    }
    // Produits récents
    static async getRecentProducts(limit = 10) {
        try {
            const response = await adminApi.get(`/recent-products?limit=${limit}`);
            if (!response.data.success) {
                throw new Error(response.data.error || 'Erreur lors de la récupération des produits');
            }
            return response.data.data;
        }
        catch (error) {
            console.error('❌ Erreur getRecentProducts:', error);
            throw new Error('Impossible de récupérer les produits récents');
        }
    }
    // Logs d'import
    static async getImportLogs() {
        try {
            const response = await adminApi.get('/import-logs');
            if (!response.data.success) {
                throw new Error(response.data.error || 'Erreur lors de la récupération des logs');
            }
            return response.data.data;
        }
        catch (error) {
            console.error('❌ Erreur getImportLogs:', error);
            throw new Error('Impossible de récupérer les logs d\'import');
        }
    }
    // Déclencher nouvel import
    static async triggerImport(maxProducts = 50) {
        try {
            const response = await adminApi.post('/trigger-import', {
                maxProducts
            });
            if (!response.data.success) {
                throw new Error(response.data.error || 'Erreur lors du déclenchement de l\'import');
            }
            return response.data.data;
        }
        catch (error) {
            console.error('❌ Erreur triggerImport:', error);
            throw new Error('Impossible de déclencher l\'import');
        }
    }
    // Vérifier le statut d'un import en cours
    static async getImportProgress(importId) {
        try {
            const response = await adminApi.get(`/import-progress/${importId}`);
            if (!response.data.success) {
                throw new Error(response.data.error || 'Erreur lors de la récupération du progrès');
            }
            return response.data.data;
        }
        catch (error) {
            console.error('❌ Erreur getImportProgress:', error);
            throw new Error('Impossible de récupérer le progrès de l\'import');
        }
    }
    // Supprimer un produit
    static async deleteProduct(productId) {
        try {
            const response = await adminApi.delete(`/product/${productId}`);
            if (!response.data.success) {
                throw new Error(response.data.error || 'Erreur lors de la suppression');
            }
            return response.data.data;
        }
        catch (error) {
            console.error('❌ Erreur deleteProduct:', error);
            throw new Error('Impossible de supprimer le produit');
        }
    }
    // Valider un produit
    static async validateProduct(productId, status) {
        try {
            const response = await adminApi.patch(`/product/${productId}/validate`, {
                verified_status: status
            });
            if (!response.data.success) {
                throw new Error(response.data.error || 'Erreur lors de la validation');
            }
            return response.data.data;
        }
        catch (error) {
            console.error('❌ Erreur validateProduct:', error);
            throw new Error('Impossible de valider le produit');
        }
    }
}
exports.AdminApiService = AdminApiService;
exports.default = AdminApiService;
// EOF
