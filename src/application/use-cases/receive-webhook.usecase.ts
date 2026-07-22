import { Transaction } from '../../domain/entities/transaction.js';
import { ITransactionRepository } from '../repositories/i-transaction-repository.js';
import { ISignatureValidator } from '../cryptography/i-signature-validator.js';
import { IQueueProvider } from '../providers/i-queue-provider.js';
import { InvalidSignatureError } from '../../domain/errors/invalid-signature-error.js';

interface ReceiveWebhookInput {
  merchantId: string;
  blockchainTxId: string;
  amount: number;
  currency: string;
  payloadString: string;
  signature: string;
}

export class ReceiveWebhookUseCase {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly signatureValidator: ISignatureValidator,
    private readonly queueProvider: IQueueProvider
  ) {}

  async execute(input: ReceiveWebhookInput): Promise<void> {
    const isValid = this.signatureValidator.isValid(input.payloadString, input.signature);
    if (!isValid) {
      throw new InvalidSignatureError();
    }

    const transaction = new Transaction({
      merchantId: input.merchantId,
      blockchainTxId: input.blockchainTxId,
      amount: input.amount,
      currency: input.currency,
    });

    await this.transactionRepository.create(transaction);
    await this.queueProvider.publishTransactionEvent(transaction.id);
  }
}
