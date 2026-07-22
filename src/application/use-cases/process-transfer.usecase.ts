import { ITransactionRepository } from '../repositories/i-transaction-repository.js';
import { IPixProvider } from '../providers/i-pix-provider.js';
import { IQueueProvider } from '../providers/i-queue-provider.js';
import { IExchangeRateProvider } from '../providers/i-exchange-rate-provider.js';
import { TransactionNotFoundError } from '../../domain/errors/transaction-not-found-error.js';

export class ProcessTransferUseCase {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly pixProvider: IPixProvider,
    private readonly queueProvider: IQueueProvider,
    private readonly exchangeRateProvider: IExchangeRateProvider
  ) {}

  async execute(transactionId: string): Promise<void> {
    const transaction = await this.transactionRepository.findById(transactionId);
    
    if (!transaction) {
      throw new TransactionNotFoundError(transactionId);
    }

    transaction.process();
    await this.transactionRepository.save(transaction);

    try {
      // 1. Fetch real-time exchange rate
      const rate = await this.exchangeRateProvider.getRate(transaction.currency, 'BRL');
      
      // 2. Apply rate to calculate amountBrl
      transaction.applyExchangeRate(rate);
      
      // 3. Send Pix using the calculated BRL amount, not the original crypto amount
      const brlAmount = transaction.amountBrl!;
      const success = await this.pixProvider.sendPix(brlAmount, transaction.merchantId);
      
      if (success) {
        transaction.complete();
      } else {
        transaction.fail();
      }
    } catch (error) {
      transaction.fail();
      await this.transactionRepository.save(transaction);
      throw error; // Rethrow so BullMQ can trigger retry
    }

    await this.transactionRepository.save(transaction);

    // Notification (SUCCESS ou FAILED)
    await this.queueProvider.publishWebhookEvent(transaction.id);
  }
}
