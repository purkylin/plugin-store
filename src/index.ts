import { adminPage } from "./admin";
import {
  clearSessionCookie,
  createSessionCookie,
  loginUser,
  logoutUser,
  registerUser,
  requireUser,
} from "./auth";
import { error, handleError, HTTPError, json, readJSON, stringifyJSON } from "./http";
import {
  acceptPluginSubmission,
  cancelSubmission,
  checkPluginUpdates,
  claimPluginID,
  createPluginSubmission,
  deletePluginDraft,
  deletePluginType,
  deleteOwnedPlugin,
  decodeCursor,
  getAdminUserStats,
  getLatestPluginRelease,
  getManifest,
  getPluginDraftVisibility,
  getPendingSubmission,
  getPluginNotificationRecipient,
  importPluginDrafts,
  listAdminPlugins,
  listAdminUsers,
  listPendingSubmissions,
  listPluginTypes,
  listPlugins,
  listUserSubmissions,
  pluginExists,
  recordInstallEvent,
  rejectSubmission,
  requirePluginOwnership,
  requirePluginTypeExists,
  savePluginDraft,
  setUserWhitelist,
  submitAllPluginDrafts,
  unpublishOwnedPlugin,
  unpublishPlugin,
  upsertPluginType,
} from "./repository";
import {
  acceptResourcePush,
  createCMSPush,
  createPythonPush,
  deleteResource,
  listPendingResourcePushes,
  listResources,
  listUserResourcePushes,
  publicPush,
  rejectResourcePush,
  setResourceEnabled,
  type ResourcePushRow,
  type ResourceType,
} from "./resources";
import {
  generateTVBoxConfig,
  getEmailSetting,
  getTVBoxSettings,
  readTVBoxObject,
  retryPluginSync,
  saveTVBoxSettings,
  saveEmailSetting,
} from "./tvbox";
import { scheduleAdminEmail, scheduleEmail } from "./email";
import { userSubmissionPage } from "./submit";
import type { Env } from "./types";
import {
  parseInstallEvent,
  parseCatalogSort,
  parseInspectRequest,
  parseLimit,
  parseOptionalQuery,
  parsePage,
  parsePageSize,
  parsePlatform,
  parsePluginID,
  parsePluginTypeRequest,
  parsePluginTypeValue,
  parsePublishRequest,
  parseSortOrder,
  parseUpdateCheckRequest,
  parseVersion,
} from "./validation";
import { inspectPluginScript } from "./inspect";
import { compareVersions } from "./version";

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    try {
      return await route(request, env, context);
    } catch (cause) {
      return handleError(cause);
    }
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const apiPath: string | null = url.pathname === "/api/v1"
    ? "/v1"
    : url.pathname.startsWith("/api/v1/")
      ? url.pathname.slice("/api".length)
      : null;
  const segments = (apiPath ?? "").split("/").filter(Boolean);

  if (request.method === "GET" && url.pathname === "/api/health") {
    return json({ status: "ok" });
  }
  if (
    request.method === "GET"
    && (url.pathname === "/tvbox/config/tvbox.json" || /^\/tvbox\/py\/[A-Za-z0-9._-]+\.py$/.test(url.pathname))
  ) {
    return readTVBoxObject(env, url.pathname.slice(1), request, context);
  }
  if (request.method === "GET" && url.pathname === "/") {
    return userSubmissionPage("login");
  }
  if (
    request.method === "GET"
    && (url.pathname === "/admin" || url.pathname === "/admin/")
  ) {
    return adminPage();
  }
  if (
    request.method === "GET"
    && (
      url.pathname === "/submit"
      || url.pathname === "/submit/"
      || url.pathname === "/register"
      || url.pathname === "/register/"
      || url.pathname === "/login"
      || url.pathname === "/login/"
    )
  ) {
    return userSubmissionPage(
      url.pathname === "/register" || url.pathname === "/register/"
        ? "register"
        : "login",
    );
  }
  if (request.method === "POST" && apiPath === "/v1/auth/register") {
    const session = await registerUser(env.DB, await readJSON(request));
    return json(
      { user: session.user, expires_at: session.expires_at },
      201,
      { "set-cookie": createSessionCookie(session.token, request) },
    );
  }
  if (request.method === "POST" && apiPath === "/v1/auth/login") {
    const session = await loginUser(env.DB, await readJSON(request));
    return json(
      { user: session.user, expires_at: session.expires_at },
      200,
      { "set-cookie": createSessionCookie(session.token, request) },
    );
  }
  if (request.method === "POST" && apiPath === "/v1/auth/logout") {
    await logoutUser(request, env.DB);
    return new Response(null, {
      status: 204,
      headers: { "set-cookie": clearSessionCookie(request) },
    });
  }
  if (request.method === "GET" && apiPath === "/v1/user/me") {
    return json({ user: await requireUser(request, env.DB) });
  }
  if (request.method === "GET" && apiPath === "/v1/user/submissions") {
    const user = await requireUser(request, env.DB);
    return json(await listUserSubmissions(env.DB, user.id));
  }
  if (request.method === "GET" && apiPath === "/v1/user/pushes") {
    const user = await requireUser(request, env.DB);
    return json(await listUserResourcePushes(
      env.DB,
      user.id,
      parsePage(url.searchParams.get("page")),
      parsePageSize(url.searchParams.get("page_size")),
    ));
  }
  if (request.method === "POST" && apiPath === "/v1/user/pushes/py") {
    const user = await requireUser(request, env.DB);
    const push = await createPythonPush(env, user, await request.formData());
    notifyResourceReceived(context, env, push);
    return json(publicPush(push), 202);
  }
  if (request.method === "POST" && apiPath === "/v1/user/pushes/cms") {
    const user = await requireUser(request, env.DB);
    const push = await createCMSPush(env.DB, user, await readJSON(request));
    notifyResourceReceived(context, env, push);
    return json(publicPush(push), 202);
  }
  if (request.method === "GET" && apiPath === "/v1/plugin-types") {
    return json(await listPluginTypes(env.DB), 200, { "cache-control": "no-store" });
  }
  if (request.method === "POST" && apiPath === "/v1/user/plugins") {
    return submitNewPlugin(request, env, context);
  }
  if (request.method === "POST" && apiPath === "/v1/user/plugins/draft") {
    return saveNewDraft(request, env);
  }
  if (request.method === "POST" && apiPath === "/v1/user/plugins/import") {
    return importDrafts(request, env);
  }
  if (request.method === "POST" && apiPath === "/v1/user/plugins/submit-drafts") {
    const user = await requireUser(request, env.DB);
    const items = await submitAllPluginDrafts(env.DB, user.id);
    if (!user.whitelisted) {
      if (items.length > 0) {
        scheduleEmail(context, env, {
          to: user.email,
          subject: `已提交 ${items.length} 个插件`,
          title: "插件已进入审核队列",
          lines: [`本次共提交 ${items.length} 个插件，审核完成后会再次通知你。`],
        });
        scheduleAdminEmail(context, env, `${items.length} 个插件待审核`, "收到批量插件提交", [
          `提交用户：${user.nick} (${user.email})`,
          `数量：${items.length}`,
        ]);
      }
      return json({ items, submitted_count: items.length }, 202);
    }
    const published = [];
    for (const item of items) {
      const release = await publishPendingSubmission(env, item.submission_id);
      published.push({ ...item, ...release, status: "accepted" });
    }
    if (published.length > 0) {
      scheduleEmail(context, env, {
        to: user.email,
        subject: `已发布 ${published.length} 个插件`,
        title: "批量发布已完成",
        lines: [`本次共发布 ${published.length} 个插件。`],
      });
    }
    return json({
      items: published,
      submitted_count: items.length,
      published_count: published.length,
    }, 201);
  }
  if (request.method === "GET" && apiPath === "/v1/admin/users/stats") {
    requireAdmin(request, env);
    return json(await getAdminUserStats(env.DB));
  }
  if (
    (request.method === "GET" || request.method === "POST")
    && apiPath === "/v1/admin/plugin-types"
  ) {
    requireAdmin(request, env);
    if (request.method === "GET") {
      return json(await listPluginTypes(env.DB));
    }
    return json(
      await upsertPluginType(env.DB, parsePluginTypeRequest(await readJSON(request))),
      200,
    );
  }
  if (request.method === "GET" && apiPath === "/v1/admin/users") {
    requireAdmin(request, env);
    const search = parseOptionalQuery(url.searchParams.get("q"), "q");
    return json(await listAdminUsers(
      env.DB,
      search,
      parsePage(url.searchParams.get("page")),
      parsePageSize(url.searchParams.get("page_size")),
    ));
  }
  if (request.method === "GET" && apiPath === "/v1/admin/reviews") {
    requireAdmin(request, env);
    return json(await listPendingSubmissions(env.DB, parseLimit(url.searchParams.get("limit"))));
  }
  if (request.method === "GET" && apiPath === "/v1/admin/pushes") {
    requireAdmin(request, env);
    return json(await listPendingResourcePushes(
      env.DB,
      parsePage(url.searchParams.get("page")),
      parsePageSize(url.searchParams.get("page_size")),
    ));
  }
  if (request.method === "GET" && apiPath === "/v1/admin/resources") {
    requireAdmin(request, env);
    return json(await listResources(env.DB, {
      type: parseResourceTypeFilter(url.searchParams.get("type")),
      status: parseResourceStatus(url.searchParams.get("status")),
      sort: parseResourceSort(url.searchParams.get("sort")),
      page: parsePage(url.searchParams.get("page")),
      pageSize: parsePageSize(url.searchParams.get("page_size")),
    }));
  }
  if (apiPath === "/v1/admin/tvbox/settings") {
    requireAdmin(request, env);
    if (request.method === "GET") return json(await getTVBoxSettings(env.DB));
    if (request.method === "PUT") return json(await saveTVBoxSettings(env.DB, await readJSON(request)));
  }
  if (request.method === "POST" && apiPath === "/v1/admin/tvbox/generate") {
    requireAdmin(request, env);
    return json(await generateTVBoxConfig(env, request.url));
  }
  if (request.method === "POST" && apiPath === "/v1/admin/tvbox/retry-plugin-sync") {
    requireAdmin(request, env);
    return json(await retryPluginSync(env, request.url));
  }
  if (apiPath === "/v1/admin/settings/email") {
    requireAdmin(request, env);
    if (request.method === "GET") return json({ enabled: await getEmailSetting(env.DB) });
    if (request.method === "PUT") return json({ enabled: await saveEmailSetting(env.DB, parseEnabled(await readJSON(request))) });
  }
  if (request.method === "GET" && apiPath === "/v1/plugins") {
    return catalog(url, env);
  }
  if (request.method === "POST" && apiPath === "/v1/plugins/inspect") {
    const { url: inspectUrl } = parseInspectRequest(await readJSON(request));
    const result = await inspectPluginScript(inspectUrl);
    return json(result, 200, { "cache-control": "no-store" });
  }
  if (request.method === "POST" && apiPath === "/v1/plugins/check-updates") {
    const result = await checkPluginUpdates(
      env.DB,
      parseUpdateCheckRequest(await readJSON(request)),
    );
    const items = await Promise.all(result.items.map(async (item) => {
      if (!("_manifest_json" in item)) {
        return item;
      }
      const { _manifest_json: manifestJSON, ...publicItem } = item;
      return {
        ...publicItem,
        manifest_sha256: publicItem.manifest_sha256 === null
          ? null
          : await apiManifestChecksum(manifestJSON),
      };
    }));
    return json({ ...result, items }, 200, { "cache-control": "no-store" });
  }
  if (request.method === "GET" && apiPath === "/v1/admin/plugins") {
    return adminCatalog(request, url, env);
  }
  if (segments.length === 4 && segments[0] === "v1" && segments[1] === "plugins") {
    const pluginID = parsePluginID(decodeURIComponent(segments[2] ?? ""));
    if (request.method === "GET" && segments[3] === "manifest") {
      return manifest(pluginID, env);
    }
    if (request.method === "POST" && segments[3] === "install-events") {
      return installEvent(request, pluginID, env);
    }
  }
  if (
    request.method === "POST"
    && segments.length === 5
    && segments[0] === "v1"
    && segments[1] === "admin"
    && segments[2] === "pushes"
  ) {
    requireAdmin(request, env);
    const id = decodeURIComponent(segments[3] ?? "");
    if (segments[4] === "accept") {
      const push = await acceptResourcePush(env, id, await readOptionalJSON(request));
      notifyResourceReviewed(context, env, push);
      return json(publicPush(push));
    }
    if (segments[4] === "reject") {
      const push = await rejectResourcePush(env, id, await readJSON(request));
      notifyResourceReviewed(context, env, push);
      return json(publicPush(push));
    }
  }
  if (
    segments.length === 6
    && segments[0] === "v1"
    && segments[1] === "admin"
    && segments[2] === "resources"
  ) {
    requireAdmin(request, env);
    const type = parseResourceType(segments[3]);
    const id = decodeURIComponent(segments[4] ?? "");
    if (request.method === "PUT" && segments[5] === "enabled") {
      await setResourceEnabled(env.DB, type, id, parseEnabled(await readJSON(request)));
      return json({ id, resource_type: type, status: "updated" });
    }
  }
  if (
    request.method === "DELETE"
    && segments.length === 5
    && segments[0] === "v1"
    && segments[1] === "admin"
    && segments[2] === "resources"
  ) {
    requireAdmin(request, env);
    const type = parseResourceType(segments[3]);
    const id = decodeURIComponent(segments[4] ?? "");
    await deleteResource(env, type, id);
    return new Response(null, { status: 204 });
  }
  if (
    request.method === "DELETE"
    && segments.length === 4
    && segments[0] === "v1"
    && segments[1] === "admin"
    && segments[2] === "plugin-types"
  ) {
    requireAdmin(request, env);
    const value = parsePluginTypeValue(decodeURIComponent(segments[3] ?? ""));
    await deletePluginType(env.DB, value);
    return new Response(null, { status: 204 });
  }
  if (
    request.method === "PUT"
    && segments.length === 5
    && segments[0] === "v1"
    && segments[1] === "admin"
    && segments[2] === "users"
    && segments[4] === "whitelist"
  ) {
    requireAdmin(request, env);
    const userID = decodeURIComponent(segments[3] ?? "");
    const enabled = parseWhitelistRequest(await readJSON(request));
    return json(await setUserWhitelist(env.DB, userID, enabled));
  }
  if (
    request.method === "POST"
    && segments.length === 5
    && segments[0] === "v1"
    && segments[1] === "admin"
    && segments[2] === "plugins"
    && segments[4] === "unpublish"
  ) {
    const pluginID = parsePluginID(decodeURIComponent(segments[3] ?? ""));
    return unpublish(request, pluginID, env, context);
  }
  if (
    request.method === "POST"
    && segments.length === 5
    && segments[0] === "v1"
    && segments[1] === "user"
    && segments[2] === "plugins"
    && segments[4] === "unpublish"
  ) {
    const user = await requireUser(request, env.DB);
    const pluginID = parsePluginID(decodeURIComponent(segments[3] ?? ""));
    if (!await unpublishOwnedPlugin(env.DB, pluginID, user.id)) {
      return error("plugin_not_found", "Published plugin not found.", 404);
    }
    return json({ id: pluginID, status: "unpublished" });
  }
  if (
    request.method === "PUT"
    && segments.length === 5
    && segments[0] === "v1"
    && segments[1] === "user"
    && segments[2] === "plugins"
    && segments[4] === "draft"
  ) {
    return saveExistingDraft(
      request,
      parsePluginID(decodeURIComponent(segments[3] ?? "")),
      env,
    );
  }
  if (
    (request.method === "PUT" || request.method === "DELETE")
    && segments.length === 4
    && segments[0] === "v1"
    && segments[1] === "user"
    && segments[2] === "plugins"
  ) {
    const pluginID = parsePluginID(decodeURIComponent(segments[3] ?? ""));
    if (request.method === "DELETE") {
      const user = await requireUser(request, env.DB);
      await deleteOwnedPlugin(env.DB, pluginID, user.id);
      return new Response(null, { status: 204 });
    }
    return submitPlugin(
      request,
      pluginID,
      env,
      context,
    );
  }
  if (
    request.method === "POST"
    && segments.length === 5
    && segments[0] === "v1"
    && segments[1] === "user"
    && segments[2] === "submissions"
    && segments[4] === "cancel"
  ) {
    const user = await requireUser(request, env.DB);
    const submissionID = decodeURIComponent(segments[3] ?? "");
    if (!await cancelSubmission(env.DB, submissionID, user.id)) {
      return error("submission_not_found", "Pending submission not found.", 404);
    }
    return json({ id: submissionID, status: "cancelled" });
  }
  if (
    request.method === "POST"
    && segments.length === 5
    && segments[0] === "v1"
    && segments[1] === "admin"
    && segments[2] === "reviews"
  ) {
    return reviewSubmission(
      request,
      decodeURIComponent(segments[3] ?? ""),
      segments[4] ?? "",
      env,
      context,
    );
  }
  return error("not_found", "Route not found.", 404);
}

async function adminCatalog(request: Request, url: URL, env: Env): Promise<Response> {
  requireAdmin(request, env);
  const limit = parseLimit(url.searchParams.get("limit"));
  const cursor = decodeCursor(url.searchParams.get("cursor"));
  const result = await listAdminPlugins(env.DB, limit, cursor);
  const items = await Promise.all(result.items.map(async (item) => ({
    ...item,
    manifest_sha256: await sha256(stringifyJSON(item.manifest)),
  })));
  return json({ ...result, items });
}

async function catalog(url: URL, env: Env): Promise<Response> {
  const platform = parsePlatform(url.searchParams.get("platform"));
  const appVersion = parseVersion(url.searchParams.get("app_version"));
  const page = parsePage(url.searchParams.get("page"));
  const pageSize = parsePageSize(url.searchParams.get("page_size"));
  const sort = parseCatalogSort(url.searchParams.get("sort"));
  const order = parseSortOrder(url.searchParams.get("order"));
  const type = parseOptionalQuery(url.searchParams.get("type"), "type");
  const search = parseOptionalQuery(url.searchParams.get("q"), "q");
  const result = await listPlugins(env.DB, {
    platform,
    appVersion,
    page,
    pageSize,
    sort,
    order,
    type,
    search,
  });
  const items = await Promise.all(result.items.map(async (item) => {
    const { _manifest_json: manifestJSON, ...publicItem } = item;
    return {
      ...publicItem,
      manifest_sha256: await apiManifestChecksum(manifestJSON),
    };
  }));
  return json({ ...result, items }, 200, { "cache-control": "public, max-age=60" });
}

async function manifest(pluginID: string, env: Env): Promise<Response> {
  const row = await getManifest(env.DB, pluginID);
  if (row === null) {
    return error("plugin_not_found", "Plugin not found.", 404);
  }
  const manifestJSON = stringifyJSON(JSON.parse(row.manifest_json) as unknown);
  const checksum = await sha256(manifestJSON);
  return new Response(manifestJSON, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
      etag: `"sha256-${checksum}"`,
    },
  });
}

async function apiManifestChecksum(manifestJSON: string): Promise<string> {
  return sha256(stringifyJSON(JSON.parse(manifestJSON) as unknown));
}

async function installEvent(request: Request, pluginID: string, env: Env): Promise<Response> {
  const event = parseInstallEvent(await readJSON(request), pluginID);
  if (!await pluginExists(env.DB, pluginID)) {
    return error("plugin_not_found", "Plugin not found.", 404);
  }
  await recordInstallEvent(env.DB, event);
  return new Response(null, { status: 204 });
}

async function submitPlugin(
  request: Request,
  pluginID: string,
  env: Env,
  context: ExecutionContext,
): Promise<Response> {
  const user = await requireUser(request, env.DB);
  const submittedAt = new Date().toISOString();
  const parsed = parsePublishRequest(await readJSON(request), pluginID, submittedAt);
  await requirePluginOwnership(env.DB, pluginID, user.id);
  await requireUnchangedVisibility(
    env.DB,
    pluginID,
    user.id,
    parsed.request.visibility,
  );
  rejectPrivateSubmission(parsed.request.visibility);
  const latest = await getLatestPluginRelease(env.DB, pluginID);
  if (
    latest === null
    || parsed.request.manifest.type
      === (JSON.parse(latest.manifest_json) as Record<string, unknown>).type
  ) {
    await requirePluginTypeExists(env.DB, parsed.request.manifest.type);
  }
  return finishPluginSubmission(env, user, parsed, pluginID, context);
}

async function submitNewPlugin(
  request: Request,
  env: Env,
  context: ExecutionContext,
): Promise<Response> {
  const user = await requireUser(request, env.DB);
  const value = await readJSON(request);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HTTPError(400, "invalid_body", "Request body must be a JSON object.");
  }
  const body = value as Record<string, unknown>;
  if (
    typeof body.manifest !== "object"
    || body.manifest === null
    || Array.isArray(body.manifest)
  ) {
    throw new HTTPError(400, "invalid_body", "manifest must be a JSON object.");
  }
  const pluginID = crypto.randomUUID();
  const parsed = parsePublishRequest(
    {
      ...body,
      manifest: {
        ...(body.manifest as Record<string, unknown>),
        id: pluginID,
      },
    },
    pluginID,
    new Date().toISOString(),
  );
  rejectPrivateSubmission(parsed.request.visibility);
  if (parsed.metadata.author !== user.nick) {
    throw new HTTPError(
      400,
      "author_mismatch",
      "manifest.author must match the registered user nick.",
    );
  }
  await requirePluginTypeExists(env.DB, parsed.request.manifest.type);
  await claimPluginID(env.DB, pluginID, user.id);
  return finishPluginSubmission(env, user, parsed, pluginID, context);
}

async function saveNewDraft(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env.DB);
  const pluginID = crypto.randomUUID();
  const parsed = parsePublishRequest(
    withManifestID(await readJSON(request), pluginID),
    pluginID,
    new Date().toISOString(),
  );
  validateSubmissionAuthor(parsed, user.nick);
  await requirePluginTypeExists(env.DB, parsed.request.manifest.type);
  await claimPluginID(env.DB, pluginID, user.id);
  const savedAt = await savePluginDraft(
    env.DB,
    user.id,
    parsed.request,
    parsed.metadata,
    JSON.stringify(parsed.request.manifest),
  );
  const visibility = parsed.request.visibility ?? "public";
  return json({
    plugin_id: pluginID,
    status: visibility === "private" ? "private" : "draft",
    visibility,
    saved_at: savedAt,
  }, 201);
}

async function importDrafts(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env.DB);
  const value = await readJSON(request);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HTTPError(400, "invalid_body", "Request body must be a JSON object.");
  }
  const plugins = (value as Record<string, unknown>).plugins;
  if (!Array.isArray(plugins) || plugins.length === 0 || plugins.length > 100) {
    throw new HTTPError(
      400,
      "invalid_plugins",
      "plugins must be an array containing 1 through 100 items.",
    );
  }

  const importedAt = new Date().toISOString();
  const drafts = plugins.map((value, index) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new HTTPError(
        400,
        "invalid_plugin",
        `plugins[${index}] must be a JSON object.`,
      );
    }
    const item = value as Record<string, unknown>;
    const wrappedManifest = item.manifest;
    const manifest = wrappedManifest === undefined ? item : wrappedManifest;
    if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) {
      throw new HTTPError(
        400,
        "invalid_plugin",
        `plugins[${index}].manifest must be a JSON object.`,
      );
    }

    const sanitized = { ...(manifest as Record<string, unknown>) };
    delete sanitized.id;
    delete sanitized.author;
    delete sanitized.update_time;
    const pluginID = crypto.randomUUID();
    try {
      const parsed = parsePublishRequest(
        {
          ...(wrappedManifest === undefined ? {} : item),
          manifest: {
            ...sanitized,
            id: pluginID,
            author: user.nick,
          },
        },
        pluginID,
        importedAt,
      );
      return {
        request: parsed.request,
        metadata: parsed.metadata,
        manifestJSON: JSON.stringify(parsed.request.manifest),
      };
    } catch (cause) {
      if (cause instanceof HTTPError) {
        throw new HTTPError(
          cause.status,
          cause.code,
          `plugins[${index}]: ${cause.message}`,
        );
      }
      throw cause;
    }
  });

  for (const type of new Set(drafts.map((draft) => draft.request.manifest.type))) {
    await requirePluginTypeExists(env.DB, type);
  }
  const items = await importPluginDrafts(env.DB, user.id, drafts);
  return json({ items, imported_count: items.length }, 201);
}

async function saveExistingDraft(
  request: Request,
  pluginID: string,
  env: Env,
): Promise<Response> {
  const user = await requireUser(request, env.DB);
  const parsed = parsePublishRequest(
    await readJSON(request),
    pluginID,
    new Date().toISOString(),
  );
  validateSubmissionAuthor(parsed, user.nick);
  await requirePluginOwnership(env.DB, pluginID, user.id);
  await requireUnchangedVisibility(
    env.DB,
    pluginID,
    user.id,
    parsed.request.visibility,
  );
  const latest = await getLatestPluginRelease(env.DB, pluginID);
  if (latest !== null) {
    const manifest = JSON.parse(latest.manifest_json) as Record<string, unknown>;
    if (
      parsed.request.manifest.type !== manifest.type
      || parsed.metadata.author !== manifest.author
    ) {
      throw new HTTPError(
        409,
        "immutable_field",
        "Plugin type and author cannot be changed.",
      );
    }
  }
  await requirePluginTypeExists(env.DB, parsed.request.manifest.type);
  const savedAt = await savePluginDraft(
    env.DB,
    user.id,
    parsed.request,
    parsed.metadata,
    JSON.stringify(parsed.request.manifest),
  );
  const visibility = parsed.request.visibility ?? "public";
  return json({
    plugin_id: pluginID,
    status: visibility === "private" ? "private" : "draft",
    visibility,
    saved_at: savedAt,
  });
}

async function finishPluginSubmission(
  env: Env,
  user: { id: string; email: string; nick: string; whitelisted: boolean },
  parsed: ReturnType<typeof parsePublishRequest>,
  pluginID: string,
  context: ExecutionContext,
): Promise<Response> {
  rejectPrivateSubmission(parsed.request.visibility);
  if (parsed.metadata.author !== user.nick) {
    throw new HTTPError(
      400,
      "author_mismatch",
      "manifest.author must match the registered user nick.",
    );
  }
  const submissionID = await createPluginSubmission(
    env.DB,
    user.id,
    parsed.request,
    parsed.metadata,
    JSON.stringify(parsed.request.manifest),
  );
  await deletePluginDraft(env.DB, pluginID, user.id);
  if (user.whitelisted) {
    const manifestJSON = JSON.stringify(parsed.request.manifest);
    await acceptPluginSubmission(
      env.DB,
      submissionID,
      parsed.request,
      parsed.metadata,
      manifestJSON,
      await sha256(manifestJSON),
    );
    scheduleEmail(context, env, {
      to: user.email,
      subject: `插件已发布：${parsed.metadata.name}`,
      title: "你的插件已自动发布",
      lines: [`插件：${parsed.metadata.name}`, `版本：${parsed.metadata.version}`],
    });
    return json({
      submission_id: submissionID,
      plugin_id: pluginID,
      version: parsed.metadata.version,
      status: "accepted",
    }, 201);
  }
  scheduleEmail(context, env, {
    to: user.email,
    subject: `插件已提交：${parsed.metadata.name}`,
    title: "我们已收到你的插件提交",
    lines: [`插件：${parsed.metadata.name}`, `版本：${parsed.metadata.version}`, "审核后会再次通知你。"],
  });
  scheduleAdminEmail(context, env, `插件待审核：${parsed.metadata.name}`, "收到新的插件提交", [
    `提交用户：${user.nick} (${user.email})`,
    `插件：${parsed.metadata.name}`,
    `版本：${parsed.metadata.version}`,
  ]);
  return json({ submission_id: submissionID, plugin_id: pluginID, status: "pending" }, 202);
}

function rejectPrivateSubmission(visibility: "public" | "private" | undefined): void {
  if (visibility === "private") {
    throw new HTTPError(
      409,
      "private_plugin_cannot_be_submitted",
      "Private plugins can be saved and exported, but cannot be submitted for review.",
    );
  }
}

async function requireUnchangedVisibility(
  db: D1Database,
  pluginID: string,
  userID: string,
  requestedVisibility: "public" | "private" | undefined,
): Promise<void> {
  const savedVisibility = await getPluginDraftVisibility(db, pluginID, userID);
  const requested = requestedVisibility ?? "public";
  if (savedVisibility !== null && savedVisibility !== requested) {
    throw new HTTPError(
      409,
      "visibility_immutable",
      "Plugin visibility is fixed when the plugin is created and cannot be changed.",
    );
  }
}

function withManifestID(value: unknown, pluginID: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HTTPError(400, "invalid_body", "Request body must be a JSON object.");
  }
  const body = value as Record<string, unknown>;
  if (
    typeof body.manifest !== "object"
    || body.manifest === null
    || Array.isArray(body.manifest)
  ) {
    throw new HTTPError(400, "invalid_body", "manifest must be a JSON object.");
  }
  return {
    ...body,
    manifest: {
      ...(body.manifest as Record<string, unknown>),
      id: pluginID,
    },
  };
}

function validateSubmissionAuthor(
  parsed: ReturnType<typeof parsePublishRequest>,
  nick: string,
): void {
  if (parsed.metadata.author !== nick) {
    throw new HTTPError(
      400,
      "author_mismatch",
      "manifest.author must match the registered user nick.",
    );
  }
}

async function reviewSubmission(
  request: Request,
  submissionID: string,
  action: string,
  env: Env,
  context: ExecutionContext,
): Promise<Response> {
  requireAdmin(request, env);
  const pending = await getPendingSubmission(env.DB, submissionID);
  if (pending === null) {
    return error("submission_not_found", "Pending submission not found.", 404);
  }
  const pendingManifest = JSON.parse(pending.manifest_json) as Record<string, unknown>;
  const pluginName = typeof pendingManifest.name === "string" ? pendingManifest.name : pending.plugin_id;
  if (action === "reject") {
    const reason = parseReviewReason(await readJSON(request));
    if (!await rejectSubmission(env.DB, submissionID, reason)) {
      return error("submission_not_found", "Pending submission not found.", 404);
    }
    scheduleEmail(context, env, {
      to: pending.email,
      subject: `插件未通过：${pluginName}`,
      title: "你的插件提交未被接受",
      lines: [`插件：${pluginName}`, `原因：${reason}`],
    });
    return json({ id: submissionID, status: "rejected", reason });
  }
  if (action !== "accept") {
    return error("not_found", "Review action not found.", 404);
  }
  const published = await publishPendingSubmission(env, submissionID);
  scheduleEmail(context, env, {
    to: pending.email,
    subject: `插件已通过：${pluginName}`,
    title: "你的插件已发布",
    lines: [`插件：${pluginName}`, `版本：${published.version}`],
  });
  return json({
    id: submissionID,
    status: "accepted",
    ...published,
  });
}

async function publishPendingSubmission(
  env: Env,
  submissionID: string,
): Promise<{ plugin_id: string; version: string }> {
  const submission = await getPendingSubmission(env.DB, submissionID);
  if (submission === null) {
    throw new HTTPError(404, "submission_not_found", "Pending submission not found.");
  }
  const parsed = parsePublishRequest({
    manifest: JSON.parse(submission.manifest_json),
    platforms: [
      ...(submission.supports_ios === 1 ? ["ios"] : []),
      ...(submission.supports_tvos === 1 ? ["tvos"] : []),
    ],
    minimum_ios_version: submission.minimum_ios_version,
    minimum_tvos_version: submission.minimum_tvos_version,
  }, submission.plugin_id, new Date().toISOString());
  await validatePublishedUpdate(
    env.DB,
    submission.plugin_id,
    parsed.request.manifest,
    parsed.metadata,
  );
  const manifestJSON = JSON.stringify(parsed.request.manifest);
  const checksum = await sha256(manifestJSON);
  await acceptPluginSubmission(
    env.DB,
    submissionID,
    parsed.request,
    parsed.metadata,
    manifestJSON,
    checksum,
  );
  return {
    plugin_id: submission.plugin_id,
    version: parsed.metadata.version,
  };
}

async function unpublish(
  request: Request,
  pluginID: string,
  env: Env,
  context: ExecutionContext,
): Promise<Response> {
  requireAdmin(request, env);
  const reason = parseReviewReason(await readJSON(request));
  const recipient = await getPluginNotificationRecipient(env.DB, pluginID);
  if (!await unpublishPlugin(env.DB, pluginID, reason)) {
    return error("plugin_not_found", "Published plugin not found.", 404);
  }
  if (recipient) {
    scheduleEmail(context, env, {
      to: recipient.email,
      subject: `插件已下架：${recipient.name}`,
      title: "你的插件已被管理员下架",
      lines: [`插件：${recipient.name}`, `版本：${recipient.version}`, `原因：${reason}`],
    });
  }
  return json({ id: pluginID, status: "unpublished", reason });
}

async function validatePublishedUpdate(
  db: D1Database,
  pluginID: string,
  manifest: Record<string, unknown>,
  metadata: { author: string; version: string },
): Promise<void> {
  const existing = await getLatestPluginRelease(db, pluginID);
  if (existing === null) {
    return;
  }
  const currentManifest = JSON.parse(existing.manifest_json) as Record<string, unknown>;
  if (manifest.type !== currentManifest.type) {
    throw new HTTPError(409, "immutable_field", "manifest.type cannot be changed.");
  }
  if (metadata.author !== currentManifest.author) {
    throw new HTTPError(409, "immutable_field", "manifest.author cannot be changed.");
  }
  if (compareVersions(metadata.version, existing.latest_version) <= 0) {
    throw new HTTPError(
      409,
      "version_not_incremented",
      `manifest.version must be greater than ${existing.latest_version}.`,
    );
  }
}

function parseReviewReason(value: unknown): string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HTTPError(400, "invalid_body", "Request body must be a JSON object.");
  }
  const reason = (value as Record<string, unknown>).reason;
  if (typeof reason !== "string" || reason.trim().length < 2 || reason.trim().length > 500) {
    throw new HTTPError(400, "invalid_reason", "reason must be 2-500 characters.");
  }
  return reason.trim();
}

function parseWhitelistRequest(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HTTPError(400, "invalid_body", "Request body must be a JSON object.");
  }
  const enabled = (value as Record<string, unknown>).enabled;
  if (typeof enabled !== "boolean") {
    throw new HTTPError(400, "invalid_field", "enabled must be a boolean.");
  }
  return enabled;
}

function requireAdmin(request: Request, env: Env): void {
  if (!env.ADMIN_TOKEN) {
    throw new HTTPError(503, "admin_not_configured", "ADMIN_TOKEN is not configured.");
  }
  if (request.headers.get("authorization") !== `Bearer ${env.ADMIN_TOKEN}`) {
    throw new HTTPError(401, "unauthorized", "A valid admin bearer token is required.");
  }
}

async function readOptionalJSON(request: Request): Promise<unknown> {
  if (request.headers.get("content-length") === "0" || !request.headers.get("content-type")) {
    return {};
  }
  return readJSON(request);
}

function parseResourceType(value: string | undefined): ResourceType {
  if (value === "py" || value === "cms") return value;
  throw new HTTPError(400, "invalid_resource_type", "resource type must be py or cms.");
}

function parseResourceTypeFilter(value: string | null): "all" | ResourceType {
  if (value === null || value === "" || value === "all") return "all";
  return parseResourceType(value);
}

function parseResourceStatus(value: string | null): "all" | "enabled" | "disabled" {
  if (value === null || value === "" || value === "all") return "all";
  if (value === "enabled" || value === "disabled") return value;
  throw new HTTPError(400, "invalid_status", "status must be all, enabled, or disabled.");
}

function parseResourceSort(
  value: string | null,
): "updated_desc" | "updated_asc" | "name_asc" | "name_desc" {
  if (value === null || value === "") return "updated_desc";
  if (["updated_desc", "updated_asc", "name_asc", "name_desc"].includes(value)) {
    return value as "updated_desc" | "updated_asc" | "name_asc" | "name_desc";
  }
  throw new HTTPError(400, "invalid_sort", "Unsupported resource sort order.");
}

function parseEnabled(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HTTPError(400, "invalid_body", "Request body must be a JSON object.");
  }
  const enabled = (value as Record<string, unknown>).enabled;
  if (typeof enabled !== "boolean") {
    throw new HTTPError(400, "invalid_field", "enabled must be a boolean.");
  }
  return enabled;
}

function resourceLabel(push: ResourcePushRow): string {
  return push.resource_type === "py" ? push.file_name ?? "Python 脚本" : push.cms_name ?? "CMS";
}

function notifyResourceReceived(
  context: ExecutionContext,
  env: Env,
  push: ResourcePushRow,
): void {
  const label = resourceLabel(push);
  scheduleEmail(context, env, {
    to: push.email,
    subject: `Push 已收到：${label}`,
    title: "我们已收到你的 Push",
    lines: [`资源：${label}`, "管理员处理后，你会再次收到邮件，也可以在提交记录中查看状态。"],
  });
  scheduleAdminEmail(context, env, `待处理 Push：${label}`, "有新的资源 Push", [
    `提交用户：${push.nick} (${push.email})`,
    `资源类型：${push.resource_type.toUpperCase()}`,
    `资源：${label}`,
  ]);
}

function notifyResourceReviewed(
  context: ExecutionContext,
  env: Env,
  push: ResourcePushRow,
): void {
  const accepted = push.status === "accepted";
  const label = resourceLabel(push);
  scheduleEmail(context, env, {
    to: push.email,
    subject: `Push ${accepted ? "已接受" : "已拒绝"}：${label}`,
    title: accepted ? "你的 Push 已被接受" : "你的 Push 未被接受",
    lines: [
      `资源：${label}`,
      ...(push.rejection_reason ? [`原因：${push.rejection_reason}`] : []),
      ...(push.review_note ? [`管理员备注：${push.review_note}`] : []),
    ],
  });
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
