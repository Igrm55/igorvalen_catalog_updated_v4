# Catalog App

A small full-stack product catalog. The server exposes a JSON API for managing products and serves a static single-page application from the `public` folder. Data is stored in a local **SQLite** database (`data/catalog.db`) and images are saved under `public/uploads`.

## Architecture

- **Backend:** Node.js 18+, Express, CORS and Multer for uploads
- **Frontend:** Static assets (HTML, JS, CSS) served by the same Express instance
- **Persistence:** SQLite database (`data/catalog.db`)

## Tech Stack

- Node.js
- Express
- Multer

## Local Development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run backend/frontend**

   ```bash
   npm start
   # open http://localhost:4000
   ```

   The first run creates `data/catalog.db`. No manual database setup is required.

3. **Seed sample data** – with the server running, POST products to the API (optional):

   ```bash
   curl -X POST http://localhost:4000/api/products \
     -H "Content-Type: application/json" \
     -d '{"name":"Sample","category":"Demo","priceUV":1.99}'
   ```

4. **Run tests**

   ```bash
   npm test
   ```

## Deployment on Render

Only the `PORT` environment variable is required. To persist the database and uploads across deploys, mount a disk for both `data` and `public/uploads`. Example `render.yaml`:

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
    disk:
      - name: data
        mountPath: data
        sizeGB: 1
      - name: uploads
        mountPath: public/uploads
        sizeGB: 1
```

## Maintenance

- Back up the `data/catalog.db` file regularly
- Back up the `public/uploads` directory or mount a persistent disk so product images survive restarts
- For schema changes, apply migrations to the SQLite database
