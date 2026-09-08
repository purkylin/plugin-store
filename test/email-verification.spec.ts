import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import { loginUser, sha256 } from "../src/auth";
import type { Env } from "../src/types";

const configured: Env = { ...env, DB: env.DB, STORAGE: env.STORAGE, AUTH_BASE_URL: "https://portal.example.com", RESEND_API_KEY: "test", RESEND_FROM_EMAIL: "test@example.com" };
afterEach(() => vi.restoreAllMocks());
const details = () => ({ email: `${crypto.randomUUID()}@example.com`, nick: crypto.randomUUID(), password: "registration-password", password_confirmation: "registration-password" });
async function post(path: string, body: unknown, bindings = configured) {
  const context = createExecutionContext();
  const response = await worker.fetch(new Request(`https://untrusted.example/api/v1/auth/${path}`, {
    method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": crypto.randomUUID() }, body: JSON.stringify(body),
  }), bindings, context);
  await waitOnExecutionContext(context);
  return response;
}
async function register(body = details()) {
  const mail = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"id":"mail"}'));
  const response = await post("register", body);
  expect(response.status).toBe(202);
  const payload = JSON.parse(String(mail.mock.calls.at(-1)?.[1]?.body));
  const token = /#token=([\w-]+)/.exec(payload.text)?.[1];
  expect(token).toHaveLength(43);
  return { body, response, token: token!, payload, mail };
}

describe("Email activation", () => {
  it("creates no user/session before confirmation and sends mail with notifications disabled", async () => {
    await env.DB.prepare("UPDATE tvbox_settings SET email_enabled = 0 WHERE id = 1").run();
    const { body, response, token, payload } = await register();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(payload.text).toContain("https://portal.example.com/verify-email#token=");
    expect(await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(body.email).first()).toBeNull();
    await expect(loginUser(env.DB, body)).rejects.toThrow();
    const pending = await env.DB.prepare("SELECT * FROM pending_registrations WHERE email = ?").bind(body.email).first();
    expect(pending?.token_hash).toBe(await sha256(token));
    expect(pending?.password_hash).not.toBe(body.password);
    const context = createExecutionContext();
    const page = await worker.fetch(new Request("https://portal.example.com/verify-email"), configured, context);
    expect(page.headers.get("cache-control")).toBe("no-store");
    expect(await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(body.email).first()).toBeNull();
    const activation = await post("verify-email", { token });
    expect(activation.status).toBe(200);
    expect(activation.headers.get("set-cookie")).toBeNull();
    const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(body.email).first<{ id: string }>();
    expect(await env.DB.prepare("SELECT token_hash FROM user_sessions WHERE user_id = ?").bind(user!.id).first()).toBeNull();
    expect((await loginUser(env.DB, body)).user.email).toBe(body.email);
    expect((await post("verify-email", { token })).status).toBe(400);
  });

  it("rejects expired tokens without reserving the email or nickname", async () => {
    const { body, token } = await register();
    await env.DB.prepare("UPDATE pending_registrations SET expires_at = 0 WHERE token_hash = ?").bind(await sha256(token)).run();
    expect((await post("verify-email", { token })).status).toBe(400);
    expect(await env.DB.prepare("SELECT id FROM users WHERE email = ? OR nick = ?").bind(body.email, body.nick).first()).toBeNull();
  });

  it("allows only one concurrent activation and invalidates older registrations", async () => {
    const { body, token } = await register();
    const otherToken = "b".repeat(43);
    await env.DB.prepare(`INSERT INTO pending_registrations SELECT ?, email, nick, password_salt, password_hash, password_iterations, expires_at FROM pending_registrations WHERE token_hash = ?`)
      .bind(await sha256(otherToken), await sha256(token)).run();
    const responses = await Promise.all([post("verify-email", { token }), post("verify-email", { token })]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 400]);
    expect((await post("verify-email", { token: otherToken })).status).toBe(400);
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE email = ?").bind(body.email).first("count")).toBe(1);
  });

  it("handles a nickname claimed by another verified registration without consuming the failed link", async () => {
    const first = await register();
    const secondBody = { ...details(), nick: first.body.nick };
    const second = await register(secondBody);
    expect((await post("verify-email", { token: first.token })).status).toBe(200);
    expect((await post("verify-email", { token: second.token })).status).toBe(409);
    expect(await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(secondBody.email).first()).toBeNull();
  });

  it("limits resend and does not create accounts on delivery/configuration failure", async () => {
    const { body, mail } = await register();
    expect((await post("register", body)).status).toBe(429);
    expect(mail).toHaveBeenCalledTimes(1);
    const failed = details();
    mail.mockResolvedValue(new Response("failure", { status: 500 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post("register", failed)).status).toBe(503);
    expect(await env.DB.prepare("SELECT token_hash FROM pending_registrations WHERE email = ?").bind(failed.email).first()).toBeNull();
    expect(await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(failed.email).first()).toBeNull();
    expect((await post("register", details(), { ...configured, AUTH_BASE_URL: "" })).status).toBe(503);
  });
});
