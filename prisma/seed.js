const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Seed skipped in production');
    return;
  }

  const count = await prisma.product.count();
  if (count === 0) {
    await prisma.product.create({
      data: {
        name: 'Sample',
        category: 'Demo',
        sortOrder: 1
      }
    });
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
