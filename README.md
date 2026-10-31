# PlantPal 🪴

PlantPal is a friendly houseplant care companion. Ask it about watering,
light, soil, pests, or pet safety, and upload a photo to identify an
unknown plant.

## Project structure

```
.
├── frontend/                  # Vite app (plain JavaScript + CSS)
│   ├── index.html             # Single-page UI (landing, chat, plant finder)
│   ├── public/assets/         # Photos served as-is
│   ├── src/
│   │   ├── main.js            # UI logic (routing, chat, photo identification)
│   │   └── style.css          # Styles, including dark mode
│   ├── .env.example           # Optional deployed-backend URL
│   ├── vite.config.js         # Dev/preview proxy to the Express API
│   └── package.json
└── backend/                   # Express API
    ├── server.js              # Chat and plant-identification endpoints
    ├── .env.example           # OpenAI key and port
    └── package.json
```

The two folders are independent npm projects. Frontend dependencies live in
`frontend/node_modules`; backend dependencies live in `backend/node_modules`.

## Requirements

- Node.js 20.19+ or 22.12+ (required by Vite 8)
- npm
- An OpenAI API key to use the chat and plant finder

## Running locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then add your OpenAI API key
npm run dev            # http://localhost:5000
```

`npm start` runs the server without file watching. If `OPENAI_API_KEY` is
missing, the server still starts and the AI endpoints return `503` until a
key is configured.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

During development the Vite server proxies `/api` requests to
`http://localhost:5000`, so no frontend environment file is needed. If your
backend runs elsewhere, change the proxy target in `frontend/vite.config.js`.

### 3. Production build

```bash
cd frontend
npm run build          # writes static files to frontend/dist
npm run preview        # serves the build locally with the same /api proxy
```

When the frontend is deployed separately from the API, set the backend
origin at build time so browser requests go to the right place:

```bash
# frontend/.env
VITE_API_URL=https://your-plantpal-backend.example.com
```

## API

| Endpoint                   | What it does                                    |
| -------------------------- | ----------------------------------------------- |
| `POST /api/chat`           | Plant care Q&A, with short conversation memory  |
| `POST /api/identify-plant` | Identifies a houseplant from a data-URL image   |

The Express server enables CORS so the separately deployed frontend can call
it. Chat history is kept in memory on the client only — nothing is stored
server-side.
