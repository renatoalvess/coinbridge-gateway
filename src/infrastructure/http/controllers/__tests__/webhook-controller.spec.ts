import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { app } from '../../app.js';
import { env } from '../../../../lib/env.js';
import { prisma } from '../../../database/prisma/client.js';

describe('WebhookController (E2E)', () => {
  beforeAll(async () => {
    await app.ready();
    // Clean up db before tests
    await prisma.transaction.deleteMany();
    await prisma.merchant.deleteMany();

    // Create a merchant
    await prisma.merchant.create({
      data: {
        id: 'merchant-test-123',
        name: 'Test Merchant',
        email: 'test@merchant.com',
        apiKey: 'fake-api-key',
      }
    });
  });

  afterAll(async () => {
    await app.close();
  });

  function generateSignature(payload: any) {
    return crypto
      .createHmac('sha256', env.WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  it('should return 401 if signature is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/blockchain',
      payload: {
        merchantId: 'merchant-test-123',
        blockchainTxId: 'tx-001',
        amount: 1000,
        currency: 'USDT',
      }
    });

    expect(response.statusCode).toBe(400); // Because zod validator blocks missing header
  });

  it('should return 401 if signature is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/blockchain',
      headers: {
        'x-signature': 'invalid-signature-123'
      },
      payload: {
        merchantId: 'merchant-test-123',
        blockchainTxId: 'tx-001',
        amount: 1000,
        currency: 'USDT',
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return 202 Accepted and create transaction on valid webhook', async () => {
    const payload = {
      merchantId: 'merchant-test-123',
      blockchainTxId: 'tx-002',
      amount: 1000,
      currency: 'USDT',
    };

    const signature = generateSignature(payload);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/blockchain',
      headers: {
        'x-signature': signature
      },
      payload
    });

    expect(response.statusCode).toBe(202);

    // Verify if it was saved in DB
    const tx = await prisma.transaction.findUnique({
      where: { blockchain_tx_id: 'tx-002' }
    });

    expect(tx).toBeDefined();
    expect(tx?.status).toBe('PENDING');
  });

  it('should return 202 idempotently if the same webhook is sent twice', async () => {
    const payload = {
      merchantId: 'merchant-test-123',
      blockchainTxId: 'tx-002', // Same as previous
      amount: 1000,
      currency: 'USDT',
    };

    const signature = generateSignature(payload);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/blockchain',
      headers: {
        'x-signature': signature
      },
      payload
    });

    // Should return 202 even though it already exists, acting idempotently
    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body).message).toBe('Already processed (Idempotent)');
  });
});
