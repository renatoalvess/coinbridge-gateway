import { MerchantNotFoundError } from "#src/domain/errors/merchant-not-found-error.js";
import { TransactionNotFoundError } from "#src/domain/errors/transaction-not-found-error.js";
import { IWebhookNotificationProvider } from "../providers/i-webhook-notification-provider.js";
import { IMerchantRepository } from "../repositories/i-merchant-repository.js";
import { ITransactionRepository } from "../repositories/i-transaction-repository.js";

export class SendWebhookNotificationUseCase {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly merchantRepository: IMerchantRepository,
    private readonly webhookProvider: IWebhookNotificationProvider
  ) {}

  async execute(transactionId: string): Promise<void> {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new TransactionNotFoundError(transactionId);
    }

    const merchant = await this.merchantRepository.findById(transaction.merchantId);
    if (!merchant) {
      throw new MerchantNotFoundError(transaction.merchantId);
    }

    if (!merchant.callbackUrl) {
      console.log(`[Webhook] Merchant ${merchant.id} has no callback URL configured. Skipping.`);
      return;
    }

    // Payload que será enviado ao lojista
    const payload = {
      transactionId: transaction.id,
      blockchainTxId: transaction.blockchainTxId,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
    };
    
    // Envia o webhook assinando o payload com a API Key do Lojista
    const success = await this.webhookProvider.send(
      merchant.callbackUrl,
      payload,
      merchant.apiKey
    );
    if (!success) {
      throw new Error(`Failed to deliver webhook to merchant ${merchant.id}`);
    }
  }
}