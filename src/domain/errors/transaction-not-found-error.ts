export class TransactionNotFoundError extends Error {
  constructor(id?: string) {
    super(
      id ? `Transaction with id ${id} not found.` : 'Transaction not found.',
    );
    this.name = 'TransactionNotFoundError';
  }
}
