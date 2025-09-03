const mongoose = require('mongoose');

// Função para conectar ao MongoDB
async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/igorvalen_catalog';

  try {
    await mongoose.connect(uri);
    console.log('MongoDB conectado');
    return true;
  } catch (err) {
    console.error('Erro ao conectar no MongoDB:', err.message);
    return false;
  }
}

module.exports = connectDB;
