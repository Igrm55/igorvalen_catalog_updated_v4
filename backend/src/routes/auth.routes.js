const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Rota de login do admin
router.post('/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || '1234';

  if (password !== adminPassword) {
    return res.status(401).json({ message: 'Senha incorreta' });
  }

  const secret = process.env.JWT_SECRET || 'dev-secret';
  const token = jwt.sign({ role: 'admin' }, secret, { expiresIn: '1d' });
  res.json({ token });
});

module.exports = router;
