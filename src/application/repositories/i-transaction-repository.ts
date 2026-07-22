import { Transaction } from '../../domain/entities/transaction.js';

export interface ITransactionRepository {
  create(transaction: Transaction): Promise<void>;
  findById(id: string): Promise<Transaction | null>;
  save(transaction: Transaction): Promise<void>;
}
