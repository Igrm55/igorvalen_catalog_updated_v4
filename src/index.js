const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const app = express()
const PORT = process.env.PORT || 4000
const uploadDir = path.join(__dirname, '..', 'public', 'uploads')
fs.mkdirSync(uploadDir, { recursive: true })

app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

// Static: disable HTML caching to avoid stale SW/JS
app.use((req,res,next)=>{
  if (req.path === '/' || req.path === '/index.html'){
    res.set('Cache-Control','no-store')
  }
  next()
})
app.use(express.static(path.join(__dirname,'..','public')))

// Multer storage for images
const upload = multer({
  storage: multer.diskStorage({
    destination: (req,file,cb)=> cb(null, uploadDir),
    filename: (req,file,cb)=> {
      const ts = Date.now()
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_')
      cb(null, `${ts}-${safe}`)
    }
  })
})

// Helpers
function normalizeNumber(val){
  if (val===undefined || val===null || val==='') return null
  if (typeof val === 'number') return val
  // Accept "4,70" or "4.70"
  const s = String(val).replace('.','').replace(',','.')
  const f = parseFloat(s)
  return isNaN(f) ? null : f
}
async function getSettings(){
  const s = await prisma.settings.findUnique({ where:{ id:1 } })
  const order = s?.categoriesOrder ? s.categoriesOrder.split('|') : []
  return { id: 1, categoriesOrder: order }
}

// ---- Public API ----
app.get('/api/catalog', async (req,res)=>{
  try{
    const { q, category } = req.query
    const where = { active: true }
    if (category) where.category = category
    if (q){
      where.OR = [
        { name: { contains: q } },
        { codes: { contains: q } },
        { category: { contains: q } },
      ]
    }
    const [products, settings] = await Promise.all([
      prisma.product.findMany({ where, orderBy: { sortOrder: 'asc' } }),
      getSettings()
    ])
    res.json({ products, settings })
  }catch(err){
    console.error(err)
    res.status(500).json({ error:'Erro ao carregar catálogo'})
  }
})

// ---- Admin API ----
app.post('/api/login', (req,res)=>{
  const { password } = req.body || {}
  res.json({ ok: password === '1234' })
})

app.get('/api/admin/products', async (req,res)=>{
  const products = await prisma.product.findMany({ orderBy:{ sortOrder:'asc' } })
  res.json(products)
})

app.get('/api/products/:id', async (req,res)=>{
  const id = Number(req.params.id)
  const item = await prisma.product.findUnique({ where:{ id } })
  if (!item) return res.status(404).json({ error:'Not found' })
  res.json(item)
})

app.post('/api/products', upload.single('image'), async (req,res)=>{
  try{
    const body = req.body || {}
    const data = {
      name: body.name || '',
      category: body.category || '',
      codes: body.codes || null,
      flavors: body.flavors || null,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : (body.imageUrl || null),
      priceUV: normalizeNumber(body.priceUV),
      priceUP: normalizeNumber(body.priceUP),
      priceFV: normalizeNumber(body.priceFV),
      priceFP: normalizeNumber(body.priceFP),
      sortOrder: Number(body.sortOrder || 0),
      active: body.active === 'false' ? false : true,
    }
    const next = await prisma.product.count() + 1
    if (!data.sortOrder) data.sortOrder = next
    const created = await prisma.product.create({ data })
    res.json(created)
  }catch(err){
    console.error(err)
    res.status(500).json({ error:'Erro ao criar produto' })
  }
})

app.put('/api/products/:id', upload.single('image'), async (req,res)=>{
  try{
    const id = Number(req.params.id)
    const body = req.body || {}
    const updates = {
      name: body.name,
      category: body.category,
      codes: body.codes ?? null,
      flavors: body.flavors ?? null,
      priceUV: normalizeNumber(body.priceUV),
      priceUP: normalizeNumber(body.priceUP),
      priceFV: normalizeNumber(body.priceFV),
      priceFP: normalizeNumber(body.priceFP),
      active: body.active === 'false' ? false : true,
    }
    if (req.file){
      updates.imageUrl = `/uploads/${req.file.filename}`
    }
    const updated = await prisma.product.update({ where:{ id }, data: updates })
    res.json(updated)
  }catch(err){
    console.error(err)
    res.status(500).json({ error:'Erro ao atualizar produto' })
  }
})

app.delete('/api/products/:id', async (req,res)=>{
  try{
    const id = Number(req.params.id)
    await prisma.product.delete({ where:{ id } })
    res.json({ ok:true })
  }catch(err){
    console.error(err)
    res.status(500).json({ error:'Erro ao excluir produto' })
  }
})

app.post('/api/products/reorder', async (req,res)=>{
  try{
    const ordered = req.body || []
    for (let i=0;i<ordered.length;i++){
      const id = Number(ordered[i])
      await prisma.product.update({ where:{ id }, data:{ sortOrder: i+1 } })
    }
    res.json({ ok:true })
  }catch(err){
    console.error(err)
    res.status(500).json({ error:'Erro ao reordenar' })
  }
})

// Settings endpoint (if ever needed)
app.get('/api/settings', async (req,res)=>{
  res.json(await getSettings())
})

// Fallback to index.html
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname,'..','public','index.html'))
})

app.listen(PORT, ()=>{
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})
