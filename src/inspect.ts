import { HTTPError } from "./http";

export interface InspectResult {
  name?: string | undefined;
  version?: string | undefined;
  author?: string | undefined;
  description?: string | undefined;
  homepage?: string | undefined;
  platforms: string[];
  raw_platforms: string[];
  script_content?: string | undefined;
}

export function parseLuexueScript(content: string): InspectResult {
  let name: string | undefined;
  let version: string | undefined;
  let author: string | undefined;
  let description: string | undefined;
  let homepage: string | undefined;

  // Extract JSDoc metadata from comments
  const nameMatch = content.match(/@name\s+([^\r\n*]+)/i);
  if (nameMatch && nameMatch[1]) {
    name = nameMatch[1].trim();
  }

  const descMatch = content.match(/@(?:description|desc)\s+([^\r\n*]+)/i);
  if (descMatch && descMatch[1]) {
    description = descMatch[1].trim();
  }

  const verMatch = content.match(/@version\s+([^\r\n*]+)/i);
  if (verMatch && verMatch[1]) {
    let rawVer = verMatch[1].trim();
    // Normalize "v5.0" -> "5.0"
    rawVer = rawVer.replace(/^[vV]/, "").trim();
    version = rawVer;
  }

  const authorMatch = content.match(/@author\s+([^\r\n*]+)/i);
  if (authorMatch && authorMatch[1]) {
    author = authorMatch[1].trim();
  }

  const urlMatch = content.match(/@(?:homepage|url|update_url)\s+([^\r\n*]+)/i);
  if (urlMatch && urlMatch[1]) {
    homepage = urlMatch[1].trim();
  }

  return {
    name,
    version,
    author,
    description,
    homepage,
    platforms: [],
    raw_platforms: [],
  };
}

export async function inspectPluginScript(urlStr: string): Promise<InspectResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    throw new HTTPError(400, "invalid_url", "提供的 URL 格式不正确。");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new HTTPError(400, "invalid_url_protocol", "仅支持 HTTP 或 HTTPS 协议的 URL。");
  }

  let response: Response;
  try {
    response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HawkPluginInspector/1.0)",
        Accept: "*/*",
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new HTTPError(400, "fetch_failed", `抓取脚本失败: ${msg}`);
  }

  if (!response.ok) {
    throw new HTTPError(
      400,
      "fetch_failed",
      `抓取脚本失败: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > 2 * 1024 * 1024) {
    throw new HTTPError(400, "file_too_large", "脚本文件过大（超过 2MB）。");
  }

  const text = await response.text();
  if (text.length > 2 * 1024 * 1024) {
    throw new HTTPError(400, "file_too_large", "脚本文件过大（超过 2MB）。");
  }

  const result = parseLuexueScript(text);
  result.script_content = text;
  return result;
}
