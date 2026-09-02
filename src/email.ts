import type { Env } from "./types";

export interface EmailMessage {
  to: string;
  subject: string;
  title: string;
  lines: string[];
}

export function scheduleEmail(
  context: ExecutionContext,
  env: Env,
  message: EmailMessage,
): void {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return;
  }
  context.waitUntil((async () => {
    const setting = await env.DB.prepare(
      "SELECT email_enabled FROM tvbox_settings WHERE id = 1",
    ).first<{ email_enabled: number }>().catch(() => null);
    if (setting?.email_enabled === 0) return;
    await sendEmail(env, message);
  })().catch((cause: unknown) => {
    console.error("Email delivery failed", cause);
  }));
}

export function scheduleAdminEmail(
  context: ExecutionContext,
  env: Env,
  subject: string,
  title: string,
  lines: string[],
): void {
  if (!env.ADMIN_NOTIFY_EMAIL) {
    return;
  }
  scheduleEmail(context, env, { to: env.ADMIN_NOTIFY_EMAIL, subject, title, lines });
}

async function sendEmail(env: Env, message: EmailMessage): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [message.to],
      subject: message.subject,
      text: [message.title, "", ...message.lines].join("\n"),
      html: renderHTML(message.title, message.lines),
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}: ${await response.text()}`);
  }
}

function renderHTML(title: string, lines: string[]): string {
  return [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#172331;line-height:1.6">',
    `<h2>${escapeHTML(title)}</h2>`,
    ...lines.map((line) => `<p>${escapeHTML(line)}</p>`),
    "</div>",
  ].join("");
}

function escapeHTML(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
