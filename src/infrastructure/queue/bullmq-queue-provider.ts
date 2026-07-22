import { Queue } from 'bullmq';
import { IQueueProvider } from '../../application/providers/i-queue-provider.js';

export class BullMQQueueProvider implements IQueueProvider {
  private transactionsQueue: Queue;
  private webhooksQueue: Queue;

  constructor(redisUrl: string) {
    this.transactionsQueue = new Queue('transactions-queue', {
      connection: { url: redisUrl },
    });

    this.webhooksQueue = new Queue('webhooks-out-queue', {
      connection: { url: redisUrl },
    });
  }

  async publishTransactionEvent(transactionId: string): Promise<void> {
    await this.transactionsQueue.add('process-pix', { transactionId }, {
      removeOnComplete: true,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s, 16s...
      }
    });
  }

  async publishWebhookEvent(transactionId: string): Promise<void> {
    await this.webhooksQueue.add('send-webhook', { transactionId }, {
      removeOnComplete: true,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 3000,
      }
    });
  }
}
