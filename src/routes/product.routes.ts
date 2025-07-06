import { Router } from "express";
import {
  getAllProducts,
  getProductBySlug,
  deleteProduct,
  searchProducts,
  getProductStats,
} from "../controllers/product.controller";
import { getSimilarProducts } from "../controllers/similar.controller";
import { createProductSchema, updateProductSchema } from "../validators/product.schema";
import { createProduct, updateProduct } from "../services/product.service";
import { Prisma, VerifiedStatus } from "@prisma/client";
import { prisma } from "../lib/prisma"; // ✅ AJOUT IMPORT MANQUANT
import { EcoScoreService } from "../services/eco-score.service"; // ✅ AJOUT IMPORT MANQUANT

const router = Router();

/**
 * @openapi
 * /api/products/barcode/{code}:
 *   get:
 *     summary: Rechercher un produit par code-barres
 *     description: Recherche un produit dans la base via son code-barres
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Code-barres du produit (EAN-13, UPC, etc.)
 *     responses:
 *       200:
 *         description: Produit trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *                 barcode:
 *                   type: string
 *       404:
 *         description: Produit non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *                 barcode:
 *                   type: string
 *                 suggestion_url:
 *                   type: string
 */
router.get("/barcode/:code", async (req, res) => {
  try {
    const { code } = req.params;
    
    // Validation du code-barres
    if (!code || code.trim() === '') {
      return res.status(400).json({
        success: false,
        error: "Code-barres requis",
        barcode: code
      });
    }

    // Nettoyer le code-barres
    const cleanBarcode = code.trim().replace(/[^\d]/g, '');
    
    if (cleanBarcode.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Code-barres invalide (minimum 8 chiffres)",
        barcode: code
      });
    }

    console.log(`🔍 Recherche produit par code-barres: ${cleanBarcode}`);

    // Rechercher le produit avec plusieurs méthodes
    let product = null;

    // 1. Recherche directe par barcode (MAINTENANT POSSIBLE)
    product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: cleanBarcode },
          { barcode: code },
          { title: { contains: cleanBarcode, mode: 'insensitive' } },
          { description: { contains: cleanBarcode, mode: 'insensitive' } }
        ]
      }
    });

    // 2. Si pas trouvé, recherche dans les tags
    if (!product) {
      product = await prisma.product.findFirst({
        where: {
          tags: {
            hasSome: [cleanBarcode, code]
          }
        }
      });
    }

    if (product) {
      console.log(`✅ Produit trouvé: ${product.title}`);
      
      // Convertir les décimaux Prisma
      const sanitizedProduct = {
        ...product,
        eco_score: product.eco_score ? Number(product.eco_score) : null,
        ai_confidence: product.ai_confidence ? Number(product.ai_confidence) : null
      };
      
      return res.json({
        success: true,
        product: sanitizedProduct,
        barcode: cleanBarcode,
        search_method: 'database'
      });
    }

    // 3. Produit non trouvé - Proposer création
    console.log(`❌ Produit non trouvé pour code-barres: ${cleanBarcode}`);
    
    return res.status(404).json({
      success: false,
      error: "Produit non trouvé dans notre base de données",
      barcode: cleanBarcode,
      suggestion_url: `/product-not-found?barcode=${cleanBarcode}`,
      message: "Aidez-nous à enrichir notre base en photographiant ce produit"
    });

  } catch (error) {
    console.error('❌ Erreur recherche barcode:', error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la recherche",
      message: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

/**
 * @openapi
 * /api/products/analyze-photos:
 *   post:
 *     summary: Analyser des photos de produit avec OCR et IA
 *     description: Route pour analyser les photos uploadées depuis ProductNotFoundPage
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               barcode:
 *                 type: string
 *               photos:
 *                 type: object
 *                 properties:
 *                   front:
 *                     type: string
 *                   ingredients:
 *                     type: string
 *                   nutrition:
 *                     type: string
 *               source:
 *                 type: string
 *     responses:
 *       200:
 *         description: Analyse réussie et produit créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 productId:
 *                   type: string
 *                 productSlug:
 *                   type: string
 *                 productName:
 *                   type: string
 *                 analysis:
 *                   type: object
 */
router.post("/analyze-photos", async (req, res) => {
  try {
    const { barcode, photos, source = 'user_photo_analysis' } = req.body;

    console.log(`📸 Analyse photos pour code-barres: ${barcode}`);
    console.log(`📷 Photos reçues: ${Object.keys(photos || {}).join(', ')}`);

    // Validation
    if (!barcode) {
      return res.status(400).json({
        success: false,
        error: "Code-barres requis"
      });
    }

    if (!photos || !photos.front || !photos.ingredients) {
      return res.status(400).json({
        success: false,
        error: "Photos 'front' et 'ingredients' requises"
      });
    }

    // 🔬 SIMULATION OCR - À remplacer par vraie OCR
    const mockOCRAnalysis = EcoScoreService.simulateOCRAnalysis(photos);
    
    console.log(`🧠 Analyse OCR simulée:`, mockOCRAnalysis);

    // Calculer le score écologique avec les données extraites
    const detailedScore = await EcoScoreService.calculateDetailedEcoScore({
      title: mockOCRAnalysis.productName,
      description: mockOCRAnalysis.description,
      brand: mockOCRAnalysis.brand,
      category: mockOCRAnalysis.category,
      tags: mockOCRAnalysis.tags
    });

    // Générer un slug unique
    const slug = mockOCRAnalysis.productName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + `-${Date.now()}`;

    // Créer le produit en base
    const newProduct = await prisma.product.create({
      data: {
        title: mockOCRAnalysis.productName,
        slug: slug,
        description: mockOCRAnalysis.description,
        brand: mockOCRAnalysis.brand,
        category: mockOCRAnalysis.category,
        barcode: barcode,
        tags: mockOCRAnalysis.tags,
        images: photos.front ? [photos.front] : [],
        eco_score: detailedScore.eco_score,
        ai_confidence: detailedScore.ai_confidence,
        confidence_pct: detailedScore.confidence_pct,
        confidence_color: detailedScore.confidence_color,
        verified_status: 'ai_analyzed',
        resume_fr: `Produit analysé automatiquement par IA. Score écologique: ${Math.round(detailedScore.eco_score * 100)}%. ${detailedScore.details || ''}`,
        enriched_at: new Date(),
        zones_dispo: ['FR'], // Par défaut France
        prices: { default: 0 } // Prix à définir plus tard
      }
    });

    console.log(`✅ Produit créé: ${newProduct.id} - ${newProduct.title}`);

    res.json({
      success: true,
      message: "Produit analysé et créé avec succès",
      productId: newProduct.id,
      productSlug: newProduct.slug,
      productName: newProduct.title,
      brand: newProduct.brand,
      category: newProduct.category,
      ecoScore: Math.round(detailedScore.eco_score * 100),
      analysis: {
        ocr_extraction: mockOCRAnalysis,
        eco_score: detailedScore,
        confidence: `${detailedScore.confidence_pct}%`
      },
      redirect_url: `/product/${newProduct.slug}`
    });

  } catch (error) {
    console.error('❌ Erreur analyse photos:', error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de l'analyse des photos",
      message: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: Liste tous les produits
 *     description: Récupère la liste complète des produits avec leur eco_score
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Nombre maximum de produits à retourner
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Nombre de produits à ignorer (pagination)
 *     responses:
 *       200:
 *         description: Liste des produits
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: Erreur serveur
 */
router.get("/", getAllProducts);

/**
 * @openapi
 * /api/products/search:
 *   get:
 *     summary: Recherche et filtre les produits
 *     description: Recherche dans les produits avec filtres avancés
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Terme de recherche
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtre par catégorie
 *       - in: query
 *         name: min_score
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         description: Score écologique minimum
 *       - in: query
 *         name: max_score
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         description: Score écologique maximum
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filtre par marque
 *       - in: query
 *         name: verified_only
 *         schema:
 *           type: boolean
 *         description: Afficher uniquement les produits vérifiés
 *     responses:
 *       200:
 *         description: Résultats de recherche
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 count:
 *                   type: integer
 *                 filters:
 *                   type: object
 */
router.get("/search", searchProducts);

/**
 * @openapi
 * /api/products/stats:
 *   get:
 *     summary: Statistiques des produits
 *     description: Récupère les statistiques globales des produits
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Statistiques des produits
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_products:
 *                   type: integer
 *                   description: Nombre total de produits
 *                 average_eco_score:
 *                   type: number
 *                   description: Score écologique moyen
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 top_products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get("/stats", getProductStats);

/**
 * @openapi
 * /api/products:
 *   post:
 *     summary: Créer un nouveau produit
 *     description: Ajoute un produit avec calcul automatique de l'eco_score via IA
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       201:
 *         description: Produit créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.post("/", async (req, res) => {
  try {
    const data = createProductSchema.parse(req.body);

    const parsedData: Prisma.ProductCreateInput = {
      title: data.title,
      slug: data.slug,
      description: data.description ?? '',
      brand: data.brand ?? null,
      category: data.category ?? 'générique',
      tags: data.tags ?? [],
      images: data.images ?? [],
      zones_dispo: data.zones_dispo ?? [],
      prices: data.prices ?? {},
      affiliate_url: data.affiliate_url ?? null,
      eco_score: data.eco_score ? new Prisma.Decimal(data.eco_score) : undefined,
      ai_confidence: data.ai_confidence ? new Prisma.Decimal(data.ai_confidence) : undefined,
      confidence_pct: data.confidence_pct ?? null,
      confidence_color: data.confidence_color ?? null,
      verified_status: data.verified_status as VerifiedStatus ?? 'pending',
      resume_fr: data.resume_fr ?? '',
      resume_en: data.resume_en ?? '',
      enriched_at: data.enriched_at ? new Date(data.enriched_at) : undefined,
    };

    const product = await createProduct(parsedData);
    res.status(201).json(product);
  } catch (err: any) {
    res.status(400).json({
      error: "Validation error",
      details: err.errors ?? err.message,
    });
  }
});

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     summary: Mettre à jour un produit
 *     description: Met à jour les informations d'un produit existant
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID unique du produit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProductRequest'
 *     responses:
 *       200:
 *         description: Produit mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Produit non trouvé
 */
router.put("/:id", async (req, res) => {
  try {
    const data = updateProductSchema.parse(req.body);

    const parsedData: Prisma.ProductUpdateInput = {
      title: data.title,
      slug: data.slug,
      description: data.description,
      brand: data.brand,
      category: data.category,
      tags: data.tags,
      images: data.images,
      zones_dispo: data.zones_dispo,
      prices: data.prices,
      affiliate_url: data.affiliate_url,
      eco_score: data.eco_score ? new Prisma.Decimal(data.eco_score) : undefined,
      ai_confidence: data.ai_confidence ? new Prisma.Decimal(data.ai_confidence) : undefined,
      confidence_pct: data.confidence_pct,
      confidence_color: data.confidence_color,
      verified_status: data.verified_status as VerifiedStatus,
      resume_fr: data.resume_fr,
      resume_en: data.resume_en,
      enriched_at: data.enriched_at ? new Date(data.enriched_at) : undefined,
    };

    const { id } = req.params;
    const product = await updateProduct(id, parsedData);
    res.json(product);
  } catch (err: any) {
    res.status(400).json({
      error: "Validation error",
      details: err.errors ?? err.message,
    });
  }
});

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     summary: Supprimer un produit
 *     description: Supprime définitivement un produit
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID unique du produit
 *     responses:
 *       200:
 *         description: Produit supprimé
 *       404:
 *         description: Produit non trouvé
 */
router.delete("/:id", deleteProduct);

/**
 * @openapi
 * /api/products/{id}/similar:
 *   get:
 *     summary: Produits similaires
 *     description: Récupère des produits similaires basés sur la catégorie et les tags
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du produit de référence
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Nombre de suggestions à retourner
 *     responses:
 *       200:
 *         description: Liste des produits similaires
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produit non trouvé
 */
router.get("/:id/similar", getSimilarProducts);

/**
 * @openapi
 * /api/products/{slug}:
 *   get:
 *     summary: Récupérer un produit par slug
 *     description: Récupère les détails d'un produit via son slug unique
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug unique du produit (ex. "savon-bio-karite")
 *     responses:
 *       200:
 *         description: Détails du produit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produit non trouvé
 */
router.get("/:slug", getProductBySlug);

export default router;