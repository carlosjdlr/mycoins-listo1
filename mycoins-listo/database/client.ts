import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { env } from '@/lib/config/env';

const globalForPrisma = globalThis as typeof globalThis & {
	prisma?: PrismaClient;
};

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

// Activar con PRISMA_LOG_QUERIES=true para contar/ver cada consulta SQL emitida
// (útil para la comparación "antes vs. después" del taller de optimización: se
// puede ver en consola cuántas queries dispara un mismo endpoint).
const shouldLogQueries = process.env.PRISMA_LOG_QUERIES === 'true';

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		adapter,
		log: shouldLogQueries ? [{ emit: 'event', level: 'query' }] : undefined,
	});

if (shouldLogQueries) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(prisma as any).$on('query', (e: { query: string; params: string; duration: number }) => {
		console.log(`[Prisma Query] ${e.query} -- params: ${e.params} -- ${e.duration}ms`);
	});
}

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = prisma;
}
