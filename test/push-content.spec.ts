import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { registerAndActivate } from "./verified-account";

const adminHeaders = { authorization: "Bearer test-admin-token" };
async function owner() {
  const name = crypto.randomUUID();
  const response = await registerAndActivate({ email: `${name}@example.com`, nick: name, password: "push-content-password", password_confirmation: "push-content-password" });
  return response.headers.get("set-cookie")!.split(";", 1)[0]!;
}
const call = (path: string, init?: RequestInit) => exports.default.fetch(new Request(`https://example.com/api/v1/${path}`, init));
async function python(cookie: string, content = "print('<script>not HTML</script>')\n") {
  const form = new FormData();
  form.append("file", new File([content], `${crypto.randomUUID()}.py`));
  const response = await call("user/pushes/py", { method: "POST", headers: { cookie }, body: form });
  expect(response.status).toBe(202);
  return response.json<{ id: string }>();
}
const view = (id: string, cookie: string) => call(`user/pushes/${id}/content`, { headers: { cookie } });
async function review(id: string, action: string) {
  const response = await call(`admin/pushes/${id}/${action}`, { method: "POST", headers: { ...adminHeaders, "content-type": "application/json" }, body: JSON.stringify(action === "reject" ? { reason: "test rejection" } : {}) });
  expect(response.status).toBe(200);
}

describe("Push content preview", () => {
  it("restricts preview to the owner/admin and preserves accepted and rejected uploads", async () => {
    const cookie = await owner();
    const stranger = await owner();
    const content = "print('<script>not HTML</script>')\n";
    for (const action of ["accept", "reject"]) {
      const push = await python(cookie, content);
      expect((await call(`user/pushes/${push.id}/content`)).status).toBe(401);
      expect((await view(push.id, stranger)).status).toBe(404);
      expect((await call(`admin/pushes/${push.id}/content`)).status).toBe(401);
      const preview = await view(push.id, cookie);
      expect(preview.headers.get("cache-control")).toBe("no-store");
      expect(await preview.json()).toMatchObject({ content, resource_type: "py" });
      expect((await call(`admin/pushes/${push.id}/content`, { headers: adminHeaders })).status).toBe(200);
      await review(push.id, action);
      expect(await (await view(push.id, cookie)).json()).toMatchObject({ content });
    }
  });

  it("does not substitute a changed published script for a missing historical upload", async () => {
    const cookie = await owner();
    const push = await python(cookie, "print('original')\n");
    await review(push.id, "accept");
    const row = await env.DB.prepare("SELECT staging_r2_key, script_key FROM resource_pushes WHERE id = ?").bind(push.id).first<{ staging_r2_key: string; script_key: string }>();
    await env.STORAGE.delete(row!.staging_r2_key);
    expect((await view(push.id, cookie)).status).toBe(200);
    await env.STORAGE.put(`tvbox/py/${row!.script_key}.py`, "print('newer version')\n");
    expect((await view(push.id, cookie)).status).toBe(410);
  });

  it("shows the submitted CMS URL and metadata without fetching the remote site", async () => {
    const cookie = await owner();
    const url = `https://example.com/${crypto.randomUUID()}/api.php/provide/vod`;
    const response = await call("user/pushes/cms", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ name: "CMS preview", url, note: "test note" }) });
    expect(response.status).toBe(202);
    const push = await response.json<{ id: string }>();
    const result = await (await view(push.id, cookie)).json<{ content: string }>();
    expect(JSON.parse(result.content)).toMatchObject({ name: "CMS preview", url, note: "test note" });
  });
});
