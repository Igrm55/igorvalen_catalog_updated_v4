# Catalog App

A small full-stack product catalog. The server exposes a JSON API for managing products and serves a static single-page application from the `public` folder. Data is stored locally in `data/catalog.json` and images are saved under `public/uploads`.

## Architecture

- **Backend:** Node.js 18+, Express, CORS and Multer for uploads
- **Frontend:** Static assets (HTML, JS, CSS) served by the same Express instance
- **Persistence:** JSON file (`data/catalog.json`) committed in this repo

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

3. **Seed sample data** – with the server running, POST products to the API:

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

Only the `PORT` environment variable is required. Example `render.yaml`:

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
      name: uploads
      mountPath: public/uploads
      sizeGB: 1
```

## Maintenance

- Back up the `data/catalog.json` file regularly
- Back up the `public/uploads` directory or mount a persistent disk so product images survive restarts
- For schema changes, edit `data/catalog.json` accordingly
