// PATH: backend/src/db/pool.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    console.error('❌ Échec de la connexion PostgreSQL:', err);
    return false;
  }
}

export function isPostgreSQLConnected(): boolean {
  return Boolean(prisma);
}

// Exemple de fonction de récupération (tu peux l’enrichir plus tard)
export async function getAllProducts(limit = 50, offset = 0, query: string | null = null) {
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

export async function getProductBySlug(slug: string) {
  return await prisma.product.findFirst({ where: { slug } });
}

export async function getProductByBarcode(barcode: string) {
  return await prisma.product.findFirst({ where: { barcode } });
}

export { prisma };
