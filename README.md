# PlantPal 🪴

PlantPal is a friendly houseplant care companion. Ask it about watering,
light, soil, pests, or pet safety, upload a photo to identify an unknown
plant, and — with a free account — keep a personal plant collection with
care advice, a care log, and saved conversations.

## What's inside

```
.
├── index.html        # Single-page frontend (landing, chat, plant finder, My Plants)
├── style.css         # Styles, including dark mode
├── script.js         # Frontend logic (routing, auth, chat, plants, photo identification)
└── backend/
    ├── server.js     # Express API (auth, plants, care log, conversations, OpenAI)
    ├── auth.js       # Register / login / logout / session middleware
    ├── db.js         # SQLite schema and data access
    └── .env.example  # Environment variables
```

The frontend is plain HTML/CSS/JS with no build step. The backend is an
Express server backed by SQLite, proxying the OpenAI API for chat,
identification, and generated care sheets.

| Endpoint                        | What it does                                        |
| ------------------------------- | --------------------------------------------------- |
| `POST /api/auth/register`       | Create an account (email + password)                |
| `POST /api/auth/login`          | Sign in, returns a bearer session token             |
| `POST /api/auth/logout`         | Invalidate the current session                      |
| `GET  /api/auth/me`             | Current user                                        |
| `GET/POST /api/plants`          | List / add plants in your collection                |
| `GET/DELETE /api/plants/:id`    | Plant detail (with care log) / remove a plant       |
| `POST /api/plants/:id/events`   | Log watering, fertilizing, repotting, pruning, etc. |
| `POST /api/plants/:id/advice`   | Generate a care sheet for a plant with OpenAI       |
| `POST /api/chat`                | Plant care Q&A; saved to your account when signed in |
| `GET /api/conversations`         | List saved conversations                           |
| `GET /api/conversations/:id`     | One conversation with its messages                 |
| `DELETE /api/conversations/:id`  | Delete a saved conversation                        |
| `POST /api/identify-plant`      | Identifies a houseplant from a data-URL image       |

## Running locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then add your OpenAI API key
npm start              # runs on http://localhost:5000
```

The backend also serves the frontend files, so http://localhost:5000 is a
complete working app.

### 2. Frontend (standalone)

The frontend is static — serve it with any static server, e.g.:

```bash
npx serve .
```

When opened from `localhost`, the frontend automatically calls
`http://localhost:5000`; anywhere else it calls the deployed backend URL
at the top of `script.js`.

## Notes

- Accounts are authenticated with bcrypt-hashed passwords and
  server-side session tokens; the token is kept in `localStorage`.
- Data is stored in `backend/plantpal.db` (SQLite). On hosts with an
  ephemeral filesystem (e.g. Render's free tier), set `DATA_DIR` to a
  mounted persistent disk directory so data survives deploys.
- Without `OPENAI_API_KEY` the AI endpoints return a clear 503; auth,
  plants, and the care log all work without it (care sheets and
  identification need the key).
- Signed-out visitors can still chat, but the conversation is not saved;
  signed-in users get their conversations stored and can revisit or
  delete them from the chat page.
