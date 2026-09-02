import { HTTPError } from "./http";

const passwordIterations = 100_000;
const sessionLifetimeMilliseconds = 30 * 24 * 60 * 60 * 1000;
const sessionCookieName = "hawk_session";
const encoder = new TextEncoder();

export interface AuthenticatedUser {
  id: string;
  email: string;
  nick: string;
  whitelisted: boolean;
  contribution_points: number;
}

interface UserRow {
  id: string;
  email: string;
  nick: string;
  password_salt: string;
  password_hash: string;
  password_iterations: number;
  is_whitelisted: number;
  contribution_points: number;
}

export async function registerUser(
  db: D1Database,
  value: unknown,
): Promise<{ user: AuthenticatedUser; token: string; expires_at: string }> {
  const body = requireRecord(value);
  const email = parseEmail(body.email);
  const nick = parseNick(body.nick);
  const password = parsePassword(body.password);
  const passwordConfirmation = requireString(
    body.password_confirmation,
    "password_confirmation",
  );
  if (password !== passwordConfirmation) {
    throw new HTTPError(
      400,
      "password_mismatch",
      "The password confirmation does not match.",
    );
  }
  const duplicate = await db.prepare(
    "SELECT email, nick FROM users WHERE email = ? COLLATE NOCASE OR nick = ? COLLATE NOCASE",
  ).bind(email, nick).first<{ email: string; nick: string }>();
  if (duplicate !== null) {
    const field = duplicate.email.toLowerCase() === email ? "email" : "nick";
    throw new HTTPError(409, "user_already_exists", `${field} is already registered.`);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const salt = randomToken(16);
  const passwordHash = await hashPassword(password, salt);
  const session = await prepareSession(id);
  try {
    await db.batch([
      db.prepare(`
        INSERT INTO users (
          id, email, nick, password_salt, password_hash,
          password_iterations, created_at, is_whitelisted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).bind(id, email, nick, salt, passwordHash, passwordIterations, createdAt),
      db.prepare(`
        INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at)
        VALUES (?, ?, ?, ?)
      `).bind(session.tokenHash, id, createdAt, session.expiresAt),
    ]);
  } catch {
    throw new HTTPError(409, "user_already_exists", "email or nick is already registered.");
  }
  return {
    user: { id, email, nick, whitelisted: false, contribution_points: 0 },
    token: session.token,
    expires_at: session.expiresAt,
  };
}

export async function loginUser(
  db: D1Database,
  value: unknown,
): Promise<{ user: AuthenticatedUser; token: string; expires_at: string }> {
  const body = requireRecord(value);
  const email = parseEmail(body.email);
  const password = requireString(body.password, "password");
  const user = await db.prepare(`
    SELECT id, email, nick, password_salt, password_hash,
           password_iterations, is_whitelisted, contribution_points
    FROM users
    WHERE email = ? COLLATE NOCASE
  `).bind(email).first<UserRow>();
  if (
    user === null
    || !await verifyPassword(
      password,
      user.password_salt,
      user.password_hash,
      user.password_iterations,
    )
  ) {
    throw new HTTPError(401, "invalid_credentials", "Email or password is incorrect.");
  }
  const createdAt = new Date().toISOString();
  const session = await prepareSession(user.id);
  await db.prepare(`
    INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).bind(session.tokenHash, user.id, createdAt, session.expiresAt).run();
  return {
    user: toAuthenticatedUser(user),
    token: session.token,
    expires_at: session.expiresAt,
  };
}

export async function requireUser(
  request: Request,
  db: D1Database,
): Promise<AuthenticatedUser> {
  const token = readSessionCookie(request);
  if (!token) {
    throw new HTTPError(401, "unauthorized", "A valid user session is required.");
  }
  const tokenHash = await sha256(token);
  const user = await db.prepare(`
    SELECT u.id, u.email, u.nick, u.is_whitelisted, u.contribution_points
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).bind(tokenHash, new Date().toISOString()).first<{
    id: string;
    email: string;
    nick: string;
    is_whitelisted: number;
    contribution_points: number;
  }>();
  if (user === null) {
    throw new HTTPError(401, "unauthorized", "The user session is invalid or expired.");
  }
  return toAuthenticatedUser(user);
}

export async function logoutUser(request: Request, db: D1Database): Promise<void> {
  const token = readSessionCookie(request);
  if (token) {
    await db.prepare("DELETE FROM user_sessions WHERE token_hash = ?")
      .bind(await sha256(token))
      .run();
  }
}

export function createSessionCookie(
  token: string,
  request: Request,
): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return [
    `${sessionCookieName}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(sessionLifetimeMilliseconds / 1000)}${secure}`,
  ].join("; ");
}

export function clearSessionCookie(request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return [
    `${sessionCookieName}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=0${secure}`,
  ].join("; ");
}

function readSessionCookie(request: Request): string | null {
  const cookies = request.headers.get("cookie") ?? "";
  for (const cookie of cookies.split(";")) {
    const [name, ...parts] = cookie.trim().split("=");
    if (name === sessionCookieName) {
      return parts.join("=") || null;
    }
  }
  return null;
}

async function prepareSession(userID: string) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + sessionLifetimeMilliseconds).toISOString();
  return { token, tokenHash: await sha256(token), expiresAt, userID };
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return hashPasswordWithIterations(password, salt, passwordIterations);
}

async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
  iterations: number,
): Promise<boolean> {
  const actual = decodeBase64URL(await hashPasswordWithIterations(password, salt, iterations));
  const expected = decodeBase64URL(expectedHash);
  if (actual.length !== expected.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= (actual[index] ?? 0) ^ (expected[index] ?? 0);
  }
  return difference === 0;
}

async function hashPasswordWithIterations(
  password: string,
  salt: string,
  iterations: number,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: decodeBase64URL(salt).buffer as ArrayBuffer,
      iterations,
    },
    key,
    256,
  );
  return encodeBase64URL(new Uint8Array(bits));
}

function parseEmail(value: unknown): string {
  const email = requireString(value, "email").trim().toLowerCase();
  if (email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return email;
  }
  throw new HTTPError(400, "invalid_email", "email must be a valid email address.");
}

function parseNick(value: unknown): string {
  const nick = requireString(value, "nick").trim();
  if (
    nick.length >= 2
    && nick.length <= 40
    && /^[\p{L}\p{N}_.-]+$/u.test(nick)
  ) {
    return nick;
  }
  throw new HTTPError(
    400,
    "invalid_nick",
    "nick must be 2-40 letters, numbers, underscores, dots, or hyphens.",
  );
}

function parsePassword(value: unknown): string {
  const password = requireString(value, "password");
  if (password.length >= 8 && password.length <= 128) {
    return password;
  }
  throw new HTTPError(400, "invalid_password", "password must be 8-128 characters.");
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new HTTPError(400, "invalid_body", "Request body must be a JSON object.");
}

function requireString(value: unknown, field: string): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  throw new HTTPError(400, "invalid_field", `${field} must be a non-empty string.`);
}

function randomToken(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return encodeBase64URL(bytes);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return encodeBase64URL(new Uint8Array(digest));
}

function encodeBase64URL(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeBase64URL(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function toAuthenticatedUser(
  user: { id: string; email: string; nick: string; is_whitelisted: number; contribution_points: number },
): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    nick: user.nick,
    whitelisted: user.is_whitelisted === 1,
    contribution_points: user.contribution_points,
  };
}
