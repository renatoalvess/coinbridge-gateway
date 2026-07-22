import { prisma } from './client.js';

async function main() {
  const txs = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      amount: true,
      currency: true,
      exchangeRate: true,
      amountBrl: true,
      status: true,
      createdAt: true,
    },
  });

  const formattedTxs = txs.map((tx) => ({
    id: tx.id.slice(0, 8) + '...',
    amount: (tx.amount / 100).toFixed(2),
    currency: tx.currency,
    rate: tx.exchangeRate ? tx.exchangeRate.toFixed(4) : '-',
    amountBrl: tx.amountBrl ? (tx.amountBrl / 100).toFixed(2) : '-',
    status: tx.status,
    time: tx.createdAt.toLocaleTimeString(),
  }));

  console.log('\n--- Últimas 10 Transações ---\n');
  console.table(formattedTxs);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
