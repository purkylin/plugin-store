import { adminPage } from "./admin";
import {
  clearSessionCookie,
  createSessionCookie,
  loginUser,
  logoutUser,
  registerUser,
  requireUser,
} from "./auth";
import { error, handleError, HTTPError, json, readJSON } from "./http";
import {
  acceptPluginSubmission,
  cancelSubmission,
  claimPluginID,
  createPluginSubmission,
  deletePluginDraft,
  deleteOwnedPlugin,
  decodeCursor,
  getLatestPluginRelease,
  getManifest,
  getPendingSubmission,
  listAdminPlugins,
  listPendingSubmissions,
  listPlugins,
  listUserSubmissions,
  pluginExists,
  recordInstallEvent,
  rejectSubmission,
  requirePluginOwnership,
  savePluginDraft,
  unpublishOwnedPlugin,
  unpublishPlugin,
} from "./repository";
import { userSubmissionPage } from "./submit";
import type { Env } from "./types";
import {
  parseInstallEvent,
  parseCatalogSort,
  parseLimit,
  parseOptionalQuery,
  parsePage,
  parsePageSize,
  parsePlatform,
  parsePluginID,
  parsePublishRequest,
  parseSortOrder,
  parseVersion,
} from "./validation";
import { compareVersions } from "./version";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (cause) {
      return handleError(cause);
    }
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env): Promise<Response> {
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
  if (request.method === "POST" && apiPath === "/v1/user/plugins") {
    return submitNewPlugin(request, env);
  }
  if (request.method === "POST" && apiPath === "/v1/user/plugins/draft") {
    return saveNewDraft(request, env);
  }
  if (request.method === "GET" && apiPath === "/v1/admin/reviews") {
    requireAdmin(request, env);
    return json(await listPendingSubmissions(env.DB, parseLimit(url.searchParams.get("limit"))));
  }
  if (request.method === "GET" && apiPath === "/v1/plugins") {
    return catalog(url, env);
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
    && segments[2] === "plugins"
    && segments[4] === "unpublish"
  ) {
    const pluginID = parsePluginID(decodeURIComponent(segments[3] ?? ""));
    return unpublish(request, pluginID, env);
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
    );
  }
  return error("not_found", "Route not found.", 404);
}

async function adminCatalog(request: Request, url: URL, env: Env): Promise<Response> {
  requireAdmin(request, env);
  const limit = parseLimit(url.searchParams.get("limit"));
  const cursor = decodeCursor(url.searchParams.get("cursor"));
  return json(await listAdminPlugins(env.DB, limit, cursor));
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
  return json(result, 200, { "cache-control": "public, max-age=60" });
}

async function manifest(pluginID: string, env: Env): Promise<Response> {
  const row = await getManifest(env.DB, pluginID);
  if (row === null) {
    return error("plugin_not_found", "Plugin not found.", 404);
  }
  return new Response(row.manifest_json, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
      etag: `"sha256-${row.manifest_sha256}"`,
    },
  });
}

async function installEvent(request: Request, pluginID: string, env: Env): Promise<Response> {
  const event = parseInstallEvent(await readJSON(request), pluginID);
  if (!await pluginExists(env.DB, pluginID)) {
    return error("plugin_not_found", "Plugin not found.", 404);
  }
  await recordInstallEvent(env.DB, event);
  return new Response(null, { status: 204 });
}

async function submitPlugin(request: Request, pluginID: string, env: Env): Promise<Response> {
  const user = await requireUser(request, env.DB);
  const submittedAt = new Date().toISOString();
  const parsed = parsePublishRequest(await readJSON(request), pluginID, submittedAt);
  await requirePluginOwnership(env.DB, pluginID, user.id);
  return finishPluginSubmission(env, user, parsed, pluginID);
}

async function submitNewPlugin(request: Request, env: Env): Promise<Response> {
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
  if (parsed.metadata.author !== user.nick) {
    throw new HTTPError(
      400,
      "author_mismatch",
      "manifest.author must match the registered user nick.",
    );
  }
  await claimPluginID(env.DB, pluginID, user.id);
  return finishPluginSubmission(env, user, parsed, pluginID);
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
  await claimPluginID(env.DB, pluginID, user.id);
  const savedAt = await savePluginDraft(
    env.DB,
    user.id,
    parsed.request,
    parsed.metadata,
    JSON.stringify(parsed.request.manifest),
  );
  return json({ plugin_id: pluginID, status: "draft", saved_at: savedAt }, 201);
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
  const savedAt = await savePluginDraft(
    env.DB,
    user.id,
    parsed.request,
    parsed.metadata,
    JSON.stringify(parsed.request.manifest),
  );
  return json({ plugin_id: pluginID, status: "draft", saved_at: savedAt });
}

async function finishPluginSubmission(
  env: Env,
  user: { id: string; nick: string },
  parsed: ReturnType<typeof parsePublishRequest>,
  pluginID: string,
): Promise<Response> {
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
  return json({ submission_id: submissionID, plugin_id: pluginID, status: "pending" }, 202);
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
): Promise<Response> {
  requireAdmin(request, env);
  if (action === "reject") {
    const reason = parseReviewReason(await readJSON(request));
    if (!await rejectSubmission(env.DB, submissionID, reason)) {
      return error("submission_not_found", "Pending submission not found.", 404);
    }
    return json({ id: submissionID, status: "rejected", reason });
  }
  if (action !== "accept") {
    return error("not_found", "Review action not found.", 404);
  }
  const submission = await getPendingSubmission(env.DB, submissionID);
  if (submission === null) {
    return error("submission_not_found", "Pending submission not found.", 404);
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
  return json({
    id: submissionID,
    status: "accepted",
    plugin_id: submission.plugin_id,
    version: parsed.metadata.version,
  });
}

async function unpublish(request: Request, pluginID: string, env: Env): Promise<Response> {
  requireAdmin(request, env);
  const reason = parseReviewReason(await readJSON(request));
  if (!await unpublishPlugin(env.DB, pluginID, reason)) {
    return error("plugin_not_found", "Published plugin not found.", 404);
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

function requireAdmin(request: Request, env: Env): void {
  if (!env.ADMIN_TOKEN) {
    throw new HTTPError(503, "admin_not_configured", "ADMIN_TOKEN is not configured.");
  }
  if (request.headers.get("authorization") !== `Bearer ${env.ADMIN_TOKEN}`) {
    throw new HTTPError(401, "unauthorized", "A valid admin bearer token is required.");
  }
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
