import { describe, it, expect } from 'vitest';
import { Transaction } from '../transaction.js';
import { InvalidTransactionStateError } from '../../errors/invalid-transaction-state-error.js';

describe('Transaction Entity', () => {
  it('should create a valid pending transaction', () => {
    const tx = new Transaction({
      merchantId: 'merchant-123',
      blockchainTxId: '0x123abc',
      amount: 15045, // R$ 150,45
      currency: 'USDT',
    });

    expect(tx.id).toBeDefined();
    expect(tx.status).toBe('PENDING');
    expect(tx.amount).toBe(15045);
  });

  it('should apply exchange rate and calculate BRL amount correctly', () => {
    const tx = new Transaction({
      merchantId: 'merchant-123',
      blockchainTxId: '0x123abc',
      amount: 1000, // 10.00 USD
      currency: 'USDT',
    });

    tx.applyExchangeRate(5.43);
    expect(tx.exchangeRate).toBe(5.43);
    expect(tx.amountBrl).toBe(5430); // 54.30 BRL
  });

  it('should allow transition from PENDING to PROCESSING', () => {
    const tx = new Transaction({
      merchantId: 'merchant-123',
      blockchainTxId: '0x123abc',
      amount: 1000,
      currency: 'USDT',
    });

    tx.process();
    expect(tx.status).toBe('PROCESSING');
  });

  it('should allow transition from FAILED to PROCESSING (retry)', () => {
    const tx = new Transaction({
      merchantId: 'merchant-123',
      blockchainTxId: '0x123abc',
      amount: 1000,
      currency: 'USDT',
      status: 'FAILED',
    });

    tx.process();
    expect(tx.status).toBe('PROCESSING');
  });

  it('should not allow transition from PENDING directly to SUCCESS', () => {
    const tx = new Transaction({
      merchantId: 'merchant-123',
      blockchainTxId: '0x123abc',
      amount: 1000,
      currency: 'USDT',
    });

    expect(() => tx.complete()).toThrowError(InvalidTransactionStateError);
  });

  it('should not allow transition from FAILED to SUCCESS', () => {
    const tx = new Transaction({
      merchantId: 'merchant-123',
      blockchainTxId: '0x123abc',
      amount: 1000,
      currency: 'USDT',
      status: 'FAILED',
    });

    expect(tx.status).toBe('FAILED');
    expect(() => tx.complete()).toThrowError(InvalidTransactionStateError);
  });
});
