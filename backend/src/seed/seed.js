require('dotenv').config();
const Item = require('../models/Item');
const connectDB = require('../config/db');

// Script para popular o banco com itens de exemplo
async function seed() {
  await connectDB();
  await Item.deleteMany({});

  const items = await Item.insertMany([
    {
      name: 'Produto 1',
      description: 'Descrição do produto 1',
      price: 10,
      imageUrl: 'https://via.placeholder.com/150',
      category: 'Categoria A',
    },
    {
      name: 'Produto 2',
      description: 'Descrição do produto 2',
      price: 20,
      imageUrl: 'https://via.placeholder.com/150',
      category: 'Categoria B',
    },
    {
      name: 'Produto 3',
      description: 'Descrição do produto 3',
      price: 30,
    },
    {
      name: 'Produto 4',
      description: 'Descrição do produto 4',
      price: 40,
    },
    {
      name: 'Produto 5',
      description: 'Descrição do produto 5',
      price: 50,
    },
  ]);

  console.log(`${items.length} itens inseridos`);
  process.exit();
}

seed();
