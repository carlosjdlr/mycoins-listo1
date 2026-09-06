import Redis from 'ioredis';

import { logger } from './logger';

class CacheService {
	private redis: Redis | null = null;
	private memoryCache = new Map<string, { value: unknown; expiresAt: number }>();
	private useMemory = false;

	constructor() {
		const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
		try {
			this.redis = new Redis(redisUrl, {
				maxRetriesPerRequest: 1,
				connectTimeout: 2000,
				showFriendlyErrorStack: true,
				retryStrategy: times => {
					if (times > 1) {
						logger.warn('Redis connection failed, switching to memory cache fallback.');
						this.useMemory = true;
						return null; // Stop retrying
					}
					return 1000;
				},
			});

			this.redis.on('error', (err: Error) => {
				if (!this.useMemory) {
					logger.warn(`Redis client error: ${err.message}. Using memory cache fallback.`);
					this.useMemory = true;
				}
			});

			this.redis.on('connect', () => {
				logger.info('Successfully connected to Redis cache.');
				this.useMemory = false;
			});
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			logger.warn(`Failed to initialize Redis: ${msg}. Using memory cache fallback.`);
			this.useMemory = true;
		}
	}

	async get<T>(key: string): Promise<T | null> {
		if (this.useMemory || !this.redis) {
			const cached = this.memoryCache.get(key);
			if (!cached) return null;
			if (Date.now() > cached.expiresAt) {
				this.memoryCache.delete(key);
				return null;
			}
			return cached.value as T;
		}

		try {
			const val = await this.redis.get(key);
			if (!val) return null;
			return JSON.parse(val) as T;
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.warn(`Redis GET failed for key "${key}": ${msg}. Falling back to memory.`);
			this.useMemory = true;
			return this.get<T>(key);
		}
	}

	async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
		if (this.useMemory || !this.redis) {
			this.memoryCache.set(key, {
				value,
				expiresAt: Date.now() + ttlSeconds * 1000,
			});
			return;
		}

		try {
			await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.warn(`Redis SET failed for key "${key}": ${msg}. Falling back to memory.`);
			this.useMemory = true;
			await this.set<T>(key, value, ttlSeconds);
		}
	}

	async getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
		const cached = await this.get<T>(key);
		if (cached !== null) {
			return cached;
		}

		const freshValue = await fetchFn();
		await this.set(key, freshValue, ttlSeconds);
		return freshValue;
	}

	async invalidate(key: string): Promise<void> {
		this.memoryCache.delete(key);
		if (!this.useMemory && this.redis) {
			try {
				await this.redis.del(key);
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				logger.warn(`Redis DEL failed for key "${key}": ${msg}.`);
			}
		}
	}
}

export const cacheService = new CacheService();
