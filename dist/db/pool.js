"use strict";
// PATH: backend/src/db/pool.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.testConnection = testConnection;
exports.isPostgreSQLConnected = isPostgreSQLConnected;
exports.getAllProducts = getAllProducts;
exports.getProductBySlug = getProductBySlug;
exports.getProductByBarcode = getProductByBarcode;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
async function testConnection() {
    try {
        await prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (err) {
        console.error('❌ Échec de la connexion PostgreSQL:', err);
        return false;
    }
}
function isPostgreSQLConnected() {
    return Boolean(prisma);
}
// Exemple de fonction de récupération (tu peux l’enrichir plus tard)
async function getAllProducts(limit = 50, offset = 0, query = null) {
    if (query) {
        return await prisma.product.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { brand: { contains: query, mode: 'insensitive' } },
                ],
            },
            take: limit,
            skip: offset,
        });
    }
    return await prisma.product.findMany({ take: limit, skip: offset });
}
async function getProductBySlug(slug) {
    return await prisma.product.findFirst({ where: { slug } });
}
async function getProductByBarcode(barcode) {
    return await prisma.product.findFirst({ where: { barcode } });
}
