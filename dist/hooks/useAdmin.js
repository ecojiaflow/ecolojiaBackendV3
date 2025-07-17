"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAdmin = void 0;
// PATH: frontend/ecolojiaFrontV3/src/hooks/useAdmin.ts
const react_1 = require("react");
const adminApi_1 = __importDefault(require("../services/adminApi"));
const useAdmin = () => {
    const [stats, setStats] = (0, react_1.useState)(null);
    const [recentProducts, setRecentProducts] = (0, react_1.useState)([]);
    const [importLogs, setImportLogs] = (0, react_1.useState)([]);
    const [importProgress, setImportProgress] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [lastUpdate, setLastUpdate] = (0, react_1.useState)(new Date());
    // Charger toutes les données du dashboard
    const loadDashboardData = (0, react_1.useCallback)(async () => {
        setLoading(true);
        setError(null);
        try {
            const [statsData, productsData, logsData] = await Promise.all([
                adminApi_1.default.getDashboardStats(),
                adminApi_1.default.getRecentProducts(15),
                adminApi_1.default.getImportLogs()
            ]);
            setStats(statsData);
            setRecentProducts(productsData);
            setImportLogs(logsData);
            setLastUpdate(new Date());
            console.log('✅ Dashboard data loaded successfully');
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des données';
            setError(errorMessage);
            console.error('❌ Erreur loadDashboardData:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Actualiser les statistiques uniquement
    const refreshStats = (0, react_1.useCallback)(async () => {
        try {
            const statsData = await adminApi_1.default.getDashboardStats();
            setStats(statsData);
            setLastUpdate(new Date());
        }
        catch (err) {
            console.error('❌ Erreur refreshStats:', err);
        }
    }, []);
    // Déclencher un nouvel import
    const triggerImport = (0, react_1.useCallback)(async (maxProducts = 50) => {
        setError(null);
        try {
            const result = await adminApi_1.default.triggerImport(maxProducts);
            // Actualiser les données après l'import
            setTimeout(() => {
                loadDashboardData();
            }, 2000);
            return result;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors du déclenchement de l\'import';
            setError(errorMessage);
            throw err;
        }
    }, [loadDashboardData]);
    // Valider un produit
    const validateProduct = (0, react_1.useCallback)(async (productId, status) => {
        try {
            const result = await adminApi_1.default.validateProduct(productId, status);
            // Mettre à jour la liste des produits localement
            setRecentProducts(products => products.map(product => product.id === productId
                ? { ...product, verified_status: status }
                : product));
            return result;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la validation';
            setError(errorMessage);
            throw err;
        }
    }, []);
    // Supprimer un produit
    const deleteProduct = (0, react_1.useCallback)(async (productId) => {
        try {
            const result = await adminApi_1.default.deleteProduct(productId);
            // Retirer le produit de la liste locale
            setRecentProducts(products => products.filter(product => product.id !== productId));
            // Actualiser les stats
            refreshStats();
            return result;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
            setError(errorMessage);
            throw err;
        }
    }, [refreshStats]);
    // Auto-refresh des données toutes les 30 secondes
    (0, react_1.useEffect)(() => {
        loadDashboardData();
        const interval = setInterval(() => {
            refreshStats();
        }, 30000);
        return () => clearInterval(interval);
    }, [loadDashboardData, refreshStats]);
    return {
        // Données
        stats,
        recentProducts,
        importLogs,
        importProgress,
        // États
        loading,
        error,
        lastUpdate,
        // Actions
        loadDashboardData,
        refreshStats,
        triggerImport,
        validateProduct,
        deleteProduct,
        // Utilitaires
        clearError: () => setError(null)
    };
};
exports.useAdmin = useAdmin;
exports.default = exports.useAdmin;
// EOF
