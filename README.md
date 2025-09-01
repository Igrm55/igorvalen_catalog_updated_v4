# Catalog App

A small full-stack product catalog ready for deployment on platforms like Render. The backend is built with Node.js and Express and persists data in PostgreSQL while product images are stored on Cloudinary.

## Architecture

- **Backend:** Node.js 18+, Express, pg, Multer
- **Frontend:** Static assets served from the `public` folder
- **Persistence:** PostgreSQL for product data and settings
- **Images:** Uploaded directly to Cloudinary

## Local Development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a `.env` file** with the following variables:

   ```bash
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
   ADMIN_PASSWORD=your_secure_password
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

3. **Run the application**

   ```bash
   npm start
   # open http://localhost:4000
   ```

4. **Run tests**

   ```bash
   npm test
   ```

## Deployment on Render

Configure a web service with `npm install` as the build command and `npm start` as the start command. In the Render dashboard set the following environment variables:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

The application no longer requires persistent disk mounts because all data and images are stored in managed services.

