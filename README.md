# IgorValen Catálogo (MERN)

Aplicação de catálogo com **React + Vite + Tailwind** e **Node.js + Express + MongoDB**. Possui fallback em memória para facilitar o uso sem MongoDB.

## Requisitos

- Node 18+
- Docker Desktop (opcional para MongoDB)

## Como rodar

```bash
git clone <repo>
cd igorvalen_catalog_updated_v4
cp backend/.env.example backend/.env
docker compose up -d    # opcional; fallback em memória se não usar
npm install             # instala deps do backend e frontend
npm run seed            # opcional: popula 5 itens
npm run dev:all         # API 5000 e Web 5173
```

## URLs úteis

- Frontend: http://localhost:5173
- API: http://localhost:5000
- Healthcheck: http://localhost:5000/healthz

Login de admin: senha padrão **1234** (configurável via `ADMIN_PASSWORD`).

Se visualizar tela branca, limpe service workers em `chrome://serviceworker-internals` e recarregue.

## Teste rápido

```bash
curl http://localhost:5000/healthz
curl http://localhost:5000/api/items
```

## Scripts

- `npm run dev:all` – inicia API e frontend.
- `npm run seed` – insere itens de exemplo.
- `npm test` – smoke tests backend e frontend.
