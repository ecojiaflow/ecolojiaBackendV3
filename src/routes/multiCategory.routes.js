// src/pages/MultiCategoriesPage.tsx
import React, { useState, useEffect } from 'react';
import CategoryCard from '../components/CategoryCard';
import {
  Category,
  CategoriesResponse,
  AnalysisResponse,
  multiCategoryApi
} from '../services/multiCategoryApi';

const MultiCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisResponse | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    loadCategories();
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setConnectionStatus('checking');
      const isConnected = await multiCategoryApi.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    } catch {
      setConnectionStatus('disconnected');
    }
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: CategoriesResponse = await multiCategoryApi.getCategories();
      if (response.success && response.categories) {
        setCategories(response.categories);
      } else {
        throw new Error('Réponse API invalide');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisComplete = (result: AnalysisResponse) => {
    setLastAnalysis(result);
    console.log('📊 Analyse terminée :', result);
  };

  const renderConnectionStatus = () => {
    const status = {
      checking: { text: 'Vérification...', color: 'text-yellow-600', icon: '⏳' },
      connected: { text: 'API Connectée', color: 'text-green-600', icon: '✅' },
      disconnected: { text: 'API Déconnectée', color: 'text-red-600', icon: '❌' }
    }[connectionStatus];

    return (
      <div className={`rounded-xl px-4 py-2 font-medium ${status.color} border`}>
        {status.icon} {status.text}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Chargement des catégories...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">❌ Erreur de connexion</h2>
          <p className="mb-4">{error}</p>
          {renderConnectionStatus()}
          <button
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            onClick={() => {
              loadCategories();
              checkConnection();
            }}
          >
            🔄 Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🌱 Analyse Multi-Catégories</h1>
          <p className="text-gray-600">Scannez vos produits, l’IA détecte automatiquement la bonne catégorie</p>
          <div className="mt-4">{renderConnectionStatus()}</div>
        </div>

        {/* Dernier Résultat */}
        {lastAnalysis && (
          <div className="bg-white border-2 border-green-200 p-6 rounded-3xl shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">📊 Dernière Analyse</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="text-2xl font-bold text-green-600">{lastAnalysis.analysis.overall_score}/100</div>
                <div className="text-sm text-gray-500">Score Global</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="text-lg font-bold text-blue-600 capitalize">{lastAnalysis.category}</div>
                <div className="text-sm text-gray-500">Catégorie IA</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl">
                <div className="text-lg font-bold text-purple-600">
                  {Math.round(lastAnalysis.detection_confidence * 100)}%
                </div>
                <div className="text-sm text-gray-500">Confiance IA</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-xl">
                <div className="text-lg font-bold text-orange-600">
                  {lastAnalysis.metadata.processing_time_ms}ms
                </div>
                <div className="text-sm text-gray-500">Temps traitement</div>
              </div>
            </div>
          </div>
        )}

        {/* Grille catégories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onAnalysisComplete={handleAnalysisComplete}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MultiCategoriesPage;
