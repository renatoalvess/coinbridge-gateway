import { IPixProvider } from '../../application/providers/i-pix-provider.js';

export class FakePixProvider implements IPixProvider {
  async sendPix(amountCents: number, merchantId: string): Promise<boolean> {
    console.log(`[FakePix] Sending ${amountCents} cents for merchant ${merchantId}...`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulate 20% chance of temporary network failure to test Retries
    const isNetworkError = Math.random() < 0.2;
    if (isNetworkError) {
      throw new Error('FakePixProvider: Temporary Network Error (Simulated)');
    }

    // Simulate 10% chance of business logic failure (invalid key, insufficient funds)
    const isBusinessFailure = Math.random() < 0.1;
    if (isBusinessFailure) {
      return false; // Will trigger FAILED status immediately without retry
    }

    return true; // SUCCESS
  }
}
