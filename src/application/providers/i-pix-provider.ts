export interface IPixProvider {
  sendPix(amountCents: number, merchantId: string): Promise<boolean>;
}
