'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function init() {
  await prisma.$connect();
}

async function health() {
  await prisma.$queryRaw`SELECT 1`;
}

function mapProduct(p) {
  if (!p) return p;
  return { ...p, active: p.active !== false };
}

async function getProducts() {
  const rows = await prisma.product.findMany();
  return rows.map(mapProduct);
}

function getProduct(id) {
  return prisma.product.findUnique({ where: { id } }).then(mapProduct);
}

async function insertProduct(p) {
  const created = await prisma.product.create({ data: p });
  return created.id;
}

function updateProduct(id, p) {
  return prisma.product.update({ where: { id }, data: p });
}

function deleteProduct(id) {
  return prisma.product.delete({ where: { id } });
}

function reorderProducts(order) {
  const tx = order.map((id, idx) =>
    prisma.product.update({ where: { id }, data: { sortOrder: idx + 1 } })
  );
  return prisma.$transaction(tx);
}

async function getSettings() {
  const row = await prisma.setting.findUnique({ where: { id: 1 } });
  return row && Array.isArray(row.categoriesOrder) ? row.categoriesOrder : [];
}

function saveSettings(order) {
  return prisma.setting.upsert({
    where: { id: 1 },
    update: { categoriesOrder: order },
    create: { id: 1, categoriesOrder: order }
  });
}

module.exports = {
  init,
  health,
  getProducts,
  getProduct,
  insertProduct,
  updateProduct,
  deleteProduct,
  reorderProducts,
  getSettings,
  saveSettings
};
