import { hashPassword, parseEmail, parsePassword, passwordIterations, randomToken, requireRecord, requireString, sha256 } from "./auth";
import { sendEmail } from "./email";
import { HTTPError } from "./http";
import type { Env } from "./types";

export const resetRequestMessage = "如果该邮箱已注册，你将收到重置密码邮件，请检查收件箱和垃圾邮件。";

export function accountEmailOrigin(env: Env): string {
  try {
    const url = new URL(env.AUTH_BASE_URL ?? "");
    if (url.protocol !== "https:" || url.username || url.password || !env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) throw new Error();
    return url.origin;
  } catch {
    throw new HTTPError(503, "account_email_unavailable", "账号邮件服务暂不可用，请稍后再试。");
  }
}

// A single conditional upsert prevents concurrent requests from exceeding limits.
export async function takeResetQuota(db: D1Database, key: string, limit: number, cooldown = 0): Promise<boolean> {
  const now = Date.now();
  const result = await db.prepare(`
    INSERT INTO auth_rate_limits (key, window_start, count, last_at) VALUES (?, ?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      window_start = CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END,
      count = CASE WHEN window_start <= ? THEN 1 ELSE count + 1 END,
      last_at = excluded.last_at
    WHERE last_at <= ? AND (window_start <= ? OR count < ?)
    RETURNING key
  `).bind(key, now, now, now - 3600000, now - 3600000, now - cooldown, now - 3600000, limit).first();
  return result !== null;
}

export function requestPasswordReset(env: Env, context: ExecutionContext, value: unknown, ip: string): void {
  const email = parseEmail(requireRecord(value).email);
  const origin = accountEmailOrigin(env);
  // All account lookup and delivery happen after the same public response.
  context.waitUntil(issuePasswordReset(env, email, origin, ip).catch(() => {
    console.error("Password reset delivery failed");
  }));
}

async function issuePasswordReset(env: Env, email: string, origin: string, ip: string): Promise<void> {
  const db = env.DB;
  if (!await takeResetQuota(db, `request-ip:${await sha256(ip)}`, 20)) return;
  if (!await takeResetQuota(db, `request-email:${await sha256(email)}`, 5, 60000)) return;
  const now = Date.now();
  await db.batch([
    db.prepare("DELETE FROM password_resets WHERE expires_at <= ?").bind(now),
    db.prepare("DELETE FROM auth_rate_limits WHERE last_at < ?").bind(now - 86400000),
  ]);
  const user = await db.prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE").bind(email).first<{ id: string }>();
  if (!user) return;
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  await db.prepare("INSERT INTO password_resets (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(tokenHash, user.id, now, now + 1800000).run();
  try {
    await sendEmail(env, {
      action: { label: "重置密码", url: `${origin}/reset-password#token=${token}` },
      to: email, subject: "重置 Hawk Plugin Store 密码", title: "重置密码",
      lines: ["请打开以下链接设置新密码。链接 30 分钟内有效，成功使用一次后失效。", `${origin}/reset-password#token=${token}`, "如果不是你本人申请，请忽略此邮件，你的密码不会改变。"],
    });
  } catch (cause) {
    await db.prepare("DELETE FROM password_resets WHERE token_hash = ?").bind(tokenHash).run();
    throw cause;
  }
}

export async function resetPassword(env: Env, context: ExecutionContext, value: unknown, ip: string): Promise<void> {
  const body = requireRecord(value);
  const token = requireString(body.token, "token");
  const invalid = () => new HTTPError(400, "invalid_reset_token", "重置链接已失效或已使用，请重新申请。");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw invalid();
  if (!await takeResetQuota(env.DB, `reset-ip:${await sha256(ip)}`, 30)) {
    throw new HTTPError(429, "rate_limited", "尝试次数过多，请稍后再试。");
  }
  const password = parsePassword(body.password);
  if (password !== requireString(body.password_confirmation, "password_confirmation")) {
    throw new HTTPError(400, "password_mismatch", "两次输入的密码不一致。");
  }
  const tokenHash = await sha256(token);
  const user = await env.DB.prepare(`SELECT u.email FROM password_resets r JOIN users u ON u.id = r.user_id
    WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > ?`).bind(tokenHash, Date.now()).first<{ email: string }>();
  if (!user) throw invalid();
  const salt = randomToken(16);
  const hash = await hashPassword(password, salt);
  const claim = crypto.randomUUID();
  const now = Date.now();
  // D1 batches are transactions. A unique claim ties every mutation to the one
  // request that consumed the token; racing/replayed requests change nothing.
  const results = await env.DB.batch([
    env.DB.prepare("UPDATE password_resets SET used_at = ?, claim_id = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?").bind(now, claim, tokenHash, now),
    env.DB.prepare(`UPDATE users SET password_salt = ?, password_hash = ?, password_iterations = ?
      WHERE id = (SELECT user_id FROM password_resets WHERE claim_id = ?)` ).bind(salt, hash, passwordIterations, claim),
    env.DB.prepare("DELETE FROM user_sessions WHERE user_id = (SELECT user_id FROM password_resets WHERE claim_id = ?)").bind(claim),
    env.DB.prepare(`UPDATE password_resets SET used_at = ? WHERE used_at IS NULL
      AND user_id = (SELECT user_id FROM password_resets WHERE claim_id = ?)` ).bind(now, claim),
  ]);
  if (results[0]?.meta.changes !== 1) throw invalid();
  context.waitUntil(sendEmail(env, {
    to: user.email, subject: "Hawk Plugin Store 密码已更新", title: "密码已更新",
    lines: ["你的账号密码已更新，所有设备需要重新登录。", "如果不是你本人操作，请立即通过登录页的“忘记密码”重新设置密码，并检查邮箱安全。"],
  }).catch(() => { console.error("Password change notification failed"); }));
}
