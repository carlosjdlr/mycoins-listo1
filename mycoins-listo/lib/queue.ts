import { Queue } from 'bullmq';

import { logger } from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class QueueService {
	private queue: Queue | null = null;
	private useFallback = false;

	constructor() {
		try {
			this.queue = new Queue('email-queue', {
				connection: {
					url: REDIS_URL,
					maxRetriesPerRequest: null,
				},
			});

			this.queue.on('error', (err: Error) => {
				logger.warn(`BullMQ queue error: ${err.message}. Using fallback in-memory job processing.`);
				this.useFallback = true;
			});
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			logger.warn(`BullMQ initialization failed: ${msg}. Using fallback in-memory job processing.`);
			this.useFallback = true;
		}
	}

	async addJob(
		name: string,
		data: { email: string; subject: string; body: string },
	): Promise<void> {
		if (this.useFallback || !this.queue) {
			logger.info(`[Memory Queue Fallback] Processing job "${name}" synchronously.`);
			await this.executeJobLocally(name, data);
			return;
		}

		try {
			await this.queue.add(name, data, {
				attempts: 3,
				backoff: 1000,
			});
			logger.info(`Enqueued background job "${name}" to BullMQ queue "email-queue" successfully.`);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			logger.warn(`Failed to enqueue job to BullMQ: ${msg}. Executing synchronously.`);
			this.useFallback = true;
			await this.executeJobLocally(name, data);
		}
	}

	private async executeJobLocally(
		name: string,
		data: { email: string; subject: string; body: string },
	): Promise<void> {
		try {
			logger.info(`[Sync Worker Fallback] Started processing job "${name}"...`);
			logger.info(`[Sync Worker Fallback] Target Email: ${data.email}`);
			logger.info(`[Sync Worker Fallback] Subject: ${data.subject}`);
			logger.info(`[Sync Worker Fallback] Body Preview: ${data.body.substring(0, 60)}...`);

			// Simulate latency
			await new Promise(resolve => setTimeout(resolve, 500));

			logger.info(`[Sync Worker Fallback] Completed processing job "${name}" successfully.`);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			logger.error(`Error in synchronous fallback job execution "${name}": ${msg}`);
		}
	}
}

export const queueService = new QueueService();

/**
 * Cola de auditoría (`audit-logs`).
 *
 * Se usa para trabajo "fire-and-forget" que no debe bloquear la respuesta HTTP:
 * registrar accesos (login) para trazabilidad y simular el envío de una alerta
 * de seguridad. Igual que `QueueService`, si Redis no está disponible cae a un
 * fallback en memoria para que el proyecto siga funcionando en cualquier entorno.
 */
export type AuditJobName = 'REGISTER_ACCESS_AUDIT' | 'SEND_SECURITY_ALERT';

export type AuditJobData = {
	userId: string;
	email: string;
	ip?: string;
	userAgent?: string;
	timestamp: string;
};

class AuditQueueService {
	private queue: Queue | null = null;
	private useFallback = false;

	constructor() {
		try {
			this.queue = new Queue('audit-logs', {
				connection: {
					url: REDIS_URL,
					maxRetriesPerRequest: null,
				},
			});

			this.queue.on('error', (err: Error) => {
				logger.warn(
					`BullMQ audit queue error: ${err.message}. Using fallback in-memory job processing.`,
				);
				this.useFallback = true;
			});
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			logger.warn(
				`BullMQ audit queue initialization failed: ${msg}. Using fallback in-memory job processing.`,
			);
			this.useFallback = true;
		}
	}

	/**
	 * Encola el trabajo sin bloquear al llamador: no se espera (`await`) desde el
	 * endpoint de login, así que la respuesta HTTP no depende de que termine.
	 */
	addJob(name: AuditJobName, data: AuditJobData): void {
		if (this.useFallback || !this.queue) {
			void this.executeJobLocally(name, data);
			return;
		}

		this.queue
			.add(name, data, { attempts: 3, backoff: 1000 })
			.then(() => {
				logger.info(`Enqueued background job "${name}" to BullMQ queue "audit-logs" successfully.`);
			})
			.catch((error: unknown) => {
				const msg = error instanceof Error ? error.message : String(error);
				logger.warn(
					`Failed to enqueue job to BullMQ audit queue: ${msg}. Executing synchronously.`,
				);
				this.useFallback = true;
				void this.executeJobLocally(name, data);
			});
	}

	private async executeJobLocally(name: AuditJobName, data: AuditJobData): Promise<void> {
		try {
			logger.info(
				`[Audit Queue Fallback] Processing job "${name}" in-memory for user ${data.userId}.`,
			);
			await processAuditJob(name, data);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			logger.error(`Error in synchronous fallback audit job "${name}": ${msg}`);
		}
	}
}

/**
 * Logica de procesamiento compartida entre el worker real (workers/audit.worker.ts)
 * y el fallback en memoria de AuditQueueService, para no duplicar comportamiento.
 */
export const processAuditJob = async (name: AuditJobName, data: AuditJobData): Promise<void> => {
	switch (name) {
		case 'REGISTER_ACCESS_AUDIT':
			logger.info(
				`[Audit] Acceso registrado -> userId=${data.userId} email=${data.email} ip=${data.ip ?? 'desconocida'} ua="${data.userAgent ?? 'desconocido'}" at=${data.timestamp}`,
			);
			break;
		case 'SEND_SECURITY_ALERT':
			await new Promise(resolve => setTimeout(resolve, 300));
			logger.info(
				`[Audit] Alerta de seguridad simulada enviada a ${data.email} por inicio de sesion desde ip=${data.ip ?? 'desconocida'}.`,
			);
			break;
	}
};

export const auditQueueService = new AuditQueueService();
