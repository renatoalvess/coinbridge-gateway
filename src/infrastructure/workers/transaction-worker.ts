import { Worker, Job } from 'bullmq';
import './webhook-worker.js';
import { env } from '../../lib/env.js';
import { ProcessTransferUseCase } from '../../application/use-cases/process-transfer.usecase.js';
import { PrismaTransactionRepository } from '../database/repositories/prisma-transaction-repository.js';
import { FakePixProvider } from '../pix/fake-pix-provider.js';
import { BullMQQueueProvider } from '../queue/bullmq-queue-provider.js';
import { CoinbaseExchangeRateProvider } from '../providers/coinbase-exchange-rate-provider.js';

const transactionRepository = new PrismaTransactionRepository();
const pixProvider = new FakePixProvider();
const queueProvider = new BullMQQueueProvider(env.REDIS_URL);
const exchangeRateProvider = new CoinbaseExchangeRateProvider();

const processTransferUseCase = new ProcessTransferUseCase(
  transactionRepository,
  pixProvider,
  queueProvider,
  exchangeRateProvider,
);

export const transactionWorker = new Worker(
  'transactions-queue',
  async (job: Job<{ transactionId: string }>) => {
    console.log(
      `[Worker] Processing job ${job.id} for transaction ${job.data.transactionId} (Attempt ${job.attemptsMade + 1})`,
    );

    await processTransferUseCase.execute(job.data.transactionId);

    console.log(`[Worker] Job ${job.id} processed successfully`);
  },
  {
    connection: { url: env.REDIS_URL },
    concurrency: 5,
  },
);

transactionWorker.on('failed', (job, err) => {
  if (job) {
    console.error(`[Worker] Job ${job.id} failed with error: ${err.message}`);
  }
});

console.log('[Worker] Transaction Worker started and listening to queue...');
