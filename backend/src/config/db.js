const mongoose = require('mongoose');

// Função para conectar ao MongoDB
async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/igorvalen_catalog';

  try {
    await mongoose.connect(uri);
    console.log('MongoDB conectado');
  } catch (err) {
    console.error('Erro ao conectar no MongoDB:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
