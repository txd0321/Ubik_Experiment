# Ubik Deployment (Frontend + Presign Backend)

## 1) Backend deployment

The backend is in `backend/` and provides:

- `POST /api/v1/session/init`
- `POST /api/v1/events/batch`
- `POST /api/v1/experiment/submit`
- `GET /api/v1/models/presign?key=models/<file>.glb`

### Install and run

```powershell
cd F:\tmpDocument\Zouwenyin\Ubik_Experiment\backend
npm install
Copy-Item ".env.example" ".env"
npm start
```

### Required backend environment variables

- `COS_BUCKET`
- `COS_REGION`
- `COS_SECRET_ID`
- `COS_SECRET_KEY`

Optional:

- `COS_TMP_TOKEN`
- `COS_PRESIGN_EXPIRES` (default `1800`)
- `ALLOWED_ORIGINS` (comma-separated)
- `PORT` (default `3001`)

In production, set these in **system environment variables** or process manager config (PM2/Docker/K8s), not in frontend.

## 2) Frontend deployment

The frontend is in `frontend/`.

Create `frontend/.env.production`:

```env
VITE_API_BASE_URL=https://your-backend-domain.com
```

Build:

```powershell
cd F:\tmpDocument\Zouwenyin\Ubik_Experiment\frontend
npm install
npm run build
```

Deploy `frontend/dist` to your static host (Nginx/CDN/object storage).

## 3) Nginx reverse proxy (single domain, recommended)

If you want frontend and backend under one domain:

- frontend static: `https://example.com/ubik`
- backend API: `https://example.com/api`

Then set:

```env
VITE_API_BASE_URL=https://example.com
```

And proxy `/api/` to backend service.

## 4) Security notes

- Never expose `COS_SECRET_ID` or `COS_SECRET_KEY` to frontend.
- Keep COS signing only in backend API.
- Restrict `ALLOWED_ORIGINS` in production.
