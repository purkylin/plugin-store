import { HTTPError } from "./http";

const maxPythonBytes = 2 * 1024 * 1024;
const maxRedirects = 3;

export interface DownloadedPythonFile {
  bytes: Uint8Array;
  fileName: string;
}

export async function downloadPythonFile(value: unknown): Promise<DownloadedPythonFile> {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HTTPError(400, "invalid_url", "url is required.");
  }
  let url = parseSafeHTTPURL(value);
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        headers: {
          accept: "text/plain, application/octet-stream;q=0.9, */*;q=0.1",
          "user-agent": "HawkPluginStore/1.0",
        },
      });
    } catch (cause) {
      throw new HTTPError(
        400,
        "download_failed",
        `Could not download the Python file: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === maxRedirects) {
        throw new HTTPError(400, "too_many_redirects", "The Python URL redirects too many times.");
      }
      url = parseSafeHTTPURL(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) {
      throw new HTTPError(400, "download_failed", `Python URL returned HTTP ${response.status}.`);
    }
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > maxPythonBytes) {
      throw new HTTPError(413, "file_too_large", "Python files must not exceed 2 MB.");
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    validatePythonBytes(bytes, response.headers.get("content-type"));
    return {
      bytes,
      fileName: responseFileName(response.headers.get("content-disposition"))
        ?? fileNameFromURL(url),
    };
  }
  throw new HTTPError(400, "download_failed", "Could not download the Python file.");
}

export function validateUploadedPython(file: File): Promise<DownloadedPythonFile> {
  return file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    validatePythonBytes(bytes, file.type || null);
    return { bytes, fileName: file.name };
  });
}

function validatePythonBytes(bytes: Uint8Array, contentType: string | null): void {
  if (bytes.byteLength === 0) {
    throw new HTTPError(400, "empty_file", "The Python file is empty.");
  }
  if (bytes.byteLength > maxPythonBytes) {
    throw new HTTPError(413, "file_too_large", "Python files must not exceed 2 MB.");
  }
  const prefix = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.slice(0, Math.min(bytes.length, 1024)))
    .trimStart()
    .toLowerCase();
  if (
    contentType?.toLowerCase().includes("text/html")
    || prefix.startsWith("<!doctype html")
    || prefix.startsWith("<html")
  ) {
    throw new HTTPError(400, "not_python", "The supplied content appears to be HTML, not Python.");
  }
  if (bytes.includes(0)) {
    throw new HTTPError(400, "not_text", "The Python file must be UTF-8 text.");
  }
}

function parseSafeHTTPURL(value: string): URL {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new HTTPError(400, "invalid_url", "The Python URL is invalid.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new HTTPError(400, "invalid_url", "Only HTTP and HTTPS URLs are supported.");
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || isPrivateIPv4(hostname)
    || hostname === "::1"
    || hostname.startsWith("fc")
    || hostname.startsWith("fd")
    || hostname.startsWith("fe8")
    || hostname.startsWith("fe9")
    || hostname.startsWith("fea")
    || hostname.startsWith("feb")
  ) {
    throw new HTTPError(400, "unsafe_url", "Private and local network URLs are not allowed.");
  }
  url.hash = "";
  return url;
}

function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
    return false;
  }
  const octets = parts.map(Number);
  if (octets.some((octet) => octet > 255)) {
    return true;
  }
  const [a, b] = octets;
  return a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b !== undefined && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || a === 224
    || a === 255;
}

function fileNameFromURL(url: URL): string {
  const segment = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "script.py");
  return segment || "script.py";
}

function responseFileName(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return null;
    }
  }
  return value.match(/filename="?([^";]+)"?/i)?.[1]?.trim() ?? null;
}
