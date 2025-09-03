require('dotenv').config();
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const itemsRoutes = require('./routes/items.routes');
const errorHandler = require('./middlewares/error');

const app = express();
const PORT = process.env.PORT || 5000;

// Conecta ao banco de dados
connectDB();

// Configurações básicas
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Rotas da API
app.use('/api', authRoutes);
app.use('/api', itemsRoutes);

// Rota de verificação
app.get('/healthz', (req, res) => res.json({ ok: true }));

// Middleware de erros
app.use(errorHandler);

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
