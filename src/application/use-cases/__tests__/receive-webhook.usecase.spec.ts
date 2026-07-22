import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReceiveWebhookUseCase } from '../receive-webhook.usecase.js';
import { ITransactionRepository } from '../../repositories/i-transaction-repository.js';
import { ISignatureValidator } from '../../cryptography/i-signature-validator.js';
import { IQueueProvider } from '../../providers/i-queue-provider.js';

describe('ReceiveWebhookUseCase', () => {
  let receiveWebhookUseCase: ReceiveWebhookUseCase;
  let transactionRepositoryMock: ITransactionRepository;
  let signatureValidatorMock: ISignatureValidator;
  let queueProviderMock: IQueueProvider;

  beforeEach(() => {
    transactionRepositoryMock = {
      create: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(),
    };

    signatureValidatorMock = {
      isValid: vi.fn().mockReturnValue(true),
    };

    queueProviderMock = {
      publishTransactionEvent: vi.fn(),
    };

    receiveWebhookUseCase = new ReceiveWebhookUseCase(
      transactionRepositoryMock,
      signatureValidatorMock,
      queueProviderMock,
    );
  });

  it('should process webhook and enqueue transaction successfully', async () => {
    await receiveWebhookUseCase.execute({
      merchantId: 'merchant-123',
      blockchainTxId: 'tx-123',
      amount: 5000,
      currency: 'USDT',
      payloadString: '{"amount":5000}',
      signature: 'valid-signature',
    });

    expect(signatureValidatorMock.isValid).toHaveBeenCalledWith(
      '{"amount":5000}',
      'valid-signature',
    );
    expect(transactionRepositoryMock.create).toHaveBeenCalledOnce();

    // Check if the created transaction has the right status
    const createdTransaction = vi.mocked(transactionRepositoryMock.create).mock
      .calls[0][0];
    expect(createdTransaction.status).toBe('PENDING');
    expect(createdTransaction.blockchainTxId).toBe('tx-123');

    expect(queueProviderMock.publishTransactionEvent).toHaveBeenCalledWith(
      createdTransaction.id,
    );
  });

  it('should throw an error if signature is invalid', async () => {
    signatureValidatorMock.isValid = vi.fn().mockReturnValue(false);

    await expect(
      receiveWebhookUseCase.execute({
        merchantId: 'merchant-123',
        blockchainTxId: 'tx-123',
        amount: 5000,
        currency: 'USDT',
        payloadString: '{"amount":5000}',
        signature: 'invalid-signature',
      }),
    ).rejects.toThrow('Invalid signature');

    expect(transactionRepositoryMock.create).not.toHaveBeenCalled();
    expect(queueProviderMock.publishTransactionEvent).not.toHaveBeenCalled();
  });
});
