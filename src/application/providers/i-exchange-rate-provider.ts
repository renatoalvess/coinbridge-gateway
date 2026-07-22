export interface IExchangeRateProvider {
  getRate(from: string, to: string): Promise<number>;
}
