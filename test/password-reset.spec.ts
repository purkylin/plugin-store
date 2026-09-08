import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import { loginUser, registerUser, requireUser, sha256 } from "../src/auth";
import { takeResetQuota } from "../src/password-reset";
import type { Env } from "../src/types";

const configured: Env = { ...env, DB: env.DB, STORAGE: env.STORAGE, AUTH_BASE_URL: "https://portal.example.com", RESEND_API_KEY: "test", RESEND_FROM_EMAIL: "test@example.com" };
afterEach(() => vi.restoreAllMocks());

async function account() {
  const suffix = crypto.randomUUID();
  const email = `${suffix}@example.com`;
  const session = await registerUser(env.DB, { email, nick: suffix, password: "old-password", password_confirmation: "old-password" });
  return { email, session };
}
async function call(path: string, body?: unknown, bindings = configured, ip = crypto.randomUUID()) {
  const context = createExecutionContext();
  const request = new Request(`https://untrusted.example/${path}`, body === undefined ? {} : {
    method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": ip }, body: JSON.stringify(body),
  });
  const response = await worker.fetch(request, bindings, context);
  await waitOnExecutionContext(context);
  return response;
}
function mockMail() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"id":"mail"}', { status: 200 }));
}
async function issue(email: string) {
  const mail = mockMail();
  const response = await call("api/v1/auth/forgot-password", { email });
  expect(response.status).toBe(202);
  const payload = JSON.parse(String(mail.mock.calls.at(-1)?.[1]?.body));
  const token = /#token=([\w-]+)/.exec(payload.text)?.[1];
  expect(token).toHaveLength(43);
  return { token: token!, payload, mail };
}
const newPassword = (token: string) => ({ token, password: "new-password", password_confirmation: "new-password" });

describe("Password recovery", () => {
  it("sends security mail despite disabled notifications and resets all sessions once", async () => {
    const { email, session } = await account();
    await env.DB.prepare("UPDATE tvbox_settings SET email_enabled = 0 WHERE id = 1").run();
    const { token, payload } = await issue(email.toUpperCase());
    expect(payload.text).toContain("https://portal.example.com/reset-password#token=");
    expect(payload.html).toContain('>重置密码</a>');
    const row = await env.DB.prepare("SELECT token_hash FROM password_resets WHERE user_id = ?").bind(session.user.id).first();
    expect(row?.token_hash).toBe(await sha256(token));
    const other = await loginUser(env.DB, { email, password: "old-password" });
    const response = await call("api/v1/auth/reset-password", newPassword(token));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    for (const current of [session, other]) {
      await expect(requireUser(new Request("https://portal.example.com", { headers: { cookie: `hawk_session=${current.token}` } }), env.DB)).rejects.toThrow();
    }
    await expect(loginUser(env.DB, { email, password: "old-password" })).rejects.toThrow();
    expect((await loginUser(env.DB, { email, password: "new-password" })).user.id).toBe(session.user.id);
    expect((await call("api/v1/auth/reset-password", newPassword(token))).status).toBe(400);
  });

  it("rejects expired links and mismatched passwords without consuming valid links", async () => {
    const { email } = await account();
    const { token } = await issue(email);
    expect((await call("api/v1/auth/reset-password", { ...newPassword(token), password_confirmation: "different" })).status).toBe(400);
    expect((await call("api/v1/auth/reset-password", { ...newPassword(token), password: "short", password_confirmation: "short" })).status).toBe(400);
    expect(await env.DB.prepare("SELECT used_at FROM password_resets WHERE token_hash = ?").bind(await sha256(token)).first("used_at")).toBeNull();
    await env.DB.prepare("UPDATE password_resets SET expires_at = 0 WHERE token_hash = ?").bind(await sha256(token)).run();
    expect((await call("api/v1/auth/reset-password", newPassword(token))).status).toBe(400);
    await expect(loginUser(env.DB, { email, password: "old-password" })).resolves.toBeDefined();
  });

  it("allows only one racing reset and invalidates other outstanding links", async () => {
    const { email, session } = await account();
    const { token } = await issue(email);
    const second = "a".repeat(43);
    await env.DB.prepare("INSERT INTO password_resets (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(await sha256(second), session.user.id, Date.now(), Date.now() + 60000).run();
    const responses = await Promise.all([call("api/v1/auth/reset-password", newPassword(token)), call("api/v1/auth/reset-password", newPassword(token))]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 400]);
    expect((await call("api/v1/auth/reset-password", newPassword(second))).status).toBe(400);
  });

  it("returns identical messages for unknown and throttled addresses", async () => {
    const { email } = await account();
    const mail = mockMail();
    const known = await call("api/v1/auth/forgot-password", { email });
    const unknown = await call("api/v1/auth/forgot-password", { email: `${crypto.randomUUID()}@example.com` });
    const limited = await call("api/v1/auth/forgot-password", { email });
    expect([known.status, unknown.status, limited.status]).toEqual([202, 202, 202]);
    expect(await known.text()).toBe(await unknown.text());
    expect(await limited.json()).toHaveProperty("message");
    expect(mail).toHaveBeenCalledTimes(1);
  });

  it("enforces concurrent persistent quotas and permits a new window", async () => {
    const key = crypto.randomUUID();
    const results = await Promise.all(Array.from({ length: 10 }, () => takeResetQuota(env.DB, key, 5)));
    expect(results.filter(Boolean)).toHaveLength(5);
    await env.DB.prepare("UPDATE auth_rate_limits SET window_start = 0, last_at = 0 WHERE key = ?").bind(key).run();
    expect(await takeResetQuota(env.DB, key, 5)).toBe(true);
  });

  it("removes tokens when delivery fails and rejects missing configuration", async () => {
    const { email, session } = await account();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("failure", { status: 500 }));
    expect((await call("api/v1/auth/forgot-password", { email })).status).toBe(202);
    expect(await env.DB.prepare("SELECT token_hash FROM password_resets WHERE user_id = ?").bind(session.user.id).first()).toBeNull();
    expect((await call("api/v1/auth/forgot-password", { email }, { ...configured, AUTH_BASE_URL: "" })).status).toBe(503);
    expect((await call("api/v1/auth/forgot-password", { email }, { ...configured, RESEND_API_KEY: "" })).status).toBe(503);
  });

  it("serves uncached recovery pages without consuming tokens on GET", async () => {
    const { email } = await account();
    const { token } = await issue(email);
    for (const path of ["forgot-password", "reset-password"]) {
      const response = await call(path);
      expect(response.status).toBe(200);
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect((await call("api/v1/auth/reset-password", newPassword(token))).status).toBe(200);
  });
});
