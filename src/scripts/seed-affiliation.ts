// PATH: backend/src/scripts/seed-affiliation.ts
// // import { PrismaClient } from '@prisma/client';

const prisma = null // new PrismaClient();

// Utilisation de ton enum existant depuis le client Prisma généré
// Si VerifiedStatus n'existe pas, utilise des strings directement
const VerifiedStatus = {
  verified: 'verified' as const,
  pending: 'pending' as const,
  rejected: 'rejected' as const
};

async function main() {
  console.log('🌱 Début du seed des données d\'affiliation...');

  try {
    // 1. Produit d'exemple basé sur ton format existant
    const product = await prisma.product.upsert({
      where: { slug: "savon-alep-artisanal" },
      update: {
        description: "Savon traditionnel à base d'huile d'olive et de laurier",
        tags: ["zéro-déchet", "vegan", "bio"],
        zones_dispo: ["FR", "BE"],
        affiliate_url: null,
        eco_score: 0.84,
        ai_confidence: 0.92,
        confidence_pct: 92,
        confidence_color: "green",
        verified_status: VerifiedStatus.verified,
        image_url: "https://res.cloudinary.com/dma0ywmfb/image/upload/w_400,h_400,c_fill,q_auto,f_auto/v1750024282/savon-alep_txl6yj.jpg"
      },
      create: {
        title: "Savon d'Alep artisanal",
        slug: "savon-alep-artisanal",
        description: "Savon traditionnel à base d'huile d'olive et de laurier",
        tags: ["zéro-déchet", "vegan", "bio"],
        zones_dispo: ["FR", "BE"],
        affiliate_url: null,
        eco_score: 0.84,
        ai_confidence: 0.92,
        confidence_pct: 92,
        confidence_color: "green",
        verified_status: VerifiedStatus.verified,
        image_url: "https://res.cloudinary.com/dma0ywmfb/image/upload/w_400,h_400,c_fill,q_auto,f_auto/v1750024282/savon-alep_txl6yj.jpg"
      }
    });
    console.log("✅ Produit inséré ou mis à jour :", product.slug);

    // 2. Partenaire (findUnique → create si nécessaire)
    let partner = await prisma.partner.findFirst({
      where: { name: "Greenweez" }
    });

    if (!partner) {
      partner = await prisma.partner.create({
        data: {
          name: "Greenweez",
          website: "https://www.greenweez.com",
          commission_rate: 0.07,
          ethical_score: 0.91
        }
      });
      console.log("✅ Partenaire créé :", partner.name);
    } else {
      console.log("✅ Partenaire déjà existant :", partner.name);
    }

    // 3. Lien d'affiliation (upsert OK ici car clé unique composite)
    const link = await prisma.partnerLink.upsert({
      where: {
        product_id_partner_id: {
          product_id: product.id,
          partner_id: partner.id
        }
      },
      update: {
        url: "https://greenweez.com/savon-alep-traditionnel",
        tracking_id: "trk-alep001",
        clicks: 0
      },
      create: {
        product_id: product.id,
        partner_id: partner.id,
        url: "https://greenweez.com/savon-alep-traditionnel",
        tracking_id: "trk-alep001",
        clicks: 0
      }
    });
    console.log("✅ Lien affilié créé ou mis à jour :", link.tracking_id);

    console.log('✅ Seed affiliation terminé avec succès');

  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error("❌ Erreur lors du seed :", e);
    process.exit(1);
  }).finally(async () => {
    await prisma.$disconnect();
  });
}
// EOF
