import { IMerchantRepository } from '../../../application/repositories/i-merchant-repository.js';
import { Merchant } from '../../../domain/entities/merchant.js';
import { prisma } from '../prisma/client.js';

export class PrismaMerchantRepository implements IMerchantRepository {
  async findById(id: string): Promise<Merchant | null> {
    const data = await prisma.merchant.findUnique({
      where: { id },
    });

    if (!data) return null;

    return new Merchant({
      id: data.id,
      name: data.name,
      email: data.email,
      apiKey: data.apiKey,
      callbackUrl: data.callbackUrl,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
