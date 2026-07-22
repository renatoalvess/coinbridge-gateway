import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessTransferUseCase } from '../process-transfer.usecase.js';
import { ITransactionRepository } from '../../repositories/i-transaction-repository.js';
import { IPixProvider } from '../../providers/i-pix-provider.js';
import { IQueueProvider } from '../../providers/i-queue-provider.js';
import { IExchangeRateProvider } from '../../providers/i-exchange-rate-provider.js';
import { Transaction } from '../../../domain/entities/transaction.js';

describe('ProcessTransferUseCase', () => {
  let processTransferUseCase: ProcessTransferUseCase;
  let transactionRepositoryMock: ITransactionRepository;
  let pixProviderMock: IPixProvider;
  let queueProviderMock: IQueueProvider;
  let exchangeRateProviderMock: IExchangeRateProvider;
  let mockTransaction: Transaction;

  beforeEach(() => {
    mockTransaction = new Transaction({
      id: 'tx-internal-123',
      merchantId: 'merchant-123',
      blockchainTxId: 'crypto-tx-123',
      amount: 10000, // 100.00
      currency: 'USDT',
    });

    transactionRepositoryMock = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockTransaction),
      save: vi.fn(),
    };

    pixProviderMock = {
      sendPix: vi.fn().mockResolvedValue(true),
    };

    queueProviderMock = {
      publishTransactionEvent: vi.fn(),
      publishWebhookEvent: vi.fn().mockResolvedValue(undefined),
    };

    exchangeRateProviderMock = {
      getRate: vi.fn().mockResolvedValue(5.50), // 1 USDT = 5.50 BRL
    };

    processTransferUseCase = new ProcessTransferUseCase(
      transactionRepositoryMock,
      pixProviderMock,
      queueProviderMock,
      exchangeRateProviderMock
    );
  });

  it('should process transfer successfully with exchange rate applied', async () => {
    let saveCount = 0;
    transactionRepositoryMock.save = vi.fn().mockImplementation(async (tx: Transaction) => {
      saveCount++;
      if (saveCount === 1) {
        expect(tx.status).toBe('PROCESSING');
      } else if (saveCount === 2) {
        expect(tx.status).toBe('SUCCESS');
      }
    });

    await processTransferUseCase.execute('tx-internal-123');

    expect(transactionRepositoryMock.findById).toHaveBeenCalledWith('tx-internal-123');
    expect(exchangeRateProviderMock.getRate).toHaveBeenCalledWith('USDT', 'BRL');
    // amount is 10000, rate is 5.50 -> amountBrl = 55000
    expect(pixProviderMock.sendPix).toHaveBeenCalledWith(55000, 'merchant-123');
    expect(queueProviderMock.publishWebhookEvent).toHaveBeenCalledWith('tx-internal-123');
    expect(saveCount).toBe(2);
    expect(mockTransaction.exchangeRate).toBe(5.50);
    expect(mockTransaction.amountBrl).toBe(55000);
  });

  it('should throw an error if transaction is not found', async () => {
    transactionRepositoryMock.findById = vi.fn().mockResolvedValue(null);

    await expect(processTransferUseCase.execute('invalid-id')).rejects.toThrow('Transaction with id invalid-id not found.');
    expect(pixProviderMock.sendPix).not.toHaveBeenCalled();
    expect(queueProviderMock.publishWebhookEvent).not.toHaveBeenCalled();
    expect(exchangeRateProviderMock.getRate).not.toHaveBeenCalled();
  });

  it('should mark transaction as FAILED if Pix provider returns false', async () => {
    pixProviderMock.sendPix = vi.fn().mockResolvedValue(false);

    await processTransferUseCase.execute('tx-internal-123');

    expect(transactionRepositoryMock.save).toHaveBeenLastCalledWith(expect.objectContaining({
      status: 'FAILED'
    }));
    expect(queueProviderMock.publishWebhookEvent).toHaveBeenCalledWith('tx-internal-123');
  });

  it('should mark transaction as FAILED and rethrow if Pix provider throws an error', async () => {
    const error = new Error('Pix API Timeout');
    pixProviderMock.sendPix = vi.fn().mockRejectedValue(error);

    await expect(processTransferUseCase.execute('tx-internal-123')).rejects.toThrow('Pix API Timeout');

    expect(transactionRepositoryMock.save).toHaveBeenLastCalledWith(expect.objectContaining({
      status: 'FAILED'
    }));
  });
});
