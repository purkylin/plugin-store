import { HTTPError } from "./http";
import type {
  InstallAction,
  InstallEvent,
  Platform,
  PluginVisibility,
  PluginManifestMetadata,
  PublishRequest,
  UpdateCheckRequest,
} from "./types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pluginIDPattern = /^[A-Za-z0-9._-]{1,200}$/;
const versionPattern = /^\d+(?:\.\d+)*(?:-[0-9A-Za-z.-]+)?$/;

export function parsePlatform(value: string | null): Platform {
  if (value === "ios" || value === "tvos") {
    return value;
  }
  throw new HTTPError(400, "invalid_platform", "platform must be ios or tvos.");
}

export function parseVersion(value: string | null, field = "app_version"): string {
  if (value !== null && versionPattern.test(value)) {
    return value;
  }
  throw new HTTPError(400, "invalid_version", `${field} must be a numeric dotted version.`);
}

export function parseLimit(value: string | null): number {
  if (value === null) {
    return 100;
  }
  const limit = Number(value);
  if (Number.isInteger(limit) && limit >= 1 && limit <= 100) {
    return limit;
  }
  throw new HTTPError(400, "invalid_limit", "limit must be an integer from 1 through 100.");
}

export function parsePage(value: string | null): number {
  if (value === null) {
    return 1;
  }
  const page = Number(value);
  if (Number.isInteger(page) && page >= 1) {
    return page;
  }
  throw new HTTPError(400, "invalid_page", "page must be a positive integer.");
}

export function parsePageSize(value: string | null): number {
  if (value === null) {
    return 20;
  }
  const pageSize = Number(value);
  if (Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 100) {
    return pageSize;
  }
  throw new HTTPError(400, "invalid_page_size", "page_size must be an integer from 1 through 100.");
}

export function parseCatalogSort(value: string | null): "time" | "downloads" {
  if (value === null || value === "time" || value === "downloads") {
    return value ?? "time";
  }
  throw new HTTPError(400, "invalid_sort", "sort must be time or downloads.");
}

export function parseSortOrder(value: string | null): "asc" | "desc" {
  if (value === null || value === "asc" || value === "desc") {
    return value ?? "desc";
  }
  throw new HTTPError(400, "invalid_order", "order must be asc or desc.");
}

export function parseOptionalQuery(
  value: string | null,
  field: string,
  maxLength = 100,
): string | null {
  if (value === null || value.trim() === "") {
    return null;
  }
  const parsed = value.trim();
  if (parsed.length <= maxLength) {
    return parsed;
  }
  throw new HTTPError(400, "invalid_query", `${field} is too long.`);
}

export function parsePluginID(value: string): string {
  if (pluginIDPattern.test(value)) {
    return value;
  }
  throw new HTTPError(400, "invalid_plugin_id", "The plugin ID is invalid.");
}

export function parsePluginTypeRequest(value: unknown): { value: string; name: string } {
  const body = requireRecord(value);
  const typeValue = requireString(body.value, "value").trim();
  const name = requireString(body.name, "name").trim();
  if (!/^[a-z][a-z0-9._-]{0,39}$/.test(typeValue)) {
    throw new HTTPError(
      400,
      "invalid_plugin_type_value",
      "value must start with a lowercase letter and contain only lowercase letters, numbers, dots, underscores, or hyphens.",
    );
  }
  if (name.length > 60) {
    throw new HTTPError(400, "invalid_plugin_type_name", "name must not exceed 60 characters.");
  }
  return { value: typeValue, name };
}

export function parseInspectRequest(value: unknown): { url: string } {
  const body = requireRecord(value);
  const url = requireURL(body.url, "url");
  return { url };
}

export function parsePluginTypeValue(value: string): string {
  if (/^[a-z][a-z0-9._-]{0,39}$/.test(value)) {
    return value;
  }
  throw new HTTPError(400, "invalid_plugin_type_value", "The plugin type value is invalid.");
}

export function parseInstallEvent(value: unknown, pathID: string): InstallEvent {
  const body = requireRecord(value);
  const eventID = requireUUID(body.event_id, "event_id");
  const pluginID = requireString(body.plugin_id, "plugin_id");
  const installationID = requireUUID(body.installation_id, "installation_id");
  const action = requireAction(body.action);
  const appVersion = parseVersion(requireString(body.app_version, "app_version"));
  const platform = parsePlatform(requireString(body.platform, "platform"));
  const occurredAt = requireDate(body.occurred_at, "occurred_at");

  if (pluginID !== pathID) {
    throw new HTTPError(400, "plugin_id_mismatch", "Body plugin_id must match the URL.");
  }

  const fromVersion = optionalVersion(body.from_version, "from_version");
  const toVersion = optionalVersion(body.to_version, "to_version");
  validateVersionsForAction(action, fromVersion, toVersion);
  return {
    event_id: eventID,
    plugin_id: pluginID,
    installation_id: installationID,
    action,
    from_version: fromVersion,
    to_version: toVersion,
    app_version: appVersion,
    platform,
    occurred_at: occurredAt,
  };
}

export function parseUpdateCheckRequest(value: unknown): UpdateCheckRequest {
  const body = requireRecord(value);
  const platform = parsePlatform(requireString(body.platform, "platform"));
  const appVersion = parseVersion(
    requireString(body.app_version, "app_version"),
    "app_version",
  );
  if (!Array.isArray(body.plugins) || body.plugins.length === 0 || body.plugins.length > 100) {
    throw new HTTPError(
      400,
      "invalid_plugins",
      "plugins must be an array containing 1 through 100 items.",
    );
  }

  const seen = new Set<string>();
  const plugins = body.plugins.map((value, index) => {
    const plugin = requireRecord(value);
    const id = parsePluginID(requireString(plugin.id, `plugins[${index}].id`));
    if (seen.has(id)) {
      throw new HTTPError(
        400,
        "duplicate_plugin_id",
        `plugins contains duplicate id: ${id}.`,
      );
    }
    seen.add(id);
    return {
      id,
      version: parseVersion(
        requireString(plugin.version, `plugins[${index}].version`),
        `plugins[${index}].version`,
      ),
    };
  });
  return { platform, app_version: appVersion, plugins };
}

export function parsePublishRequest(
  value: unknown,
  pathID: string,
  publishedAt = new Date().toISOString(),
): { request: PublishRequest; metadata: PluginManifestMetadata } {
  const body = requireRecord(value);
  const manifest = {
    ...requireRecord(body.manifest),
    update_time: publishedAt,
  };
  const metadata = parseManifestMetadata(manifest);
  if (metadata.id !== pathID) {
    throw new HTTPError(400, "plugin_id_mismatch", "Manifest id must match the URL.");
  }

  const platforms = parsePlatforms(body.platforms);
  const visibility = parseVisibility(body.visibility);
  const minimumIOS = optionalVersion(body.minimum_ios_version, "minimum_ios_version");
  const minimumTVOS = optionalVersion(body.minimum_tvos_version, "minimum_tvos_version");
  return {
    request: {
      manifest,
      ...(visibility === "public" ? {} : { visibility }),
      ...(platforms === undefined ? {} : { platforms }),
      ...(minimumIOS === null ? {} : { minimum_ios_version: minimumIOS }),
      ...(minimumTVOS === null ? {} : { minimum_tvos_version: minimumTVOS }),
    },
    metadata,
  };
}

function parseVisibility(value: unknown): PluginVisibility {
  if (value === undefined || value === "public") {
    return "public";
  }
  if (value === "private") {
    return value;
  }
  throw new HTTPError(
    400,
    "invalid_visibility",
    "visibility must be public or private.",
  );
}

function parseManifestMetadata(manifest: Record<string, unknown>): PluginManifestMetadata {
  const id = parsePluginID(requireString(manifest.id, "manifest.id"));
  const name = requireString(manifest.name, "manifest.name");
  const description = requireString(manifest.desc, "manifest.desc");
  const author = requireString(manifest.author, "manifest.author");
  const version = parseVersion(requireString(manifest.version, "manifest.version"), "manifest.version");
  requireString(manifest.type, "manifest.type");
  requireDate(manifest.update_time, "manifest.update_time");

  let iconURL: string | null = null;
  if (manifest.icon !== undefined && manifest.icon !== null) {
    iconURL = requireURL(manifest.icon, "manifest.icon");
  }
  return { id, name, description, author, iconURL, version };
}

function parsePlatforms(value: unknown): Platform[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new HTTPError(400, "invalid_platforms", "platforms must be a non-empty array.");
  }

  const platforms = value.map((item) => parsePlatform(requireString(item, "platforms[]")));
  return [...new Set(platforms)];
}

function validateVersionsForAction(
  action: InstallAction,
  fromVersion: string | null,
  toVersion: string | null,
): void {
  if (action === "install" && toVersion === null) {
    throw new HTTPError(400, "missing_version", "Install events require to_version.");
  }
  if (action === "update" && (fromVersion === null || toVersion === null)) {
    throw new HTTPError(400, "missing_version", "Update events require both versions.");
  }
  if (action === "uninstall" && fromVersion === null) {
    throw new HTTPError(400, "missing_version", "Uninstall events require from_version.");
  }
}

function optionalVersion(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return parseVersion(requireString(value, field), field);
}

function requireAction(value: unknown): InstallAction {
  if (value === "install" || value === "update" || value === "uninstall") {
    return value;
  }
  throw new HTTPError(400, "invalid_action", "action must be install, update, or uninstall.");
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new HTTPError(400, "invalid_body", "Request body must be a JSON object.");
}

function requireString(value: unknown, field: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  throw new HTTPError(400, "invalid_field", `${field} must be a non-empty string.`);
}

function requireUUID(value: unknown, field: string): string {
  const text = requireString(value, field);
  if (uuidPattern.test(text)) {
    return text.toLowerCase();
  }
  throw new HTTPError(400, "invalid_uuid", `${field} must be a UUID.`);
}

function requireDate(value: unknown, field: string): string {
  const text = requireString(value, field);
  if (!Number.isNaN(Date.parse(text))) {
    return text;
  }
  throw new HTTPError(400, "invalid_date", `${field} must be an ISO 8601 date.`);
}

function requireURL(value: unknown, field: string): string {
  const text = requireString(value, field);
  try {
    const url = new URL(text);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return text;
    }
  } catch {
    // Fall through to the common error.
  }
  throw new HTTPError(400, "invalid_url", `${field} must be an HTTP(S) URL.`);
}
