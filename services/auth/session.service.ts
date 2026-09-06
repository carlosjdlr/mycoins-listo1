import * as sessionDb from '@/database/sessions';
import { getSessionUser } from '@/database/users';
import { AuthenticationError } from '@/errors/auth';
import { env } from '@/lib/config/env';
import { sealTokens, unsealTokens } from '@/lib/session';
import type { SessionPayload, SessionTokenSet } from '@/lib/session';
import { cacheService } from '@/lib/cache';

export const sessionService = {
	/** Crea la sesión en servidor y devuelve el id que se guardará en la cookie. */
	async create(userId: string, tokens: SessionTokenSet): Promise<string> {
		const expiresAt = new Date(Date.now() + env.SESSION_COOKIE_MAX_AGE_SECONDS * 1000);
		const session = await sessionDb.create({
			userId,
			sealedTokens: await sealTokens(tokens),
			expiresAt,
		});

		return session.id;
	},

	/**
	 * Reconstruye la sesión en cada petición.
	 *
	 * Rechaza sesiones revocadas o expiradas: por eso el logout ahora sí invalida
	 * la cookie del lado del servidor, y no sólo la borra del navegador.
	 */
	async resolve(sessionId: string): Promise<SessionPayload> {
		const session = await cacheService.getOrSet(`session:${sessionId}`, 300, async () => {
			const activeSession = await sessionDb.findActive(sessionId);
			if (!activeSession) {
				throw new AuthenticationError('Session revoked or expired');
			}
			return activeSession;
		});

		const user = await cacheService.getOrSet(`user:${session.userId}`, 300, async () => {
			const sessionUser = await getSessionUser(session.userId);
			if (!sessionUser) {
				throw new AuthenticationError('User no longer exists');
			}
			return sessionUser;
		});

		const createdAtDate =
			typeof session.createdAt === 'string' ? new Date(session.createdAt) : session.createdAt;

		return {
			sessionId: session.id,
			user,
			tokens: await unsealTokens(session.sealedTokens),
			createdAt: createdAtDate.toISOString(),
		};
	},

	async rotateTokens(sessionId: string, tokens: SessionTokenSet): Promise<void> {
		await sessionDb.updateTokens(sessionId, await sealTokens(tokens));
		await cacheService.invalidate(`session:${sessionId}`);
	},

	async revoke(sessionId: string): Promise<void> {
		const session = await sessionDb.findActive(sessionId);
		if (session) {
			await cacheService.invalidate(`session:${sessionId}`);
			await cacheService.invalidate(`user:${session.userId}`);
		}
		await sessionDb.revoke(sessionId);
	},
};
