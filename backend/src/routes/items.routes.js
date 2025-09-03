const express = require('express');
const Item = require('../models/Item');
const auth = require('../middlewares/auth');

const router = express.Router();

// Lista todos os itens
router.get('/items', async (req, res, next) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// Retorna item específico
router.get('/items/:id', async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item não encontrado' });
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// Cria item (protegido)
router.post('/items', auth, async (req, res, next) => {
  try {
    const item = await Item.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    err.status = 400;
    next(err);
  }
});

// Atualiza item (protegido)
router.put('/items/:id', auth, async (req, res, next) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) {
      return res.status(404).json({ message: 'Item não encontrado' });
    }
    res.json(item);
  } catch (err) {
    err.status = 400;
    next(err);
  }
});

// Remove item (protegido)
router.delete('/items/:id', auth, async (req, res, next) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item não encontrado' });
    }
    res.json({ message: 'Item removido' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
