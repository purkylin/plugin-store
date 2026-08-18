export interface Env {
  DB: D1Database;
  ADMIN_TOKEN?: string;
}

export type Platform = "ios" | "tvos";
export type InstallAction = "install" | "update" | "uninstall";
export type PluginVisibility = "public" | "private";

export interface CatalogRow {
  id: string;
  name: string;
  description: string;
  author: string;
  icon_url: string | null;
  latest_version: string;
  updated_at: string;
  install_count: number;
  manifest_sha256: string;
  manifest_json: string;
  minimum_ios_version: string | null;
  minimum_tvos_version: string | null;
}

export interface AdminCatalogRow extends CatalogRow {
  supports_ios: number;
  supports_tvos: number;
}

export interface CatalogCursor {
  updatedAt: string;
  id: string;
}

export interface InstallEvent {
  event_id: string;
  plugin_id: string;
  installation_id: string;
  action: InstallAction;
  from_version: string | null;
  to_version: string | null;
  app_version: string;
  platform: Platform;
  occurred_at: string;
}

export interface PublishRequest {
  manifest: Record<string, unknown>;
  visibility?: PluginVisibility;
  platforms?: Platform[];
  minimum_ios_version?: string | null;
  minimum_tvos_version?: string | null;
}

export interface PluginManifestMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  iconURL: string | null;
  version: string;
}

export interface UpdateCheckPlugin {
  id: string;
  version: string;
}

export interface UpdateCheckRequest {
  platform: Platform;
  app_version: string;
  plugins: UpdateCheckPlugin[];
}
