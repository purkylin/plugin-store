const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...jsonHeaders, ...headers },
  });
}

export function error(code: string, message: string, status: number): Response {
  return json({ code, message }, status);
}

export async function readJSON(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HTTPError(415, "unsupported_media_type", "Content-Type must be application/json.");
  }

  try {
    return await request.json();
  } catch {
    throw new HTTPError(400, "invalid_json", "Request body is not valid JSON.");
  }
}

export class HTTPError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function handleError(cause: unknown): Response {
  if (cause instanceof HTTPError) {
    return error(cause.code, cause.message, cause.status);
  }

  console.error(cause);
  if (hasMessage(cause, "no such table")) {
    return error(
      "database_not_initialized",
      "数据库尚未初始化，请管理员先执行 D1 数据库迁移。",
      503,
    );
  }
  return error("internal_error", "The server could not complete the request.", 500);
}

function hasMessage(cause: unknown, text: string): boolean {
  let current = cause;
  const visited = new Set<unknown>();
  while (current && !visited.has(current)) {
    visited.add(current);
    if (current instanceof Error && current.message.includes(text)) {
      return true;
    }
    if (typeof current !== "object") {
      break;
    }
    current = "cause" in current
      ? (current as { cause?: unknown }).cause
      : undefined;
  }
  return false;
}
