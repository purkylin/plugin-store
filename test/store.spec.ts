import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const manifest = {
  id: "example.hot",
  type: "hot",
  icon: "https://example.com/icon.png",
  name: "Example Hot",
  author: "Hawk",
  version: "1.0.0",
  update_time: "2026-07-24T08:00:00Z",
  desc: "Example plugin used by integration tests.",
  endpoint: "https://example.com/hot.json",
};

describe("Plugin Store API", () => {
  it("publishes, lists, downloads, and idempotently counts installs", async () => {
    const first = await createReviewedPlugin({
      ...manifest,
      author: "Hawk",
    }, {
      platforms: ["ios", "tvos"],
      minimum_ios_version: "1.0.0",
    });
    const storedManifest = await env.DB.prepare(`
      SELECT manifest_json
      FROM plugin_releases
      WHERE plugin_id = ? AND version = ?
    `).bind(first.pluginID, "1.0.0").first<{ manifest_json: string }>();
    expect(JSON.parse(storedManifest?.manifest_json ?? "{}").update_time).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    const unknownID = "00000000-0000-4000-8000-000000000000";

    const available = await checkUpdates({
      platform: "ios",
      app_version: "1.4.0",
      plugins: [
        { id: first.pluginID, version: "0.9.0" },
        { id: unknownID, version: "1.0.0" },
      ],
    });
    expect(available).toMatchObject({
      update_count: 1,
      items: [
        {
          id: first.pluginID,
          current_version: "0.9.0",
          latest_version: "1.0.0",
          update_available: true,
          status: "update_available",
          manifest: {
            id: first.pluginID,
            version: "1.0.0",
          },
          manifest_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
        {
          id: unknownID,
          latest_version: null,
          update_available: false,
          status: "not_found",
          manifest: null,
          manifest_sha256: null,
        },
      ],
    });
    expect(await sha256(JSON.stringify(available.items[0]?.manifest ?? null)))
      .toBe(available.items[0]?.manifest_sha256);

    expect(await checkUpdates({
      platform: "ios",
      app_version: "1.4.0",
      plugins: [{ id: first.pluginID, version: "1.0.0" }],
    })).toMatchObject({
      update_count: 0,
      items: [{
        status: "up_to_date",
        update_available: false,
        manifest: null,
      }],
    });

    expect(await checkUpdates({
      platform: "ios",
      app_version: "0.9.0",
      plugins: [{ id: first.pluginID, version: "0.9.0" }],
    })).toMatchObject({
      update_count: 0,
      items: [{
        latest_version: "1.0.0",
        status: "incompatible",
        update_available: false,
        manifest: null,
        manifest_sha256: null,
      }],
    });

    const duplicate = await fetchWorker(
      "https://example.com/api/v1/plugins/check-updates",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          platform: "ios",
          app_version: "1.4.0",
          plugins: [
            { id: first.pluginID, version: "1.0.0" },
            { id: first.pluginID, version: "0.9.0" },
          ],
        }),
      },
    );
    expect(duplicate.status).toBe(400);
    expect(await duplicate.json()).toMatchObject({ code: "duplicate_plugin_id" });

    const catalog = await getCatalog("1.4.0");
    expect(catalog.items).toHaveLength(1);
    expect(catalog.items[0]).toMatchObject({
      id: first.pluginID,
      latest_version: "1.0.0",
      install_count: 0,
      manifest_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });

    const incompatible = await getCatalog("0.9.0");
    expect(incompatible.items).toEqual([]);
    expect(incompatible.total).toBe(0);

    const adminCatalog = await fetchWorker(
      "https://example.com/api/v1/admin/plugins?limit=20",
      { headers: { authorization: "Bearer test-admin-token" } },
    );
    expect(adminCatalog.status).toBe(200);
    const managed = await adminCatalog.json<{
      items: Array<{ id: string; manifest: unknown; platforms: string[] }>;
    }>();
    expect(managed.items[0]).toMatchObject({
      id: first.pluginID,
      manifest: {
        ...manifest,
        id: first.pluginID,
        update_time: expect.any(String),
      },
      platforms: ["ios", "tvos"],
    });

    const downloaded = await fetchWorker(
      `https://example.com/api/v1/plugins/${first.pluginID}/manifest`,
    );
    expect(downloaded.status).toBe(200);
    const manifestJSON = await downloaded.text();
    const downloadedManifest = JSON.parse(manifestJSON);
    expect(downloadedManifest).toEqual({
      ...manifest,
      id: first.pluginID,
      update_time: expect.any(String),
    });
    expect(downloadedManifest.update_time).not.toBe(manifest.update_time);
    expect(downloadedManifest.update_time).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    );
    expect(await sha256(manifestJSON)).toBe(catalog.items[0]?.manifest_sha256);
    expect(downloaded.headers.get("etag"))
      .toBe(`"sha256-${catalog.items[0]?.manifest_sha256}"`);

    const event = installEvent(first.pluginID);
    expect((await postEvent(event)).status).toBe(204);
    expect((await postEvent(event)).status).toBe(204);

    const counted = await getCatalog("1.4.0");
    expect(counted.items[0]?.install_count).toBe(1);

    const second = await createReviewedPlugin({
      ...manifest,
      author: "SecondAuthor",
      name: "Second Plugin",
    });

    expect((await getFilteredCatalog({ type: "hot", q: "Second Plugin" })).items)
      .toEqual([expect.objectContaining({ id: second.pluginID })]);
    expect((await getFilteredCatalog({ q: "SecondAuthor" })).items)
      .toEqual([expect.objectContaining({ id: second.pluginID })]);
    expect((await getFilteredCatalog({ q: first.pluginID.slice(0, 12) })).items)
      .toEqual([expect.objectContaining({ id: first.pluginID })]);
    expect((await getFilteredCatalog({ type: "video" })).items).toEqual([]);

    const firstPage = await getCatalog("1.4.0", 1);
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage).toMatchObject({
      total: 2,
      page: 1,
      page_size: 1,
      total_pages: 2,
    });
    const secondPage = await getCatalog("1.4.0", 1, 2);
    expect(secondPage.items).toHaveLength(1);
    expect(new Set([
      firstPage.items[0]?.id,
      secondPage.items[0]?.id,
    ])).toEqual(new Set([first.pluginID, second.pluginID]));
    const downloadsDescending = await getCatalog(
      "1.4.0",
      20,
      1,
      "downloads",
      "desc",
    );
    expect(downloadsDescending.items[0]?.id).toBe(first.pluginID);
    const downloadsAscending = await getCatalog(
      "1.4.0",
      20,
      1,
      "downloads",
      "asc",
    );
    expect(downloadsAscending.items[0]?.id).toBe(second.pluginID);
    const timeAscending = await getCatalog("1.4.0", 20, 1, "time", "asc");
    expect(timeAscending.items.map((item) => item.updated_at)).toEqual(
      [...timeAscending.items]
        .map((item) => item.updated_at)
        .sort((lhs, rhs) => lhs.localeCompare(rhs)),
    );
  });

  it("does not allow administrators to create or edit plugins directly", async () => {
    const response = await fetchWorker(
      "https://example.com/api/v1/admin/plugins/example.unauthorized",
      {
        method: "PUT",
        headers: {
          authorization: "Bearer test-admin-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ manifest }),
      },
    );
    expect(response.status).toBe(404);
  });

  it("lets administrators configure plugin type names and values", async () => {
    const initial = await fetchWorker("https://example.com/api/v1/plugin-types");
    expect(initial.status).toBe(200);
    expect(await initial.json()).toMatchObject({
      items: [expect.objectContaining({ value: "hot", name: "热榜" })],
    });

    const adminHeaders = {
      authorization: "Bearer test-admin-token",
      "content-type": "application/json",
    };
    const saved = await fetchWorker("https://example.com/api/v1/admin/plugin-types", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ value: "podcast", name: "播客" }),
    });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({ value: "podcast", name: "播客" });

    const renamed = await fetchWorker("https://example.com/api/v1/admin/plugin-types", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ value: "podcast", name: "音频播客" }),
    });
    expect(renamed.status).toBe(200);
    expect(await renamed.json()).toMatchObject({ value: "podcast", name: "音频播客" });

    const registration = await authRequest("/api/v1/auth/register", {
      email: "typed-author@example.com",
      nick: "TypedAuthor",
      password: "typed-author-password",
      password_confirmation: "typed-author-password",
    });
    const cookie = sessionCookie(registration);
    const typedDraft = await fetchWorker(
      "https://example.com/api/v1/user/plugins/draft",
      {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          manifest: {
            ...manifest,
            type: "podcast",
            name: "Podcast Plugin",
            author: "TypedAuthor",
          },
        }),
      },
    );
    expect(typedDraft.status).toBe(201);

    const deleteUsed = await fetchWorker(
      "https://example.com/api/v1/admin/plugin-types/podcast",
      {
        method: "DELETE",
        headers: { authorization: "Bearer test-admin-token" },
      },
    );
    expect(deleteUsed.status).toBe(409);
    expect(await deleteUsed.json()).toMatchObject({ code: "plugin_type_in_use" });

    expect((await fetchWorker("https://example.com/api/v1/admin/plugin-types", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ value: "temporary", name: "临时类型" }),
    })).status).toBe(200);
    expect((await fetchWorker(
      "https://example.com/api/v1/admin/plugin-types/temporary",
      {
        method: "DELETE",
        headers: { authorization: "Bearer test-admin-token" },
      },
    )).status).toBe(204);

    const invalidDraft = await fetchWorker(
      "https://example.com/api/v1/user/plugins/draft",
      {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          manifest: {
            ...manifest,
            type: "missing",
            name: "Invalid Type",
            author: "TypedAuthor",
          },
        }),
      },
    );
    expect(invalidDraft.status).toBe(400);
    expect(await invalidDraft.json()).toMatchObject({ code: "invalid_plugin_type" });
  });

  it("reports user contributions and lets whitelisted users publish without review", async () => {
    const registration = await authRequest("/api/v1/auth/register", {
      email: "trusted-author@example.com",
      nick: "TrustedAuthor",
      password: "trusted-author-password",
      password_confirmation: "trusted-author-password",
    });
    expect(registration.status).toBe(201);
    const cookie = sessionCookie(registration);
    const account = await registration.json<{
      user: { id: string; whitelisted: boolean };
    }>();
    expect(account.user.whitelisted).toBe(false);

    const adminUsers = await fetchWorker(
      "https://example.com/api/v1/admin/users?q=trusted-author",
      { headers: { authorization: "Bearer test-admin-token" } },
    );
    expect(adminUsers.status).toBe(200);
    expect(await adminUsers.json()).toMatchObject({
      page: 1,
      page_size: 20,
      total: 1,
      total_pages: 1,
      items: [{
        id: account.user.id,
        email: "trusted-author@example.com",
        nick: "TrustedAuthor",
        whitelisted: false,
        contribution_count: 0,
      }],
    });

    const enabled = await fetchWorker(
      `https://example.com/api/v1/admin/users/${account.user.id}/whitelist`,
      {
        method: "PUT",
        headers: {
          authorization: "Bearer test-admin-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ enabled: true }),
      },
    );
    expect(enabled.status).toBe(200);
    expect(await enabled.json()).toEqual({
      id: account.user.id,
      whitelisted: true,
    });
    expect(await fetchWorker("https://example.com/api/v1/user/me", {
      headers: { cookie },
    }).then((response) => response.json())).toMatchObject({
      user: { whitelisted: true },
    });

    const direct = await submitNewUserManifest({
      ...manifest,
      author: "TrustedAuthor",
      name: "Trusted Direct Publish",
    }, cookie);
    expect(direct.status).toBe(201);
    const directResult = await direct.json<{
      submission_id: string;
      plugin_id: string;
      status: string;
    }>();
    expect(directResult.status).toBe("accepted");
    expect((await fetchWorker(
      `https://example.com/api/v1/plugins/${directResult.plugin_id}/manifest`,
    )).status).toBe(200);

    const directUpdate = await submitUserManifest({
      ...manifest,
      id: directResult.plugin_id,
      author: "TrustedAuthor",
      name: "Trusted Direct Update",
      version: "1.1.0",
    }, cookie);
    expect(directUpdate.status).toBe(201);
    expect(await fetchWorker("https://example.com/api/v1/user/me", {
      headers: { cookie },
    }).then((response) => response.json())).toMatchObject({
      user: { contribution_points: 1 },
    });

    const imported = await fetchWorker(
      "https://example.com/api/v1/user/plugins/import",
      {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          plugins: [{
            ...manifest,
            author: "ignored",
            name: "Trusted Batch Publish",
          }],
        }),
      },
    );
    expect(imported.status).toBe(201);
    const importedResult = await imported.json<{
      items: Array<{ plugin_id: string }>;
    }>();
    const submittedDrafts = await fetchWorker(
      "https://example.com/api/v1/user/plugins/submit-drafts",
      { method: "POST", headers: { cookie } },
    );
    expect(submittedDrafts.status).toBe(201);
    expect(await submittedDrafts.json()).toMatchObject({
      submitted_count: 1,
      published_count: 1,
      items: [{ status: "accepted" }],
    });
    expect((await fetchWorker(
      `https://example.com/api/v1/plugins/${importedResult.items[0]?.plugin_id}/manifest`,
    )).status).toBe(200);

    expect(await fetchWorker("https://example.com/api/v1/user/me", {
      headers: { cookie },
    }).then((response) => response.json())).toMatchObject({
      user: { contribution_points: 2 },
    });

    const queue = await fetchWorker(
      "https://example.com/api/v1/admin/reviews?limit=100",
      { headers: { authorization: "Bearer test-admin-token" } },
    ).then((response) => response.json<{
      items: Array<{ user: { nick: string } }>;
    }>());
    expect(queue.items.some((item) => item.user.nick === "TrustedAuthor")).toBe(false);

    const stats = await fetchWorker(
      "https://example.com/api/v1/admin/users/stats",
      { headers: { authorization: "Bearer test-admin-token" } },
    );
    expect(stats.status).toBe(200);
    const statsBody = await stats.json<{
      total_users: number;
      whitelisted_users: number;
      top_contributors: Array<{ id: string; contribution_count: number }>;
    }>();
    expect(statsBody).toMatchObject({
      total_users: expect.any(Number),
      whitelisted_users: expect.any(Number),
    });
    expect(statsBody.top_contributors[0]).toMatchObject({
      id: account.user.id,
      contribution_count: 2,
    });

    for (const pluginID of [
      directResult.plugin_id,
      importedResult.items[0]?.plugin_id,
    ]) {
      expect((await fetchWorker(
        `https://example.com/api/v1/user/plugins/${pluginID}`,
        { method: "DELETE", headers: { cookie } },
      )).status).toBe(204);
    }
    expect((await fetchWorker(
      `https://example.com/api/v1/admin/users/${account.user.id}/whitelist`,
      {
        method: "PUT",
        headers: {
          authorization: "Bearer test-admin-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ enabled: false }),
      },
    )).status).toBe(200);
  });

  it("batch imports JSON plugins as drafts and replaces managed fields", async () => {
    const registration = await authRequest("/api/v1/auth/register", {
      email: "batch-importer@example.com",
      nick: "BatchImporter",
      password: "batch-import-password",
      password_confirmation: "batch-import-password",
    });
    expect(registration.status).toBe(201);
    const cookie = sessionCookie(registration);
    const imported = await fetchWorker(
      "https://example.com/api/v1/user/plugins/import",
      {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          plugins: [
            {
              ...manifest,
              id: "ignored.first",
              author: "IgnoredAuthor",
              update_time: "2000-01-01T00:00:00Z",
              name: "Imported Direct Manifest",
            },
            {
              manifest: {
                ...manifest,
                id: "ignored.second",
                author: "AnotherIgnoredAuthor",
                update_time: "2000-01-01T00:00:00Z",
                name: "Imported Wrapped Manifest",
              },
              platforms: ["ios"],
              minimum_ios_version: "1.2.0",
            },
          ],
        }),
      },
    );
    expect(imported.status).toBe(201);
    const result = await imported.json<{
      imported_count: number;
      items: Array<{ plugin_id: string; status: string; saved_at: string }>;
    }>();
    expect(result.imported_count).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(new Set(result.items.map((item) => item.plugin_id)).size).toBe(2);
    for (const item of result.items) {
      expect(item).toMatchObject({
        plugin_id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        ),
        status: "draft",
        saved_at: expect.any(String),
      });
      expect(["ignored.first", "ignored.second"]).not.toContain(item.plugin_id);
    }

    const drafts = await fetchWorker(
      "https://example.com/api/v1/user/submissions",
      { headers: { cookie } },
    ).then((response) => response.json<{
      items: Array<{
        status: string;
        plugin_id: string;
        manifest: Record<string, unknown>;
        platforms: string[];
        minimum_ios_version: string | null;
      }>;
    }>());
    expect(drafts.items).toHaveLength(2);
    expect(drafts.items.every((item) => item.status === "draft")).toBe(true);
    expect(drafts.items.every((item) => item.manifest.author === "BatchImporter")).toBe(true);
    expect(drafts.items.every(
      (item) => item.manifest.update_time !== "2000-01-01T00:00:00Z",
    )).toBe(true);
    expect(new Set(drafts.items.map((item) => item.plugin_id))).toEqual(
      new Set(result.items.map((item) => item.plugin_id)),
    );
    expect(drafts.items).toContainEqual(expect.objectContaining({
      platforms: ["ios"],
      minimum_ios_version: "1.2.0",
    }));

    const invalid = await fetchWorker(
      "https://example.com/api/v1/user/plugins/import",
      {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          plugins: [
            { ...manifest, name: "Would Be Valid" },
            { type: "hot", version: "1.0.0", desc: "Missing name" },
          ],
        }),
      },
    );
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      code: "invalid_field",
      message: expect.stringContaining("plugins[1]"),
    });
    const afterInvalid = await fetchWorker(
      "https://example.com/api/v1/user/submissions",
      { headers: { cookie } },
    ).then((response) => response.json<{ items: unknown[] }>());
    expect(afterInvalid.items).toHaveLength(2);

    const submitted = await fetchWorker(
      "https://example.com/api/v1/user/plugins/submit-drafts",
      { method: "POST", headers: { cookie } },
    );
    expect(submitted.status).toBe(202);
    const submittedResult = await submitted.json<{
      submitted_count: number;
      items: Array<{ submission_id: string; plugin_id: string; status: string }>;
    }>();
    expect(submittedResult).toMatchObject({
      submitted_count: 2,
      items: [
        expect.objectContaining({ status: "pending" }),
        expect.objectContaining({ status: "pending" }),
      ],
    });
    expect(new Set(submittedResult.items.map((item) => item.plugin_id))).toEqual(
      new Set(result.items.map((item) => item.plugin_id)),
    );
    const pending = await fetchWorker(
      "https://example.com/api/v1/user/submissions",
      { headers: { cookie } },
    ).then((response) => response.json<{ items: Array<{ status: string }> }>());
    expect(pending.items).toHaveLength(2);
    expect(pending.items.every((item) => item.status === "pending")).toBe(true);

    for (const item of submittedResult.items) {
      expect((await fetchWorker(
        `https://example.com/api/v1/user/submissions/${item.submission_id}/cancel`,
        { method: "POST", headers: { cookie } },
      )).status).toBe(200);
    }
  });

  it("saves drafts without changing the approved store manifest", async () => {
    const registration = await authRequest("/api/v1/auth/register", {
      email: "draft-author@example.com",
      nick: "DraftAuthor",
      password: "draft-author-password",
      password_confirmation: "draft-author-password",
    });
    expect(registration.status).toBe(201);
    const cookie = sessionCookie(registration);
    const draftManifest = {
      ...manifest,
      author: "DraftAuthor",
      name: "Saved Draft",
      version: "1.0.0",
    };
    const saved = await fetchWorker("https://example.com/api/v1/user/plugins/draft", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ manifest: draftManifest }),
    });
    expect(saved.status).toBe(201);
    const draft = await saved.json<{ plugin_id: string; status: string }>();
    expect(draft.status).toBe("draft");
    expect((await getFilteredCatalog({ q: draft.plugin_id })).total).toBe(0);

    const draftList = await fetchWorker(
      "https://example.com/api/v1/user/submissions",
      { headers: { cookie } },
    ).then((response) => response.json<{
      items: Array<{
        status: string;
        plugin_id: string;
        manifest: Record<string, unknown>;
        history: unknown[];
      }>;
    }>());
    expect(draftList.items).toHaveLength(1);
    expect(draftList.items[0]).toMatchObject({
      status: "draft",
      plugin_id: draft.plugin_id,
      history: [],
    });

    const submitted = await submitUserManifest({
      ...draftManifest,
      id: draft.plugin_id,
      name: "Approved Name",
      version: "1.1.0",
    }, cookie);
    expect(submitted.status).toBe(202);
    const submission = await submitted.json<{ submission_id: string }>();
    expect((await acceptReview(submission.submission_id)).status).toBe(200);

    const draftUpdate = await fetchWorker(
      `https://example.com/api/v1/user/plugins/${draft.plugin_id}/draft`,
      {
        method: "PUT",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          manifest: {
            ...draftManifest,
            id: draft.plugin_id,
            name: "Unsubmitted Local Change",
            version: "1.2.0",
          },
        }),
      },
    );
    expect(draftUpdate.status).toBe(200);
    const storeManifest = await fetchWorker(
      `https://example.com/api/v1/plugins/${draft.plugin_id}/manifest`,
    ).then((response) => response.json<Record<string, unknown>>());
    expect(storeManifest).toMatchObject({
      name: "Approved Name",
      version: "1.1.0",
    });

    expect((await fetchWorker(
      `https://example.com/api/v1/user/plugins/${draft.plugin_id}`,
      { method: "DELETE", headers: { cookie } },
    )).status).toBe(204);
    expect((await fetchWorker(
      `https://example.com/api/v1/plugins/${draft.plugin_id}/manifest`,
    )).status).toBe(404);
  });

  it("keeps private plugins out of review and makes visibility immutable", async () => {
    const registration = await authRequest("/api/v1/auth/register", {
      email: "private-author@example.com",
      nick: "PrivateAuthor",
      password: "private-author-password",
      password_confirmation: "private-author-password",
    });
    expect(registration.status).toBe(201);
    const cookie = sessionCookie(registration);
    const privateManifest = {
      ...manifest,
      author: "PrivateAuthor",
      name: "Private Manual Import",
    };

    const saved = await fetchWorker("https://example.com/api/v1/user/plugins/draft", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ manifest: privateManifest, visibility: "private" }),
    });
    expect(saved.status).toBe(201);
    const privatePlugin = await saved.json<{
      plugin_id: string;
      status: string;
      visibility: string;
    }>();
    expect(privatePlugin).toMatchObject({ status: "private", visibility: "private" });
    expect((await getFilteredCatalog({ q: privatePlugin.plugin_id })).total).toBe(0);

    const listed = await fetchWorker(
      "https://example.com/api/v1/user/submissions",
      { headers: { cookie } },
    ).then((response) => response.json<{
      items: Array<{
        plugin_id: string;
        status: string;
        visibility: string;
        manifest: Record<string, unknown>;
      }>;
    }>());
    expect(listed.items).toContainEqual(expect.objectContaining({
      plugin_id: privatePlugin.plugin_id,
      status: "private",
      visibility: "private",
      manifest: expect.objectContaining({ name: "Private Manual Import" }),
    }));

    const bulkSubmit = await fetchWorker(
      "https://example.com/api/v1/user/plugins/submit-drafts",
      { method: "POST", headers: { cookie } },
    );
    expect(bulkSubmit.status).toBe(202);
    expect(await bulkSubmit.json()).toMatchObject({ items: [], submitted_count: 0 });
    expect(await fetchWorker("https://example.com/api/v1/user/me", {
      headers: { cookie },
    }).then((response) => response.json())).toMatchObject({
      user: { contribution_points: 0 },
    });

    const privateBody = {
      manifest: {
        ...privateManifest,
        id: privatePlugin.plugin_id,
      },
      visibility: "private",
    };
    const directSubmit = await fetchWorker(
      `https://example.com/api/v1/user/plugins/${privatePlugin.plugin_id}`,
      {
        method: "PUT",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify(privateBody),
      },
    );
    expect(directSubmit.status).toBe(409);
    expect(await directSubmit.json()).toMatchObject({
      code: "private_plugin_cannot_be_submitted",
    });

    const makePublic = await fetchWorker(
      `https://example.com/api/v1/user/plugins/${privatePlugin.plugin_id}/draft`,
      {
        method: "PUT",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ ...privateBody, visibility: "public" }),
      },
    );
    expect(makePublic.status).toBe(409);
    expect(await makePublic.json()).toMatchObject({ code: "visibility_immutable" });

    const publicSaved = await fetchWorker(
      "https://example.com/api/v1/user/plugins/draft",
      {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          manifest: { ...privateManifest, name: "Public Fixed Visibility" },
          visibility: "public",
        }),
      },
    ).then((response) => response.json<{ plugin_id: string }>());
    const makePrivate = await fetchWorker(
      `https://example.com/api/v1/user/plugins/${publicSaved.plugin_id}/draft`,
      {
        method: "PUT",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          manifest: {
            ...privateManifest,
            id: publicSaved.plugin_id,
            name: "Public Fixed Visibility",
          },
          visibility: "private",
        }),
      },
    );
    expect(makePrivate.status).toBe(409);
    expect(await makePrivate.json()).toMatchObject({ code: "visibility_immutable" });

    const submittedPublicDrafts = await fetchWorker(
      "https://example.com/api/v1/user/plugins/submit-drafts",
      { method: "POST", headers: { cookie } },
    );
    expect(submittedPublicDrafts.status).toBe(202);
    expect(await submittedPublicDrafts.json()).toMatchObject({ submitted_count: 1 });
    const makeSubmittedPluginPrivate = await fetchWorker(
      `https://example.com/api/v1/user/plugins/${publicSaved.plugin_id}/draft`,
      {
        method: "PUT",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          manifest: {
            ...privateManifest,
            id: publicSaved.plugin_id,
            name: "Public Fixed Visibility",
          },
          visibility: "private",
        }),
      },
    );
    expect(makeSubmittedPluginPrivate.status).toBe(409);
    expect(await makeSubmittedPluginPrivate.json()).toMatchObject({
      code: "visibility_immutable",
    });
  });

  it("enforces update invariants, stamps update time, and unpublishes plugins", async () => {
    const initial = {
      ...manifest,
      author: "FixedAuthor",
      version: "2.0.0",
      ua: "Hawk/Test",
    };
    const created = await createReviewedPlugin(initial);
    const owned = { ...initial, id: created.pluginID };

    const sameVersion = await submitUserManifest(
      { ...owned, name: "Renamed" },
      created.cookie,
    );
    expect(sameVersion.status).toBe(409);
    expect(await sameVersion.json()).toMatchObject({ code: "version_not_incremented" });

    const lowerVersion = await submitUserManifest(
      { ...owned, version: "1.9.0" },
      created.cookie,
    );
    expect(lowerVersion.status).toBe(409);

    const changedAuthor = await submitUserManifest({
      ...owned,
      author: "Different Author",
      version: "2.1.0",
    }, created.cookie);
    expect(changedAuthor.status).toBe(400);
    expect(await changedAuthor.json()).toMatchObject({ code: "author_mismatch" });

    const changedType = await submitUserManifest({
      ...owned,
      type: "different",
      version: "2.1.0",
    }, created.cookie);
    expect(changedType.status).toBe(409);

    const updated = await submitUserManifest({
      ...owned,
      name: "Updated Plugin",
      version: "2.1.0",
      update_time: "2000-01-01T00:00:00Z",
    }, created.cookie);
    expect(updated.status).toBe(202);
    const updatedSubmission = await updated.json<{ submission_id: string }>();
    expect((await acceptReview(updatedSubmission.submission_id)).status).toBe(200);

    const downloaded = await fetchWorker(
      `https://example.com/api/v1/plugins/${created.pluginID}/manifest`,
    );
    const latest = await downloaded.json<Record<string, unknown>>();
    expect(latest).toMatchObject({
      id: created.pluginID,
      author: "FixedAuthor",
      version: "2.1.0",
      ua: "Hawk/Test",
    });
    expect(latest.update_time).not.toBe("2000-01-01T00:00:00Z");

    const unpublished = await fetchWorker(
      `https://example.com/api/v1/admin/plugins/${created.pluginID}/unpublish`,
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-admin-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ reason: "Needs additional changes." }),
      },
    );
    expect(unpublished.status).toBe(200);
    expect((
      await fetchWorker(`https://example.com/api/v1/plugins/${created.pluginID}/manifest`)
    ).status).toBe(404);
    expect((
      await fetchWorker(`https://example.com/api/v1/admin/plugins/${created.pluginID}/unpublish`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-admin-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ reason: "Already unpublished." }),
      })
    ).status).toBe(404);
    expect((
      await fetchWorker(`https://example.com/api/v1/admin/plugins/${created.pluginID}`, {
        method: "DELETE",
        headers: { authorization: "Bearer test-admin-token" },
      })
    ).status).toBe(404);
  });

  it("registers users and gates user submissions behind admin review", async () => {
    const registration = await authRequest("/api/v1/auth/register", {
      email: "author@example.com",
      nick: "ReviewAuthor",
      password: "correct-horse-battery",
      password_confirmation: "correct-horse-battery",
    });
    expect(registration.status).toBe(201);
    const accountCookie = sessionCookie(registration);
    expect(registration.headers.get("set-cookie")).toContain("HttpOnly");
    expect(registration.headers.get("set-cookie")).toContain("SameSite=Strict");
    expect(registration.headers.get("set-cookie")).toContain("Secure");
    const account = await registration.json<{
      user: { id: string; email: string; nick: string };
      expires_at: string;
    }>();
    expect(account.user).toMatchObject({
      email: "author@example.com",
      nick: "ReviewAuthor",
    });
    expect(account.expires_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    );
    expect(await env.DB.prepare(`
      SELECT password_iterations, created_at
      FROM users
      WHERE email = ?
    `).bind("author@example.com").first()).toEqual({
      password_iterations: 100_000,
      created_at: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      ),
    });

    expect((await authRequest("/api/v1/auth/register", {
      email: "author@example.com",
      nick: "AnotherNick",
      password: "correct-horse-battery",
      password_confirmation: "correct-horse-battery",
    })).status).toBe(409);
    expect((await authRequest("/api/v1/auth/register", {
      email: "other@example.com",
      nick: "ReviewAuthor",
      password: "correct-horse-battery",
      password_confirmation: "correct-horse-battery",
    })).status).toBe(409);
    expect((await authRequest("/api/v1/auth/register", {
      email: "mismatch@example.com",
      nick: "MismatchAuthor",
      password: "correct-horse-battery",
      password_confirmation: "different-password",
    })).status).toBe(400);

    const login = await authRequest("/api/v1/auth/login", {
      email: "AUTHOR@example.com",
      password: "correct-horse-battery",
    });
    expect(login.status).toBe(200);
    expect(sessionCookie(login)).toMatch(/^hawk_session=/);

    const requestedManifest = {
      ...manifest,
      id: "client-chosen.plugin",
      author: "ReviewAuthor",
      name: "Needs Review",
      ua: "Hawk/Review-Test",
    };
    const submitted = await submitNewUserManifest(requestedManifest, accountCookie);
    expect(submitted.status).toBe(202);
    const submission = await submitted.json<{
      submission_id: string;
      plugin_id: string;
      status: string;
    }>();
    expect(submission.status).toBe("pending");
    expect(submission.plugin_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(submission.plugin_id).not.toBe(requestedManifest.id);
    const userManifest = { ...requestedManifest, id: submission.plugin_id };

    const beforeReview = await getCatalog("9.0.0");
    expect(beforeReview.items.some((item) => item.id === submission.plugin_id)).toBe(false);

    const queue = await fetchWorker("https://example.com/api/v1/admin/reviews?limit=100", {
      headers: { authorization: "Bearer test-admin-token" },
    });
    expect(queue.status).toBe(200);
    const pending = await queue.json<{
      items: Array<{
        id: string;
        plugin_id: string;
        user: { nick: string };
        manifest: Record<string, unknown>;
      }>;
    }>();
    expect(pending.items).toContainEqual(expect.objectContaining({
      id: submission.submission_id,
      plugin_id: submission.plugin_id,
      user: expect.objectContaining({ nick: "ReviewAuthor" }),
      manifest: expect.objectContaining({ ua: "Hawk/Review-Test" }),
    }));

    const cancelled = await fetchWorker(
      `https://example.com/api/v1/user/submissions/${submission.submission_id}/cancel`,
      {
        method: "POST",
        headers: { cookie: accountCookie },
      },
    );
    expect(cancelled.status).toBe(200);
    expect(await cancelled.json()).toMatchObject({ status: "cancelled" });

    const resubmitted = await submitUserManifest({
      ...userManifest,
      name: "Edited After Cancel",
    }, accountCookie);
    expect(resubmitted.status).toBe(202);
    const resubmission = await resubmitted.json<{ submission_id: string }>();

    const accepted = await fetchWorker(
      `https://example.com/api/v1/admin/reviews/${resubmission.submission_id}/accept`,
      {
        method: "POST",
        headers: { authorization: "Bearer test-admin-token" },
      },
    );
    expect(accepted.status).toBe(200);
    const afterReview = await getCatalog("9.0.0");
    expect(afterReview.items).toContainEqual(expect.objectContaining({
      id: submission.plugin_id,
      latest_version: "1.0.0",
    }));

    const update = await submitUserManifest(
      { ...userManifest, version: "1.1.0", name: "Review Update" },
      accountCookie,
    );
    expect(update.status).toBe(202);
    const updateSubmission = await update.json<{ submission_id: string }>();
    const rejected = await fetchWorker(
      `https://example.com/api/v1/admin/reviews/${updateSubmission.submission_id}/reject`,
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-admin-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ reason: "Please improve the description." }),
      },
    );
    expect(rejected.status).toBe(200);
    const catalogAfterRejection = await getCatalog("9.0.0");
    expect(catalogAfterRejection.items).toContainEqual(expect.objectContaining({
      id: submission.plugin_id,
      latest_version: "1.0.0",
    }));

    const history = await fetchWorker("https://example.com/api/v1/user/submissions", {
      headers: { cookie: accountCookie },
    });
    const historyBody = await history.json<{
      items: Array<{
        id: string;
        status: string;
        rejection_reason: string | null;
        approved_version: string | null;
        published_version: string | null;
        history: Array<{
          id: string;
          status: string;
          rejection_reason: string | null;
        }>;
      }>;
    }>();
    expect(historyBody.items).toHaveLength(1);
    expect(historyBody.items).toContainEqual(expect.objectContaining({
      id: updateSubmission.submission_id,
      status: "rejected",
      rejection_reason: "Please improve the description.",
      approved_version: "1.0.0",
      published_version: "1.0.0",
    }));
    expect(historyBody.items[0]?.history).toContainEqual(expect.objectContaining({
      id: submission.submission_id,
      status: "cancelled",
    }));

    const userUnpublish = await fetchWorker(
      `https://example.com/api/v1/user/plugins/${submission.plugin_id}/unpublish`,
      {
        method: "POST",
        headers: { cookie: accountCookie },
      },
    );
    expect(userUnpublish.status).toBe(200);
    expect((await getCatalog("9.0.0").then((page) =>
      page.items.some((item) => item.id === submission.plugin_id)
    ))).toBe(false);
    const afterUserUnpublish = await fetchWorker(
      "https://example.com/api/v1/user/submissions",
      { headers: { cookie: accountCookie } },
    ).then((response) => response.json<{
      items: Array<{ approved_version: string | null; published_version: string | null }>;
    }>());
    expect(afterUserUnpublish.items[0]).toMatchObject({
      approved_version: "1.0.0",
      published_version: null,
    });

    const secondRegistration = await authRequest("/api/v1/auth/register", {
      email: "ownership-check@example.com",
      nick: "OwnershipCheck",
      password: "another-secure-password",
      password_confirmation: "another-secure-password",
    });
    const secondCookie = sessionCookie(secondRegistration);
    expect((await submitUserManifest({
      ...userManifest,
      author: "OwnershipCheck",
      version: "2.0.0",
    }, secondCookie)).status).toBe(409);
    expect((await submitNewUserManifest({
      ...userManifest,
      author: "SomeoneElse",
    }, accountCookie)).status).toBe(400);

    expect((await fetchWorker(
      `https://example.com/api/v1/user/plugins/${submission.plugin_id}`,
      {
        method: "DELETE",
        headers: { cookie: secondCookie },
      },
    )).status).toBe(404);
    expect((await fetchWorker(
      `https://example.com/api/v1/user/plugins/${submission.plugin_id}`,
      {
        method: "DELETE",
        headers: { cookie: accountCookie },
      },
    )).status).toBe(204);
    const afterDelete = await fetchWorker(
      "https://example.com/api/v1/user/submissions",
      { headers: { cookie: accountCookie } },
    ).then((response) => response.json<{ items: unknown[] }>());
    expect(afterDelete.items).toEqual([]);

    const logout = await fetchWorker("https://example.com/api/v1/auth/logout", {
      method: "POST",
      headers: { cookie: accountCookie },
    });
    expect(logout.status).toBe(204);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await fetchWorker("https://example.com/api/v1/user/me", {
      headers: { cookie: accountCookie },
    })).status).toBe(401);
  });

  it("serves the protected management application shell", async () => {
    const response = await fetchWorker("https://example.com/admin");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    const html = await response.text();
    expect(html).toContain("Plugin Store 管理");
    expect(html).not.toContain('id="new-plugin"');
    expect(html).toContain("确认下架");
    expect(html).toContain("下架原因");
    expect(html).toContain("待审核投稿");
    expect(html).toContain("已合并插件");
    expect(html).toContain("用户统计");
    expect(html).toContain("贡献用户 Top 5");
    expect(html).toContain("白名单管理");
    expect(html).toContain("查看插件");
    expect(html).toContain("查看内容");
    expect(html).toContain('id="review-manifest"');
    expect(html).toContain("接受并发布");
    expect(html).toContain("拒绝原因");
    expect(html).toContain("插件类型");
    expect(html).toContain('id="plugin-type-form"');
    expect(html).toContain('id="plugin-pending-tab"');
    expect(html).toContain('id="plugin-published-tab"');
    expect(html).toContain('id="admin-sidebar"');
    expect(html).toContain('data-panel="settings"');
    expect(html).toContain('id="review-copy"');
    expect(html).toContain('id="users-previous"');
    expect(html).toContain('id="users-next"');
    expect(html).toContain('data-panel="resources"');
    expect(html).toContain('id="resource-pending-tab"');
    expect(html).toContain('id="resource-list-tab"');
    expect(html).toContain('id="resources-pagination"');
    expect(html).toContain('id="toast"');
    expect(html).toContain('id="email-enabled"');
    expect(html).toContain('sessionStorage.getItem("hawk_admin_token")');

    const submitPage = await fetchWorker("https://example.com/submit");
    expect(submitPage.status).toBe(200);
    const submitHTML = await submitPage.text();
    expect(submitHTML).toContain("Hawk 插件投稿");
    expect(submitHTML).toContain("没有账号？");
    expect(submitHTML).toContain('id="register-form" hidden');
    expect(submitHTML).not.toContain('href="/admin"');
    expect(submitHTML).toContain("由系统自动生成，无法修改");
    expect(submitHTML).toContain("提交成功，插件正在等待管理员审核");
    expect(submitHTML).toContain("插件菜单");
    expect(submitHTML).toContain("删除插件");
    expect(submitHTML).toContain("保存草稿");
    expect(submitHTML).toContain("批量导入 JSON");
    expect(submitHTML).toContain('id="import-json-file"');
    expect(submitHTML).toContain("全部提交审核");
    expect(submitHTML).not.toContain("scrollIntoView");
    expect(submitHTML).toContain('id="editor-dialog"');
    expect(submitHTML).toContain("plugin-name");
    expect(submitHTML).toContain("plugin-id");
    expect(submitHTML).toContain("market-dot");
    expect(submitHTML).toContain("private-lock");
    expect(submitHTML).toContain('id="plugin-private"');
    expect(submitHTML).toContain("查看配置");
    expect(submitHTML).toContain("复制配置");
    expect(submitHTML).toContain("function highlightJSON");
    expect(submitHTML).toContain("已关联");
    expect(submitHTML).not.toContain("function nextPatchVersion");
    expect(submitHTML).toContain("用作模板");
    expect(submitHTML).toContain("function useAsTemplate");
    expect(submitHTML).toContain('<select id="plugin-type"');
    expect(submitHTML).toContain('id="plugin-action-menu"');
    expect(submitHTML).not.toContain('id="plugin-menu-dialog"');
    expect(submitHTML).toContain('id="toast"');
    expect(submitHTML).toContain('id="new-push"');
    expect(submitHTML).toContain('id="push-dialog"');
    expect(submitHTML).not.toContain('id="all-pushes"');
    expect(submitHTML).not.toContain('id="push-history-dialog"');
    expect(submitHTML).not.toContain("<th>通过版本</th>");

    const registerPage = await fetchWorker("https://example.com/register");
    expect(registerPage.status).toBe(200);
    const registerHTML = await registerPage.text();
    expect(registerHTML).toContain("注册并登录");
    expect(registerHTML).toContain("确认密码");
    expect(registerHTML).toContain("已有账号？");
    expect(registerHTML).not.toContain("Token 仅保存在当前页面内存");
    expect(registerHTML).toContain('id="login-form" hidden');
    expect((await fetchWorker("https://example.com/login")).status).toBe(200);
    const root = await fetchWorker("https://example.com/");
    expect(root.status).toBe(200);
    const rootHTML = await root.text();
    expect(rootHTML).toContain("用户登录");
    expect(rootHTML).toContain('id="register-form" hidden');

    expect((
      await fetchWorker("https://example.com/v1/plugins?platform=ios&app_version=1.0.0")
    ).status).toBe(404);
  });
});

interface CatalogResponse {
  items: Array<{
    id: string;
    latest_version: string;
    install_count: number;
    manifest_sha256: string;
    updated_at: string;
  }>;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface UpdateCheckBody {
  platform: "ios" | "tvos";
  app_version: string;
  plugins: Array<{ id: string; version: string }>;
}

function checkUpdates(body: UpdateCheckBody): Promise<{
  items: Array<Record<string, unknown>>;
  update_count: number;
}> {
  return fetchWorker("https://example.com/api/v1/plugins/check-updates", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (response) => {
    expect(response.status).toBe(200);
    return response.json();
  });
}

async function getCatalog(
  appVersion: string,
  pageSize?: number,
  page = 1,
  sort?: "time" | "downloads",
  order?: "asc" | "desc",
): Promise<CatalogResponse> {
  const url = new URL("https://example.com/api/v1/plugins");
  url.searchParams.set("platform", "ios");
  url.searchParams.set("app_version", appVersion);
  if (pageSize !== undefined) {
    url.searchParams.set("page_size", String(pageSize));
  }
  url.searchParams.set("page", String(page));
  if (sort) url.searchParams.set("sort", sort);
  if (order) url.searchParams.set("order", order);
  const response = await fetchWorker(url);
  expect(response.status).toBe(200);
  return response.json<CatalogResponse>();
}

async function getFilteredCatalog(
  filters: { type?: string; q?: string },
): Promise<CatalogResponse> {
  const url = new URL("https://example.com/api/v1/plugins");
  url.searchParams.set("platform", "ios");
  url.searchParams.set("app_version", "9.0.0");
  if (filters.type) url.searchParams.set("type", filters.type);
  if (filters.q) url.searchParams.set("q", filters.q);
  const response = await fetchWorker(url);
  expect(response.status).toBe(200);
  return response.json<CatalogResponse>();
}

function installEvent(pluginID: string) {
  return {
    event_id: "019c0000-0000-7000-8000-000000000001",
    plugin_id: pluginID,
    installation_id: "019c0000-0000-7000-8000-000000000002",
    action: "install",
    from_version: null,
    to_version: "1.0.0",
    app_version: "1.4.0",
    platform: "ios",
    occurred_at: "2026-07-24T08:10:00Z",
  };
}

function postEvent(event: ReturnType<typeof installEvent>): Promise<Response> {
  return fetchWorker(
    `https://example.com/api/v1/plugins/${encodeURIComponent(event.plugin_id)}/install-events`,
    {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
    },
  );
}

async function createReviewedPlugin(
  value: Record<string, unknown>,
  options: {
    platforms?: string[];
    minimum_ios_version?: string;
    minimum_tvos_version?: string;
  } = {},
): Promise<{ pluginID: string; cookie: string }> {
  const author = String(value.author);
  const registration = await authRequest("/api/v1/auth/register", {
    email: `${author.toLowerCase()}@example.com`,
    nick: author,
    password: "reviewed-plugin-password",
    password_confirmation: "reviewed-plugin-password",
  });
  expect(registration.status).toBe(201);
  const cookie = sessionCookie(registration);
  const submitted = await fetchWorker("https://example.com/api/v1/user/plugins", {
    method: "POST",
    headers: {
      cookie,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      manifest: value,
      ...options,
    }),
  });
  expect(submitted.status).toBe(202);
  const result = await submitted.json<{ submission_id: string; plugin_id: string }>();
  expect((await acceptReview(result.submission_id)).status).toBe(200);
  return { pluginID: result.plugin_id, cookie };
}

function acceptReview(submissionID: string): Promise<Response> {
  return fetchWorker(
    `https://example.com/api/v1/admin/reviews/${encodeURIComponent(submissionID)}/accept`,
    {
      method: "POST",
      headers: { authorization: "Bearer test-admin-token" },
    },
  );
}

function authRequest(path: string, body: Record<string, unknown>): Promise<Response> {
  return fetchWorker(`https://example.com${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function submitUserManifest(
  value: Record<string, unknown>,
  cookie: string,
): Promise<Response> {
  return fetchWorker(
    `https://example.com/api/v1/user/plugins/${encodeURIComponent(String(value.id))}`,
    {
      method: "PUT",
      headers: {
        cookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({ manifest: value }),
    },
  );
}

function submitNewUserManifest(
  value: Record<string, unknown>,
  cookie: string,
): Promise<Response> {
  return fetchWorker("https://example.com/api/v1/user/plugins", {
    method: "POST",
    headers: {
      cookie,
      "content-type": "application/json",
    },
    body: JSON.stringify({ manifest: value }),
  });
}

function sessionCookie(response: Response): string {
  const value = response.headers.get("set-cookie");
  if (!value) {
    throw new Error("Expected a session cookie.");
  }
  return value.split(";", 1)[0] ?? "";
}

function fetchWorker(input: string | URL, init?: RequestInit): Promise<Response> {
  return exports.default.fetch(new Request(input, init));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
