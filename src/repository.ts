import { HTTPError } from "./http";
import type {
  AdminCatalogRow,
  CatalogCursor,
  CatalogRow,
  InstallEvent,
  Platform,
  PluginManifestMetadata,
  PublishRequest,
  UpdateCheckRequest,
} from "./types";
import { compareVersions, isVersionAtLeast } from "./version";

interface ListOptions {
  platform: Platform;
  appVersion: string;
  page: number;
  pageSize: number;
  sort: "time" | "downloads";
  order: "asc" | "desc";
  type: string | null;
  search: string | null;
}

interface ManifestRow {
  manifest_json: string;
  manifest_sha256: string;
}

interface PublishedPluginRow {
  latest_version: string;
  manifest_json: string;
}

interface UpdateCheckRow extends PublishedPluginRow {
  id: string;
  manifest_sha256: string;
  supports_ios: number;
  supports_tvos: number;
  minimum_ios_version: string | null;
  minimum_tvos_version: string | null;
}

interface PluginDraftRow {
  plugin_id: string;
  user_id: string;
  email: string;
  nick: string;
  manifest_json: string;
  supports_ios: number;
  supports_tvos: number;
  minimum_ios_version: string | null;
  minimum_tvos_version: string | null;
  saved_at: string;
  is_private: number;
  published_version: string | null;
  approved_version: string | null;
}

interface DraftSubmissionRow {
  plugin_id: string;
  manifest_json: string;
  supports_ios: number;
  supports_tvos: number;
  minimum_ios_version: string | null;
  minimum_tvos_version: string | null;
  pending_submission_id: string | null;
  latest_version: string | null;
  latest_manifest_json: string | null;
  is_private: number;
}

interface AdminUserRow {
  id: string;
  email: string;
  nick: string;
  created_at: string;
  is_whitelisted: number;
  contribution_count: number;
}

export interface PluginSubmissionRow {
  id: string;
  plugin_id: string;
  user_id: string;
  email: string;
  nick: string;
  version: string;
  manifest_json: string;
  supports_ios: number;
  supports_tvos: number;
  minimum_ios_version: string | null;
  minimum_tvos_version: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  cancelled_at: string | null;
  published_version: string | null;
  approved_version: string | null;
}

type SubmissionItem = ReturnType<typeof toSubmissionItem>;
type UserPluginItem = Omit<SubmissionItem, "status" | "visibility"> & {
  status: SubmissionItem["status"] | "draft" | "private";
  visibility: "public" | "private";
  history: SubmissionItem[];
};

export async function listPlugins(db: D1Database, options: ListOptions) {
  const supportColumn = options.platform === "ios" ? "supports_ios" : "supports_tvos";
  const filters = [`r.${supportColumn} = 1`];
  const values: unknown[] = [];
  if (options.type !== null) {
    filters.push("json_extract(r.manifest_json, '$.type') = ? COLLATE NOCASE");
    values.push(options.type);
  }
  if (options.search !== null) {
    const pattern = `%${escapeLike(options.search)}%`;
    filters.push(`(
      p.id LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR p.name LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR p.author LIKE ? ESCAPE '\\' COLLATE NOCASE
    )`);
    values.push(pattern, pattern, pattern);
  }
  const sql = `
    SELECT p.id, p.name, p.description, p.author, p.icon_url,
           r.version AS latest_version, p.updated_at,
           r.manifest_sha256, r.manifest_json,
           r.minimum_ios_version, r.minimum_tvos_version,
           (SELECT COUNT(*) FROM plugin_installations i WHERE i.plugin_id = p.id) AS install_count
    FROM plugins p
    JOIN plugin_releases r ON r.id = p.published_release_id
    WHERE ${filters.join(" AND ")}
  `;
  const result = await db.prepare(sql).bind(...values).all<CatalogRow>();
  const compatible = result.results.filter((row) => isCompatible(row, options));
  compatible.sort((lhs, rhs) => {
    const comparison = options.sort === "downloads"
      ? lhs.install_count - rhs.install_count
      : lhs.updated_at.localeCompare(rhs.updated_at);
    if (comparison !== 0) {
      return options.order === "asc" ? comparison : -comparison;
    }
    return lhs.id.localeCompare(rhs.id);
  });
  const total = compatible.length;
  const start = (options.page - 1) * options.pageSize;
  const items = compatible.slice(start, start + options.pageSize);

  return {
    items: items.map((row) => ({
      ...toCatalogItem(row),
      _manifest_json: row.manifest_json,
    })),
    total,
    page: options.page,
    page_size: options.pageSize,
    total_pages: total === 0 ? 0 : Math.ceil(total / options.pageSize),
  };
}

export async function listAdminPlugins(
  db: D1Database,
  limit: number,
  cursor: CatalogCursor | null,
) {
  const cursorClause = cursor
    ? "WHERE p.updated_at < ? OR (p.updated_at = ? AND p.id > ?)"
    : "";
  const sql = `
    SELECT p.id, p.name, p.description, p.author, p.icon_url,
           r.version AS latest_version, p.updated_at, r.manifest_sha256,
           r.manifest_json, r.supports_ios, r.supports_tvos,
           r.minimum_ios_version, r.minimum_tvos_version,
           (SELECT COUNT(*) FROM plugin_installations i WHERE i.plugin_id = p.id) AS install_count
    FROM plugins p
    JOIN plugin_releases r ON r.id = p.published_release_id
    ${cursorClause}
    ORDER BY p.updated_at DESC, p.id ASC
    LIMIT ?
  `;
  const values = cursor
    ? [cursor.updatedAt, cursor.updatedAt, cursor.id, limit + 1]
    : [limit + 1];
  const result = await db.prepare(sql).bind(...values).all<AdminCatalogRow>();
  const rows = result.results.slice(0, limit);
  const last = rows.at(-1);

  return {
    items: rows.map(toAdminCatalogItem),
    next_cursor: result.results.length > limit && last
      ? encodeCursor({ updatedAt: last.updated_at, id: last.id })
      : null,
  };
}

export async function getAdminUserStats(db: D1Database) {
  const counts = await db.prepare(`
    SELECT COUNT(*) AS total_users,
           SUM(CASE WHEN is_whitelisted = 1 THEN 1 ELSE 0 END) AS whitelisted_users
    FROM users
  `).first<{ total_users: number; whitelisted_users: number | null }>();
  const privateCounts = await db.prepare(`
    SELECT COUNT(*) AS private_plugins
    FROM plugin_drafts
    WHERE is_private = 1
  `).first<{ private_plugins: number }>();
  const contributors = await db.prepare(`
    ${adminUserSelect()}
    WHERE EXISTS (
      SELECT 1
      FROM plugin_submissions accepted
      WHERE accepted.user_id = u.id AND accepted.status = 'accepted'
    )
    ORDER BY contribution_count DESC, u.created_at ASC, u.id ASC
    LIMIT 5
  `).all<AdminUserRow>();
  return {
    total_users: counts?.total_users ?? 0,
    whitelisted_users: counts?.whitelisted_users ?? 0,
    private_plugins: privateCounts?.private_plugins ?? 0,
    top_contributors: contributors.results.map(toAdminUser),
  };
}

export async function listPluginTypes(db: D1Database) {
  const result = await db.prepare(`
    SELECT value, name, created_at, updated_at
    FROM plugin_types
    ORDER BY name COLLATE NOCASE ASC, value COLLATE NOCASE ASC
  `).all<{
    value: string;
    name: string;
    created_at: string;
    updated_at: string;
  }>();
  return { items: result.results };
}

export async function upsertPluginType(
  db: D1Database,
  type: { value: string; name: string },
) {
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO plugin_types (value, name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(value) DO UPDATE SET
      name = excluded.name,
      updated_at = excluded.updated_at
  `).bind(type.value, type.name, now, now).run();
  return { ...type, updated_at: now };
}

export async function deletePluginType(db: D1Database, value: string): Promise<void> {
  const used = await db.prepare(`
    SELECT 1 AS found
    WHERE EXISTS (
      SELECT 1 FROM plugin_drafts
      WHERE json_extract(manifest_json, '$.type') = ?
    ) OR EXISTS (
      SELECT 1 FROM plugin_submissions
      WHERE json_extract(manifest_json, '$.type') = ?
    ) OR EXISTS (
      SELECT 1 FROM plugin_releases
      WHERE json_extract(manifest_json, '$.type') = ?
    )
  `).bind(value, value, value).first<{ found: number }>();
  if (used !== null) {
    throw new HTTPError(
      409,
      "plugin_type_in_use",
      "This plugin type is used by an existing plugin and cannot be deleted.",
    );
  }
  const result = await db.prepare("DELETE FROM plugin_types WHERE value = ?")
    .bind(value).run();
  if ((result.meta.changes ?? 0) === 0) {
    throw new HTTPError(404, "plugin_type_not_found", "Plugin type not found.");
  }
}

export async function requirePluginTypeExists(
  db: D1Database,
  value: unknown,
): Promise<void> {
  if (typeof value !== "string") {
    throw new HTTPError(400, "invalid_plugin_type", "manifest.type is invalid.");
  }
  const row = await db.prepare("SELECT 1 AS found FROM plugin_types WHERE value = ?")
    .bind(value).first<{ found: number }>();
  if (row === null) {
    throw new HTTPError(
      400,
      "invalid_plugin_type",
      `Plugin type ${value} is not configured.`,
    );
  }
}

export async function listAdminUsers(
  db: D1Database,
  search: string | null,
  page = 1,
  pageSize = 20,
) {
  const filter = search === null
    ? ""
    : `WHERE u.email LIKE ? ESCAPE '\\' COLLATE NOCASE
       OR u.nick LIKE ? ESCAPE '\\' COLLATE NOCASE`;
  const pattern = search === null ? [] : [`%${escapeLike(search)}%`, `%${escapeLike(search)}%`];
  const count = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM users u
    ${filter}
  `).bind(...pattern).first<{ total: number }>();
  const total = count?.total ?? 0;
  const result = await db.prepare(`
    ${adminUserSelect()}
    ${filter}
    ORDER BY u.is_whitelisted DESC, contribution_count DESC, u.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...pattern, pageSize, (page - 1) * pageSize).all<AdminUserRow>();
  return {
    items: result.results.map(toAdminUser),
    page,
    page_size: pageSize,
    total,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function setUserWhitelist(
  db: D1Database,
  userID: string,
  enabled: boolean,
) {
  const result = await db.prepare(
    "UPDATE users SET is_whitelisted = ? WHERE id = ?",
  ).bind(enabled ? 1 : 0, userID).run();
  if ((result.meta.changes ?? 0) === 0) {
    throw new HTTPError(404, "user_not_found", "User not found.");
  }
  return { id: userID, whitelisted: enabled };
}

export async function getManifest(
  db: D1Database,
  pluginID: string,
): Promise<ManifestRow | null> {
  return db.prepare(`
    SELECT r.manifest_json, r.manifest_sha256
    FROM plugins p
    JOIN plugin_releases r ON r.id = p.published_release_id
    WHERE p.id = ?
  `).bind(pluginID).first<ManifestRow>();
}

export async function checkPluginUpdates(
  db: D1Database,
  request: UpdateCheckRequest,
) {
  const placeholders = request.plugins.map(() => "?").join(", ");
  const rows = await db.prepare(`
    SELECT p.id, r.version AS latest_version, r.manifest_json,
           r.manifest_sha256, r.supports_ios, r.supports_tvos,
           r.minimum_ios_version, r.minimum_tvos_version
    FROM plugins p
    JOIN plugin_releases r ON r.id = p.published_release_id
    WHERE p.id IN (${placeholders})
  `).bind(...request.plugins.map((plugin) => plugin.id)).all<UpdateCheckRow>();
  const published = new Map(rows.results.map((row) => [row.id, row]));
  let updateCount = 0;

  const items = request.plugins.map((plugin) => {
    const row = published.get(plugin.id);
    if (row === undefined) {
      return {
        id: plugin.id,
        current_version: plugin.version,
        latest_version: null,
        update_available: false,
        status: "not_found" as const,
        manifest: null,
        manifest_sha256: null,
      };
    }

    const supportsPlatform = request.platform === "ios"
      ? row.supports_ios === 1
      : row.supports_tvos === 1;
    const minimumVersion = request.platform === "ios"
      ? row.minimum_ios_version
      : row.minimum_tvos_version;
    if (!supportsPlatform || !isVersionAtLeast(request.app_version, minimumVersion)) {
      return {
        id: plugin.id,
        current_version: plugin.version,
        latest_version: row.latest_version,
        update_available: false,
        status: "incompatible" as const,
        manifest: null,
        manifest_sha256: null,
        _manifest_json: row.manifest_json,
      };
    }

    if (compareVersions(row.latest_version, plugin.version) > 0) {
      updateCount += 1;
      return {
        id: plugin.id,
        current_version: plugin.version,
        latest_version: row.latest_version,
        update_available: true,
        status: "update_available" as const,
        manifest: JSON.parse(row.manifest_json) as Record<string, unknown>,
        manifest_sha256: row.manifest_sha256,
        _manifest_json: row.manifest_json,
      };
    }

    return {
      id: plugin.id,
      current_version: plugin.version,
      latest_version: row.latest_version,
      update_available: false,
      status: "up_to_date" as const,
      manifest: null,
      manifest_sha256: row.manifest_sha256,
      _manifest_json: row.manifest_json,
    };
  });

  return { items, update_count: updateCount };
}

export async function pluginExists(db: D1Database, pluginID: string): Promise<boolean> {
  const row = await db.prepare(
    "SELECT 1 AS found FROM plugins WHERE id = ? AND published_release_id IS NOT NULL",
  ).bind(pluginID).first<{ found: number }>();
  return row !== null;
}

export async function getPublishedPlugin(
  db: D1Database,
  pluginID: string,
): Promise<PublishedPluginRow | null> {
  return db.prepare(`
    SELECT r.version AS latest_version, r.manifest_json
    FROM plugins p
    JOIN plugin_releases r ON r.id = p.published_release_id
    WHERE p.id = ?
  `).bind(pluginID).first<PublishedPluginRow>();
}

export async function getLatestPluginRelease(
  db: D1Database,
  pluginID: string,
): Promise<PublishedPluginRow | null> {
  return db.prepare(`
    SELECT version AS latest_version, manifest_json
    FROM plugin_releases
    WHERE plugin_id = ?
    ORDER BY published_at DESC, id DESC
    LIMIT 1
  `).bind(pluginID).first<PublishedPluginRow>();
}

export async function unpublishPlugin(
  db: D1Database,
  pluginID: string,
  reason: string,
): Promise<boolean> {
  const published = await getPublishedPlugin(db, pluginID);
  if (published === null) {
    return false;
  }
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(`
      UPDATE plugin_submissions
      SET status = 'rejected', rejection_reason = ?, reviewed_at = ?
      WHERE plugin_id = ? AND version = ? AND status = 'accepted'
    `).bind(reason, now, pluginID, published.latest_version),
    db.prepare(`
      UPDATE plugins
      SET published_release_id = NULL, updated_at = ?
      WHERE id = ? AND published_release_id IS NOT NULL
    `).bind(now, pluginID),
  ]);
  return true;
}

export async function unpublishOwnedPlugin(
  db: D1Database,
  pluginID: string,
  userID: string,
): Promise<boolean> {
  const result = await db.prepare(`
    UPDATE plugins
    SET published_release_id = NULL, updated_at = ?
    WHERE id = ?
      AND published_release_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM plugin_owners o
        WHERE o.plugin_id = plugins.id AND o.user_id = ?
      )
  `).bind(new Date().toISOString(), pluginID, userID).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function deleteOwnedPlugin(
  db: D1Database,
  pluginID: string,
  userID: string,
): Promise<void> {
  const owner = await db.prepare(
    "SELECT user_id FROM plugin_owners WHERE plugin_id = ?",
  ).bind(pluginID).first<{ user_id: string }>();
  if (owner === null || owner.user_id !== userID) {
    throw new HTTPError(404, "plugin_not_found", "Plugin not found.");
  }
  await db.batch([
    db.prepare(
      "UPDATE plugins SET published_release_id = NULL WHERE id = ?",
    ).bind(pluginID),
    db.prepare("DELETE FROM plugins WHERE id = ?").bind(pluginID),
    db.prepare(
      "DELETE FROM plugin_owners WHERE plugin_id = ? AND user_id = ?",
    ).bind(pluginID, userID),
  ]);
}

export async function claimPluginID(
  db: D1Database,
  pluginID: string,
  userID: string,
): Promise<void> {
  const owner = await db.prepare(
    "SELECT user_id FROM plugin_owners WHERE plugin_id = ?",
  ).bind(pluginID).first<{ user_id: string }>();
  if (owner !== null) {
    if (owner.user_id !== userID) {
      throw new HTTPError(409, "plugin_id_taken", "The plugin ID belongs to another user.");
    }
    return;
  }
  if (await pluginExists(db, pluginID)) {
    throw new HTTPError(409, "plugin_id_taken", "The plugin ID is already published.");
  }
  try {
    await db.prepare(`
      INSERT INTO plugin_owners (plugin_id, user_id, created_at)
      VALUES (?, ?, ?)
    `).bind(pluginID, userID, new Date().toISOString()).run();
  } catch {
    const current = await db.prepare(
      "SELECT user_id FROM plugin_owners WHERE plugin_id = ?",
    ).bind(pluginID).first<{ user_id: string }>();
    if (current?.user_id !== userID) {
      throw new HTTPError(409, "plugin_id_taken", "The plugin ID belongs to another user.");
    }
  }
}

export async function requirePluginOwnership(
  db: D1Database,
  pluginID: string,
  userID: string,
): Promise<void> {
  const owner = await db.prepare(
    "SELECT user_id FROM plugin_owners WHERE plugin_id = ?",
  ).bind(pluginID).first<{ user_id: string }>();
  if (owner === null) {
    throw new HTTPError(404, "plugin_not_found", "Plugin not found.");
  }
  if (owner.user_id !== userID) {
    throw new HTTPError(409, "plugin_id_taken", "The plugin ID belongs to another user.");
  }
}

export async function createPluginSubmission(
  db: D1Database,
  userID: string,
  request: PublishRequest,
  metadata: PluginManifestMetadata,
  manifestJSON: string,
): Promise<string> {
  const pending = await db.prepare(`
    SELECT 1 AS found FROM plugin_submissions
    WHERE plugin_id = ? AND status = 'pending'
  `).bind(metadata.id).first<{ found: number }>();
  if (pending !== null) {
    throw new HTTPError(
      409,
      "review_already_pending",
      "This plugin already has a submission waiting for review.",
    );
  }
  const latestRelease = await getLatestPluginRelease(db, metadata.id);
  if (latestRelease !== null) {
    const currentManifest = JSON.parse(latestRelease.manifest_json) as Record<string, unknown>;
    if (metadata.author !== currentManifest.author || request.manifest.type !== currentManifest.type) {
      throw new HTTPError(409, "immutable_field", "Plugin type and author cannot be changed.");
    }
    if (isVersionAtLeast(latestRelease.latest_version, metadata.version)) {
      throw new HTTPError(
        409,
        "version_not_incremented",
        `manifest.version must be greater than ${latestRelease.latest_version}.`,
      );
    }
  }
  const id = crypto.randomUUID();
  const platforms = new Set(request.platforms ?? ["ios", "tvos"]);
  await db.prepare(`
    INSERT INTO plugin_submissions (
      id, plugin_id, user_id, version, manifest_json,
      supports_ios, supports_tvos, minimum_ios_version, minimum_tvos_version,
      status, rejection_reason, submitted_at, reviewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, NULL)
  `).bind(
    id,
    metadata.id,
    userID,
    metadata.version,
    manifestJSON,
    platforms.has("ios") ? 1 : 0,
    platforms.has("tvos") ? 1 : 0,
    request.minimum_ios_version ?? null,
    request.minimum_tvos_version ?? null,
    new Date().toISOString(),
  ).run();
  return id;
}

export async function savePluginDraft(
  db: D1Database,
  userID: string,
  request: PublishRequest,
  metadata: PluginManifestMetadata,
  manifestJSON: string,
): Promise<string> {
  const savedAt = new Date().toISOString();
  const platforms = new Set(request.platforms ?? ["ios", "tvos"]);
  await db.prepare(`
    INSERT INTO plugin_drafts (
      plugin_id, user_id, manifest_json, supports_ios, supports_tvos,
      minimum_ios_version, minimum_tvos_version, saved_at, is_private
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(plugin_id) DO UPDATE SET
      manifest_json = excluded.manifest_json,
      supports_ios = excluded.supports_ios,
      supports_tvos = excluded.supports_tvos,
      minimum_ios_version = excluded.minimum_ios_version,
      minimum_tvos_version = excluded.minimum_tvos_version,
      is_private = excluded.is_private,
      saved_at = excluded.saved_at
    WHERE plugin_drafts.user_id = excluded.user_id
  `).bind(
    metadata.id,
    userID,
    manifestJSON,
    platforms.has("ios") ? 1 : 0,
    platforms.has("tvos") ? 1 : 0,
    request.minimum_ios_version ?? null,
    request.minimum_tvos_version ?? null,
    savedAt,
    request.visibility === "private" ? 1 : 0,
  ).run();
  return savedAt;
}

export async function importPluginDrafts(
  db: D1Database,
  userID: string,
  drafts: Array<{
    request: PublishRequest;
    metadata: PluginManifestMetadata;
    manifestJSON: string;
  }>,
): Promise<Array<{
  plugin_id: string;
  status: "draft" | "private";
  visibility: "public" | "private";
  saved_at: string;
}>> {
  const savedAt = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  for (const draft of drafts) {
    const platforms = new Set(draft.request.platforms ?? ["ios", "tvos"]);
    statements.push(
      db.prepare(`
        INSERT INTO plugin_owners (plugin_id, user_id, created_at)
        VALUES (?, ?, ?)
      `).bind(draft.metadata.id, userID, savedAt),
      db.prepare(`
        INSERT INTO plugin_drafts (
          plugin_id, user_id, manifest_json, supports_ios, supports_tvos,
          minimum_ios_version, minimum_tvos_version, saved_at, is_private
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        draft.metadata.id,
        userID,
        draft.manifestJSON,
        platforms.has("ios") ? 1 : 0,
        platforms.has("tvos") ? 1 : 0,
        draft.request.minimum_ios_version ?? null,
        draft.request.minimum_tvos_version ?? null,
        savedAt,
        draft.request.visibility === "private" ? 1 : 0,
      ),
    );
  }
  await db.batch(statements);
  return drafts.map((draft) => ({
    plugin_id: draft.metadata.id,
    status: draft.request.visibility === "private" ? "private" : "draft",
    visibility: draft.request.visibility === "private" ? "private" : "public",
    saved_at: savedAt,
  }));
}

export async function submitAllPluginDrafts(
  db: D1Database,
  userID: string,
): Promise<Array<{
  submission_id: string;
  plugin_id: string;
  status: "pending";
}>> {
  const result = await db.prepare(`
    SELECT d.plugin_id, d.manifest_json, d.supports_ios, d.supports_tvos,
           d.minimum_ios_version, d.minimum_tvos_version, d.is_private,
           pending.id AS pending_submission_id,
           latest.version AS latest_version,
           latest.manifest_json AS latest_manifest_json
    FROM plugin_drafts d
    LEFT JOIN plugin_submissions pending
      ON pending.plugin_id = d.plugin_id AND pending.status = 'pending'
    LEFT JOIN plugin_releases latest ON latest.id = (
      SELECT release.id
      FROM plugin_releases release
      WHERE release.plugin_id = d.plugin_id
      ORDER BY release.published_at DESC, release.id DESC
      LIMIT 1
    )
    WHERE d.user_id = ? AND d.is_private = 0
    ORDER BY d.saved_at ASC, d.plugin_id ASC
  `).bind(userID).all<DraftSubmissionRow>();
  if (result.results.length === 0) {
    return [];
  }

  const submittedAt = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  const items = result.results.map((draft) => {
    if (draft.pending_submission_id !== null) {
      throw new HTTPError(
        409,
        "review_already_pending",
        `Plugin ${draft.plugin_id} already has a submission waiting for review.`,
      );
    }
    const manifest = JSON.parse(draft.manifest_json) as Record<string, unknown>;
    const version = typeof manifest.version === "string" ? manifest.version : "";
    if (draft.latest_version !== null && draft.latest_manifest_json !== null) {
      const latestManifest = JSON.parse(
        draft.latest_manifest_json,
      ) as Record<string, unknown>;
      if (manifest.type !== latestManifest.type || manifest.author !== latestManifest.author) {
        throw new HTTPError(
          409,
          "immutable_field",
          `Plugin ${draft.plugin_id} cannot change its type or author.`,
        );
      }
      if (compareVersions(version, draft.latest_version) <= 0) {
        throw new HTTPError(
          409,
          "version_not_incremented",
          `Plugin ${draft.plugin_id} version must be greater than ${draft.latest_version}.`,
        );
      }
    }

    const submissionID = crypto.randomUUID();
    const manifestJSON = JSON.stringify({ ...manifest, update_time: submittedAt });
    statements.push(
      db.prepare(`
        INSERT INTO plugin_submissions (
          id, plugin_id, user_id, version, manifest_json,
          supports_ios, supports_tvos, minimum_ios_version, minimum_tvos_version,
          status, rejection_reason, submitted_at, reviewed_at, cancelled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, NULL, NULL)
      `).bind(
        submissionID,
        draft.plugin_id,
        userID,
        version,
        manifestJSON,
        draft.supports_ios,
        draft.supports_tvos,
        draft.minimum_ios_version,
        draft.minimum_tvos_version,
        submittedAt,
      ),
      db.prepare(
        "DELETE FROM plugin_drafts WHERE plugin_id = ? AND user_id = ?",
      ).bind(draft.plugin_id, userID),
    );
    return {
      submission_id: submissionID,
      plugin_id: draft.plugin_id,
      status: "pending" as const,
    };
  });

  await db.batch(statements);
  return items;
}

export async function deletePluginDraft(
  db: D1Database,
  pluginID: string,
  userID: string,
): Promise<void> {
  await db.prepare(
    "DELETE FROM plugin_drafts WHERE plugin_id = ? AND user_id = ?",
  ).bind(pluginID, userID).run();
}

export async function getPluginDraftVisibility(
  db: D1Database,
  pluginID: string,
  userID: string,
): Promise<"public" | "private" | null> {
  const row = await db.prepare(`
    SELECT d.is_private,
           EXISTS (
             SELECT 1 FROM plugin_submissions s
             WHERE s.plugin_id = o.plugin_id
           ) AS has_public_submission
    FROM plugin_owners o
    LEFT JOIN plugin_drafts d
      ON d.plugin_id = o.plugin_id AND d.user_id = o.user_id
    WHERE o.plugin_id = ? AND o.user_id = ?
  `).bind(pluginID, userID).first<{
    is_private: number | null;
    has_public_submission: number;
  }>();
  if (row === null) {
    return null;
  }
  if (row.is_private !== null) {
    return row.is_private === 1 ? "private" : "public";
  }
  return row.has_public_submission === 1 ? "public" : null;
}

export async function listUserSubmissions(db: D1Database, userID: string) {
  const result = await db.prepare(`
    SELECT s.id, s.plugin_id, s.user_id, u.email, u.nick, s.version,
           s.manifest_json, s.supports_ios, s.supports_tvos,
           s.minimum_ios_version, s.minimum_tvos_version, s.status,
           s.rejection_reason, s.submitted_at, s.reviewed_at, s.cancelled_at,
           current_release.version AS published_version,
           (
             SELECT release.version
             FROM plugin_releases release
             WHERE release.plugin_id = s.plugin_id
             ORDER BY release.published_at DESC, release.id DESC
             LIMIT 1
           ) AS approved_version
    FROM plugin_submissions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN plugins p ON p.id = s.plugin_id
    LEFT JOIN plugin_releases current_release ON current_release.id = p.published_release_id
    WHERE s.user_id = ?
    ORDER BY s.submitted_at DESC
    LIMIT 100
  `).bind(userID).all<PluginSubmissionRow>();
  const plugins = new Map<string, UserPluginItem>();
  for (const row of result.results) {
    const submission = toSubmissionItem(row);
    const plugin = plugins.get(row.plugin_id);
    if (plugin) {
      plugin.history.push(submission);
    } else {
      plugins.set(row.plugin_id, { ...submission, history: [submission] });
    }
  }
  const drafts = await db.prepare(`
    SELECT d.plugin_id, d.user_id, u.email, u.nick, d.manifest_json,
           d.supports_ios, d.supports_tvos,
           d.minimum_ios_version, d.minimum_tvos_version, d.saved_at, d.is_private,
           current_release.version AS published_version,
           (
             SELECT release.version
             FROM plugin_releases release
             WHERE release.plugin_id = d.plugin_id
             ORDER BY release.published_at DESC, release.id DESC
             LIMIT 1
           ) AS approved_version
    FROM plugin_drafts d
    JOIN users u ON u.id = d.user_id
    LEFT JOIN plugins p ON p.id = d.plugin_id
    LEFT JOIN plugin_releases current_release ON current_release.id = p.published_release_id
    WHERE d.user_id = ?
    ORDER BY d.saved_at DESC
  `).bind(userID).all<PluginDraftRow>();
  for (const row of drafts.results) {
    const existing = plugins.get(row.plugin_id);
    const manifest = JSON.parse(row.manifest_json) as Record<string, unknown>;
    plugins.set(row.plugin_id, {
      id: existing?.id ?? `draft:${row.plugin_id}`,
      plugin_id: row.plugin_id,
      user: { id: row.user_id, email: row.email, nick: row.nick },
      version: typeof manifest.version === "string" ? manifest.version : "",
      manifest,
      platforms: [
        ...(row.supports_ios === 1 ? ["ios"] : []),
        ...(row.supports_tvos === 1 ? ["tvos"] : []),
      ],
      minimum_ios_version: row.minimum_ios_version,
      minimum_tvos_version: row.minimum_tvos_version,
      status: row.is_private === 1 ? "private" : "draft",
      visibility: row.is_private === 1 ? "private" : "public",
      rejection_reason: null,
      submitted_at: row.saved_at,
      reviewed_at: null,
      cancelled_at: null,
      published_version: row.published_version,
      approved_version: row.approved_version,
      history: existing?.history ?? [],
    });
  }
  return {
    items: [...plugins.values()].sort(
      (lhs, rhs) => rhs.submitted_at.localeCompare(lhs.submitted_at),
    ),
  };
}

export async function listPendingSubmissions(db: D1Database, limit: number) {
  const result = await db.prepare(`
    SELECT s.id, s.plugin_id, s.user_id, u.email, u.nick, s.version,
           s.manifest_json, s.supports_ios, s.supports_tvos,
           s.minimum_ios_version, s.minimum_tvos_version, s.status,
           s.rejection_reason, s.submitted_at, s.reviewed_at, s.cancelled_at
    FROM plugin_submissions s
    JOIN users u ON u.id = s.user_id
    WHERE s.status = 'pending'
    ORDER BY s.submitted_at ASC
    LIMIT ?
  `).bind(limit).all<PluginSubmissionRow>();
  return { items: result.results.map(toSubmissionItem) };
}

export async function getPendingSubmission(
  db: D1Database,
  submissionID: string,
): Promise<PluginSubmissionRow | null> {
  return db.prepare(`
    SELECT s.id, s.plugin_id, s.user_id, u.email, u.nick, s.version,
           s.manifest_json, s.supports_ios, s.supports_tvos,
           s.minimum_ios_version, s.minimum_tvos_version, s.status,
           s.rejection_reason, s.submitted_at, s.reviewed_at, s.cancelled_at
    FROM plugin_submissions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.status = 'pending'
  `).bind(submissionID).first<PluginSubmissionRow>();
}

export async function acceptPluginSubmission(
  db: D1Database,
  submissionID: string,
  request: PublishRequest,
  metadata: PluginManifestMetadata,
  manifestJSON: string,
  checksum: string,
): Promise<void> {
  const markAccepted = db.prepare(`
    UPDATE plugin_submissions
    SET status = 'accepted', rejection_reason = NULL, reviewed_at = ?
    WHERE id = ? AND status = 'pending'
  `).bind(new Date().toISOString(), submissionID);
  await db.batch([
    ...buildPublishStatements(db, request, metadata, manifestJSON, checksum),
    markAccepted,
  ]);
}

export async function rejectSubmission(
  db: D1Database,
  submissionID: string,
  reason: string,
): Promise<boolean> {
  const result = await db.prepare(`
    UPDATE plugin_submissions
    SET status = 'rejected', rejection_reason = ?, reviewed_at = ?
    WHERE id = ? AND status = 'pending'
  `).bind(reason, new Date().toISOString(), submissionID).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function cancelSubmission(
  db: D1Database,
  submissionID: string,
  userID: string,
): Promise<boolean> {
  const result = await db.prepare(`
    UPDATE plugin_submissions
    SET status = 'cancelled', rejection_reason = NULL, cancelled_at = ?
    WHERE id = ? AND user_id = ? AND status = 'pending'
  `).bind(new Date().toISOString(), submissionID, userID).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function recordInstallEvent(
  db: D1Database,
  event: InstallEvent,
): Promise<void> {
  const receivedAt = new Date().toISOString();
  const insertEvent = db.prepare(`
    INSERT OR IGNORE INTO plugin_install_events (
      event_id, plugin_id, installation_id, action, from_version, to_version,
      app_version, platform, occurred_at, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    event.event_id,
    event.plugin_id,
    event.installation_id,
    event.action,
    event.from_version,
    event.to_version,
    event.app_version,
    event.platform,
    event.occurred_at,
    receivedAt,
  );

  if (event.action !== "install") {
    await insertEvent.run();
    return;
  }

  const insertInstallation = db.prepare(`
    INSERT OR IGNORE INTO plugin_installations (plugin_id, installation_id, installed_at)
    SELECT ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM plugin_install_events WHERE event_id = ?
    )
  `).bind(event.plugin_id, event.installation_id, receivedAt, event.event_id);
  await db.batch([insertInstallation, insertEvent]);
}

function buildPublishStatements(
  db: D1Database,
  request: PublishRequest,
  metadata: PluginManifestMetadata,
  manifestJSON: string,
  checksum: string,
): D1PreparedStatement[] {
  const now = new Date().toISOString();
  const platforms = new Set(request.platforms ?? ["ios", "tvos"]);
  const upsertPlugin = db.prepare(`
    INSERT INTO plugins (
      id, name, description, author, icon_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      author = excluded.author,
      icon_url = excluded.icon_url,
      updated_at = excluded.updated_at
  `).bind(
    metadata.id,
    metadata.name,
    metadata.description,
    metadata.author,
    metadata.iconURL,
    now,
    now,
  );
  const upsertRelease = db.prepare(`
    INSERT INTO plugin_releases (
      plugin_id, version, manifest_json, manifest_sha256,
      supports_ios, supports_tvos, minimum_ios_version,
      minimum_tvos_version, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(plugin_id, version) DO UPDATE SET
      manifest_json = excluded.manifest_json,
      manifest_sha256 = excluded.manifest_sha256,
      supports_ios = excluded.supports_ios,
      supports_tvos = excluded.supports_tvos,
      minimum_ios_version = excluded.minimum_ios_version,
      minimum_tvos_version = excluded.minimum_tvos_version,
      published_at = excluded.published_at
  `).bind(
    metadata.id,
    metadata.version,
    manifestJSON,
    checksum,
    platforms.has("ios") ? 1 : 0,
    platforms.has("tvos") ? 1 : 0,
    request.minimum_ios_version ?? null,
    request.minimum_tvos_version ?? null,
    now,
  );
  const publishRelease = db.prepare(`
    UPDATE plugins
    SET published_release_id = (
      SELECT id FROM plugin_releases WHERE plugin_id = ? AND version = ?
    ), updated_at = ?
    WHERE id = ?
  `).bind(metadata.id, metadata.version, now, metadata.id);

  return [upsertPlugin, upsertRelease, publishRelease];
}

export function decodeCursor(value: string | null): CatalogCursor | null {
  if (value === null) {
    return null;
  }

  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(padded)) as unknown;
    if (!isRecord(parsed) || typeof parsed.updatedAt !== "string" || typeof parsed.id !== "string") {
      throw new Error("Malformed cursor");
    }
    return { updatedAt: parsed.updatedAt, id: parsed.id };
  } catch {
    throw new HTTPError(400, "invalid_cursor", "The pagination cursor is invalid.");
  }
}

function encodeCursor(cursor: CatalogCursor): string {
  return btoa(JSON.stringify(cursor))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function isCompatible(row: CatalogRow, options: ListOptions): boolean {
  const minimum = options.platform === "ios"
    ? row.minimum_ios_version
    : row.minimum_tvos_version;
  return isVersionAtLeast(options.appVersion, minimum);
}

function toCatalogItem(row: CatalogRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    author: row.author,
    icon_url: row.icon_url,
    latest_version: row.latest_version,
    updated_at: row.updated_at,
    install_count: row.install_count,
    manifest_sha256: row.manifest_sha256,
  };
}

function toAdminCatalogItem(row: AdminCatalogRow) {
  return {
    ...toCatalogItem(row),
    manifest: JSON.parse(row.manifest_json) as unknown,
    platforms: [
      ...(row.supports_ios === 1 ? ["ios"] : []),
      ...(row.supports_tvos === 1 ? ["tvos"] : []),
    ],
    minimum_ios_version: row.minimum_ios_version,
    minimum_tvos_version: row.minimum_tvos_version,
  };
}

function toSubmissionItem(row: PluginSubmissionRow) {
  return {
    id: row.id,
    plugin_id: row.plugin_id,
    user: { id: row.user_id, email: row.email, nick: row.nick },
    version: row.version,
    manifest: JSON.parse(row.manifest_json) as unknown,
    platforms: [
      ...(row.supports_ios === 1 ? ["ios"] : []),
      ...(row.supports_tvos === 1 ? ["tvos"] : []),
    ],
    minimum_ios_version: row.minimum_ios_version,
    minimum_tvos_version: row.minimum_tvos_version,
    status: row.status,
    visibility: "public" as const,
    rejection_reason: row.rejection_reason,
    submitted_at: row.submitted_at,
    reviewed_at: row.reviewed_at,
    cancelled_at: row.cancelled_at,
    published_version: row.published_version,
    approved_version: row.approved_version,
  };
}

function adminUserSelect(): string {
  return `
    SELECT u.id, u.email, u.nick, u.created_at, u.is_whitelisted,
           (
             SELECT COUNT(DISTINCT submission.plugin_id)
             FROM plugin_submissions submission
             WHERE submission.user_id = u.id AND submission.status = 'accepted'
           ) AS contribution_count
    FROM users u
  `;
}

function toAdminUser(row: AdminUserRow) {
  return {
    id: row.id,
    email: row.email,
    nick: row.nick,
    created_at: row.created_at,
    whitelisted: row.is_whitelisted === 1,
    contribution_count: row.contribution_count,
  };
}

function escapeLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
