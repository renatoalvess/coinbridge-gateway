export class MerchantNotFoundError extends Error {
  constructor(id: string) {
    super(`Merchant not found: ${id}`);
    this.name = 'MerchantNotFoundError';
  }
}
