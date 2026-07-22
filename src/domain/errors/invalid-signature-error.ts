export class InvalidSignatureError extends Error {
  constructor() {
    super('Invalid signature');
    this.name = 'InvalidSignatureError';
  }
}
