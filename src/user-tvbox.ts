import type { AuthenticatedUser } from "./auth";
import { sha256Bytes, sha256Text } from "./crypto";
import { HTTPError } from "./http";
import {
  getPrivatePluginForSync,
  getPluginForSync,
  getPublicPluginDraftForSync,
  requirePluginOwnership,
  savePluginDraft,
  type PluginSyncRow,
} from "./repository";
import { createUserResourcePush } from "./resources";
import { validateUploadedPython } from "./remote-file";
import type { Env, PluginManifestMetadata, PublishRequest } from "./types";
import { compareVersions } from "./version";

const maxPythonResources = 50;

interface UserTVBoxSettingsRow {
  user_id: string;
  public_key: string;
  template_json: string;
  linked_plugin_id: string | null;
  config_r2_key: string;
  config_sha256: string | null;
  generated_at: string | null;
  plugin_sync_status: "pending" | "synced" | "failed" | null;
  plugin_sync_error: string | null;
  plugin_synced_at: string | null;
  updated_at: string;
}

interface UserTVBoxResourceRow {
  id: string;
  user_id: string;
  resource_type: "py" | "cms";
  source_type: "upload" | "url";
  name: string;
  source_url: string | null;
  r2_key: string | null;
  file_size: number | null;
  sha256: string | null;
  is_adult: number;
  enabled: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface UserTVBoxPythonFileRow {
  sha256: string;
  r2_key: string;
  file_size: number;
  reference_count: number;
  created_at: string;
  updated_at: string;
}

export async function getUserTVBoxSettings(db: D1Database, userID: string) {
  const row = await ensureSettings(db, userID);
  return settingsToPublic(row);
}

export async function saveUserTVBoxSettings(
  db: D1Database,
  userID: string,
  value: unknown,
) {
  const body = requireRecord(value);
  const template = validateTemplate(body.template);
  const linkedPluginID = parseOptionalPluginID(body.linked_plugin_id);
  if (linkedPluginID !== null) {
    await requirePluginOwnership(db, linkedPluginID, userID);
    const [published, publicDraft, privateDraft] = await Promise.all([
      getPluginForSync(db, linkedPluginID),
      getPublicPluginDraftForSync(db, linkedPluginID, userID),
      getPrivatePluginForSync(db, linkedPluginID, userID),
    ]);
    const linkedPlugin = publicDraft ?? published ?? privateDraft;
    if (linkedPlugin === null) {
      throw new HTTPError(
        409,
        "plugin_not_available_for_sync",
        "找不到可以关联的插件草稿或已上架插件。",
      );
    }
    requireTVBoxPlugin(linkedPlugin);
  }
  await ensureSettings(db, userID);
  await db.prepare(`
    UPDATE user_tvbox_settings
    SET template_json = ?, linked_plugin_id = ?, updated_at = ?
    WHERE user_id = ?
  `).bind(JSON.stringify(template), linkedPluginID, new Date().toISOString(), userID).run();
  return getUserTVBoxSettings(db, userID);
}

export async function listUserTVBoxResources(db: D1Database, userID: string) {
  const rows = await db.prepare(`
    SELECT id, user_id, resource_type, source_type, name, source_url,
           file_size, sha256, is_adult, enabled, sort_order, created_at, updated_at
    FROM user_tvbox_resources
    WHERE user_id = ?
    ORDER BY sort_order ASC, name COLLATE NOCASE ASC, created_at ASC
  `).bind(userID).all<UserTVBoxResourceRow>();
  const pushes = await db.prepare(`
    SELECT user_resource_id, resource_type, sha256, normalized_cms_url, status
    FROM resource_pushes
    WHERE user_id = ?
  `).bind(userID).all<UserResourcePushMatch>();
  return {
    items: rows.results.map((row) => toPublicResource(row, findMatchingPush(row, pushes.results))),
    python_limit: maxPythonResources,
    python_count: rows.results.filter((row) => row.resource_type === "py").length,
  };
}

export async function pushUserTVBoxResource(
  env: Env,
  user: AuthenticatedUser,
  resourceID: string,
) {
  const resource = await requireUserResource(env.DB, user.id, resourceID);
  const existingPush = await findMatchingPushForResource(env.DB, user.id, resource);
  if (existingPush) {
    throw new HTTPError(409, "resource_already_pushed", "这个资源已经 Push 过了。");
  }
  const push = await createUserResourcePush(env.DB, user, {
    id: resource.id,
    resourceType: resource.resource_type,
    sourceType: resource.source_type,
    name: resource.name,
    sourceURL: resource.source_url,
    fileSize: resource.file_size,
    checksum: resource.sha256,
    isAdult: resource.is_adult === 1,
  });
  return {
    resource: toPublicResource(resource, {
      user_resource_id: push.user_resource_id,
      resource_type: push.resource_type,
      sha256: push.sha256,
      normalized_cms_url: push.normalized_cms_url,
      status: push.status,
    }),
    push,
  };
}

export async function createUserPythonResource(
  env: Env,
  user: AuthenticatedUser,
  form: FormData,
) {
  await requirePythonCapacity(env.DB, user.id);
  const uploaded = form.get("file");
  const urlValue = form.get("url");
  const hasURL = typeof urlValue === "string" && urlValue.trim() !== "";
  if ((uploaded instanceof File) === hasURL) {
    throw new HTTPError(400, "invalid_source", "请选择上传文件或远程地址其中一种。");
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const isAdult = parseFormBoolean(form.get("is_adult"));
  let name: string;
  let sourceURL: string | null = null;
  let r2Key: string | null = null;
  let fileSize: number | null = null;
  let checksum: string | null = null;
  let sharedFile: UserTVBoxPythonFileRow | null = null;
  let newlyStoredR2Key: string | null = null;
  let newlyRegisteredFile = false;

  if (uploaded instanceof File) {
    const validated = await validateUploadedPython(uploaded);
    name = validatePythonFileName(validated.fileName);
    checksum = await sha256Bytes(validated.bytes);
    fileSize = validated.bytes.byteLength;
    const prepared = await preparePythonFile(env, checksum, validated.bytes, fileSize, now);
    sharedFile = prepared.file;
    newlyStoredR2Key = prepared.newlyStoredR2Key;
    newlyRegisteredFile = prepared.newlyRegistered;
    r2Key = sharedFile.r2_key;
  } else {
    sourceURL = requireHTTPURL(urlValue, "url");
    name = parseOptionalText(form.get("name"), "name", 255)
      ?? fileNameFromURL(sourceURL)
      ?? "远程 Python";
    name = name.length > 255 ? name.slice(0, 255) : name;
  }

  try {
    const resource = {
      id,
      userID: user.id,
      resourceType: "py" as const,
      sourceType: uploaded instanceof File ? "upload" as const : "url" as const,
      name,
      sourceURL,
      r2Key,
      fileSize,
      checksum,
      isAdult,
      now,
    };
    if (sharedFile) {
      await insertUploadedResource(env.DB, resource, sharedFile);
    } else {
      await insertResource(env.DB, resource);
    }
  } catch (cause) {
    if (newlyStoredR2Key && newlyRegisteredFile) {
      await cleanupUnreferencedPythonFile(env, checksum as string, newlyStoredR2Key);
    }
    throw cause;
  }
  return toPublicResource(await requireUserResource(env.DB, user.id, id));
}

export async function createUserCMSResource(
  db: D1Database,
  user: AuthenticatedUser,
  value: unknown,
) {
  const body = requireRecord(value);
  const name = requireText(body.name, "name", 100);
  const sourceURL = requireHTTPURL(body.url, "url");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await insertResource(db, {
    id,
    userID: user.id,
    resourceType: "cms",
    sourceType: "url",
    name,
    sourceURL,
    r2Key: null,
    fileSize: null,
    checksum: null,
    isAdult: parseBoolean(body.is_adult, false),
    now,
  });
  return toPublicResource(await requireUserResource(db, user.id, id));
}

export async function replaceUserPythonFile(
  env: Env,
  userID: string,
  resourceID: string,
  file: File | null,
  isAdult?: boolean,
) {
  if (!(file instanceof File)) {
    throw new HTTPError(400, "file_required", "请选择要替换的 Python 文件。");
  }
  const resource = await requireUserResource(env.DB, userID, resourceID);
  if (resource.resource_type !== "py" || resource.source_type !== "upload" || !resource.r2_key) {
    throw new HTTPError(409, "resource_not_upload", "只有上传的 Python 文件可以替换。");
  }
  const validated = await validateUploadedPython(file);
  const checksum = await sha256Bytes(validated.bytes);
  if (checksum === resource.sha256) {
    throw new HTTPError(409, "content_unchanged", "新文件内容与当前版本相同。");
  }
  const now = new Date().toISOString();
  const prepared = await preparePythonFile(env, checksum, validated.bytes, validated.bytes.byteLength, now);
  const previousFile = resource.sha256
    ? await findPythonFile(env.DB, resource.sha256)
    : null;
  try {
    await replaceUploadedResource(env.DB, {
      resourceID,
      userID,
      name: validatePythonFileName(validated.fileName),
      fileSize: validated.bytes.byteLength,
      checksum,
      r2Key: prepared.file.r2_key,
      updatedAt: now,
      isAdult,
    }, previousFile);
  } catch (cause) {
    if (prepared.newlyStoredR2Key && prepared.newlyRegistered) {
      await cleanupUnreferencedPythonFile(env, checksum, prepared.newlyStoredR2Key);
    }
    throw cause;
  }
  if (previousFile) {
    const retained = await findPythonFile(env.DB, previousFile.sha256);
    if (!retained) await env.STORAGE.delete(previousFile.r2_key).catch(() => undefined);
  } else {
    await env.STORAGE.delete(resource.r2_key).catch(() => undefined);
  }
  return toPublicResource(await requireUserResource(env.DB, userID, resourceID));
}

export async function updateUserResourceURL(
  db: D1Database,
  userID: string,
  resourceID: string,
  value: unknown,
) {
  const resource = await requireUserResource(db, userID, resourceID);
  if (resource.source_type !== "url") {
    throw new HTTPError(409, "resource_not_url", "只有远程地址资源可以修改地址。");
  }
  const body = requireRecord(value);
  const sourceURL = requireHTTPURL(body.url, "url");
  const name = body.name === undefined
    ? resource.name
    : requireText(body.name, "name", resource.resource_type === "cms" ? 100 : 255);
  const isAdult = body.is_adult === undefined
    ? resource.is_adult === 1
    : parseBoolean(body.is_adult, false);
  await db.prepare(`
    UPDATE user_tvbox_resources
    SET name = ?, source_url = ?, is_adult = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).bind(name, sourceURL, isAdult ? 1 : 0, new Date().toISOString(), resourceID, userID).run();
  return toPublicResource(await requireUserResource(db, userID, resourceID));
}

export async function setUserResourceEnabled(
  db: D1Database,
  userID: string,
  resourceID: string,
  enabled: boolean,
) {
  const result = await db.prepare(`
    UPDATE user_tvbox_resources
    SET enabled = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).bind(enabled ? 1 : 0, new Date().toISOString(), resourceID, userID).run();
  if ((result.meta.changes ?? 0) === 0) {
    throw new HTTPError(404, "resource_not_found", "资源不存在。");
  }
  return toPublicResource(await requireUserResource(db, userID, resourceID));
}

export async function setUserResourceOrder(
  db: D1Database,
  userID: string,
  resourceID: string,
  sortOrder: number,
) {
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10_000) {
    throw new HTTPError(400, "invalid_sort_order", "sort_order 必须是 0 到 10000 之间的整数。");
  }
  const result = await db.prepare(`
    UPDATE user_tvbox_resources
    SET sort_order = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).bind(sortOrder, new Date().toISOString(), resourceID, userID).run();
  if ((result.meta.changes ?? 0) === 0) {
    throw new HTTPError(404, "resource_not_found", "资源不存在。");
  }
  return toPublicResource(await requireUserResource(db, userID, resourceID));
}

export async function deleteUserResource(env: Env, userID: string, resourceID: string): Promise<void> {
  const resource = await requireUserResource(env.DB, userID, resourceID);
  // A resource is the source of truth for the new ID-only Push flow. Removing
  // it also removes an unresolved review entry instead of leaving a broken
  // pending reference behind. Accepted/rejected history remains available.
  await env.DB.prepare(`
    DELETE FROM resource_pushes
    WHERE user_resource_id = ? AND user_id = ? AND status = 'pending'
  `).bind(resourceID, userID).run();
  const file = resource.resource_type === "py" && resource.source_type === "upload" && resource.sha256
    ? await findPythonFile(env.DB, resource.sha256)
    : null;
  await deleteResourceAndReleasePythonFile(env.DB, resourceID, userID, file?.sha256 ?? resource.sha256);
  if (resource.r2_key && (file === null || !(await findPythonFile(env.DB, file.sha256)))) {
    await env.STORAGE.delete(resource.r2_key).catch(() => undefined);
  }
}

export async function readUserResourceContent(env: Env, userID: string, resourceID: string) {
  const resource = await requireUserResource(env.DB, userID, resourceID);
  if (resource.source_type === "url") {
    return {
      id: resource.id,
      name: resource.name,
      resource_type: resource.resource_type,
      source_type: resource.source_type,
      source_url: resource.source_url,
      content: null,
    };
  }
  const object = resource.r2_key ? await env.STORAGE.get(resource.r2_key) : null;
  if (!object) {
    throw new HTTPError(410, "resource_content_unavailable", "本地文件内容已不可用。");
  }
  return {
    id: resource.id,
    name: resource.name,
    resource_type: resource.resource_type,
    source_type: resource.source_type,
    source_url: null,
    sha256: resource.sha256,
    content: await object.text(),
  };
}

export async function generateUserTVBoxConfig(
  env: Env,
  userID: string,
  requestURL: string,
  syncPlugin = false,
) {
  const settings = await ensureSettings(env.DB, userID);
  const template = validateTemplate(JSON.parse(settings.template_json));
  const resources = await env.DB.prepare(`
    SELECT * FROM user_tvbox_resources
    WHERE user_id = ? AND enabled = 1
    ORDER BY sort_order ASC, name COLLATE NOCASE ASC, created_at ASC
  `).bind(userID).all<UserTVBoxResourceRow>();
  const publicBaseURL = resolvePublicBaseURL(env, requestURL);
  const sites = resources.results.map((resource) => {
    const key = `${resource.resource_type}_${resource.id.replaceAll("-", "")}`;
    const api = resource.source_type === "url"
      ? resource.source_url as string
      : buildUserPythonURL(env, requestURL, publicBaseURL, settings, resource);
    return {
      key,
      name: `${resource.name}${resource.is_adult === 1 ? "🔞" : ""}`,
      type: resource.resource_type === "py" ? 3 : 1,
      api,
      searchable: 1,
      quickSearch: 1,
      filterable: 1,
    };
  });
  const configJSON = JSON.stringify({ ...template, sites }, null, 2);
  const checksum = await sha256Text(configJSON);
  const changed = checksum !== settings.config_sha256;
  const generatedAt = new Date().toISOString();
  if (changed) {
    await env.STORAGE.put(settings.config_r2_key, configJSON, {
      httpMetadata: {
        contentType: "application/json; charset=utf-8",
        cacheControl: "public, max-age=86400",
      },
      customMetadata: { sha256: checksum, user_id: userID },
    });
    await env.DB.prepare(`
      UPDATE user_tvbox_settings
      SET config_sha256 = ?, generated_at = ?,
          plugin_sync_status = CASE WHEN linked_plugin_id IS NULL THEN NULL ELSE 'pending' END,
          plugin_sync_error = NULL, updated_at = ?
      WHERE user_id = ?
    `).bind(checksum, generatedAt, generatedAt, userID).run();
  }

  let sync: { status: "synced" | "failed" | null; error: string | null; version?: string } = {
    status: null,
    error: null,
  };
  if (syncPlugin) {
    sync = await syncUserLinkedPlugin(env, userID, publicBaseURL, checksum);
  }
  return {
    changed,
    config_url: `${publicBaseURL}/tvbox/user/${encodeURIComponent(settings.public_key)}/config.json?v=${encodeURIComponent(checksum)}`,
    config_sha256: checksum,
    resource_count: resources.results.length,
    plugin_sync_status: sync.status ?? (changed ? "pending" : settings.plugin_sync_status),
    plugin_sync_error: sync.error ?? (changed ? null : settings.plugin_sync_error),
    plugin_version: sync.version ?? null,
  };
}

export async function readUserTVBoxObject(env: Env, key: string, request: Request, context: ExecutionContext) {
  const configMatch = /^tvbox\/user\/([A-Za-z0-9_-]+)\/config\.json$/.exec(key);
  const pyMatch = /^tvbox\/user\/([A-Za-z0-9_-]+)\/py\/([0-9a-f-]+)\.py$/i.exec(key);
  if (!configMatch && !pyMatch) {
    throw new HTTPError(404, "not_found", "File not found.");
  }
  const publicKey = configMatch?.[1] ?? pyMatch?.[1];
  const settings = await env.DB.prepare(
    "SELECT * FROM user_tvbox_settings WHERE public_key = ?",
  ).bind(publicKey).first<UserTVBoxSettingsRow>();
  if (!settings) throw new HTTPError(404, "not_found", "File not found.");

  let objectKey = settings.config_r2_key;
  if (pyMatch) {
    const resource = await env.DB.prepare(`
      SELECT r2_key, source_type
      FROM user_tvbox_resources
      WHERE id = ? AND user_id = ? AND resource_type = 'py'
    `).bind(pyMatch[2], settings.user_id).first<{ r2_key: string | null; source_type: string }>();
    if (!resource || resource.source_type !== "upload" || !resource.r2_key) {
      throw new HTTPError(404, "not_found", "File not found.");
    }
    objectKey = resource.r2_key;
  }
  const edgeCache = (caches as unknown as { default: Cache }).default;
  const cached = await edgeCache.match(request);
  if (cached) return cached;
  const object = await env.STORAGE.get(objectKey);
  if (!object) throw new HTTPError(404, "not_found", "File not found.");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set(
    "cache-control",
    configMatch ? "public, max-age=86400" : "public, max-age=31536000",
  );
  const response = new Response(object.body, { headers });
  context.waitUntil(edgeCache.put(request, response.clone()));
  return response;
}

async function syncUserLinkedPlugin(
  env: Env,
  userID: string,
  publicBaseURL: string,
  configVersion: string,
): Promise<{ status: "synced" | "failed"; error: string | null; version?: string }> {
  try {
    const settings = await ensureSettings(env.DB, userID);
    if (!settings.linked_plugin_id) throw new Error("尚未关联插件。");
    await requirePluginOwnership(env.DB, settings.linked_plugin_id, userID);
    const [published, publicDraft, privateDraft] = await Promise.all([
      getPluginForSync(env.DB, settings.linked_plugin_id),
      getPublicPluginDraftForSync(env.DB, settings.linked_plugin_id, userID),
      getPrivatePluginForSync(env.DB, settings.linked_plugin_id, userID),
    ]);
    const row = publicDraft ?? published ?? privateDraft;
    if (!row) throw new Error("关联插件不存在。");
    requireTVBoxPlugin(row);
    const isPrivate = privateDraft !== null;
    const manifest = JSON.parse(row.manifest_json) as Record<string, unknown>;
    const version = incrementPatchVersion(
      published !== null && compareVersions(row.latest_version, published.latest_version) < 0
        ? published.latest_version
        : row.latest_version,
    );
    const publishedAt = new Date().toISOString();
    const nextManifest = {
      ...manifest,
      version,
      endpoint: `${publicBaseURL}/tvbox/user/${encodeURIComponent(settings.public_key)}/config.json?v=${encodeURIComponent(configVersion)}`,
      update_time: publishedAt,
    };
    const request = {
      ...requestFromSyncRow(row, nextManifest),
      visibility: isPrivate ? "private" as const : "public" as const,
    };
    const metadata = metadataFromManifest(nextManifest);
    const manifestJSON = JSON.stringify(nextManifest);
    await savePluginDraft(
      env.DB,
      userID,
      request,
      metadata,
      manifestJSON,
    );
    await env.DB.prepare(`
      UPDATE user_tvbox_settings
      SET plugin_sync_status = 'synced', plugin_sync_error = NULL, plugin_synced_at = ?, updated_at = ?
      WHERE user_id = ?
    `).bind(publishedAt, publishedAt, userID).run();
    return { status: "synced", error: null, version };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    await env.DB.prepare(`
      UPDATE user_tvbox_settings
      SET plugin_sync_status = 'failed', plugin_sync_error = ?, updated_at = ?
      WHERE user_id = ?
    `).bind(message.slice(0, 1000), new Date().toISOString(), userID).run();
    return { status: "failed", error: message };
  }
}

async function ensureSettings(db: D1Database, userID: string): Promise<UserTVBoxSettingsRow> {
  const existing = await db.prepare(
    "SELECT * FROM user_tvbox_settings WHERE user_id = ?",
  ).bind(userID).first<UserTVBoxSettingsRow>();
  if (existing) return existing;
  const publicKey = crypto.randomUUID().replaceAll("-", "");
  const now = new Date().toISOString();
  const configKey = `tvbox/user/${publicKey}/config.json`;
  await db.prepare(`
    INSERT INTO user_tvbox_settings (
      user_id, public_key, template_json, linked_plugin_id, config_r2_key,
      config_sha256, generated_at, plugin_sync_status, plugin_sync_error,
      plugin_synced_at, updated_at
    ) VALUES (?, ?, ?, NULL, ?, NULL, NULL, NULL, NULL, NULL, ?)
  `).bind(userID, publicKey, JSON.stringify({ sites: [] }), configKey, now).run();
  return (await db.prepare(
    "SELECT * FROM user_tvbox_settings WHERE user_id = ?",
  ).bind(userID).first<UserTVBoxSettingsRow>()) as UserTVBoxSettingsRow;
}

interface PreparedPythonFile {
  file: UserTVBoxPythonFileRow;
  newlyStoredR2Key: string | null;
  newlyRegistered: boolean;
}

async function findPythonFile(
  db: D1Database,
  checksum: string,
): Promise<UserTVBoxPythonFileRow | null> {
  return db.prepare(
    "SELECT sha256, r2_key, file_size, reference_count, created_at, updated_at FROM user_tvbox_python_files WHERE sha256 = ?",
  ).bind(checksum).first<UserTVBoxPythonFileRow>();
}

async function preparePythonFile(
  env: Env,
  checksum: string,
  bytes: Uint8Array,
  fileSize: number,
  now: string,
): Promise<PreparedPythonFile> {
  const existing = await findPythonFile(env.DB, checksum);
  if (existing) {
    return { file: existing, newlyStoredR2Key: null, newlyRegistered: false };
  }

  const r2Key = `tvbox/user/python/${checksum}.py`;
  await env.STORAGE.put(r2Key, bytes, {
    httpMetadata: {
      contentType: "text/x-python; charset=utf-8",
      cacheControl: "public, max-age=31536000",
    },
    customMetadata: { sha256: checksum },
  });
  let newlyRegistered = false;
  try {
    const result = await env.DB.prepare(`
      INSERT OR IGNORE INTO user_tvbox_python_files (
        sha256, r2_key, file_size, reference_count, created_at, updated_at
      ) VALUES (?, ?, ?, 0, ?, ?)
    `).bind(checksum, r2Key, fileSize, now, now).run();
    newlyRegistered = (result.meta.changes ?? 0) > 0;
  } catch (cause) {
    if (newlyRegistered) {
      await env.DB.prepare(
        "DELETE FROM user_tvbox_python_files WHERE sha256 = ? AND reference_count = 0",
      ).bind(checksum).run();
    }
    await env.STORAGE.delete(r2Key).catch(() => undefined);
    throw cause;
  }

  const file = await findPythonFile(env.DB, checksum);
  if (!file) {
    if (newlyRegistered) {
      await env.DB.prepare(
        "DELETE FROM user_tvbox_python_files WHERE sha256 = ? AND reference_count = 0",
      ).bind(checksum).run();
    }
    await env.STORAGE.delete(r2Key).catch(() => undefined);
    throw new Error("无法登记 Python 文件。");
  }
  if (file.r2_key !== r2Key) {
    if (newlyRegistered) {
      await env.DB.prepare(
        "DELETE FROM user_tvbox_python_files WHERE sha256 = ? AND reference_count = 0",
      ).bind(checksum).run();
    }
    await env.STORAGE.delete(r2Key).catch(() => undefined);
    return { file, newlyStoredR2Key: null, newlyRegistered: false };
  }
  return { file, newlyStoredR2Key: r2Key, newlyRegistered };
}

async function cleanupUnreferencedPythonFile(
  env: Env,
  checksum: string,
  r2Key: string,
): Promise<void> {
  const result = await env.DB.prepare(`
    DELETE FROM user_tvbox_python_files
    WHERE sha256 = ? AND r2_key = ? AND reference_count = 0
  `).bind(checksum, r2Key).run();
  if ((result.meta.changes ?? 0) > 0) {
    await env.STORAGE.delete(r2Key).catch(() => undefined);
  }
}

interface UserResourceInsert {
  id: string;
  userID: string;
  resourceType: "py" | "cms";
  sourceType: "upload" | "url";
  name: string;
  sourceURL: string | null;
  r2Key: string | null;
  fileSize: number | null;
  checksum: string | null;
  isAdult: boolean;
  now: string;
}

async function nextResourceSortOrder(db: D1Database, userID: string): Promise<number> {
  const last = await db.prepare(`
    SELECT COALESCE(MAX(sort_order), -1) AS sort_order
    FROM user_tvbox_resources WHERE user_id = ?
  `).bind(userID).first<{ sort_order: number }>();
  return (last?.sort_order ?? -1) + 1;
}

function resourceInsertStatement(
  db: D1Database,
  value: UserResourceInsert,
  sortOrder: number,
): D1PreparedStatement {
  return db.prepare(`
    INSERT INTO user_tvbox_resources (
      id, user_id, resource_type, source_type, name, source_url, r2_key,
      file_size, sha256, is_adult, enabled, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).bind(
    value.id,
    value.userID,
    value.resourceType,
    value.sourceType,
    value.name,
    value.sourceURL,
    value.r2Key,
    value.fileSize,
    value.checksum,
    value.isAdult ? 1 : 0,
    sortOrder,
    value.now,
    value.now,
  );
}

async function insertUploadedResource(
  db: D1Database,
  value: UserResourceInsert,
  file: UserTVBoxPythonFileRow,
): Promise<void> {
  const sortOrder = await nextResourceSortOrder(db, value.userID);
  await db.batch([
    db.prepare(`
      UPDATE user_tvbox_python_files
      SET reference_count = reference_count + 1, updated_at = ?
      WHERE sha256 = ?
    `).bind(value.now, file.sha256),
    resourceInsertStatement(db, value, sortOrder),
  ]);
}

async function replaceUploadedResource(
  db: D1Database,
  value: {
    resourceID: string;
    userID: string;
    name: string;
    fileSize: number;
    checksum: string;
    r2Key: string;
    updatedAt: string;
    isAdult?: boolean | undefined;
  },
  previousFile: UserTVBoxPythonFileRow | null,
): Promise<void> {
  const releaseStatements = previousFile
    ? [
        db.prepare(`
          DELETE FROM user_tvbox_python_files
          WHERE sha256 = ? AND reference_count <= 1
        `).bind(previousFile.sha256),
        db.prepare(`
          UPDATE user_tvbox_python_files
          SET reference_count = reference_count - 1, updated_at = ?
          WHERE sha256 = ? AND reference_count > 1
        `).bind(value.updatedAt, previousFile.sha256),
      ]
    : [];
  await db.batch([
    db.prepare(`
      UPDATE user_tvbox_python_files
      SET reference_count = reference_count + 1, updated_at = ?
      WHERE sha256 = ?
    `).bind(value.updatedAt, value.checksum),
    db.prepare(`
      UPDATE user_tvbox_resources
      SET name = ?, r2_key = ?, file_size = ?, sha256 = ?,
          is_adult = CASE WHEN ? IS NULL THEN is_adult ELSE ? END,
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `).bind(
      value.name,
      value.r2Key,
      value.fileSize,
      value.checksum,
      value.isAdult === undefined ? null : (value.isAdult ? 1 : 0),
      value.isAdult === undefined ? null : (value.isAdult ? 1 : 0),
      value.updatedAt,
      value.resourceID,
      value.userID,
    ),
    ...releaseStatements,
  ]);
}

async function deleteResourceAndReleasePythonFile(
  db: D1Database,
  resourceID: string,
  userID: string,
  checksum: string | null,
): Promise<void> {
  const releaseStatements = checksum
    ? [
        db.prepare(`
          DELETE FROM user_tvbox_python_files
          WHERE sha256 = ? AND reference_count <= 1
        `).bind(checksum),
        db.prepare(`
          UPDATE user_tvbox_python_files
          SET reference_count = reference_count - 1, updated_at = ?
          WHERE sha256 = ? AND reference_count > 1
        `).bind(new Date().toISOString(), checksum),
      ]
    : [];
  await db.batch([
    db.prepare("DELETE FROM user_tvbox_resources WHERE id = ? AND user_id = ?")
      .bind(resourceID, userID),
    ...releaseStatements,
  ]);
}

async function insertResource(
  db: D1Database,
  value: UserResourceInsert,
) {
  const sortOrder = await nextResourceSortOrder(db, value.userID);
  await resourceInsertStatement(db, value, sortOrder).run();
}

async function requirePythonCapacity(db: D1Database, userID: string): Promise<void> {
  const row = await db.prepare(`
    SELECT COUNT(*) AS count FROM user_tvbox_resources
    WHERE user_id = ? AND resource_type = 'py'
  `).bind(userID).first<{ count: number }>();
  if ((row?.count ?? 0) >= maxPythonResources) {
    throw new HTTPError(409, "python_limit_reached", `每个用户最多管理 ${maxPythonResources} 个 Python 资源。`);
  }
}

async function requireUserResource(
  db: D1Database,
  userID: string,
  resourceID: string,
): Promise<UserTVBoxResourceRow> {
  const row = await db.prepare(
    "SELECT * FROM user_tvbox_resources WHERE id = ? AND user_id = ?",
  ).bind(resourceID, userID).first<UserTVBoxResourceRow>();
  if (!row) throw new HTTPError(404, "resource_not_found", "资源不存在。");
  return row;
}

interface UserResourcePushMatch {
  user_resource_id: string | null;
  resource_type: "py" | "cms";
  sha256: string | null;
  normalized_cms_url: string | null;
  status: "pending" | "accepted" | "rejected";
}

async function findMatchingPushForResource(
  db: D1Database,
  userID: string,
  resource: UserTVBoxResourceRow,
): Promise<UserResourcePushMatch | null> {
  const pushes = await db.prepare(`
    SELECT user_resource_id, resource_type, sha256, normalized_cms_url, status
    FROM resource_pushes
    WHERE user_id = ?
  `).bind(userID).all<UserResourcePushMatch>();
  return findMatchingPush(resource, pushes.results);
}

function findMatchingPush(
  resource: UserTVBoxResourceRow,
  pushes: UserResourcePushMatch[],
): UserResourcePushMatch | null {
  return pushes.find((push) => push.user_resource_id === resource.id) ?? null;
}

function settingsToPublic(row: UserTVBoxSettingsRow) {
  return {
    public_key: row.public_key,
    template: JSON.parse(row.template_json) as Record<string, unknown>,
    linked_plugin_id: row.linked_plugin_id,
    config_sha256: row.config_sha256,
    generated_at: row.generated_at,
    plugin_sync_status: row.plugin_sync_status,
    plugin_sync_error: row.plugin_sync_error,
    plugin_synced_at: row.plugin_synced_at,
  };
}

function toPublicResource(row: UserTVBoxResourceRow, push: UserResourcePushMatch | null = null) {
  return {
    id: row.id,
    resource_type: row.resource_type,
    source_type: row.source_type,
    name: row.name,
    source_url: row.source_url,
    file_size: row.file_size,
    sha256: row.sha256,
    is_adult: row.is_adult === 1,
    enabled: row.enabled === 1,
    pushed: push !== null,
    push_status: push?.status ?? null,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function requestFromSyncRow(row: PluginSyncRow, manifest: Record<string, unknown>): PublishRequest {
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
  const iconURL = typeof manifest.icon === "string" && manifest.icon !== "" ? manifest.icon : null;
  return { id, name, description, author, iconURL, version };
}

function requireTVBoxPlugin(row: PluginSyncRow): void {
  const manifest = JSON.parse(row.manifest_json) as Record<string, unknown>;
  if (manifest.type !== "tvbox") {
    throw new HTTPError(
      409,
      "plugin_type_not_tvbox",
      "只能关联类型为 tvbox 的插件。",
    );
  }
}

function incrementPatchVersion(value: string): string {
  const stable = value.split("-", 1)[0] ?? value;
  const parts = stable.split(".");
  const last = Number(parts.at(-1));
  if (!Number.isInteger(last) || last < 0) throw new Error(`无法自动递增插件版本 ${value}。`);
  parts[parts.length - 1] = String(last + 1);
  return parts.join(".");
}

function validateTemplate(value: unknown): Record<string, unknown> {
  const template = typeof value === "string" ? parseJSON(value) : requireRecord(value);
  if (!Array.isArray(template.sites)) {
    throw new HTTPError(400, "invalid_template", "TVBox 模板必须包含 sites 数组。");
  }
  return template;
}

function parseJSON(value: string): Record<string, unknown> {
  try {
    return requireRecord(JSON.parse(value));
  } catch {
    throw new HTTPError(400, "invalid_template", "TVBox 模板不是有效 JSON。");
  }
}

function parseOptionalPluginID(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const id = requireString(value, "linked_plugin_id").trim();
  if (!/^[A-Za-z0-9._-]{1,200}$/.test(id)) {
    throw new HTTPError(400, "invalid_plugin_id", "关联插件 ID 无效。");
  }
  return id;
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HTTPError(400, "invalid_body", "请求内容必须是对象。");
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HTTPError(400, "invalid_field", `${field} 不能为空。`);
  }
  return value.trim();
}

function requireText(value: unknown, field: string, maxLength: number): string {
  const text = requireString(value, field);
  if (text.length > maxLength) {
    throw new HTTPError(400, "invalid_field", `${field} 不能超过 ${maxLength} 个字符。`);
  }
  return text;
}

function parseOptionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return requireText(value, field, maxLength);
}

function requireHTTPURL(value: unknown, field: string): string {
  const text = requireString(value, field);
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    url.hash = "";
    return url.toString();
  } catch {
    throw new HTTPError(400, "invalid_url", `${field} 必须是 HTTP 或 HTTPS 地址。`);
  }
}

function fileNameFromURL(value: string): string | null {
  try {
    const name = decodeURIComponent(new URL(value).pathname.split("/").filter(Boolean).at(-1) ?? "");
    return name && name.toLowerCase().endsWith(".py") ? name : null;
  } catch {
    return null;
  }
}

function validatePythonFileName(value: string): string {
  const name = value.trim();
  if (
    name.length === 0 || name.length > 255 || !name.toLowerCase().endsWith(".py")
    || name.includes("/") || name.includes("\\") || /[\u0000-\u001f\u007f]/.test(name)
  ) {
    throw new HTTPError(400, "invalid_file_name", "Python 文件名必须以 .py 结尾，且不能包含路径分隔符。");
  }
  return name;
}

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  if (typeof value !== "boolean") throw new HTTPError(400, "invalid_field", "is_adult 必须是布尔值。");
  return value;
}

function parseFormBoolean(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "1" || value === "on";
}

function resolvePublicBaseURL(env: Env, requestURL: string): string {
  const request = new URL(requestURL);
  const localHost = request.hostname === "localhost"
    || request.hostname === "127.0.0.1"
    || request.hostname === "::1";
  const value = localHost ? request.origin : (env.PUBLIC_ASSET_BASE_URL?.trim() || request.origin);
  return value.replace(/\/+$/, "");
}

function buildUserPythonURL(
  env: Env,
  requestURL: string,
  publicBaseURL: string,
  settings: UserTVBoxSettingsRow,
  resource: UserTVBoxResourceRow,
): string {
  const request = new URL(requestURL);
  const localHost = request.hostname === "localhost"
    || request.hostname === "127.0.0.1"
    || request.hostname === "::1";
  const version = encodeURIComponent(resource.sha256 ?? "");
  if (!localHost && env.PUBLIC_ASSET_BASE_URL?.trim() && resource.r2_key) {
    const objectPath = resource.r2_key.split("/").map(encodeURIComponent).join("/");
    return `${publicBaseURL}/${objectPath}?v=${version}`;
  }
  return `${request.origin}/tvbox/user/${encodeURIComponent(settings.public_key)}/py/${encodeURIComponent(resource.id)}.py?v=${version}`;
}
