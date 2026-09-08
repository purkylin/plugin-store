import type { AuthenticatedUser } from "./auth";
import { sha256Bytes, sha256Text } from "./crypto";
import { HTTPError } from "./http";
import { downloadPythonFile, validateUploadedPython } from "./remote-file";
import type { Env } from "./types";

export type ResourceType = "py" | "cms";

export interface ResourcePushRow {
  id: string;
  user_id: string;
  email: string;
  nick: string;
  resource_type: ResourceType;
  file_name: string | null;
  script_key: string | null;
  staging_r2_key: string | null;
  file_size: number | null;
  sha256: string | null;
  cms_name: string | null;
  cms_url: string | null;
  normalized_cms_url: string | null;
  user_note: string | null;
  is_adult: number;
  status: "pending" | "accepted" | "rejected";
  rejection_reason: string | null;
  review_note: string | null;
  pushed_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export async function createPythonPush(
  env: Env,
  user: AuthenticatedUser,
  form: FormData,
): Promise<ResourcePushRow> {
  const uploaded = form.get("file");
  const url = form.get("url");
  if ((uploaded instanceof File) === (typeof url === "string" && url.trim() !== "")) {
    throw new HTTPError(400, "invalid_source", "Provide exactly one Python file or URL.");
  }
  const downloaded = uploaded instanceof File
    ? await validateUploadedPython(uploaded)
    : await downloadPythonFile(url);
  const fileName = validatePythonFileName(downloaded.fileName);
  const scriptKey = await scriptKeyFromFileName(fileName);
  const checksum = await sha256Bytes(downloaded.bytes);
  const current = await env.DB.prepare(
    "SELECT sha256 FROM py_scripts WHERE script_key = ?",
  ).bind(scriptKey).first<{ sha256: string }>();
  if (current?.sha256 === checksum) {
    throw new HTTPError(
      409,
      "content_unchanged",
      "这个 Python 文件的内容与当前版本完全相同，无需重复提交。请修改内容后再 Push。",
    );
  }
  const pending = await env.DB.prepare(`
    SELECT id, sha256 FROM resource_pushes
    WHERE resource_type = 'py' AND script_key = ? AND status = 'pending'
  `).bind(scriptKey).first<{ id: string; sha256: string }>();
  if (pending !== null) {
    throw new HTTPError(
      409,
      pending.sha256 === checksum ? "duplicate_pending_push" : "push_already_pending",
      "这个 Python 文件已经有一个待处理的 Push，请等待审核完成后再提交。",
    );
  }

  const id = crypto.randomUUID();
  const stagingKey = `tvbox/pushes/${id}/${fileName}`;
  const pushedAt = new Date().toISOString();
  const note = parseOptionalText(form.get("note"), "note", 500);
  const isAdult = parseFormBoolean(form.get("is_adult"));
  await env.STORAGE.put(stagingKey, downloaded.bytes, {
    httpMetadata: { contentType: "text/x-python; charset=utf-8" },
    customMetadata: { push_id: id, sha256: checksum },
  });
  try {
    await env.DB.prepare(`
      INSERT INTO resource_pushes (
        id, user_id, resource_type, file_name, script_key, staging_r2_key,
        file_size, sha256, cms_name, cms_url, normalized_cms_url,
        user_note, is_adult, status, rejection_reason, review_note,
        pushed_at, reviewed_at, reviewed_by
      ) VALUES (?, ?, 'py', ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, 'pending',
                NULL, NULL, ?, NULL, NULL)
    `).bind(
      id,
      user.id,
      fileName,
      scriptKey,
      stagingKey,
      downloaded.bytes.byteLength,
      checksum,
      note,
      isAdult ? 1 : 0,
      pushedAt,
    ).run();
  } catch (cause) {
    await env.STORAGE.delete(stagingKey).catch(() => undefined);
    throw cause;
  }
  return requireResourcePush(env.DB, id);
}

export async function createCMSPush(
  db: D1Database,
  user: AuthenticatedUser,
  value: unknown,
): Promise<ResourcePushRow> {
  const body = requireRecord(value);
  const name = requireText(body.name, "name", 100);
  const url = requireHTTPURL(body.url, "url");
  const normalizedURL = normalizeCMSURL(url);
  const note = parseOptionalText(body.note, "note", 500);
  const isAdult = parseBoolean(body.is_adult, false);
  const existing = await db.prepare(
    "SELECT 1 AS found FROM cms_sources WHERE normalized_url = ?",
  ).bind(normalizedURL).first<{ found: number }>();
  if (existing !== null) {
    throw new HTTPError(409, "cms_already_exists", "This CMS URL already exists.");
  }
  const pending = await db.prepare(`
    SELECT 1 AS found FROM resource_pushes
    WHERE resource_type = 'cms' AND normalized_cms_url = ? AND status = 'pending'
  `).bind(normalizedURL).first<{ found: number }>();
  if (pending !== null) {
    throw new HTTPError(409, "duplicate_pending_push", "This CMS URL is already waiting to be handled.");
  }
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO resource_pushes (
      id, user_id, resource_type, file_name, script_key, staging_r2_key,
      file_size, sha256, cms_name, cms_url, normalized_cms_url,
      user_note, is_adult, status, rejection_reason, review_note,
      pushed_at, reviewed_at, reviewed_by
    ) VALUES (?, ?, 'cms', NULL, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?,
              'pending', NULL, NULL, ?, NULL, NULL)
  `).bind(
    id,
    user.id,
    name,
    url,
    normalizedURL,
    note,
    isAdult ? 1 : 0,
    new Date().toISOString(),
  ).run();
  return requireResourcePush(db, id);
}

export async function listUserResourcePushes(
  db: D1Database,
  userID: string,
  page: number,
  pageSize: number,
) {
  const offset = (page - 1) * pageSize;
  const [rows, count] = await Promise.all([
    db.prepare(`
      SELECT p.*, u.email, u.nick
      FROM resource_pushes p JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
      ORDER BY p.pushed_at DESC
      LIMIT ? OFFSET ?
    `).bind(userID, pageSize, offset).all<ResourcePushRow>(),
    db.prepare("SELECT COUNT(*) AS total FROM resource_pushes WHERE user_id = ?")
      .bind(userID).first<{ total: number }>(),
  ]);
  return {
    items: rows.results.map(toUserPush),
    page,
    page_size: pageSize,
    total: count?.total ?? 0,
    total_pages: Math.max(1, Math.ceil((count?.total ?? 0) / pageSize)),
  };
}

export async function listPendingResourcePushes(
  db: D1Database,
  page: number,
  pageSize: number,
) {
  const offset = (page - 1) * pageSize;
  const [rows, count] = await Promise.all([
    db.prepare(`
      SELECT p.*, u.email, u.nick
      FROM resource_pushes p JOIN users u ON u.id = p.user_id
      WHERE p.status = 'pending'
      ORDER BY p.pushed_at ASC
      LIMIT ? OFFSET ?
    `).bind(pageSize, offset).all<ResourcePushRow>(),
    db.prepare("SELECT COUNT(*) AS total FROM resource_pushes WHERE status = 'pending'")
      .first<{ total: number }>(),
  ]);
  return {
    items: rows.results.map(toAdminPush),
    page,
    page_size: pageSize,
    total: count?.total ?? 0,
    total_pages: Math.max(1, Math.ceil((count?.total ?? 0) / pageSize)),
  };
}

export async function acceptResourcePush(
  env: Env,
  pushID: string,
  value: unknown,
): Promise<ResourcePushRow> {
  const push = await requirePendingResourcePush(env.DB, pushID);
  const body = value === undefined ? {} : requireRecord(value);
  const reviewNote = parseOptionalText(body.review_note, "review_note", 500);
  const overwrite = body.overwrite === true;
  const isAdult = body.is_adult === undefined
    ? push.is_adult === 1
    : parseBoolean(body.is_adult, false);
  const reviewedAt = new Date().toISOString();
  if (push.resource_type === "py") {
    const stagingKey = push.staging_r2_key as string;
    const object = await env.STORAGE.get(stagingKey);
    if (object === null) {
      throw new HTTPError(409, "staging_file_missing", "The staged Python file no longer exists.");
    }
    const bytes = new Uint8Array(await object.arrayBuffer());
    const checksum = await sha256Bytes(bytes);
    if (checksum !== push.sha256) {
      throw new HTTPError(409, "staging_file_changed", "The staged Python file failed integrity validation.");
    }
    const scriptKey = push.script_key as string;
    const fileName = `${scriptKey}.py`;
    const r2Key = `tvbox/py/${fileName}`;
    const existing = await env.DB.prepare(
      `SELECT p.id, p.script_key, p.enabled, p.sort_order, p.sha256, p.cache_version,
              p.display_name, p.created_at,
              (
                SELECT push.file_name
                FROM resource_pushes push
                WHERE push.resource_type = 'py'
                  AND push.script_key = p.script_key
                  AND push.status = 'accepted'
                ORDER BY push.reviewed_at ASC, push.pushed_at ASC
                LIMIT 1
              ) AS original_file_name
       FROM py_scripts p
       WHERE p.script_key = ?`,
    ).bind(scriptKey).first<{
      id: string; script_key: string; enabled: number; sort_order: number; sha256: string;
      cache_version: number; display_name: string; created_at: string;
      original_file_name: string | null;
    }>();
    if (existing !== null && !overwrite) {
      throw new HTTPError(409, "resource_conflict", "已有同名 Python 资源，需要确认是否覆盖。");
    }
    const changed = existing?.sha256 !== checksum;
    const cacheVersion = changed
      ? Math.max(Date.now(), (existing?.cache_version ?? 0) + 1)
      : (existing?.cache_version ?? Date.now());
    if (changed) {
      await env.STORAGE.put(r2Key, bytes, {
        httpMetadata: {
          contentType: "text/x-python; charset=utf-8",
          cacheControl: "public, max-age=31536000",
        },
        customMetadata: { sha256: checksum, cache_version: String(cacheVersion) },
      });
    }
    const sourceDisplayName = (existing?.original_file_name ?? push.file_name ?? fileName).replace(/\.py$/i, "");
    // The TVBox display name is immutable: keep the original uploaded file name
    // and ignore any administrative rename attempt during later overwrites.
    const displayName = existing?.display_name && existing.display_name !== existing.script_key
      ? existing.display_name
      : sourceDisplayName;
    const scriptID = existing?.id ?? crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE users
        SET contribution_points = contribution_points + 1
        WHERE id = ?
      `).bind(push.user_id),
      env.DB.prepare(`
        INSERT INTO py_scripts (
          id, script_key, file_name, display_name, r2_key, sha256, cache_version,
          is_adult, enabled, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
        ON CONFLICT(script_key) DO UPDATE SET
          file_name = excluded.file_name,
          display_name = excluded.display_name,
          r2_key = excluded.r2_key,
          sha256 = excluded.sha256,
          cache_version = excluded.cache_version,
          is_adult = excluded.is_adult,
          updated_at = excluded.updated_at
      `).bind(
        scriptID,
        scriptKey,
        fileName,
        displayName,
        r2Key,
        checksum,
        cacheVersion,
        isAdult ? 1 : 0,
        existing?.created_at ?? reviewedAt,
        changed ? reviewedAt : reviewedAt,
      ),
      acceptedStatement(env.DB, pushID, reviewNote, reviewedAt),
    ]);
    // Retain the immutable upload for author history and review previews.

  } else {
    const name = parseOptionalText(body.cms_name, "cms_name", 100) ?? push.cms_name as string;
    const requestedSiteKey = body.site_key === undefined ? null : parseSiteKey(body.site_key, pushID);
    const existingURL = await env.DB.prepare(
      "SELECT id, site_key FROM cms_sources WHERE normalized_url = ?",
    ).bind(push.normalized_cms_url).first<{ id: string; site_key: string }>();
    if (existingURL !== null && !overwrite) {
      throw new HTTPError(409, "resource_conflict", "已有相同 CMS URL，需要确认是否覆盖。");
    }
    const siteKey = requestedSiteKey ?? existingURL?.site_key ?? parseSiteKey(undefined, pushID);
    if (existingURL !== null) {
      const conflictingSiteKey = await env.DB.prepare(
        "SELECT id FROM cms_sources WHERE site_key = ? AND id != ?",
      ).bind(siteKey, existingURL.id).first<{ id: string }>();
      if (conflictingSiteKey !== null) {
        throw new HTTPError(409, "cms_site_key_exists", "This CMS site key already exists; choose another key.");
      }
    } else {
      const conflictingSiteKey = await env.DB.prepare(
        "SELECT id FROM cms_sources WHERE site_key = ?",
      ).bind(siteKey).first<{ id: string }>();
      if (conflictingSiteKey !== null) {
        throw new HTTPError(409, "cms_site_key_exists", "This CMS site key already exists; choose another key.");
      }
    }
    const resourceStatement = existingURL === null
      ? env.DB.prepare(`
        INSERT INTO cms_sources (
          id, site_key, name, url, normalized_url, is_adult, enabled,
          sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
      `).bind(
        crypto.randomUUID(),
        siteKey,
        name,
        push.cms_url,
        push.normalized_cms_url,
        isAdult ? 1 : 0,
        reviewedAt,
        reviewedAt,
      )
      : env.DB.prepare(`
        UPDATE cms_sources
        SET site_key = ?, name = ?, url = ?, normalized_url = ?,
            is_adult = ?, enabled = 1, updated_at = ?
        WHERE id = ?
      `).bind(
        siteKey,
        name,
        push.cms_url,
        push.normalized_cms_url,
        isAdult ? 1 : 0,
        reviewedAt,
        existingURL.id,
      );
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE users
        SET contribution_points = contribution_points + 1
        WHERE id = ?
      `).bind(push.user_id),
      resourceStatement,
      acceptedStatement(env.DB, pushID, reviewNote, reviewedAt),
    ]);
  }
  return requireResourcePush(env.DB, pushID);
}

export async function rejectResourcePush(
  env: Env,
  pushID: string,
  value: unknown,
): Promise<ResourcePushRow> {
  const push = await requirePendingResourcePush(env.DB, pushID);
  const body = requireRecord(value);
  const reason = requireText(body.reason, "reason", 500, 2);
  const note = parseOptionalText(body.review_note, "review_note", 500);
  const result = await env.DB.prepare(`
    UPDATE resource_pushes
    SET status = 'rejected', rejection_reason = ?, review_note = ?,
        reviewed_at = ?, reviewed_by = 'admin'
    WHERE id = ? AND status = 'pending'
  `).bind(reason, note, new Date().toISOString(), pushID).run();
  if ((result.meta.changes ?? 0) === 0) {
    throw new HTTPError(404, "push_not_found", "Pending Push not found.");
  }
  // Rejected uploads remain available to their author and administrators.
  return requireResourcePush(env.DB, pushID);
}

export async function listResources(
  db: D1Database,
  options: {
    type: "all" | ResourceType;
    status: "all" | "enabled" | "disabled";
    sort: "updated_desc" | "updated_asc" | "name_asc" | "name_desc";
    page: number;
    pageSize: number;
  },
) {
  const filters: string[] = [];
  const values: unknown[] = [];
  if (options.type !== "all") {
    filters.push("resources.resource_type = ?");
    values.push(options.type);
  }
  if (options.status !== "all") {
    filters.push("resources.enabled = ?");
    values.push(options.status === "enabled" ? 1 : 0);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const orderBy = {
    updated_desc: "updated_at DESC, name COLLATE NOCASE ASC",
    updated_asc: "updated_at ASC, name COLLATE NOCASE ASC",
    name_asc: "name COLLATE NOCASE ASC, updated_at DESC",
    name_desc: "name COLLATE NOCASE DESC, updated_at DESC",
  }[options.sort];
  const union = `
    SELECT 'py' AS resource_type, id, script_key AS site_key, display_name AS name,
           file_name, NULL AS url, is_adult, enabled, sort_order, updated_at,
           CAST(cache_version AS TEXT) AS resource_version
    FROM py_scripts
    UNION ALL
    SELECT 'cms' AS resource_type, id, site_key, name, NULL AS file_name,
           url, is_adult, enabled, sort_order, updated_at, updated_at AS resource_version
    FROM cms_sources
  `;
  const offset = (options.page - 1) * options.pageSize;
  const [rows, count] = await Promise.all([
    db.prepare(`
      WITH resources AS (${union})
      SELECT resources.*,
             snapshot.resource_version AS generated_version,
             CASE
               WHEN snapshot.resource_id IS NULL AND resources.enabled = 1 THEN 'pending_add'
               WHEN snapshot.resource_id IS NOT NULL AND resources.enabled = 0 THEN 'pending_remove'
               WHEN snapshot.resource_version != resources.resource_version THEN 'changed'
               WHEN snapshot.resource_id IS NULL THEN 'not_included'
               ELSE 'synced'
             END AS config_status
      FROM resources
      LEFT JOIN tvbox_config_resources snapshot
        ON snapshot.resource_type = resources.resource_type
       AND snapshot.resource_id = resources.id
      ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).bind(...values, options.pageSize, offset).all(),
    db.prepare(`WITH resources AS (${union}) SELECT COUNT(*) AS total FROM resources ${where}`)
      .bind(...values).first<{ total: number }>(),
  ]);
  return {
    items: rows.results,
    page: options.page,
    page_size: options.pageSize,
    total: count?.total ?? 0,
    total_pages: Math.max(1, Math.ceil((count?.total ?? 0) / options.pageSize)),
  };
}

export async function setResourceEnabled(
  db: D1Database,
  type: ResourceType,
  id: string,
  enabled: boolean,
): Promise<void> {
  const table = type === "py" ? "py_scripts" : "cms_sources";
  const result = await db.prepare(`UPDATE ${table} SET enabled = ?, updated_at = ? WHERE id = ?`)
    .bind(enabled ? 1 : 0, new Date().toISOString(), id).run();
  if ((result.meta.changes ?? 0) === 0) {
    throw new HTTPError(404, "resource_not_found", "Resource not found.");
  }
}

export async function deleteResource(env: Env, type: ResourceType, id: string): Promise<void> {
  if (type === "py") {
    const row = await env.DB.prepare("SELECT r2_key FROM py_scripts WHERE id = ?")
      .bind(id).first<{ r2_key: string }>();
    if (row === null) {
      throw new HTTPError(404, "resource_not_found", "Resource not found.");
    }
    await env.DB.prepare("DELETE FROM py_scripts WHERE id = ?").bind(id).run();
    await env.STORAGE.delete(row.r2_key).catch((cause: unknown) => {
      console.error("Could not delete Python resource from R2", cause);
    });
    return;
  }
  const result = await env.DB.prepare("DELETE FROM cms_sources WHERE id = ?").bind(id).run();
  if ((result.meta.changes ?? 0) === 0) {
    throw new HTTPError(404, "resource_not_found", "Resource not found.");
  }
}

export function publicPush(row: ResourcePushRow) {
  return toUserPush(row);
}

function acceptedStatement(
  db: D1Database,
  pushID: string,
  reviewNote: string | null,
  reviewedAt: string,
): D1PreparedStatement {
  return db.prepare(`
    UPDATE resource_pushes
    SET status = 'accepted', rejection_reason = NULL, review_note = ?,
        reviewed_at = ?, reviewed_by = 'admin'
    WHERE id = ? AND status = 'pending'
  `).bind(reviewNote, reviewedAt, pushID);
}

async function requirePendingResourcePush(db: D1Database, id: string): Promise<ResourcePushRow> {
  const row = await getResourcePush(db, id, true);
  if (row === null) {
    throw new HTTPError(404, "push_not_found", "Pending Push not found.");
  }
  return row;
}

async function requireResourcePush(db: D1Database, id: string): Promise<ResourcePushRow> {
  const row = await getResourcePush(db, id, false);
  if (row === null) {
    throw new HTTPError(404, "push_not_found", "Push not found.");
  }
  return row;
}

function getResourcePush(
  db: D1Database,
  id: string,
  pendingOnly: boolean,
): Promise<ResourcePushRow | null> {
  return db.prepare(`
    SELECT p.*, u.email, u.nick
    FROM resource_pushes p JOIN users u ON u.id = p.user_id
    WHERE p.id = ? ${pendingOnly ? "AND p.status = 'pending'" : ""}
  `).bind(id).first<ResourcePushRow>();
}

function toUserPush(row: ResourcePushRow) {
  return {
    id: row.id,
    resource_type: row.resource_type,
    name: row.resource_type === "py" ? row.file_name : row.cms_name,
    user_note: row.user_note,
    is_adult: row.is_adult === 1,
    status: row.status,
    rejection_reason: row.rejection_reason,
    review_note: row.review_note,
    pushed_at: row.pushed_at,
  };
}

function toAdminPush(row: ResourcePushRow) {
  return {
    ...toUserPush(row),
    user: { id: row.user_id, email: row.email, nick: row.nick },
    file_name: row.file_name,
    script_key: row.script_key,
    file_size: row.file_size,
    sha256: row.sha256,
    cms_name: row.cms_name,
    cms_url: row.cms_url,
  };
}

function validatePythonFileName(value: string): string {
  const name = value.trim();
  if (
    name.length === 0
    || name.length > 255
    || !name.toLowerCase().endsWith(".py")
    || name.includes("/")
    || name.includes("\\")
    || /[\u0000-\u001f\u007f]/.test(name)
  ) {
    throw new HTTPError(
      400,
      "invalid_file_name",
      "Python file names must end in .py and cannot contain path separators or control characters.",
    );
  }
  return name;
}

async function scriptKeyFromFileName(fileName: string): Promise<string> {
  const stem = fileName.slice(0, -3).normalize("NFKC").toLowerCase();
  const slug = stem
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .slice(0, 80);
  const checksum = (await sha256Text(stem)).slice(0, 10);
  if (slug && stem === slug) return slug;
  return slug ? `${slug}-${checksum}` : `script-${checksum}`;
}

function parseSiteKey(value: unknown, pushID: string): string {
  if (value === undefined || value === null || value === "") {
    return `cms_${pushID.replaceAll("-", "").slice(0, 10)}`;
  }
  const key = requireText(value, "site_key", 80);
  if (!/^[A-Za-z0-9_-]+$/.test(key)) {
    throw new HTTPError(400, "invalid_site_key", "site_key contains unsupported characters.");
  }
  return key;
}

function normalizeCMSURL(value: string): string {
  const url = new URL(value);
  url.hash = "";
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  return url.toString();
}

function requireHTTPURL(value: unknown, field: string): string {
  const text = requireText(value, field, 2048);
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new HTTPError(400, "invalid_url", `${field} must be a valid URL.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new HTTPError(400, "invalid_url", `${field} must use HTTP or HTTPS.`);
  }
  url.hash = "";
  return url.toString();
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HTTPError(400, "invalid_body", "Request body must be an object.");
  }
  return value as Record<string, unknown>;
}

function requireText(
  value: unknown,
  field: string,
  maxLength: number,
  minLength = 1,
): string {
  if (typeof value !== "string") {
    throw new HTTPError(400, "invalid_field", `${field} must be a string.`);
  }
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) {
    throw new HTTPError(
      400,
      "invalid_field",
      `${field} must contain ${minLength}-${maxLength} characters.`,
    );
  }
  return text;
}

function parseOptionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return requireText(value, field, maxLength);
}

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value !== "boolean") {
    throw new HTTPError(400, "invalid_field", "is_adult must be a boolean.");
  }
  return value;
}

function parseFormBoolean(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "1" || value === "on";
}

export async function readResourcePushContent(env: Env, id: string, userID?: string) {
  const push = await getResourcePush(env.DB, id, false);
  if (!push || (userID !== undefined && push.user_id !== userID)) {
    throw new HTTPError(404, "push_not_found", "Push 不存在。");
  }
  const name = push.resource_type === "py" ? push.file_name : push.cms_name;
  if (push.resource_type === "cms") {
    return { name, resource_type: "cms", content: JSON.stringify({ name: push.cms_name, url: push.cms_url, note: push.user_note, is_adult: push.is_adult === 1 }, null, 2) };
  }
  let object = push.staging_r2_key ? await env.STORAGE.get(push.staging_r2_key) : null;
  // Older reviews deleted their upload: only use the published version when
  // its bytes match this submission, never silently display a newer version.
  if (!object && push.status === "accepted" && push.script_key) {
    object = await env.STORAGE.get(`tvbox/py/${push.script_key}.py`);
  }
  if (object) {
    const bytes = new Uint8Array(await object.arrayBuffer());
    if (await sha256Bytes(bytes) === push.sha256) {
      return { name, resource_type: "py", content: new TextDecoder().decode(bytes), sha256: push.sha256 };
    }
  }
  throw new HTTPError(410, "push_content_unavailable", "这条历史 Push 的原始内容已不可用，无法查看当时提交的版本。");
}
