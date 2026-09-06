import { Worker } from 'bullmq';

import { logger } from '../lib/logger';
import { processAuditJob } from '../lib/queue';
import type { AuditJobData, AuditJobName } from '../lib/queue';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

logger.info('🚀 Starting Audit background worker...');

try {
	const worker = new Worker(
		'audit-logs',
		async job => {
			logger.info(`[Audit Worker] Processing job ${job.id || 'unknown'} of type ${job.name}...`);
			await processAuditJob(job.name as AuditJobName, job.data as AuditJobData);
			logger.info(`[Audit Worker] Job ${job.id || 'unknown'} processed successfully!`);
		},
		{
			connection: {
				url: REDIS_URL,
				maxRetriesPerRequest: null,
			},
			concurrency: 5,
		},
	);

	worker.on('completed', job => {
		logger.info(`[Audit Worker] Job ${job.id || 'unknown'} has completed!`);
	});

	worker.on('failed', (job, err) => {
		logger.error(`[Audit Worker] Job ${job?.id || 'unknown'} failed with error: ${err.message}`);
	});
} catch (error: unknown) {
	const msg = error instanceof Error ? error.message : String(error);
	logger.error(`Failed to start Audit worker: ${msg}`);
}
