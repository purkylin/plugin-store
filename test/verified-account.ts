import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { vi } from "vitest";
import worker from "../src/index";
import type { Env } from "../src/types";

// Integration fixtures follow the real registration, email-confirmation and
// login flow. Only delivery to the external email provider is mocked.
export async function registerAndActivate(body: Record<string, unknown>): Promise<Response> {
  const bindings: Env = { ...env, DB: env.DB, STORAGE: env.STORAGE, AUTH_BASE_URL: "https://example.com", RESEND_API_KEY: "test-key", RESEND_FROM_EMAIL: "test@example.com" };
  const mail = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"id":"test-mail"}'));
  async function post(path: string, value: unknown) {
    const context = createExecutionContext();
    const response = await worker.fetch(new Request(`https://example.com/api/v1/auth/${path}`, {
      method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": crypto.randomUUID() }, body: JSON.stringify(value),
    }), bindings, context);
    await waitOnExecutionContext(context);
    return response;
  }
  try {
    const registration = await post("register", body);
    if (registration.status !== 202) return registration;
    const payload = JSON.parse(String(mail.mock.calls.at(-1)?.[1]?.body));
    const token = /#token=([\w-]+)/.exec(payload.text)?.[1];
    const verified = await post("verify-email", { token });
    if (!verified.ok) return verified;
    const session = await post("login", { email: body.email, password: body.password });
    return new Response(session.body, { status: session.ok ? 201 : session.status, headers: session.headers });
  } finally {
    mail.mockRestore();
  }
}
