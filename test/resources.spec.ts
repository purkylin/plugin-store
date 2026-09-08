import { registerAndActivate } from "./verified-account";
import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("Resource Push and TVBox", () => {
  it("accepts Python file names containing Unicode, spaces, and parentheses", async () => {
    const registration = await registerAndActivate({
        email: "unicode-file@example.com",
        nick: "UnicodeFile",
        password: "unicode-file-password",
        password_confirmation: "unicode-file-password",
      });
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    const form = new FormData();
    form.append("file", new File(["print('unicode')\n"], "豆瓣 资源 (新版).py", { type: "text/x-python" }));
    const response = await fetchWorker("https://example.com/api/v1/user/pushes/py", {
      method: "POST", headers: { cookie }, body: form,
    });
    expect(response.status).toBe(202);
    const push = await response.json<{ id: string; name: string }>();
    expect(push.name).toBe("豆瓣 资源 (新版).py");
    expect((await admin(`/api/v1/admin/pushes/${push.id}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "test cleanup" }),
    })).status).toBe(200);
  });

  it("reviews PY and CMS resources and generates a stable TVBox configuration", async () => {
    const registration = await registerAndActivate({
        email: "resource-author@example.com",
        nick: "ResourceAuthor",
        password: "resource-test-password",
        password_confirmation: "resource-test-password",
      });
    expect(registration.status).toBe(201);
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0] ?? "";

    const form = new FormData();
    form.append("file", new File(["print('one')\n"], "275听书.py", { type: "text/x-python" }));
    form.append("note", "first upload");
    const submittedPY = await fetchWorker("https://example.com/api/v1/user/pushes/py", {
      method: "POST",
      headers: { cookie },
      body: form,
    });
    expect(submittedPY.status).toBe(202);
    const pyPush = await submittedPY.json<{ id: string }>();

    const acceptedPY = await admin(`/api/v1/admin/pushes/${pyPush.id}/accept`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ display_name: "管理员改名", review_note: "ok" }),
    });
    expect(acceptedPY.status).toBe(200);

    const duplicate = new FormData();
    duplicate.append("file", new File(["print('one')\n"], "275听书.py", { type: "text/x-python" }));
    const duplicateResponse = await fetchWorker("https://example.com/api/v1/user/pushes/py", {
      method: "POST", headers: { cookie }, body: duplicate,
    });
    expect(duplicateResponse.status).toBe(409);
    expect(await duplicateResponse.json()).toMatchObject({
      code: "content_unchanged",
      message: expect.stringContaining("内容与当前版本完全相同"),
    });

    const submittedCMS = await fetchWorker("https://example.com/api/v1/user/pushes/cms", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        name: "量子资源",
        url: "https://cms.example.com/api.php/provide/vod/",
        is_adult: false,
      }),
    });
    expect(submittedCMS.status).toBe(202);
    const cmsPush = await submittedCMS.json<{ id: string }>();
    expect((await admin(`/api/v1/admin/pushes/${cmsPush.id}/accept`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ site_key: "liangzi", overwrite: true }),
    })).status).toBe(200);

    const conflictingCMS = await fetchWorker("https://example.com/api/v1/user/pushes/cms", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        name: "另一个资源",
        url: "https://cms.example.com/another.php/provide/vod/",
      }),
    });
    expect(conflictingCMS.status).toBe(202);
    const conflictingCMSPush = await conflictingCMS.json<{ id: string }>();
    const conflictResponse = await admin(`/api/v1/admin/pushes/${conflictingCMSPush.id}/accept`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ site_key: "liangzi" }),
    });
    expect(conflictResponse.status).toBe(409);
    expect(await conflictResponse.json()).toMatchObject({ code: "cms_site_key_exists" });
    expect((await admin(`/api/v1/admin/pushes/${conflictingCMSPush.id}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "test cleanup" }),
    })).status).toBe(200);

    const resourcesResponse = await admin("/api/v1/admin/resources?page=1&page_size=20");
    expect(resourcesResponse.status).toBe(200);
    const resources = await resourcesResponse.json<{ items: Array<{ id: string; resource_type: string; enabled: number }> }>();
    expect(resources.items).toHaveLength(2);
    expect(resources.items.every((item) => item.enabled === 1)).toBe(true);
    for (const item of resources.items) {
      expect((await admin(`/api/v1/admin/resources/${item.resource_type}/${item.id}/enabled`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      })).status).toBe(200);
    }
    expect(await fetchWorker("https://example.com/api/v1/user/me", {
      headers: { cookie },
    }).then((response) => response.json())).toMatchObject({
      user: { contribution_points: 2 },
    });
    const filtered = await admin("/api/v1/admin/resources?type=py&status=enabled&sort=name_asc&page=1&page_size=20");
    expect(filtered.status).toBe(200);
    expect(await filtered.json()).toMatchObject({ total: 1, items: [{ resource_type: "py" }] });

    const submittedPlugin = await fetchWorker("https://example.com/api/v1/user/plugins", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ manifest: {
        type: "hot",
        icon: "https://admin.example.com/tvbox.png",
        name: "TVBox Config",
        author: "ResourceAuthor",
        version: "1.0.0",
        desc: "Generated TVBox configuration",
        endpoint: "https://old.example.com/tvbox.json",
      } }),
    });
    expect(submittedPlugin.status).toBe(202);
    const pluginSubmission = await submittedPlugin.json<{ submission_id: string; plugin_id: string }>();
    expect((await admin(`/api/v1/admin/reviews/${pluginSubmission.submission_id}/accept`, { method: "POST" })).status).toBe(200);

    expect((await admin("/api/v1/admin/tvbox/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        template: { spider: "https://example.com/fish.jar", logo: "https://example.com/logo.gif", sites: [], lives: [] },
        linked_plugin_id: pluginSubmission.plugin_id,
      }),
    })).status).toBe(200);

    const savedUserDraft = await fetchWorker(
      `https://example.com/api/v1/user/plugins/${pluginSubmission.plugin_id}/draft`,
      {
        method: "PUT",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ manifest: {
          type: "hot",
          icon: "https://user.example.com/unsaved-icon.png",
          name: "User draft name",
          author: "ResourceAuthor",
          version: "1.0.1",
          desc: "Unsaved user changes",
          endpoint: "https://user.example.com/unsaved.json",
          id: pluginSubmission.plugin_id,
        } }),
      },
    );
    expect(savedUserDraft.status).toBe(200);

    const generatedResponse = await admin("/api/v1/admin/tvbox/generate", { method: "POST" });
    expect(generatedResponse.status).toBe(200);
    const generated = await generatedResponse.json<{ config_url: string; resource_count: number }>();
    expect(generated).toMatchObject({
      changed: true,
      resource_count: 2,
      plugin_sync_status: "synced",
      plugin_version: "1.0.1",
    });
    expect(generated.config_url).toMatch(/\/tvbox\/config\/tvbox\.json\?v=[a-f0-9]{64}$/);

    const linkedManifestResponse = await fetchWorker(`https://example.com/api/v1/plugins/${pluginSubmission.plugin_id}/manifest`);
    expect(linkedManifestResponse.status).toBe(200);
    expect(await linkedManifestResponse.json()).toMatchObject({
      id: pluginSubmission.plugin_id,
      version: "1.0.1",
      endpoint: expect.stringMatching(/\/tvbox\/config\/tvbox\.json\?v=[a-f0-9]{64}$/),
    });

    const ownerPluginsResponse = await fetchWorker(
      "https://example.com/api/v1/user/submissions",
      { headers: { cookie } },
    );
    expect(ownerPluginsResponse.status).toBe(200);
    const ownerPlugins = await ownerPluginsResponse.json<{
      items: Array<{
        plugin_id: string;
        linked: boolean;
        status: string;
        version: string;
        published_version: string | null;
        manifest: Record<string, unknown>;
        history: Array<{ version: string; manifest: Record<string, unknown> }>;
      }>;
    }>();
    expect(ownerPlugins.items).toContainEqual(expect.objectContaining({
      plugin_id: pluginSubmission.plugin_id,
      linked: true,
      status: "draft",
      version: "1.0.1",
      published_version: "1.0.1",
      manifest: expect.objectContaining({
        version: "1.0.1",
        icon: "https://admin.example.com/tvbox.png",
        endpoint: expect.stringMatching(/\/tvbox\/config\/tvbox\.json\?v=[a-f0-9]{64}$/),
      }),
      history: [expect.objectContaining({
        version: "1.0.0",
        manifest: expect.objectContaining({ version: "1.0.0" }),
      })],
    }));

    const configResponse = await fetchWorker("https://example.com/tvbox/config/tvbox.json");
    expect(configResponse.status).toBe(200);
    expect(configResponse.headers.get("cache-control")).toBe("no-cache");
    const config = await configResponse.json<{ sites: Array<Record<string, unknown>> }>();
    expect(config.sites).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "liangzi", name: "量子资源", type: 1, api: "https://cms.example.com/api.php/provide/vod/" }),
      expect.objectContaining({ key: "py_275-a8f94271fc", name: "275听书", type: 3, api: expect.stringMatching(/\/tvbox\/py\/275-a8f94271fc\.py\?v=\d+$/) }),
    ]));
    const pyURL = String(config.sites.find((site) => site.key === "py_275-a8f94271fc")?.api);
    const pyResponse = await fetchWorker(pyURL);
    expect(pyResponse.status).toBe(200);
    expect(pyResponse.headers.get("cache-control")).toBe("public, max-age=31536000");
    expect(await pyResponse.text()).toBe("print('one')\n");

    const unchangedGeneration = await admin("/api/v1/admin/tvbox/generate", { method: "POST" });
    expect(await unchangedGeneration.json()).toMatchObject({ changed: false, resource_count: 2 });

    const pyResource = resources.items.find((item) => item.resource_type === "py");
    expect(pyResource).toBeDefined();
    const deleted = await admin(`/api/v1/admin/resources/py/${pyResource?.id}`, { method: "DELETE" });
    expect(deleted.status).toBe(204);

    const userHistory = await fetchWorker("https://example.com/api/v1/user/pushes?page=1&page_size=3", { headers: { cookie } });
    expect(await userHistory.json()).toMatchObject({ total: 3, items: [{ status: "rejected" }, { status: "accepted" }, { status: "accepted" }] });
  });
});

function admin(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("authorization", "Bearer test-admin-token");
  return fetchWorker(`https://example.com${path}`, { ...init, headers });
}

function fetchWorker(input: string | URL, init?: RequestInit): Promise<Response> {
  return exports.default.fetch(new Request(input, init));
}
