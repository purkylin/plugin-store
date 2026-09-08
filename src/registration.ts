import { hashPassword, parseEmail, parseNick, parsePassword, passwordIterations, randomToken, requireRecord, requireString, sha256 } from "./auth";
import { sendEmail } from "./email";
import { HTTPError } from "./http";
import { accountEmailOrigin, takeResetQuota } from "./password-reset";
import type { Env } from "./types";

export async function requestRegistration(env: Env, value: unknown, ip: string): Promise<void> {
  const body = requireRecord(value);
  const email = parseEmail(body.email);
  const nick = parseNick(body.nick);
  const password = parsePassword(body.password);
  if (password !== requireString(body.password_confirmation, "password_confirmation")) {
    throw new HTTPError(400, "password_mismatch", "两次输入的密码不一致。");
  }
  const origin = accountEmailOrigin(env);
  const duplicate = await env.DB.prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE OR nick = ? COLLATE NOCASE").bind(email, nick).first();
  if (duplicate) throw new HTTPError(409, "user_already_exists", "邮箱或昵称已注册，请登录或更换后重试。");
  if (!await takeResetQuota(env.DB, `registration-ip:${await sha256(ip)}`, 20)
    || !await takeResetQuota(env.DB, `registration-email:${await sha256(email)}`, 5, 60000)) {
    throw new HTTPError(429, "rate_limited", "发送过于频繁，请稍后再试。");
  }
  const salt = randomToken(16);
  const hash = await hashPassword(password, salt);
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM pending_registrations WHERE expires_at <= ?").bind(now),
    env.DB.prepare("DELETE FROM auth_rate_limits WHERE last_at < ?").bind(now - 86400000),
    env.DB.prepare(`INSERT INTO pending_registrations (token_hash, email, nick, password_salt, password_hash, password_iterations, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(tokenHash, email, nick, salt, hash, passwordIterations, now + 1800000),
  ]);
  try {
    await sendEmail(env, {
      to: email, subject: "激活 Hawk Plugin Store 账号", title: "确认邮箱并激活账号",
      lines: [`你正在注册 Hawk Plugin Store，昵称为 ${nick}。`, "请在 30 分钟内打开以下链接，并在页面上确认激活。", `${origin}/verify-email#token=${token}`, "如果不是你本人申请，请忽略此邮件。"],
      action: { label: "激活账号", url: `${origin}/verify-email#token=${token}` },
    });
  } catch {
    await env.DB.prepare("DELETE FROM pending_registrations WHERE token_hash = ?").bind(tokenHash).run();
    console.error("Registration email delivery failed");
    throw new HTTPError(503, "email_delivery_failed", "激活邮件发送失败，请稍后重新提交注册。");
  }
}

export async function verifyRegistration(env: Env, value: unknown, ip: string): Promise<void> {
  const token = requireString(requireRecord(value).token, "token");
  const invalid = () => new HTTPError(400, "invalid_verification_token", "激活链接已过期或已使用，请返回注册页面重试。");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw invalid();
  if (!await takeResetQuota(env.DB, `verification-ip:${await sha256(ip)}`, 30)) {
    throw new HTTPError(429, "rate_limited", "尝试次数过多，请稍后再试。");
  }
  const tokenHash = await sha256(token);
  const userID = crypto.randomUUID();
  let results;
  try {
    // Creating the account and consuming all registrations for this email are
    // one transaction. Replays or racing confirmations cannot create sessions.
    results = await env.DB.batch([
      env.DB.prepare(`INSERT INTO users (id, email, nick, password_salt, password_hash, password_iterations, created_at, is_whitelisted)
        SELECT ?, email, nick, password_salt, password_hash, password_iterations, ?, 0
        FROM pending_registrations WHERE token_hash = ? AND expires_at > ?`)
        .bind(userID, new Date().toISOString(), tokenHash, Date.now()),
      env.DB.prepare("DELETE FROM pending_registrations WHERE email = (SELECT email FROM users WHERE id = ?)").bind(userID),
    ]);
  } catch (cause) {
    if (String(cause).includes("UNIQUE constraint failed")) {
      throw new HTTPError(409, "user_already_exists", "邮箱或昵称已注册，请返回注册页面更换，或直接登录。");
    }
    throw cause;
  }
  if (results[0]?.meta.changes !== 1) throw invalid();
}
