import { Router } from "express";
import multer from "multer";
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
import { prisma } from "../lib/prisma";
import { EcoScoreService } from "../services/eco-score.service";
import { analyzeImageOCR } from "../services/ocr/visionOCR";

const router = Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/barcode/:code", async (req, res) => {
  try {
    const { code } = req.params;
    if (!code || code.trim() === '') {
      return res.status(400).json({ success: false, error: "Code-barres requis", barcode: code });
    }
    const cleanBarcode = code.trim().replace(/[^\d]/g, '');
    if (cleanBarcode.length < 8) {
      return res.status(400).json({ success: false, error: "Code-barres invalide (minimum 8 chiffres)", barcode: code });
    }

    let product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: cleanBarcode },
          { barcode: code },
          { title: { contains: cleanBarcode, mode: 'insensitive' } },
          { description: { contains: cleanBarcode, mode: 'insensitive' } }
        ]
      }
    });

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
      const sanitizedProduct = {
        ...product,
        eco_score: product.eco_score ? Number(product.eco_score) : null,
        ai_confidence: product.ai_confidence ? Number(product.ai_confidence) : null
      };
      return res.json({ success: true, product: sanitizedProduct, barcode: cleanBarcode, search_method: 'database' });
    }

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

router.post("/analyze-photos", async (req, res) => {
  try {
    const { barcode, photos, source = 'user_photo_analysis' } = req.body;

    console.log(`📸 Analyse photos AMÉLIORÉE pour code-barres: ${barcode}`);
    console.log(`📷 Photos reçues: ${Object.keys(photos || {}).join(', ')}`);

    if (!barcode || !photos || !photos.front) {
      return res.status(400).json({ success: false, error: "Code-barres et photo 'front' requis minimum" });
    }

    const { analyzeMultipleImages } = require("../services/ocr/visionOCR");
    const ocrResult = await analyzeMultipleImages(photos);

    if (!ocrResult.success) {
      return res.status(500).json({ success: false, error: "Erreur OCR", detail: ocrResult.error });
    }

    console.log('🧠 OCR Results:', {
      name: ocrResult.name,
      brand: ocrResult.brand,
      ingredients_count: ocrResult.ingredients?.length || 0,
      confidence: Math.round(ocrResult.confidence * 100) + '%'
    });

    const detailedScore = await EcoScoreService.calculateDetailedEcoScore({
      title: ocrResult.name,
      description: `Produit analysé automatiquement. Ingrédients: ${ocrResult.ingredients.slice(0, 3).join(', ')}.`,
      brand: ocrResult.brand,
      category: ocrResult.category,
      tags: [...ocrResult.certifications, ...ocrResult.ingredients.slice(0, 3)]
    });

    const slug = ocrResult.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + `-${Date.now()}`;

    const newProduct = await prisma.product.create({
      data: {
        title: ocrResult.name,
        slug,
        description: `Produit analysé via Google OCR. Ingrédients détectés: ${ocrResult.ingredients.slice(0, 5).join(', ')}.`,
        brand: ocrResult.brand,
        category: ocrResult.category,
        barcode,
        tags: [...ocrResult.certifications, ...ocrResult.ingredients.slice(0, 5), `confiance-${Math.round(ocrResult.confidence * 100)}pct`],
        images: photos.front ? [photos.front] : [],
        eco_score: detailedScore.eco_score,
        ai_confidence: detailedScore.ai_confidence,
        confidence_pct: detailedScore.confidence_pct,
        confidence_color: detailedScore.confidence_color,
        verified_status: 'ai_analyzed',
        resume_fr: `Produit analysé par IA avec ${Math.round(ocrResult.confidence * 100)}% de confiance. Score écologique: ${Math.round(detailedScore.eco_score * 100)}%. ${ocrResult.certifications.length > 0 ? `Certifications: ${ocrResult.certifications.join(', ')}.` : ''} ${ocrResult.ingredients.length} ingrédients identifiés.`,
        enriched_at: new Date(),
        zones_dispo: ['FR'],
        prices: { default: 0 }
      }
    });

    console.log('✅ Produit créé avec analyse OCR améliorée:', newProduct.title);

    res.json({
      success: true,
      productId: newProduct.id,
      productSlug: newProduct.slug,
      productName: newProduct.title,
      analysis: {
        ocr_confidence: `${Math.round(ocrResult.confidence * 100)}%`,
        ingredients_detected: ocrResult.ingredients.length,
        certifications_found: ocrResult.certifications,
        eco_score: detailedScore,
        raw_texts: ocrResult.rawTexts
      },
      redirect_url: `/product/${newProduct.slug}`
    });

  } catch (error) {
    console.error('❌ Erreur analyse OCR améliorée:', error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de l'analyse des photos",
      message: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

router.get("/", getAllProducts);
router.get("/search", searchProducts);
router.get("/stats", getProductStats);

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

router.delete("/:id", deleteProduct);
router.get("/:id/similar", getSimilarProducts);
router.get("/:slug", getProductBySlug);

export default router;