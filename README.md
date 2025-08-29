# Catalog App

Simple product catalog with Node.js + Express backend and static frontend. Data is persisted with **Prisma** and **PostgreSQL**, while product images are stored on disk.

## Architecture
- **Backend:** Node.js 18+, Express, Prisma Client
- **Frontend:** static files served from `public/`
- **Database:** PostgreSQL (`DATABASE_URL`)
- **Uploads:** stored under `public/uploads`

## Tech Stack
- Node.js
- Express
- Prisma ORM
- PostgreSQL
- Multer for file uploads

## Local Development
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```
3. **Create database schema**
   ```bash
   npx prisma db push
   ```
4. **(Optional) Seed sample data**
   ```bash
   npm run seed
   ```
5. **Start the server**
   ```bash
   npm run dev
   # app on http://localhost:4000
   ```
6. **Run tests**
   ```bash
   npm test
   ```

## Rendering Deployment
- Set environment variable `DATABASE_URL` to your managed PostgreSQL instance.
- Optional: `PORT` (defaults to 4000).
- Mount a persistent disk for `public/uploads` to retain images.

Example `render.yaml`:
```yaml
services:
  - type: web
    name: catalog
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run migrate:deploy && npm start
    envVars:
      - key: DATABASE_URL
        value: your-postgres-url
      - key: PORT
        value: 4000
    disk:
      - name: uploads
        mountPath: public/uploads
        sizeGB: 1
```

## Maintenance
- Run `npm run migrate:deploy` on new releases to apply migrations.
- Back up your PostgreSQL database regularly.
- Ensure the `public/uploads` directory is backed up or mounted to persistent storage.
- For local development, use `npx prisma db push` for schema changes; in production use migrations only.

## Health Check
A simple route is exposed at `/health` returning `{ ok: true }` when the database is reachable.
