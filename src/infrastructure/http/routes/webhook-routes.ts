import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { WebhookController, webhookSchema } from '../controllers/webhook-controller.js';

export async function webhookRoutes(app: FastifyInstance) {
  const webhookController = new WebhookController();

  app.post('/v1/webhooks/blockchain', {
    schema: {
      tags: ['Webhooks'],
      summary: 'Receive blockchain deposit webhook',
      body: webhookSchema,
      headers: z.object({
        'x-signature': z.string()
      }),
      response: {
        202: z.object({
          message: z.string(),
        }),
        401: z.object({
          message: z.string(),
        }),
      }
    }
  }, webhookController.handle.bind(webhookController));
}
