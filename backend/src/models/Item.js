const mongoose = require('mongoose');

// Schema do item do catálogo
const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 120,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    price: {
      type: Number,
      min: 0,
    },
    imageUrl: {
      type: String,
    },
    category: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Item', itemSchema);
