/**
 * Configuration Jest pour ECOLOJIA - Sprint 3 enrichi
 * Garde la configuration Prisma existante + ajoute support IA
 */

// Configuration Prisma existante (gardée)
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
    }
  }
});

// ===== AJOUTS SPRINT 3 - Configuration Jest + IA =====

// Timeout global étendu pour les appels IA
jest.setTimeout(30000);

// Variables d'environnement pour tests Sprint 3
process.env.NODE_ENV = 'test';
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'test_key_sprint3';

// Console management pour tests
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Configuration console pour tests
  console.log = (...args) => {
    // Afficher seulement les logs de test importants
    const message = args[0];
    if (typeof message === 'string' && (
      message.includes('✅') || 
      message.includes('❌') || 
      message.includes('🎯') ||
      message.includes('🚀') ||
      message.includes('===') ||
      message.includes('Sprint 3')
    )) {
      originalLog(...args);
    }
  };
  
  // Garder les erreurs et warnings visibles
  console.error = originalError;
  console.warn = originalWarn;
  
  console.log('🔧 Jest configuré pour Sprint 3 - IA + Prisma');
});

afterAll(() => {
  // Restaurer console
  console.log = originalLog;
});

// ===== CONFIGURATION SPRINT 3 - MOCKS IA =====

// Mock des services IA si pas de vraie clé API
if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'test_key_sprint3') {
  console.warn('⚠️ Mode test IA - Utilisation de mocks pour DeepSeek');
  
  // Mock axios pour DeepSeek API
  jest.mock('axios', () => ({
    post: jest.fn().mockImplementation((url, data) => {
      // Mock response pour DeepSeek
      if (url.includes('deepseek.com')) {
        return Promise.resolve({
          data: {
            choices: [{
              message: {
                content: "Réponse de test IA: Ce produit contient des additifs selon l'EFSA. Les études montrent que l'ultra-transformation peut impacter la santé. Source: Base de données test ECOLOJIA 2024."
              }
            }]
          }
        });
      }
      
      // Autres appels axios passent normalement
      return Promise.reject(new Error(`Mock non configuré pour: ${url}`));
    }),
    
    // Méthodes axios de base
    get: jest.fn().mockResolvedValue({ data: {} }),
    defaults: { headers: { common: {} } }
  }));
}

// ===== NETTOYAGE PRISMA (EXISTANT + ENRICHI) =====

// Nettoyer la base avant chaque test (garde votre logique existante)
beforeEach(async () => {
  try {
    // Votre nettoyage existant
    await prisma.partnerLink.deleteMany({
      where: { 
        OR: [
          { url: { contains: 'test-partner' } },
          { tracking_id: { startsWith: 'TEST_' } }
        ]
      }
    });
    
    await prisma.partner.deleteMany({
      where: { name: { startsWith: 'Test Partner' } }
    });
    
    await prisma.product.deleteMany({
      where: { title: { startsWith: 'Test Product' } }
    });
    
    // AJOUT Sprint 3: Nettoyage données IA tests
    await prisma.product.deleteMany({
      where: { 
        OR: [
          { title: { startsWith: 'Sprint3 Test' } },
          { title: { contains: 'IA Test' } }
        ]
      }
    });
    
  } catch (error) {
    // Ignorer les erreurs de cleanup - normal en tests
    if (!error.message.includes('Unknown argument')) {
      // Réduire verbosité mais garder info utile
      if (error.message.length > 100) {
        console.log('Cleanup info:', error.message.substring(0, 80) + '...');
      }
    }
  }
});

// Fermer connexions après tous les tests (existant + enrichi)
afterAll(async () => {
  try {
    // Fermeture Prisma existante
    await prisma.$disconnect();
    
    // AJOUT Sprint 3: Nettoyage cache IA si nécessaire
    if (global.aiCache) {
      global.aiCache.clear();
    }
    
  } catch (error) {
    console.error('Erreur fermeture tests:', error.message);
  }
});

// ===== HELPERS GLOBAUX SPRINT 3 =====

// Helper pour attendre résolution promesses
global.flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// Helper pour créer produits de test
global.createTestProduct = (overrides = {}) => ({
  name: "Test Product Sprint 3",
  ingredients: ["Test ingredient 1", "Test ingredient 2"],
  nutrition: {
    energy_kcal: 100,
    fat: 5.0,
    carbohydrates: 10.0,
    proteins: 3.0,
    salt: 0.5
  },
  certifications: [],
  packaging: { recyclable: true },
  ...overrides
});

// Helper pour créer profils utilisateur test
global.createTestUserProfile = (overrides = {}) => ({
  experience_level: 'débutant',
  health_goals: [],
  dietary_restrictions: [],
  preferences: ['bio'],
  ...overrides
});

// Variables globales
global.prisma = prisma;

// AJOUT Sprint 3: Flag pour identifier si services IA sont disponibles
global.AI_SERVICES_AVAILABLE = !!(
  process.env.DEEPSEEK_API_KEY && 
  process.env.DEEPSEEK_API_KEY !== 'test_key_sprint3'
);

console.log('🔧 Setup complet:', {
  prisma: '✅',
  ai_mocks: global.AI_SERVICES_AVAILABLE ? 'Vraie API' : 'Mocks de test',
  jest_timeout: '30s',
  sprint: '3.0'
});