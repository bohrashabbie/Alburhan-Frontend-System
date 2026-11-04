import { cookies } from "next/headers";

/** The Django API. Only this Next.js server talks to it; browsers never see the tokens. */
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");

const ACCESS_COOKIE = "ab_access";
const REFRESH_COOKIE = "ab_refresh";
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // matches JWT_REFRESH_DAYS on the backend
const REFRESH_RESULT_TTL_MS = 15_000;

/** What Django's /auth/login/ and /auth/refresh/ return. */
export type TokenPair = { access: string; refresh: string };

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/** Seconds until the token's `exp` claim, read without verifying (Django verifies). */
function secondsLeft(token: string, fallback: number) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return Math.max(0, Math.floor(payload.exp - Date.now() / 1000));
  } catch {
    return fallback;
  }
}

/** `path` is the part after /api/v1, e.g. "/auth/login/". Django needs the trailing slash. */
export function backendFetch(path: string, init: RequestInit = {}) {
  return fetch(`${BACKEND_URL}/api/v1${path}`, { ...init, cache: "no-store" });
}

export function postJson(path: string, body: unknown, accessToken?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  return backendFetch(path, { method: "POST", headers, body: JSON.stringify(body) });
}

export async function readSession() {
  const store = await cookies();
  return {
    accessToken: store.get(ACCESS_COOKIE)?.value,
    refreshToken: store.get(REFRESH_COOKIE)?.value,
  };
}

export async function setSession(tokens: TokenPair) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.access, cookieOptions(secondsLeft(tokens.access, 30 * 60)));
  store.set(
    REFRESH_COOKIE,
    tokens.refresh,
    cookieOptions(secondsLeft(tokens.refresh, REFRESH_MAX_AGE)),
  );
}

export async function clearSession() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

type RefreshCache = Map<string, Promise<TokenPair | null>>;
const globalCache = globalThis as typeof globalThis & { __abRefreshes?: RefreshCache };
const refreshes: RefreshCache = (globalCache.__abRefreshes ??= new Map());

/**
 * Refresh tokens rotate and a used one is blacklisted. A page often sends several requests
 * right when the access token expires, so they all share one refresh.
 */
export function refreshOnce(refreshToken: string): Promise<TokenPair | null> {
  const existing = refreshes.get(refreshToken);
  if (existing) return existing;

  const attempt = postJson("/auth/refresh/", { refresh: refreshToken })
    .then((response) => (response.ok ? (response.json() as Promise<TokenPair>) : null))
    .catch(() => null);

  refreshes.set(refreshToken, attempt);
  // Kept briefly, for requests that were sent with the old cookie.
  setTimeout(() => refreshes.delete(refreshToken), REFRESH_RESULT_TTL_MS);
  return attempt;
}

/** Mutating requests must carry this header, which other sites can't send (CSRF guard). */
export function isFromApp(request: Request) {
  return request.headers.get("x-app-request") === "1";
}

export function forbidden() {
  return Response.json(
    { code: "forbidden", message: "This request wasn't allowed.", fields: {} },
    { status: 403 },
  );
}
