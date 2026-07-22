export interface IQueueProvider {
  publishTransactionEvent(transactionId: string): Promise<void>;
  publishWebhookEvent(transactionId: string): Promise<void>;
}
