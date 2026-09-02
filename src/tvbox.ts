import { sha256Text } from "./crypto";
import { HTTPError } from "./http";
import {
  getPluginForSync,
  publishLinkedPluginRelease,
  type PluginSyncRow,
} from "./repository";
import type { PluginManifestMetadata, PublishRequest, Env } from "./types";

interface TVBoxSettingsRow {
  id: number;
  template_json: string;
  linked_plugin_id: string | null;
  config_r2_key: string;
  config_sha256: string | null;
  generated_at: string | null;
  plugin_sync_status: "pending" | "synced" | "failed" | null;
  plugin_sync_error: string | null;
  plugin_synced_at: string | null;
  updated_at: string;
  updated_by: string | null;
  email_enabled: number;
}

interface PythonSiteRow {
  id: string;
  script_key: string;
  file_name: string;
  display_name: string;
  source_file_name: string | null;
  is_adult: number;
  cache_version: number;
  sort_order: number;
  updated_at: string;
}

interface CMSSiteRow {
  id: string;
  site_key: string;
  name: string;
  url: string;
  sort_order: number;
  updated_at: string;
}

export async function getTVBoxSettings(db: D1Database) {
  const row = await requireSettings(db);
  return {
    template: JSON.parse(row.template_json) as Record<string, unknown>,
    linked_plugin_id: row.linked_plugin_id,
    config_r2_key: row.config_r2_key,
    config_sha256: row.config_sha256,
    generated_at: row.generated_at,
    plugin_sync_status: row.plugin_sync_status,
    plugin_sync_error: row.plugin_sync_error,
    plugin_synced_at: row.plugin_synced_at,
    updated_at: row.updated_at,
    email_enabled: row.email_enabled !== 0,
  };
}

export async function getEmailSetting(db: D1Database): Promise<boolean> {
  const row = await db.prepare("SELECT email_enabled FROM tvbox_settings WHERE id = 1")
    .first<{ email_enabled: number }>();
  return row?.email_enabled !== 0;
}

export async function saveEmailSetting(db: D1Database, enabled: boolean): Promise<boolean> {
  await db.prepare("UPDATE tvbox_settings SET email_enabled = ?, updated_at = ? WHERE id = 1")
    .bind(enabled ? 1 : 0, new Date().toISOString()).run();
  return enabled;
}

export async function saveTVBoxSettings(db: D1Database, value: unknown) {
  const body = requireRecord(value);
  const template = validateTemplate(body.template);
  const linkedPluginID = parseOptionalPluginID(body.linked_plugin_id);
  if (linkedPluginID !== null && await getPluginForSync(db, linkedPluginID) === null) {
    throw new HTTPError(400, "plugin_not_found", "The linked plugin does not exist or is unpublished.");
  }
  await db.prepare(`
    UPDATE tvbox_settings
    SET template_json = ?, linked_plugin_id = ?, updated_at = ?, updated_by = 'admin'
    WHERE id = 1
  `).bind(JSON.stringify(template), linkedPluginID, new Date().toISOString()).run();
  return getTVBoxSettings(db);
}

export async function generateTVBoxConfig(env: Env, requestURL: string) {
  const settings = await requireSettings(env.DB);
  const template = validateTemplate(JSON.parse(settings.template_json));
  const [pythonRows, cmsRows] = await Promise.all([
    env.DB.prepare(`
      SELECT p.id, p.script_key, p.file_name, p.display_name,
             (
               SELECT push.file_name
               FROM resource_pushes push
               WHERE push.resource_type = 'py'
                 AND push.script_key = p.script_key
                 AND push.status = 'accepted'
               ORDER BY push.reviewed_at ASC, push.pushed_at ASC
               LIMIT 1
             ) AS source_file_name,
             p.is_adult, p.cache_version, p.sort_order, p.updated_at
      FROM py_scripts p WHERE p.enabled = 1
    `).all<PythonSiteRow>(),
    env.DB.prepare(`
      SELECT id, site_key, name, url, sort_order, updated_at
      FROM cms_sources WHERE enabled = 1
    `).all<CMSSiteRow>(),
  ]);
  const publicBaseURL = resolvePublicBaseURL(env, requestURL);
  const resources = [
    ...pythonRows.results.map((script) => ({
      resource_type: "py" as const,
      id: script.id,
      name: (script.source_file_name ?? `${script.display_name}.py`).replace(/\.py$/i, ""),
      sort_order: script.sort_order,
      version: String(script.cache_version),
      site: {
        key: `py_${script.script_key}`,
        name: `${(script.source_file_name ?? `${script.display_name}.py`).replace(/\.py$/i, "")}${script.is_adult === 1 ? "🔞" : ""}`,
        type: 3,
        api: `${publicBaseURL}/tvbox/py/${encodeURIComponent(script.file_name)}?v=${script.cache_version}`,
        searchable: 1,
        quickSearch: 1,
        filterable: 1,
      },
    })),
    ...cmsRows.results.map((cms) => ({
      resource_type: "cms" as const,
      id: cms.id,
      name: cms.name,
      sort_order: cms.sort_order,
      version: cms.updated_at,
      site: {
        key: cms.site_key,
        name: cms.name,
        type: 1,
        api: cms.url,
        searchable: 1,
        quickSearch: 1,
        filterable: 1,
      },
    })),
  ].sort((left, right) => (
    left.sort_order - right.sort_order || left.name.localeCompare(right.name, "zh-Hans-CN")
  ));
  const generated = { ...template, sites: resources.map((resource) => resource.site) };
  const configJSON = JSON.stringify(generated, null, 2);
  const checksum = await sha256Text(configJSON);
  if (checksum === settings.config_sha256) {
    return {
      changed: false,
      config_url: buildConfigURL(publicBaseURL, settings.config_r2_key, settings.config_sha256),
      config_sha256: checksum,
      resource_count: resources.length,
      plugin_sync_status: settings.plugin_sync_status,
      plugin_sync_error: settings.plugin_sync_error,
    };
  }

  await env.STORAGE.put(settings.config_r2_key, configJSON, {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "no-cache",
    },
    customMetadata: { sha256: checksum },
  });
  const generatedAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM tvbox_config_resources"),
    ...resources.map((resource) => env.DB.prepare(`
      INSERT INTO tvbox_config_resources (
        resource_type, resource_id, resource_version, generated_at
      ) VALUES (?, ?, ?, ?)
    `).bind(resource.resource_type, resource.id, resource.version, generatedAt)),
    env.DB.prepare(`
      UPDATE tvbox_settings
      SET config_sha256 = ?, generated_at = ?,
          plugin_sync_status = ?, plugin_sync_error = NULL
      WHERE id = 1
    `).bind(checksum, generatedAt, settings.linked_plugin_id ? "pending" : null),
  ]);

  let sync: { status: "synced" | "failed" | null; error: string | null; version?: string } = {
    status: null,
    error: null,
  };
  if (settings.linked_plugin_id) {
    sync = await syncLinkedPlugin(env, settings.linked_plugin_id, publicBaseURL, checksum);
  }
  return {
    changed: true,
    config_url: buildConfigURL(publicBaseURL, settings.config_r2_key, checksum),
    config_sha256: checksum,
    resource_count: resources.length,
    plugin_sync_status: sync.status,
    plugin_sync_error: sync.error,
    plugin_version: sync.version ?? null,
  };
}

export async function retryPluginSync(env: Env, requestURL: string) {
  const settings = await requireSettings(env.DB);
  if (!settings.linked_plugin_id) {
    throw new HTTPError(409, "plugin_not_linked", "No plugin ID has been configured.");
  }
  if (!settings.config_sha256) {
    throw new HTTPError(409, "config_not_generated", "Generate the TVBox configuration first.");
  }
  return syncLinkedPlugin(
    env,
    settings.linked_plugin_id,
    resolvePublicBaseURL(env, requestURL),
    settings.config_sha256,
  );
}

export async function readTVBoxObject(
  env: Env,
  key: string,
  request: Request,
  context: ExecutionContext,
): Promise<Response> {
  if (!key.startsWith("tvbox/config/") && !key.startsWith("tvbox/py/")) {
    throw new HTTPError(404, "not_found", "File not found.");
  }
  const isPython = key.startsWith("tvbox/py/");
  const edgeCache = (caches as unknown as { default: Cache }).default;
  if (isPython) {
    const cached = await edgeCache.match(request);
    if (cached) return cached;
  }
  const object = await env.STORAGE.get(key);
  if (object === null) {
    throw new HTTPError(404, "not_found", "File not found.");
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (!isPython) {
    headers.set("cache-control", "no-cache");
  } else {
    headers.set("cache-control", "public, max-age=31536000");
  }
  const response = new Response(object.body, { headers });
  if (isPython) {
    context.waitUntil(edgeCache.put(request, response.clone()));
  }
  return response;
}

async function syncLinkedPlugin(
  env: Env,
  pluginID: string,
  publicBaseURL: string,
  configVersion: string,
): Promise<{ status: "synced" | "failed"; error: string | null; version?: string }> {
  try {
    const row = await getPluginForSync(env.DB, pluginID);
    if (row === null) {
      throw new Error("The linked plugin does not exist or is unpublished.");
    }
    const manifest = JSON.parse(row.manifest_json) as Record<string, unknown>;
    const version = incrementPatchVersion(row.latest_version);
    const publishedAt = new Date().toISOString();
    const nextManifest = {
      ...manifest,
      version,
      endpoint: buildConfigURL(publicBaseURL, "tvbox/config/tvbox.json", configVersion),
      update_time: publishedAt,
    };
    const request = requestFromSyncRow(row, nextManifest);
    const metadata = metadataFromManifest(nextManifest);
    const manifestJSON = JSON.stringify(nextManifest);
    await publishLinkedPluginRelease(
      env.DB,
      request,
      metadata,
      manifestJSON,
      await sha256Text(manifestJSON),
      publishedAt,
    );
    await env.DB.prepare(`
      UPDATE tvbox_settings
      SET plugin_sync_status = 'synced', plugin_sync_error = NULL, plugin_synced_at = ?
      WHERE id = 1
    `).bind(publishedAt).run();
    return { status: "synced", error: null, version };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    await env.DB.prepare(`
      UPDATE tvbox_settings
      SET plugin_sync_status = 'failed', plugin_sync_error = ?
      WHERE id = 1
    `).bind(message.slice(0, 1000)).run();
    return { status: "failed", error: message };
  }
}

function requestFromSyncRow(
  row: PluginSyncRow,
  manifest: Record<string, unknown>,
): PublishRequest {
  return {
    manifest,
    platforms: [
      ...(row.supports_ios === 1 ? ["ios" as const] : []),
      ...(row.supports_tvos === 1 ? ["tvos" as const] : []),
    ],
    minimum_ios_version: row.minimum_ios_version,
    minimum_tvos_version: row.minimum_tvos_version,
  };
}

function metadataFromManifest(manifest: Record<string, unknown>): PluginManifestMetadata {
  const id = requireString(manifest.id, "manifest.id");
  const name = requireString(manifest.name, "manifest.name");
  const description = requireString(manifest.desc, "manifest.desc");
  const author = requireString(manifest.author, "manifest.author");
  const version = requireString(manifest.version, "manifest.version");
  const iconURL = typeof manifest.icon === "string" && manifest.icon !== ""
    ? manifest.icon
    : null;
  return { id, name, description, author, iconURL, version };
}

function incrementPatchVersion(value: string): string {
  const stable = value.split("-", 1)[0] ?? value;
  const parts = stable.split(".");
  const last = Number(parts.at(-1));
  if (!Number.isInteger(last) || last < 0) {
    throw new Error(`Cannot automatically increment plugin version ${value}.`);
  }
  parts[parts.length - 1] = String(last + 1);
  return parts.join(".");
}

function validateTemplate(value: unknown): Record<string, unknown> {
  const template = typeof value === "string" ? parseJSON(value) : requireRecord(value);
  if (!Array.isArray(template.sites)) {
    throw new HTTPError(400, "invalid_template", "The TVBox template must contain a sites array.");
  }
  return template;
}

function parseJSON(value: string): Record<string, unknown> {
  try {
    return requireRecord(JSON.parse(value));
  } catch (cause) {
    if (cause instanceof HTTPError) {
      throw cause;
    }
    throw new HTTPError(400, "invalid_template", "The TVBox template is not valid JSON.");
  }
}

function parseOptionalPluginID(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const id = requireString(value, "linked_plugin_id").trim();
  if (!/^[A-Za-z0-9._-]{1,200}$/.test(id)) {
    throw new HTTPError(400, "invalid_plugin_id", "The linked plugin ID is invalid.");
  }
  return id;
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HTTPError(400, "invalid_body", "Request body must be an object.");
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HTTPError(400, "invalid_field", `${field} must be a non-empty string.`);
  }
  return value;
}

function resolvePublicBaseURL(env: Env, requestURL: string): string {
  const request = new URL(requestURL);
  // Local Wrangler storage is separate from the deployed R2 bucket. Do not
  // return the production custom domain for a config written during local dev.
  const localHost = request.hostname === "localhost"
    || request.hostname === "127.0.0.1"
    || request.hostname === "::1";
  const value = localHost
    ? request.origin
    : (env.PUBLIC_ASSET_BASE_URL?.trim() || request.origin);
  return value.replace(/\/+$/, "");
}

function buildConfigURL(baseURL: string, key: string, version: string | null): string {
  const url = `${baseURL}/${key}`;
  return version === null ? url : `${url}?v=${encodeURIComponent(version)}`;
}

async function requireSettings(db: D1Database): Promise<TVBoxSettingsRow> {
  const row = await db.prepare("SELECT * FROM tvbox_settings WHERE id = 1")
    .first<TVBoxSettingsRow>();
  if (row === null) {
    throw new HTTPError(503, "settings_not_initialized", "TVBox settings are not initialized.");
  }
  return row;
}
