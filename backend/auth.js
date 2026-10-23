import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Router } from "express";
import { users, sessions } from "./db.js";

const SESSION_TTL_DAYS = 30;
const PASSWORD_MIN_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple in-memory limiter for the auth endpoints: 10 attempts per IP
// per 15 minutes. Enough to blunt credential stuffing on a hobby app
// without adding a dependency.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const attemptsByIp = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || "unknown";
  const attempts = (attemptsByIp.get(key) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (attempts.length >= RATE_LIMIT_MAX) {
    return res
      .status(429)
      .json({ error: "Too many attempts. Please try again in a few minutes." });
  }

  attempts.push(now);
  attemptsByIp.set(key, attempts);
  next();
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name };
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  sessions.create(token, userId, expiresAt);
  return token;
}

function validateRegistration(body) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return { error: "Please enter a valid email address." };
  }
  if (name === "" || name.length > 80) {
    return { error: "Please enter your name (up to 80 characters)." };
  }
  if (password.length < PASSWORD_MIN_LENGTH || password.length > 200) {
    return {
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }

  return { email, name, password };
}

function attachUser(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (token) {
    const session = sessions.find(token);
    if (session) {
      req.user = users.findById(session.user_id);
      req.sessionToken = token;
    }
  }

  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Please sign in to continue." });
  }
  next();
}

const router = Router();

export const authRouter = router;

router.post("/register", rateLimit, async function (req, res) {
  const validation = validateRegistration(req.body || {});

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const { email, name, password } = validation;

  if (users.findByEmail(email)) {
    return res
      .status(409)
      .json({ error: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = users.create(email, name, passwordHash);

  res.status(201).json({ user: publicUser(user), token: createSession(user.id) });
});

router.post("/login", rateLimit, async function (req, res) {
  const body = req.body || {};
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const user = users.findByEmail(email);
  const passwordMatches =
    user && (await bcrypt.compare(password, user.password_hash));

  if (!passwordMatches) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  res.json({ user: publicUser(user), token: createSession(user.id) });
});

router.post("/logout", attachUser, function (req, res) {
  if (req.sessionToken) {
    sessions.remove(req.sessionToken);
  }
  res.json({ ok: true });
});

router.get("/me", attachUser, function (req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Not signed in." });
  }
  res.json({ user: publicUser(req.user) });
});

export { attachUser, requireAuth };
