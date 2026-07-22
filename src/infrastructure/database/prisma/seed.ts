import { prisma } from './client.js';

async function main() {
  await prisma.transaction.deleteMany();
  await prisma.merchant.deleteMany();

  const merchant = await prisma.merchant.upsert({
    where: { email: 'test@merchant.com' },
    update: {},
    create: {
      id: 'merchant-test-1234',
      name: 'Test Merchant',
      email: 'test@merchant.com',
      apiKey: 'fake-api-key-123',
      callbackUrl: 'https://webhook.site/6c6ec704-f6c2-43af-901c-5ce900b1ddf1',
    },
  });

  console.log('Banco de dados semeado!');
  console.log('Merchant Criado:', merchant);
}

main().catch((e) => {
  console.error('Erro ao rodar o seed:', e);
  process.exit(1);
});
