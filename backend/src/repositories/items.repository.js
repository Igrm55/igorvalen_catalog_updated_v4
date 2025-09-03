const Item = require('../models/Item');
const { randomUUID } = require('crypto');

// Implementação usando MongoDB via Mongoose
const mongoRepo = {
  list: () => Item.find().sort({ createdAt: -1 }),
  get: (id) => Item.findById(id),
  create: (data) => Item.create(data),
  update: (id, data) =>
    Item.findByIdAndUpdate(id, data, { new: true, runValidators: true }),
  remove: (id) => Item.findByIdAndDelete(id),
};

// Implementação em memória para fallback
const memoryStore = [];

const memoryRepo = {
  list: async () => [...memoryStore].sort((a, b) => b.createdAt - a.createdAt),
  get: async (id) => memoryStore.find((i) => i._id === id) || null,
  create: async (data) => {
    const doc = new Item(data);
    const err = doc.validateSync();
    if (err) throw err;
    const obj = doc.toObject();
    obj._id = randomUUID();
    obj.createdAt = new Date();
    obj.updatedAt = new Date();
    memoryStore.push(obj);
    return obj;
  },
  update: async (id, data) => {
    const index = memoryStore.findIndex((i) => i._id === id);
    if (index === -1) return null;
    const updated = { ...memoryStore[index], ...data, updatedAt: new Date() };
    const doc = new Item(updated);
    const err = doc.validateSync();
    if (err) throw err;
    memoryStore[index] = { ...doc.toObject(), _id: id, createdAt: memoryStore[index].createdAt };
    return memoryStore[index];
  },
  remove: async (id) => {
    const index = memoryStore.findIndex((i) => i._id === id);
    if (index === -1) return null;
    const [removed] = memoryStore.splice(index, 1);
    return removed;
  },
};

function getRepository(useMemory) {
  return useMemory ? memoryRepo : mongoRepo;
}

module.exports = { getRepository };
