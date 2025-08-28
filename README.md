# Catalog App

A small full-stack product catalog. The server exposes a JSON API for managing products and serves a static single-page application from the `public` folder. Product data and uploaded images can be persisted to a separate GitHub repository.

## Architecture

- **Backend:** Node.js 18+, Express, CORS and Multer for uploads. Data is loaded and saved through a GitHub-backed store.
- **Frontend:** Static assets (HTML, JS, CSS) served by the same Express instance.
- **Persistence:** Catalog JSON and images are written to a GitHub repo. A Postgres database managed by Prisma can also be configured via `DATABASE_URL`.

## Tech Stack

- Node.js
- Express
- Multer
- Prisma
- GitHub REST API

## Local Development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables** – create a `.env` file or export variables:

   ```env
   PORT=4000
   DATA_REPO=your-user/your-data-repo
   DATA_BRANCH=main
   DATA_PATH=data/catalogo.json
   GITHUB_TOKEN=ghp_xxx          # token with repo access
   DATABASE_URL=postgresql://user:pass@localhost:5432/catalog
   ```

3. **Database initialization** (optional if using the Postgres backend):

   ```bash
   npx prisma migrate deploy
   ```

4. **Seed sample data** – with the server running, POST products to the API:

   ```bash
   curl -X POST http://localhost:4000/api/products \
     -H "Content-Type: application/json" \
     -d '{"name":"Sample","category":"Demo","priceUV":1.99}'
   ```

5. **Run backend/frontend**

   ```bash
   npm start
   # open http://localhost:4000
   ```

6. **Run tests**

   ```bash
   npm test
   ```

## Deployment on Render

Set the same environment variables (`PORT`, `DATA_REPO`, `DATA_BRANCH`, `DATA_PATH`, `GITHUB_TOKEN`, `DATABASE_URL`) in your Render service. Example `render.yaml`:

```yaml
services:
  - type: web
    name: catalog
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: PORT
        value: 4000
      - key: DATA_REPO
        sync: false
      - key: DATA_BRANCH
        value: main
      - key: DATA_PATH
        value: data/catalogo.json
      - key: GITHUB_TOKEN
        sync: false
      - key: DATABASE_URL
        sync: false
    disk:
      name: uploads
      mountPath: /public/uploads
      sizeGB: 1
```

## Maintenance

- Apply schema changes with `npx prisma migrate deploy`.
- Back up the Postgres database regularly (e.g., using `pg_dump`).
- Periodically commit the GitHub data repository to safeguard product data.
- Configure a persistent disk or external object storage (S3, GCS, etc.) for the `public/uploads` directory so product images survive restarts.

