import { PrismaClient } from '@prisma/client'

// Hardcoded Direct Connection String (Bypassing Vercel Env Vars)
const connectionString = "postgresql://neondb_owner:npg_fktTczLV9G0q@ep-autumn-lab-ahb0p6mp.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        datasources: {
            db: {
                url: connectionString,
            },
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
