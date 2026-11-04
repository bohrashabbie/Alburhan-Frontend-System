import {
  backendFetch,
  clearSession,
  forbidden,
  isFromApp,
  readSession,
  refreshOnce,
  setSession,
} from "@/lib/server/session";

// These issue or consume tokens, so they only run through /api/session.
const BLOCKED = new Set(["auth/login", "auth/logout", "auth/refresh"]);

function unsafe(segments: string[]) {
  return segments.some((part) => !part || part === "." || part === ".." || /[\\/]/.test(part));
}

async function forward(
  request: Request,
  path: string,
  body: ArrayBuffer | undefined,
  token?: string,
) {
  const headers: Record<string, string> = {};
  // JSON, or multipart for file uploads: pass the browser's content type through unchanged.
  if (body !== undefined) {
    headers["content-type"] = request.headers.get("content-type") ?? "application/json";
  }
  if (token) headers.authorization = `Bearer ${token}`;
  const language = request.headers.get("accept-language");
  if (language) headers["accept-language"] = language;
  return backendFetch(path, { method: request.method, headers, body });
}

async function handle(request: Request, { params }: RouteContext<"/api/v1/[...path]">) {
  if (request.method !== "GET" && !isFromApp(request)) return forbidden();

  const { path } = await params;
  if (unsafe(path) || BLOCKED.has(path.join("/"))) return forbidden();

  const search = new URL(request.url).search;
  // Django routes end with a slash; POST/PATCH can't follow its redirect, so always add it.
  const target = `/${path.map(encodeURIComponent).join("/")}/${search}`;
  const body = request.method === "GET" ? undefined : await request.arrayBuffer();

  const { accessToken, refreshToken } = await readSession();
  let token = accessToken;
  let refreshed = false;

  if (!token && refreshToken) {
    const tokens = await refreshOnce(refreshToken);
    if (tokens) {
      await setSession(tokens);
      token = tokens.access;
      refreshed = true;
    }
  }

  let response = await forward(request, target, body, token);

  if (response.status === 401 && refreshToken && !refreshed) {
    const tokens = await refreshOnce(refreshToken);
    if (tokens) {
      await setSession(tokens);
      response = await forward(request, target, body, tokens.access);
    } else {
      await clearSession();
    }
  }

  if (response.status === 204) return new Response(null, { status: 204 });
  const headers = new Headers({
    "content-type": response.headers.get("content-type") ?? "application/json",
  });
  const disposition = response.headers.get("content-disposition");
  if (disposition) headers.set("content-disposition", disposition);
  return new Response(await response.arrayBuffer(), { status: response.status, headers });
}

export { handle as DELETE, handle as GET, handle as PATCH, handle as POST, handle as PUT };
