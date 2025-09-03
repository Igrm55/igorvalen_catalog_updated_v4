require('dotenv').config();
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const { getRepository } = require('./repositories/items.repository');
const authRoutes = require('./routes/auth.routes');
const itemsRoutes = require('./routes/items.routes');
const errorHandler = require('./middlewares/error');

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Configurações básicas
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Rotas da API
app.use('/api', authRoutes);
app.use('/api', itemsRoutes);

// Rota de verificação
app.get('/healthz', (req, res) => res.json({ ok: true }));

// Middleware de erros
app.use(errorHandler);

// Função para iniciar servidor e definir repositório
async function start() {
  let useMemory = process.env.FALLBACK_MEMORY === 'true';
  if (!useMemory) {
    const connected = await connectDB();
    useMemory = !connected;
  }
  app.locals.itemsRepo = getRepository(useMemory);
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} usando ${useMemory ? 'repositório em memória' : 'MongoDB'}`);
  });
}

start();
