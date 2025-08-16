/* Seed database with settings and initial products */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main(){
  const categories = [
    'Bebidas não alcoólicas',
    'Bebidas alcoólicas',
    'Bomboneire',
    'Cigarro',
    'Utilidades',
  ]
  // Settings: store as comma-separated string for broader SQLite support
  await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, categoriesOrder: categories.join('|') },
    update: { categoriesOrder: categories.join('|') },
  })

  // Clear existing for idempotence
  await prisma.product.deleteMany()

  const products = [
    { name: 'Refrigerante Goob 2L', category: 'Bebidas não alcoólicas', codes: '66, 69', flavors: 'Cola, Guaraná, Laranja', imageUrl: '/img/placeholder.png', priceUV: 4.20, priceUP: 4.25, priceFV: 25.21, priceFP: 25.49, sortOrder: 1, active: true },
    { name: 'Energético Ener Up 250ML', category: 'Bebidas não alcoólicas', codes: '49', flavors: 'Tradicional, Tropical', imageUrl: '/img/placeholder.png', priceUV: 3.50, priceUP: 3.55, priceFV: 21.00, priceFP: 21.30, sortOrder: 2, active: true },
    { name: 'Suco de Laranja 1L', category: 'Bebidas não alcoólicas', codes: '71', flavors: 'Laranja', imageUrl: '/img/placeholder.png', priceUV: 5.00, priceUP: 5.10, priceFV: 30.00, priceFP: 30.60, sortOrder: 3, active: true },
    { name: 'Cerveja Skol Lata 350ml', category: 'Bebidas alcoólicas', codes: '150', flavors: 'Pilsen', imageUrl: '/img/placeholder.png', priceUV: 2.80, priceUP: 2.85, priceFV: 33.60, priceFP: 34.20, sortOrder: 4, active: true },
    { name: 'Vinho Tinto Suave 750ml', category: 'Bebidas alcoólicas', codes: '155', flavors: 'Tinto Suave', imageUrl: '/img/placeholder.png', priceUV: 15.00, priceUP: 15.50, priceFV: 90.00, priceFP: 93.00, sortOrder: 5, active: true },
    { name: 'Bombom Garoto', category: 'Bomboneire', codes: '101', flavors: 'Sortidos', imageUrl: '/img/placeholder.png', priceUV: 1.50, priceUP: 1.55, priceFV: 45.00, priceFP: 46.50, sortOrder: 6, active: true },
    { name: 'Chocolate Lacta 90g', category: 'Bomboneire', codes: '105', flavors: 'Ao Leite, Branco', imageUrl: '/img/placeholder.png', priceUV: 5.50, priceUP: 5.60, priceFV: 82.50, priceFP: 84.00, sortOrder: 7, active: true },
    { name: 'Rothmans Click', category: 'Cigarro', codes: '201', flavors: 'Mentolado', imageUrl: '/img/placeholder.png', priceUV: 6.50, priceUP: 6.50, priceFV: 65.00, priceFP: 65.00, sortOrder: 8, active: true },
    { name: 'Isqueiro Bic', category: 'Utilidades', codes: '301', flavors: 'Cores Sortidas', imageUrl: '/img/placeholder.png', priceUV: 3.00, priceUP: 3.00, priceFV: 30.00, priceFP: 30.00, sortOrder: 9, active: true },
    { name: 'Vela de Aniversário', category: 'Utilidades', codes: '305', flavors: 'Número 0-9', imageUrl: '/img/placeholder.png', priceUV: 4.00, priceUP: 4.00, priceFV: 40.00, priceFP: 40.00, sortOrder: 10, active: true },
  ]

  for (const p of products){
    await prisma.product.create({ data: p })
  }
  console.log('Seed concluído.')
}

main().catch(e=>{
  console.error(e)
  process.exit(1)
}).finally(async()=>{
  await prisma.$disconnect()
})
