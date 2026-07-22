import { Worker, Job } from 'bullmq';
import { env } from '../../lib/env.js';
import { SendWebhookNotificationUseCase } from '../../application/use-cases/send-webhook-notification.usecase.js';
import { PrismaTransactionRepository } from '../database/repositories/prisma-transaction-repository.js';
import { PrismaMerchantRepository } from '../database/repositories/prisma-merchant-repository.js';
import { FetchWebhookNotificationProvider } from '../providers/fetch-webhook-notification-provider.js';

const transactionRepository = new PrismaTransactionRepository();
const merchantRepository = new PrismaMerchantRepository();
const webhookProvider = new FetchWebhookNotificationProvider();

const sendWebhookNotificationUseCase = new SendWebhookNotificationUseCase(
  transactionRepository,
  merchantRepository,
  webhookProvider,
);

export const webhookWorker = new Worker(
  'webhooks-out-queue',
  async (job: Job<{ transactionId: string }>) => {
    console.log(
      `[WebhookWorker] Processing job ${job.id} for transaction ${job.data.transactionId} (Attempt ${job.attemptsMade + 1})`,
    );

    await sendWebhookNotificationUseCase.execute(job.data.transactionId);

    console.log(
      `[WebhookWorker] Webhook for transaction ${job.data.transactionId} delivered successfully!`,
    );
  },
  {
    connection: { url: env.REDIS_URL },
    concurrency: 5,
  },
);

webhookWorker.on('failed', (job, err) => {
  if (job) {
    console.error(
      `[WebhookWorker] Job ${job.id} failed with error: ${err.message}`,
    );
  }
});

console.log(
  '[WebhookWorker] Webhook Worker started and listening to webhooks-out-queue...',
);
