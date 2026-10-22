# PlantPal 🪴

PlantPal is a friendly houseplant care companion. Ask it about watering,
light, soil, pests, or pet safety, and upload a photo to identify an
unknown plant.

## What's inside

```
.
├── index.html      # Single-page frontend (landing, chat, plant finder)
├── style.css       # Styles, including dark mode
├── script.js       # Frontend logic (routing, chat, photo identification)
└── backend/        # Express server that talks to the OpenAI API
    └── server.js
```

The frontend is plain HTML/CSS/JS with no build step. The backend is an
Express server that proxies two OpenAI endpoints:

| Endpoint               | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `POST /api/chat`       | Plant care Q&A, with short conversation memory |
| `POST /api/identify-plant` | Identifies a houseplant from a data-URL image |

## Running locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then add your OpenAI API key
npm start              # runs on http://localhost:5000
```

### 2. Frontend

The frontend is static — open `index.html` directly in a browser, or serve
it with any static server, e.g.:

```bash
npx serve .
```

### 3. Point the frontend at your backend

By default `script.js` calls the deployed backend URL at the top of the
file. For local development, change it to:

```js
const backendUrl = "http://localhost:5000";
```

## Notes

- The plant finder currently accepts any image the browser supports; the
  backend validates that it is a data-URL image before sending it to the
  model.
- Chat history is kept in memory on the client only — nothing is stored
  server-side.
