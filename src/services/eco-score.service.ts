// ✅ FICHIER AMÉLIORÉ : src/services/eco-score.service.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ProductAnalysis {
  title: string;
  description: string;
  brand?: string;
  category?: string;
  tags: string[];
}

export interface EcoScoreResult {
  eco_score: number;
  ai_confidence: number;
  confidence_pct: number;
  confidence_color: string;
  breakdown?: {
    materials: number;
    certifications: number;
    origin: number;
    durability: number;
    packaging: number;
    penalties: number;
  };
  recommendations?: string[];
  details?: string;
}

export class EcoScoreService {
  
  /**
   * Méthode requise par product.service.ts - AMÉLIORÉE
   */
  async calculateFromText(description: string): Promise<EcoScoreResult> {
    try {
      console.log('🧠 Calcul eco-score DÉTAILLÉ pour:', description.substring(0, 100) + '...');
      
      const result = await EcoScoreService.calculateDetailedEcoScore({
        title: '',
        description: description,
        tags: []
      });
      
      console.log('✅ Score détaillé calculé:', {
        score: Math.round(result.eco_score * 100),
        confidence: result.confidence_pct,
        breakdown: result.breakdown
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Erreur dans calculateFromText:', error);
      return {
        eco_score: 0.55,
        ai_confidence: 0.3,
        confidence_pct: 30,
        confidence_color: "yellow",
        details: "Erreur de calcul - score par défaut"
      };
    }
  }

  /**
   * NOUVEAU: Calcul détaillé avec breakdown complet
   */
  static async calculateDetailedEcoScore(productData: ProductAnalysis): Promise<EcoScoreResult> {
    try {
      console.log("🌱 Calcul eco_score DÉTAILLÉ pour:", productData.title || 'Produit');

      const text = `${productData.title} ${productData.description} ${productData.brand || ''} ${productData.tags.join(" ")}`.toLowerCase();

      // Analyse de chaque composant
      const materialsScore = EcoScoreService.analyzeMaterials(text);
      const certificationsScore = EcoScoreService.analyzeCertifications(text);
      const originScore = EcoScoreService.analyzeOrigin(text);
      const durabilityScore = EcoScoreService.analyzeDurability(text);
      const packagingScore = EcoScoreService.analyzePackaging(text);
      const penalties = EcoScoreService.analyzePenalties(text);

      // Score final
      let finalScore = 0.5 + materialsScore + certificationsScore + originScore + durabilityScore + packagingScore - penalties;
      finalScore = Math.max(0.1, Math.min(1, finalScore));

      // Calcul de confiance avancé
      const confidence = EcoScoreService.calculateAdvancedConfidence(text, {
        materialsScore,
        certificationsScore,
        originScore,
        durabilityScore,
        packagingScore,
        penalties
      });

      const confidencePct = Math.round(confidence * 100);
      const confidenceColor = EcoScoreService.getConfidenceColor(confidencePct);

      // Génération des recommandations
      const recommendations = EcoScoreService.generateRecommendations({
        materialsScore,
        certificationsScore,
        originScore,
        durabilityScore,
        packagingScore,
        penalties
      });

      // Détails explicatifs
      const details = EcoScoreService.generateScoreDetails({
        materialsScore,
        certificationsScore,
        originScore,
        durabilityScore,
        packagingScore,
        penalties,
        finalScore
      });

      console.log(`✅ Score FINAL: ${Math.round(finalScore * 100)}%`);
      console.log(`📊 Breakdown: Matériaux(${Math.round(materialsScore*100)}) + Certifs(${Math.round(certificationsScore*100)}) + Origine(${Math.round(originScore*100)}) + Durabilité(${Math.round(durabilityScore*100)}) + Emballage(${Math.round(packagingScore*100)}) - Pénalités(${Math.round(penalties*100)})`);
      
      return {
        eco_score: finalScore,
        ai_confidence: confidence,
        confidence_pct: confidencePct,
        confidence_color: confidenceColor,
        breakdown: {
          materials: Math.round(materialsScore * 100),
          certifications: Math.round(certificationsScore * 100),
          origin: Math.round(originScore * 100),
          durability: Math.round(durabilityScore * 100),
          packaging: Math.round(packagingScore * 100),
          penalties: Math.round(penalties * 100)
        },
        recommendations,
        details
      };

    } catch (error) {
      console.error("❌ Erreur calcul detailed eco_score:", error);
      return {
        eco_score: 0.55,
        ai_confidence: 0.3,
        confidence_pct: 30,
        confidence_color: "yellow",
        details: "Erreur de calcul"
      };
    }
  }

  /**
   * AMÉLIORÉ: Calcul de confiance avec plus de critères
   */
  static calculateAdvancedConfidence(text: string, scores: any): number {
    let confidence = 0.4; // Base
    
    // Bonus pour mots-clés spécifiques
    const ecoKeywords = ['bio', 'écologique', 'naturel', 'durable', 'recyclable', 'certifié'];
    const keywordMatches = ecoKeywords.filter(keyword => text.includes(keyword)).length;
    confidence += keywordMatches * 0.1;

    // Bonus pour certifications trouvées
    if (scores.certificationsScore > 0.1) confidence += 0.15;
    if (scores.certificationsScore > 0.15) confidence += 0.1;

    // Bonus pour origine locale
    if (scores.originScore > 0.05) confidence += 0.1;

    // Bonus pour matériaux naturels
    if (scores.materialsScore > 0.1) confidence += 0.1;

    // Malus pour pénalités importantes
    if (scores.penalties > 0.1) confidence -= 0.15;

    // Bonus pour longueur de description
    if (text.length > 200) confidence += 0.05;
    if (text.length > 500) confidence += 0.05;

    return Math.min(0.95, Math.max(0.2, confidence));
  }

  /**
   * NOUVEAU: Génération de recommandations personnalisées
   */
  static generateRecommendations(scores: any): string[] {
    const recommendations: string[] = [];

    if (scores.materialsScore < 0.1) {
      recommendations.push("Privilégiez des matériaux naturels ou recyclés");
    }

    if (scores.certificationsScore < 0.05) {
      recommendations.push("Recherchez des produits avec labels écologiques (AB, Ecocert, FSC)");
    }

    if (scores.originScore < 0.03) {
      recommendations.push("Optez pour des produits locaux ou européens");
    }

    if (scores.packagingScore < 0.05) {
      recommendations.push("Choisissez des emballages recyclables ou réutilisables");
    }

    if (scores.penalties > 0.1) {
      recommendations.push("Évitez les produits jetables ou non-recyclables");
    }

    if (recommendations.length === 0) {
      recommendations.push("Excellent choix écologique ! Continuez ainsi 🌱");
    }

    return recommendations;
  }

  /**
   * NOUVEAU: Génération de détails explicatifs
   */
  static generateScoreDetails(breakdown: any): string {
    const parts: string[] = [];

    if (breakdown.materialsScore > 0.1) {
      parts.push("matériaux naturels/recyclés détectés");
    }
    if (breakdown.certificationsScore > 0.05) {
      parts.push("certifications écologiques présentes");
    }
    if (breakdown.originScore > 0.03) {
      parts.push("origine locale/responsable");
    }
    if (breakdown.packagingScore > 0.03) {
      parts.push("emballage éco-conçu");
    }
    if (breakdown.penalties > 0.05) {
      parts.push("impact environnemental à améliorer");
    }

    return parts.length > 0 
      ? `Score basé sur: ${parts.join(", ")}`
      : "Score basé sur l'analyse générale du produit";
  }

  private calculateConfidence(text: string): number {
    return EcoScoreService.calculateAdvancedConfidence(text, {
      materialsScore: 0,
      certificationsScore: 0,
      originScore: 0,
      durabilityScore: 0,
      packagingScore: 0,
      penalties: 0
    });
  }

  private getConfidenceColor(pct: number): string {
    return EcoScoreService.getConfidenceColor(pct);
  }

  static getConfidenceColor(pct: number): string {
    if (pct >= 80) return "green";
    if (pct >= 60) return "orange";  
    if (pct >= 40) return "yellow";
    return "red";
  }

  static async calculateEcoScore(productData: ProductAnalysis): Promise<number> {
    const result = await EcoScoreService.calculateDetailedEcoScore(productData);
    return result.eco_score;
  }

  static analyzeMaterials(text: string): number {
    let score = 0;
    const excellent = ["bio", "organic", "bambou", "chanvre", "coton bio", "recyclé", "biodégradable", "compostable"];
    const good = ["naturel", "bois", "liège", "zéro déchet", "réutilisable", "lin", "laine"];
    const ok = ["durable", "écologique", "local", "végétal"];

    let foundMaterials: string[] = [];

    excellent.forEach(m => { 
      if (text.includes(m)) {
        score += 0.05;
        foundMaterials.push(m);
      }
    });
    
    good.forEach(m => { 
      if (text.includes(m)) {
        score += 0.03;
        foundMaterials.push(m);
      }
    });
    
    ok.forEach(m => { 
      if (text.includes(m)) {
        score += 0.01;
        foundMaterials.push(m);
      }
    });

    if (foundMaterials.length > 0) {
      console.log(`📦 Matériaux trouvés: ${foundMaterials.join(", ")}`);
    }

    return Math.min(score, 0.35); // Augmenté de 0.3 à 0.35
  }

  static analyzeCertifications(text: string): number {
    let score = 0;
    const certs = ["ecocert", "ab", "cosmebio", "fair trade", "fsc", "pefc", "cradle to cradle", "epeat"];
    const foundCerts: string[] = [];

    certs.forEach(cert => { 
      if (text.includes(cert)) {
        score += 0.04;
        foundCerts.push(cert);
      }
    });

    // Bonus pour multiple certifications
    const found = certs.filter(c => text.includes(c));
    if (found.length >= 2) score += 0.03;
    if (found.length >= 3) score += 0.03;

    if (foundCerts.length > 0) {
      console.log(`🏆 Certifications trouvées: ${foundCerts.join(", ")}`);
    }

    return Math.min(score, 0.25); // Augmenté de 0.2 à 0.25
  }

  static analyzeOrigin(text: string): number {
    let score = 0;
    const local = ["made in france", "fabrication française", "local", "européen", "france", "artisanal"];
    const transport = ["transport vert", "carbone neutre", "neutre en carbone", "compensation carbone"];
    const foundOrigins: string[] = [];

    local.forEach(o => { 
      if (text.includes(o)) {
        score += 0.04; // Augmenté de 0.03
        foundOrigins.push(o);
      }
    });
    
    transport.forEach(t => { 
      if (text.includes(t)) {
        score += 0.03; // Augmenté de 0.02
        foundOrigins.push(t);
      }
    });

    if (foundOrigins.length > 0) {
      console.log(`🌍 Origine/Transport: ${foundOrigins.join(", ")}`);
    }

    return Math.min(score, 0.18); // Augmenté de 0.15
  }

  static analyzeDurability(text: string): number {
    let score = 0;
    const keywords = ["durable", "résistant", "réparable", "solide", "longue durée", "garantie", "robuste"];
    const foundKeywords: string[] = [];

    keywords.forEach(k => { 
      if (text.includes(k)) {
        score += 0.02; // Augmenté de 0.015
        foundKeywords.push(k);
      }
    });

    if (foundKeywords.length > 0) {
      console.log(`⏱️ Durabilité: ${foundKeywords.join(", ")}`);
    }

    return Math.min(score, 0.12); // Augmenté de 0.1
  }

  /**
   * NOUVEAU: Analyse de l'emballage
   */
  static analyzePackaging(text: string): number {
    let score = 0;
    const ecoPackaging = ["recyclable", "biodégradable", "compostable", "papier recyclé", "carton", "verre", "métal"];
    const reusablePackaging = ["réutilisable", "consigne", "rechargeable", "recharge"];
    const minimalPackaging = ["sans emballage", "emballage minimal", "vrac", "zéro déchet"];
    const foundPackaging: string[] = [];

    ecoPackaging.forEach(pkg => { 
      if (text.includes(pkg)) {
        score += 0.03;
        foundPackaging.push(pkg);
      }
    });
    
    reusablePackaging.forEach(pkg => { 
      if (text.includes(pkg)) {
        score += 0.05;
        foundPackaging.push(pkg);
      }
    });
    
    minimalPackaging.forEach(pkg => { 
      if (text.includes(pkg)) {
        score += 0.08;
        foundPackaging.push(pkg);
      }
    });

    if (foundPackaging.length > 0) {
      console.log(`📦 Emballage éco: ${foundPackaging.join(", ")}`);
    }
    
    return Math.min(score, 0.2);
  }

  static analyzePenalties(text: string): number {
    let penalties = 0;
    const badMaterials = ["plastique", "polyester", "nylon", "pvc", "polystyrène"];
    const badPractices = ["jetable", "usage unique", "non recyclable", "suremballé"];
    const farOrigin = ["chine", "bangladesh", "vietnam", "import lointain"];
    const foundBad: string[] = [];

    badMaterials.forEach(m => { 
      if (text.includes(m)) {
        penalties += 0.06; // Augmenté de 0.05
        foundBad.push(m);
      }
    });
    
    badPractices.forEach(p => { 
      if (text.includes(p)) {
        penalties += 0.04; // Augmenté de 0.03
        foundBad.push(p);
      }
    });
    
    farOrigin.forEach(o => { 
      if (text.includes(o)) {
        penalties += 0.03; // Augmenté de 0.02
        foundBad.push(o);
      }
    });

    if (foundBad.length > 0) {
      console.log(`❌ Pénalités pour: ${foundBad.join(", ")}`);
    }

    return Math.min(penalties, 0.3); // Augmenté de 0.25
  }

  static async updateProductEcoScore(productId: string): Promise<number> {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          title: true,
          description: true,
          brand: true,
          category: true,
          tags: true
        }
      });

      if (!product) throw new Error(`Produit ${productId} non trouvé`);

      const result = await EcoScoreService.calculateDetailedEcoScore({
        title: product.title || '',
        description: product.description || '',
        brand: product.brand || '',
        category: product.category || '',
        tags: Array.isArray(product.tags) ? product.tags : []
      });

      await prisma.product.update({
        where: { id: productId },
        data: {
          eco_score: result.eco_score,
          ai_confidence: result.ai_confidence,
          confidence_pct: result.confidence_pct,
          confidence_color: result.confidence_color,
          enriched_at: new Date()
        }
      });

      return result.eco_score;
    } catch (error) {
      console.error(`❌ Erreur update eco_score produit ${productId}:`, error);
      throw error;
    }
  }

  /**
   * SIMULATION OCR - À remplacer par vraie OCR plus tard
   */
  static simulateOCRAnalysis(photos: any): {
    productName: string;
    brand: string;
    category: string;
    description: string;
    tags: string[];
  } {
    // Simulation basée sur des patterns courants
    const mockResults = [
      {
        productName: "Shampooing Bio Naturel",
        brand: "EcoNature",
        category: "cosmétique",
        description: "Shampooing bio à base d'huile d'olive et d'aloe vera, sans sulfate, certifié Ecocert",
        tags: ["bio", "naturel", "sans-sulfate", "ecocert", "cheveux"]
      },
      {
        productName: "Savon Artisanal Karité",
        brand: "Savonnerie du Sud",
        category: "cosmétique", 
        description: "Savon artisanal au beurre de karité bio, fabriqué en France, zéro déchet",
        tags: ["artisanal", "karité", "bio", "france", "zéro-déchet"]
      },
      {
        productName: "Dentifrice Menthe Bio",
        brand: "DentVert",
        category: "hygiène",
        description: "Dentifrice bio à la menthe naturelle, sans fluor, tube recyclable",
        tags: ["bio", "menthe", "sans-fluor", "recyclable", "naturel"]
      }
    ];

    // Sélectionner un résultat aléatoire pour la démo
    const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
    
    console.log(`🤖 OCR Simulé - Produit généré: ${randomResult.productName}`);
    
    return randomResult;
  }

  static async updateAllEcoScores(): Promise<{ updated: number; errors: number }> {
    try {
      const products = await prisma.product.findMany({
        select: { id: true, title: true, description: true, brand: true, category: true, tags: true }
      });

      let updated = 0;
      let errors = 0;

      for (const product of products) {
        try {
          await EcoScoreService.updateProductEcoScore(product.id);
          updated++;
        } catch (error) {
          console.error("❌ Erreur update produit:", error);
          errors++;
        }
      }

      return { updated, errors };
    } catch (error) {
      console.error("❌ Erreur updateAllEcoScores:", error);
      throw error;
    }
  }
}