import { ITransactionRepository } from '../../../application/repositories/i-transaction-repository.js';
import {
  Transaction,
  TransactionStatus,
} from '../../../domain/entities/transaction.js';
import { MerchantNotFoundError } from '../../../domain/errors/merchant-not-found-error.js';
import { DoubleSpendingError } from '../../../domain/errors/double-spending-error.js';
import { prisma } from '../prisma/client.js';

export class PrismaTransactionRepository implements ITransactionRepository {
  async create(transaction: Transaction): Promise<void> {
    try {
      await prisma.transaction.create({
        data: {
          id: transaction.id,
          merchantId: transaction.merchantId,
          blockchain_tx_id: transaction.blockchainTxId,
          amount: transaction.amount,
          currency: transaction.currency,
          exchangeRate: transaction.exchangeRate,
          amountBrl: transaction.amountBrl,
          status: transaction.status,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
        },
      });
    } catch (error: any) {
      // Handle Prisma Unique Constraint Violation (P2002) for idempotency
      if (error.code === 'P2002') {
        throw new DoubleSpendingError(transaction.blockchainTxId);
      }
      // Handle Foreign Key Constraint Violation (P2003) for non-existent merchant
      if (error.code === 'P2003') {
        throw new MerchantNotFoundError(transaction.merchantId);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Transaction | null> {
    const data = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!data) return null;

    return new Transaction({
      id: data.id,
      merchantId: data.merchantId,
      blockchainTxId: data.blockchain_tx_id,
      amount: data.amount,
      currency: data.currency,
      exchangeRate: data.exchangeRate,
      amountBrl: data.amountBrl,
      status: data.status as TransactionStatus,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async save(transaction: Transaction): Promise<void> {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        exchangeRate: transaction.exchangeRate,
        amountBrl: transaction.amountBrl,
        status: transaction.status,
        updatedAt: transaction.updatedAt,
      },
    });
  }
}
