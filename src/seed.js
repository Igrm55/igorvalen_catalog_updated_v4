'use strict';

const db = require('./services/db');

async function run() {
  try {
    await db.init();
    const products = await db.getProducts();
    if (products.length === 0) {
      await db.insertProduct({
        name: 'Sample',
        category: 'Demo',
        codes: null,
        flavors: null,
        priceUV: 1.99,
        priceUP: null,
        priceFV: null,
        priceFP: null,
        sortOrder: 1,
        active: true,
        imageUrl: null
      });
      console.log('Seeded sample product');
    } else {
      console.log('Database already has data; skipping seed');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
