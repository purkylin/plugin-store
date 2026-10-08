import { registerAndActivate } from "./verified-account";
import { env } from "cloudflare:workers";
import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("User TVBox resources", () => {
  it("keeps uploads in R2, keeps URLs remote, supports CMS and replacement", async () => {
    const registration = await registerAndActivate({
      email: `user-tvbox-${crypto.randomUUID()}@example.com`,
      nick: `UserTVBox${Math.random().toString(36).slice(2, 8)}`,
      password: "user-tvbox-password",
      password_confirmation: "user-tvbox-password",
    });
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    const statsBeforeUpload = await adminStats();

    const upload = new FormData();
    upload.append("file", new File(["print('first')\n"], "first.py", { type: "text/x-python" }));
    const uploadedResponse = await call("user/tvbox/resources/py", {
      method: "POST", headers: { cookie }, body: upload,
    });
    expect(uploadedResponse.status).toBe(201);
    const uploaded = await uploadedResponse.json<{ id: string; source_type: string; file_size: number }>();
    expect(uploaded).toMatchObject({ source_type: "upload", file_size: 15 });
    expect((await adminStats()).uploaded_python_count).toBe(statsBeforeUpload.uploaded_python_count + 1);

    const remote = new FormData();
    remote.append("url", "https://example.com/remote.py");
    remote.append("name", "远程脚本");
    remote.append("is_adult", "true");
    const remoteResponse = await call("user/tvbox/resources/py", {
      method: "POST", headers: { cookie }, body: remote,
    });
    expect(remoteResponse.status).toBe(201);
    const remoteResource = await remoteResponse.json<{ id: string; source_type: string; source_url: string; is_adult: boolean }>();
    expect(remoteResource).toMatchObject({ source_type: "url", source_url: "https://example.com/remote.py", is_adult: true });
    expect((await adminStats()).uploaded_python_count).toBe(statsBeforeUpload.uploaded_python_count + 1);

    const cmsResponse = await call("user/tvbox/resources/cms", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "测试 CMS", url: "https://cms.example.com/api.php/provide/vod/" }),
    });
    expect(cmsResponse.status).toBe(201);

    const listed = await call("user/tvbox/resources", { headers: { cookie } });
    const listedBody = await listed.json<{ items: Array<{ id: string; resource_type: string; source_type: string }> }>();
    expect(listedBody).toMatchObject({ python_count: 2, python_limit: 50, items: expect.arrayContaining([
      expect.objectContaining({ id: uploaded.id, source_type: "upload" }),
      expect.objectContaining({ id: remoteResource.id, source_type: "url" }),
      expect.objectContaining({ resource_type: "cms", source_type: "url" }),
    ]) });
    const updatedRemote = await call(`user/tvbox/resources/${remoteResource.id}`, {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/remote.py", name: "远程脚本", is_adult: false }),
    });
    expect(await updatedRemote.json()).toMatchObject({ is_adult: false });
    const cmsResource = listedBody.items.find((item) => item.resource_type === "cms");
    expect(cmsResource).toBeDefined();

    for (const resourceID of [uploaded.id, remoteResource.id, cmsResource?.id]) {
      const pushed = await call(`user/tvbox/resources/${resourceID}/push`, {
        method: "POST",
        headers: { cookie },
      });
      expect(pushed.status).toBe(202);
    }
    const pushRows = await env.DB.prepare(`
      SELECT user_resource_id, staging_r2_key
      FROM resource_pushes
      WHERE user_id = (SELECT user_id FROM user_tvbox_resources WHERE id = ?)
        AND user_resource_id IS NOT NULL
    `).bind(uploaded.id).all<{ user_resource_id: string; staging_r2_key: string | null }>();
    expect(pushRows.results).toHaveLength(3);
    expect(pushRows.results.every((row) => row.staging_r2_key === null)).toBe(true);

    const remoteContent = await call(`user/tvbox/resources/${remoteResource.id}/content`, { headers: { cookie } });
    expect(await remoteContent.json()).toMatchObject({ content: null, source_url: "https://example.com/remote.py" });

    const localContent = await call(`user/tvbox/resources/${uploaded.id}/content`, { headers: { cookie } });
    expect(await localContent.json()).toMatchObject({ content: "print('first')\n" });

    const replacement = new FormData();
    replacement.append("file", new File(["print('second')\n"], "second.py", { type: "text/x-python" }));
    const replaced = await call(`user/tvbox/resources/${uploaded.id}`, { method: "PUT", headers: { cookie }, body: replacement });
    expect(replaced.status).toBe(200);
    expect(await replaced.json()).toMatchObject({ name: "second.py", source_type: "upload" });

    const deletedRemote = await call(`user/tvbox/resources/${remoteResource.id}`, { method: "DELETE", headers: { cookie } });
    expect(deletedRemote.status).toBe(204);
    expect(await env.DB.prepare(
      "SELECT 1 AS found FROM resource_pushes WHERE user_resource_id = ?",
    ).bind(remoteResource.id).first()).toBeNull();

    const toggled = await call(`user/tvbox/resources/${uploaded.id}/enabled`, {
      method: "PUT", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ enabled: false }),
    });
    expect(await toggled.json()).toMatchObject({ enabled: false });
  });

  it("generates a user config without fetching remote resources", async () => {
    const registration = await registerAndActivate({
      email: `user-tvbox-config-${crypto.randomUUID()}@example.com`,
      nick: `UserConfig${Math.random().toString(36).slice(2, 8)}`,
      password: "user-tvbox-password",
      password_confirmation: "user-tvbox-password",
    });
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    const remote = new FormData();
    remote.append("url", "https://example.com/remote.py");
    remote.append("name", "远程脚本");
    remote.append("is_adult", "true");
    await call("user/tvbox/resources/py", { method: "POST", headers: { cookie }, body: remote });
    const local = new FormData();
    local.append("file", new File(["print('local')\n"], "local.py", { type: "text/x-python" }));
    expect((await call("user/tvbox/resources/py", {
      method: "POST", headers: { cookie }, body: local,
    })).status).toBe(201);
    await call("user/tvbox/resources/cms", {
      method: "POST", headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "测试 CMS", url: "https://cms.example.com/api.php/provide/vod/" }),
    });

    const saved = await call("user/tvbox/settings", {
      method: "PUT", headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ template: { spider: "https://example.com/fish.jar", sites: [], lives: [] } }),
    });
    expect(saved.status).toBe(200);
    const generated = await call("user/tvbox/generate", { method: "POST", headers: { cookie } });
    expect(generated.status).toBe(200);
    const result = await generated.json<{ config_url: string; resource_count: number }>();
    expect(result).toMatchObject({ resource_count: 3 });
    expect(result.config_url).not.toContain("&t=");

    const config = await call(result.config_url);
    expect(config.status).toBe(200);
    expect(config.headers.get("cache-control")).toBe("public, max-age=86400");
    const configBody = await config.json<{ sites: Array<Record<string, unknown>> }>();
    expect(configBody).toMatchObject({ sites: expect.arrayContaining([
      expect.objectContaining({ name: "远程脚本🔞", type: 3, api: "https://example.com/remote.py" }),
      expect.objectContaining({ name: "local.py", type: 3, api: expect.stringMatching(/^https:\/\/cdn\.9228\.eu\/tvbox\/user\/python\/[a-f0-9]{64}\.py\?v=[a-f0-9]{64}$/) }),
      expect.objectContaining({ type: 1, api: "https://cms.example.com/api.php/provide/vod/" }),
    ]) });
    const localAPI = String(configBody.sites.find((site) => site.name === "local.py")?.api);
    const stored = await env.STORAGE.get(new URL(localAPI).pathname.slice(1));
    expect(await stored?.text()).toBe("print('local')\n");
  });

  it("deduplicates identical uploaded Python files and releases storage after the last reference", async () => {
    const registration = await registerAndActivate({
      email: `user-tvbox-dedupe-${crypto.randomUUID()}@example.com`,
      nick: `UserDedupe${Math.random().toString(36).slice(2, 8)}`,
      password: "user-tvbox-password",
      password_confirmation: "user-tvbox-password",
    });
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    const content = "print('shared')\n";

    const first = new FormData();
    first.append("file", new File([content], "first-shared.py", { type: "text/x-python" }));
    const firstResponse = await call("user/tvbox/resources/py", { method: "POST", headers: { cookie }, body: first });
    const firstResource = await firstResponse.json<{ id: string }>();
    expect(firstResponse.status).toBe(201);

    const second = new FormData();
    second.append("file", new File([content], "second-shared.py", { type: "text/x-python" }));
    const secondResponse = await call("user/tvbox/resources/py", { method: "POST", headers: { cookie }, body: second });
    const secondResource = await secondResponse.json<{ id: string }>();
    expect(secondResponse.status).toBe(201);

    const shared = await env.DB.prepare(`
      SELECT sha256, r2_key, reference_count
      FROM user_tvbox_python_files
      WHERE sha256 = (SELECT sha256 FROM user_tvbox_resources WHERE id = ?)
    `).bind(firstResource.id).first<{ sha256: string; r2_key: string; reference_count: number }>();
    expect(shared).toMatchObject({ reference_count: 2 });
    const resources = await env.DB.prepare(`
      SELECT r2_key, sha256 FROM user_tvbox_resources WHERE id IN (?, ?)
    `).bind(firstResource.id, secondResource.id).all<{ r2_key: string; sha256: string }>();
    expect(resources.results).toHaveLength(2);
    expect(resources.results[0]?.r2_key).toBe(resources.results[1]?.r2_key);

    expect((await call(`user/tvbox/resources/${firstResource.id}`, { method: "DELETE", headers: { cookie } })).status).toBe(204);
    expect(await env.DB.prepare(
      "SELECT reference_count FROM user_tvbox_python_files WHERE sha256 = ?",
    ).bind(shared?.sha256).first<{ reference_count: number }>()).toMatchObject({ reference_count: 1 });
    expect(await env.STORAGE.get(shared!.r2_key)).not.toBeNull();

    expect((await call(`user/tvbox/resources/${secondResource.id}`, { method: "DELETE", headers: { cookie } })).status).toBe(204);
    expect(await env.DB.prepare(
      "SELECT 1 AS found FROM user_tvbox_python_files WHERE sha256 = ?",
    ).bind(shared?.sha256).first()).toBeNull();
    expect(await env.STORAGE.get(shared!.r2_key)).toBeNull();
  });

  it("links and synchronizes a private plugin without publishing it", async () => {
    await ensureTVBoxType();
    const nick = `PrivateTVBox${Math.random().toString(36).slice(2, 8)}`;
    const registration = await registerAndActivate({
      email: `private-tvbox-${crypto.randomUUID()}@example.com`,
      nick,
      password: "private-tvbox-password",
      password_confirmation: "private-tvbox-password",
    });
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    const privateResponse = await call("user/plugins/draft", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        visibility: "private",
        manifest: {
          type: "tvbox",
          icon: "https://example.com/private-tvbox.png",
          name: "Private TVBox",
          author: nick,
          version: "1.0.0",
          desc: "Private TVBox config",
          endpoint: "https://example.com/old-private.json",
        },
      }),
    });
    expect(privateResponse.status).toBe(201);
    const privatePlugin = await privateResponse.json<{ plugin_id: string }>();

    const saved = await call("user/tvbox/settings", {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        template: { sites: [] },
        linked_plugin_id: privatePlugin.plugin_id,
      }),
    });
    expect(saved.status).toBe(200);

    const syncedResponse = await call("user/tvbox/sync", {
      method: "POST",
      headers: { cookie },
    });
    expect(syncedResponse.status).toBe(200);
    expect(await syncedResponse.json()).toMatchObject({
      plugin_sync_status: "synced",
      plugin_sync_error: null,
      plugin_version: "1.0.1",
    });

    const plugins = await call("user/submissions", { headers: { cookie } })
      .then((response) => response.json<{
        items: Array<{
          plugin_id: string;
          status: string;
          visibility: string;
          linked: boolean;
          manifest: Record<string, unknown>;
        }>;
      }>());
    expect(plugins.items).toContainEqual(expect.objectContaining({
      plugin_id: privatePlugin.plugin_id,
      status: "private",
      visibility: "private",
      linked: true,
      manifest: expect.objectContaining({
        version: "1.0.1",
        icon: "https://example.com/private-tvbox.png",
        endpoint: expect.stringMatching(/\/tvbox\/user\/[A-Za-z0-9_-]+\/config\.json\?v=/),
      }),
    }));
    expect((await call(`plugins/${privatePlugin.plugin_id}/manifest`)).status).toBe(404);
  });

  it("links an unpublished public TVBox plugin and keeps published releases unchanged", async () => {
    await ensureTVBoxType();
    const nick = `PublicTVBox${Math.random().toString(36).slice(2, 8)}`;
    const registration = await registerAndActivate({
      email: `public-tvbox-${crypto.randomUUID()}@example.com`,
      nick,
      password: "public-tvbox-password",
      password_confirmation: "public-tvbox-password",
    });
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    const draftResponse = await call("user/plugins/draft", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        visibility: "public",
        manifest: {
          type: "tvbox",
          icon: "https://example.com/public-tvbox.png",
          name: "Public TVBox",
          author: nick,
          version: "1.0.0",
          desc: "Public TVBox config",
          endpoint: "https://example.com/old-public.json",
        },
      }),
    });
    expect(draftResponse.status).toBe(201);
    const draft = await draftResponse.json<{ plugin_id: string }>();

    const saved = await call("user/tvbox/settings", {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ template: { sites: [] }, linked_plugin_id: draft.plugin_id }),
    });
    expect(saved.status).toBe(200);

    const firstSync = await call("user/tvbox/sync", { method: "POST", headers: { cookie } });
    expect(await firstSync.json()).toMatchObject({
      plugin_sync_status: "synced",
      plugin_version: "1.0.1",
    });
    expect((await call(`plugins/${draft.plugin_id}/manifest`)).status).toBe(404);

    const submitted = await call("user/plugins/submit-drafts", { method: "POST", headers: { cookie } });
    expect(submitted.status).toBe(202);
    const submission = await submitted.json<{ items: Array<{ submission_id: string }> }>();
    expect((await call(`admin/reviews/${submission.items[0]?.submission_id}/accept`, {
      method: "POST",
      headers: { authorization: "Bearer test-admin-token" },
    })).status).toBe(200);

    const publishedBeforeSync = await call(`plugins/${draft.plugin_id}/manifest`);
    expect(await publishedBeforeSync.json()).toMatchObject({ version: "1.0.1" });

    const secondSync = await call("user/tvbox/sync", { method: "POST", headers: { cookie } });
    expect(await secondSync.json()).toMatchObject({
      plugin_sync_status: "synced",
      plugin_version: "1.0.2",
    });
    const publishedAfterSync = await call(`plugins/${draft.plugin_id}/manifest`);
    expect(await publishedAfterSync.json()).toMatchObject({ version: "1.0.1" });

    const plugins = await call("user/submissions", { headers: { cookie } })
      .then((response) => response.json<{
        items: Array<{ plugin_id: string; status: string; linked: boolean; manifest: Record<string, unknown> }>;
      }>());
    expect(plugins.items).toContainEqual(expect.objectContaining({
      plugin_id: draft.plugin_id,
      status: "draft",
      linked: true,
      manifest: expect.objectContaining({ version: "1.0.2" }),
    }));
  });

  it("rejects linked plugins whose type is not tvbox", async () => {
    const nick = `WrongType${Math.random().toString(36).slice(2, 8)}`;
    const registration = await registerAndActivate({
      email: `wrong-tvbox-type-${crypto.randomUUID()}@example.com`,
      nick,
      password: "wrong-type-password",
      password_confirmation: "wrong-type-password",
    });
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    const draftResponse = await call("user/plugins/draft", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        visibility: "private",
        manifest: {
          type: "hot",
          name: "Wrong type",
          author: nick,
          version: "1.0.0",
          desc: "Not a TVBox plugin",
          endpoint: "https://example.com/not-tvbox.json",
        },
      }),
    });
    const draft = await draftResponse.json<{ plugin_id: string }>();
    const saved = await call("user/tvbox/settings", {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ template: { sites: [] }, linked_plugin_id: draft.plugin_id }),
    });
    expect(saved.status).toBe(409);
    expect(await saved.json()).toMatchObject({ code: "plugin_type_not_tvbox" });
  });
});

function call(path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("http") ? path : `https://example.com/api/v1/${path}`;
  return exports.default.fetch(new Request(url, init));
}

async function adminStats(): Promise<{ uploaded_python_count: number }> {
  const response = await call("admin/users/stats", {
    headers: { authorization: "Bearer test-admin-token" },
  });
  expect(response.status).toBe(200);
  return response.json();
}

async function ensureTVBoxType(): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT OR IGNORE INTO plugin_types (value, name, created_at, updated_at)
    VALUES ('tvbox', 'TVBox', ?, ?)
  `).bind(now, now).run();
}
