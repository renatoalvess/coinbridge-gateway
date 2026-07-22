export class DoubleSpendingError extends Error {
  constructor(public readonly blockchainTxId?: string) {
    super(
      'Transaction with this blockchain_tx_id already exists (Double Spending Prevention).',
    );
    this.name = 'DoubleSpendingError';
  }
}
