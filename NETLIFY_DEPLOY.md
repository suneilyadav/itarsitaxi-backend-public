## Backend Deploy To Netlify

This backend can be deployed to Netlify while keeping the frontend on Hostinger.

### 1. Install dependencies

```bash
cd /Users/nsy/Documents/itarsitaxi-backend
npm install
```

### 2. Push this backend folder to GitHub

Create a repo containing the backend folder contents.

### 3. Create a Netlify site from that repo

In Netlify:
- Base directory: leave empty if the repo is only the backend
- Build command: leave empty
- Publish directory: leave empty

### 4. Add environment variables in Netlify

Use the same values from your current backend `.env`, except SMS keys are no longer required for booking flow:
- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_PHONE`
- `GOOGLE_MAPS_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### 5. Deploy and note the public backend URL

Example:

```text
https://itarsitaxi-api.netlify.app
```

### 6. Point the frontend to that backend

In the frontend build environment for Hostinger, set:

```bash
REACT_APP_BACKEND_URL=https://itarsitaxi-api.netlify.app
```

### 7. Rebuild the Android app

```bash
cd /Users/nsy/Documents/itarsitaxi-frontend
npm run build
npx cap sync android
npx cap run android
```
