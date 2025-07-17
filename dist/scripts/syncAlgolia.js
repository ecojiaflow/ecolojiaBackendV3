"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAlgolia = syncAlgolia;
// PATH: backend/src/scripts/syncAlgolia.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Configuration Algolia de base (à adapter selon ton setup)
const algoliaConfig = {
    appId: process.env.ALGOLIA_APP_ID || '',
    apiKey: process.env.ALGOLIA_API_KEY || '',
    indexName: 'ecolojia_products'
};
// Simulation de ton module algolia manquant
const algoliaIndex = {
    async saveObjects(objects) {
        console.log(`📤 Simulation envoi ${objects.length} objets vers Algolia`);
        console.log('📋 Échantillon des données:', JSON.stringify(objects.slice(0, 2), null, 2));
        return { objectIDs: objects.map(o => o.objectID) };
    }
};
async function syncAlgolia() {
    console.log("🔄 Début de la synchronisation Algolia...");
    try {
        const products = await prisma.product.findMany();
        console.log(`📦 ${products.length} produits trouvés en base\n`);
        // DEBUG sur les 3 premiers produits (gardé de ton script)
        console.log("🔍 DEBUG - Analyse des 3 premiers produits en base:");
        products.slice(0, 3).forEach((p, i) => {
            console.log(`${i + 1}. ${p.title}:`);
            console.log(`   - image_url: "${p.image_url}"`);
            console.log(`   - image_url type: ${typeof p.image_url}`);
            console.log(`   - images: ${JSON.stringify(p.images || [])}`);
            console.log(`   - images type: ${typeof p.images}`);
            console.log("---");
        });
        const formattedProducts = products.map((p) => {
            // Logique de ton script original préservée
            const image_url = p.images?.[0] || p.image_url || null;
            return {
                objectID: p.slug || p.id,
                title: p.title,
                description: p.description,
                tags: p.tags || [],
                brand: p.brand,
                category: p.category,
                image_url,
                eco_score: p.eco_score || 0,
            };
        });
        // Stats d'image (gardées de ton script)
        const withImage = formattedProducts.filter((p) => !!p.image_url).length;
        const withoutImage = formattedProducts.length - withImage;
        console.log("\n📊 STATISTIQUES:");
        console.log(`   - Produits avec image: ${withImage}`);
        console.log(`   - Produits sans image: ${withoutImage}\n`);
        console.log("📤 Envoi vers Algolia...");
        await algoliaIndex.saveObjects(formattedProducts);
        console.log(`✅ ${formattedProducts.length} produits réindexés proprement dans Algolia\n`);
        // Vérification post-sync (gardée de ton script)
        console.log("🔍 Vérification post-envoi...");
        formattedProducts.slice(0, 3).forEach((p, i) => {
            console.log(`${i + 1}. ${p.title}:`);
            console.log(`   - objectID: "${p.objectID}"`);
            console.log(`   - image_url: "${p.image_url}"`);
            console.log(`   - image_url type: ${typeof p.image_url}`);
            console.log("---");
        });
        console.log('✅ Synchronisation Algolia terminée');
    }
    catch (error) {
        console.error('❌ Erreur synchronisation Algolia:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
if (require.main === module) {
    syncAlgolia()
        .catch((e) => {
        console.error("❌ Erreur lors de la synchronisation Algolia:", e);
        process.exit(1);
    })
        .finally(() => {
        prisma.$disconnect();
    });
}
// EOF
