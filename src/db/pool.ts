// PATH: backend/src/db/pool.ts

// // import { PrismaClient } from '@prisma/client';

const prisma = null // new PrismaClient();

export async function testConnection(): Promise<boolean> {
  try {
    // await prisma.$queryRaw`SELECT 1`; // PRISMA DISABLED
    return true;
  } catch (err) {
    console.error('âŒ Ã‰chec de la connexion PostgreSQL:', err);
    return false;
  }
}

export function isPostgreSQLConnected(): boolean {
  return Boolean(prisma);
}

// Exemple de fonction de rÃ©cupÃ©ration (tu peux lâ€™enrichir plus tard)
export async function getAllProducts(limit = 50, offset = 0, query: string | null = null) {
  if (query) {
    // return await prisma.product.findMany({ // PRISMA DISABLED
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

  // return await prisma.product.findMany({ take: limit, skip: offset }); // PRISMA DISABLED
}

export async function getProductBySlug(slug: string) {
  // return await prisma.product.findFirst({ where: { slug } }); // PRISMA DISABLED
}

export async function getProductByBarcode(barcode: string) {
  // return await prisma.product.findFirst({ where: { barcode } }); // PRISMA DISABLED
}

export { prisma };


