import { IExchangeRateProvider } from '../../application/providers/i-exchange-rate-provider.js';

export class CoinbaseExchangeRateProvider implements IExchangeRateProvider {
  async getRate(from: string, to: string): Promise<number> {
    const url = `https://api.coinbase.com/v2/prices/${from}-${to}/spot`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Coinbase API Error: ${response.status} ${response.statusText}`,
        );
      }

      const body = await response.json();

      if (!body.data || !body.data.amount) {
        throw new Error('Invalid response format from Coinbase API');
      }

      return parseFloat(body.data.amount);
    } catch (error: any) {
      console.error(
        `[ExchangeRateProvider] Failed to fetch rate for ${from}-${to}:`,
        error.message,
      );
      throw error;
    }
  }
}
