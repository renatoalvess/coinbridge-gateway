import { Merchant } from '../../domain/entities/merchant.js';

export interface IMerchantRepository {
  findById(id: string): Promise<Merchant | null>;
}
