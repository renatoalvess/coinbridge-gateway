import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ReceiveWebhookUseCase } from '../../../application/use-cases/receive-webhook.usecase.js';
import { PrismaTransactionRepository } from '../../database/repositories/prisma-transaction-repository.js';
import { NodeSignatureValidator } from '../../cryptography/node-signature-validator.js';
import { BullMQQueueProvider } from '../../queue/bullmq-queue-provider.js';
import { env } from '../../../lib/env.js';

export const webhookSchema = z.object({
  merchantId: z.string().min(1),
  blockchainTxId: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string().min(1),
});

export class WebhookController {
  async handle(
    request: FastifyRequest<{ Body: z.infer<typeof webhookSchema> }>,
    reply: FastifyReply,
  ) {
    const signature = request.headers['x-signature'] as string;

    if (!signature) {
      return reply.status(401).send({ message: 'Missing signature' });
    }

    const transactionRepository = new PrismaTransactionRepository();
    const signatureValidator = new NodeSignatureValidator(env.WEBHOOK_SECRET);
    const queueProvider = new BullMQQueueProvider(env.REDIS_URL);
    const useCase = new ReceiveWebhookUseCase(
      transactionRepository,
      signatureValidator,
      queueProvider,
    );

    const payloadString = JSON.stringify(request.body);

    await useCase.execute({
      merchantId: request.body.merchantId,
      blockchainTxId: request.body.blockchainTxId,
      amount: request.body.amount,
      currency: request.body.currency,
      payloadString,
      signature,
    });

    return reply.status(202).send({ message: 'Accepted' });
  }
}
