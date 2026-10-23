import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The database file lives next to the code. On hosts with an ephemeral
// filesystem (e.g. Render's free tier) it resets on every deploy — set
// DATA_DIR to a mounted persistent disk directory to keep data.
const dataDir = process.env.DATA_DIR || __dirname;
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "plantpal.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plants (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name               TEXT NOT NULL,
    species            TEXT NOT NULL DEFAULT '',
    notes              TEXT NOT NULL DEFAULT '',
    water_interval_days INTEGER NOT NULL DEFAULT 7,
    advice             TEXT NOT NULL DEFAULT '',
    image              TEXT,
    created_at         TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_plants_user ON plants(user_id);

  CREATE TABLE IF NOT EXISTS care_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id    INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    note        TEXT NOT NULL DEFAULT '',
    occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_care_events_plant ON care_events(plant_id);

  CREATE TABLE IF NOT EXISTS conversations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL DEFAULT 'New conversation',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

  CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
`);

/* Users and sessions --------------------------------------------- */

const insertUser = db.prepare(
  "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
);
const findUserByEmail = db.prepare("SELECT * FROM users WHERE email = ?");
const findUserById = db.prepare(
  "SELECT id, email, name, created_at FROM users WHERE id = ?",
);

const insertSession = db.prepare(
  "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
);
const findSession = db.prepare(
  `SELECT token, user_id, expires_at FROM sessions
   WHERE token = ? AND expires_at > datetime('now')`,
);const deleteSession = db.prepare("DELETE FROM sessions WHERE token = ?");
const deleteExpiredSessions = db.prepare(
  "DELETE FROM sessions WHERE expires_at <= datetime('now')",
);

export const users = {
  create(email, name, passwordHash) {
    const info = insertUser.run(email, name, passwordHash);
    return findUserById.get(info.lastInsertRowid);
  },
  findByEmail: (email) => findUserByEmail.get(email),
  findById: (id) => findUserById.get(id),
};

export const sessions = {
  create(token, userId, expiresAt) {
    // Store in the same space-separated UTC format as datetime('now') so
    // the expiry comparison in findSession is a like-for-like string compare.
    insertSession.run(
      token,
      userId,
      expiresAt.replace("T", " ").slice(0, 19),
    );
  },
  find: (token) => findSession.get(token),
  remove: (token) => deleteSession.run(token),
  cleanupExpired: () => deleteExpiredSessions.run(),
};

/* Plants and care events ------------------------------------------ */

const insertPlant = db.prepare(
  `INSERT INTO plants (user_id, name, species, notes, water_interval_days, advice, image)
   VALUES (@userId, @name, @species, @notes, @waterIntervalDays, @advice, @image)`,
);
const selectPlantsByUser = db.prepare(
  `SELECT id, user_id, name, species, notes, water_interval_days, advice,
          image IS NOT NULL AS has_image, created_at
   FROM plants WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
);
const selectPlant = db.prepare(
  "SELECT * FROM plants WHERE id = ? AND user_id = ?",
);
const updatePlantAdvice = db.prepare(
  "UPDATE plants SET advice = ? WHERE id = ?",
);
const deletePlant = db.prepare("DELETE FROM plants WHERE id = ? AND user_id = ?");

const insertCareEvent = db.prepare(
  "INSERT INTO care_events (plant_id, user_id, type, note, occurred_at) VALUES (?, ?, ?, ?, ?)",
);
const selectEventsByPlant = db.prepare(
  "SELECT * FROM care_events WHERE plant_id = ? ORDER BY occurred_at DESC, id DESC",
);
const selectLastWatering = db.prepare(
  `SELECT occurred_at FROM care_events
   WHERE plant_id = ? AND type = 'water'
   ORDER BY occurred_at DESC, id DESC LIMIT 1`,
);

const CARE_EVENT_TYPES = ["water", "fertilize", "repot", "prune", "other"];

function withTaskInfo(plant) {
  const lastWatering = selectLastWatering.get(plant.id);
  const intervalMs = plant.water_interval_days * 24 * 60 * 60 * 1000;
  const lastWateredAt = lastWatering
    ? new Date(lastWatering.occurred_at + "Z").getTime()
    : null;
  const nextDueMs = lastWateredAt === null ? null : lastWateredAt + intervalMs;

  return {
    ...plant,
    lastWateredAt: lastWatering ? lastWatering.occurred_at : null,
    nextWaterDue: nextDueMs === null ? null : new Date(nextDueMs).toISOString(),
    wateringOverdue: nextDueMs !== null && nextDueMs < Date.now(),
  };
}

function toId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const plants = {
  create(fields) {
    const info = insertPlant.run({
      species: "",
      notes: "",
      waterIntervalDays: 7,
      advice: "",
      image: null,
      ...fields,
    });
    return withTaskInfo(selectPlant.get(info.lastInsertRowid, fields.userId));
  },
  listForUser(userId) {
    return selectPlantsByUser.all(userId).map(withTaskInfo);
  },
  get(id, userId) {
    const plantId = toId(id);
    if (!plantId) {
      return null;
    }
    const plant = selectPlant.get(plantId, userId);
    return plant ? withTaskInfo(plant) : null;
  },
  setAdvice(id, advice) {
    updatePlantAdvice.run(advice, toId(id));
  },
  remove(id, userId) {
    const plantId = toId(id);
    return plantId ? deletePlant.run(plantId, userId).changes > 0 : false;
  },
  eventsFor(plantId) {
    return selectEventsByPlant.all(plantId);
  },
  addEvent(plantId, userId, type, note, occurredAt) {
    if (!CARE_EVENT_TYPES.includes(type)) {
      throw new Error(`Unknown care event type: ${type}`);
    }
    insertCareEvent.run(plantId, userId, type, note, occurredAt);
  },
  careEventTypes: CARE_EVENT_TYPES,
};

/* Conversations and messages --------------------------------------- */

const insertConversation = db.prepare(
  "INSERT INTO conversations (user_id, title) VALUES (?, ?)",
);
const selectConversationsByUser = db.prepare(
  "SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC, id DESC",
);
const selectConversation = db.prepare(
  "SELECT * FROM conversations WHERE id = ? AND user_id = ?",
);
const touchConversation = db.prepare(
  "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
);
const renameConversation = db.prepare(
  "UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?",
);
const deleteConversation = db.prepare(
  "DELETE FROM conversations WHERE id = ? AND user_id = ?",
);

const insertMessage = db.prepare(
  "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
);
const selectMessages = db.prepare(
  "SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id",
);

export const conversations = {
  // (ids arrive as URL strings; coerce once here)
  create(userId, title) {
    const info = insertConversation.run(userId, title);
    return selectConversation.get(info.lastInsertRowid, userId);
  },
  listForUser: (userId) => selectConversationsByUser.all(userId),
  get(id, userId) {
    const conversationId = toId(id);
    return (
      (conversationId && selectConversation.get(conversationId, userId)) || null
    );
  },
  // Renames a fresh conversation after its first exchange so the list
  // stays readable without asking the user for a title.
  titleFromMessages(id, userId) {
    const conversationId = toId(id);
    if (!conversationId) {
      return;
    }
    const conversation = selectConversation.get(conversationId, userId);
    if (!conversation || conversation.title !== "New conversation") {
      return;
    }
    const firstUserMessage = selectMessages
      .all(conversationId)
      .find((message) => message.role === "user");
    if (firstUserMessage) {
      renameConversation.run(firstUserMessage.content.slice(0, 60), conversationId);
    }
  },
  appendMessages(id, messages) {
    const conversationId = toId(id);
    if (!conversationId) {
      return;
    }
    const insertMany = db.transaction((items) => {
      for (const message of items) {
        insertMessage.run(conversationId, message.role, message.content);
      }
      touchConversation.run(conversationId);
    });
    insertMany(messages);
  },
  messagesFor: (id) => {
    const conversationId = toId(id);
    return conversationId ? selectMessages.all(conversationId) : [];
  },
  remove(id, userId) {
    const conversationId = toId(id);
    return conversationId
      ? deleteConversation.run(conversationId, userId).changes > 0
      : false;
  },
};
