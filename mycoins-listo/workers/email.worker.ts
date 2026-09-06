import { Worker } from 'bullmq';

import { logger } from '../lib/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

logger.info('🚀 Starting Email background worker...');

try {
	const worker = new Worker(
		'email-queue',
		async job => {
			logger.info(`[Email Worker] Processing job ${job.id || 'unknown'} of type ${job.name}...`);
			const { email, subject, body } = job.data as { email: string; subject: string; body: string };

			logger.info(`[Email Worker] Sending email to: ${email}`);
			logger.info(`[Email Worker] Subject: ${subject}`);
			logger.info(`[Email Worker] Body preview: ${body.substring(0, 50)}...`);

			// Simulate network latency (e.g., SMTP transport delay)
			await new Promise(resolve => setTimeout(resolve, 1000));

			logger.info(`[Email Worker] Job ${job.id || 'unknown'} processed successfully!`);
		},
		{
			connection: {
				url: REDIS_URL,
				maxRetriesPerRequest: null,
			},
			concurrency: 2,
		},
	);

	worker.on('completed', job => {
		logger.info(`[Email Worker] Job ${job.id || 'unknown'} has completed!`);
	});

	worker.on('failed', (job, err) => {
		logger.error(`[Email Worker] Job ${job?.id || 'unknown'} failed with error: ${err.message}`);
	});
} catch (error: unknown) {
	const msg = error instanceof Error ? error.message : String(error);
	logger.error(`Failed to start Email worker: ${msg}`);
}
