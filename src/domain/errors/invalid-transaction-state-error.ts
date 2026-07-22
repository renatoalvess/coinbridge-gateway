export class InvalidTransactionStateError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot transition transaction status from ${from} to ${to}.`);
    this.name = 'InvalidTransactionStateError';
  }
}
