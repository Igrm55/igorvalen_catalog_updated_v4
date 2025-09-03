# IgorValen Catálogo (MERN)

Aplicação de catálogo reconstruída do zero usando **React + Vite + Tailwind** no frontend e **Node.js + Express + MongoDB** no backend.

## Pré-requisitos

- Node 18+
- MongoDB local ou Docker

### Docker (opcional)

```bash
docker run -d --name iv-mongo -p 27017:27017 mongo:6
```

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed   # insere dados de exemplo
npm start      # http://localhost:5000
```

## Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

## Teste rápido

```bash
# API viva
curl http://localhost:5000/healthz
curl http://localhost:5000/api/items
```

Acesse `/login` para entrar como admin (senha padrão: **1234**).

Dica (Windows/PowerShell): se usar Docker, abra o Docker Desktop antes de rodar.
