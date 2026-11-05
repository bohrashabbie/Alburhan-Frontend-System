/** Every backend error has this shape: { code, message, fields: { field: "message" } }. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

function headers() {
  const language = typeof document !== "undefined" ? document.documentElement.lang : "en";
  return {
    "content-type": "application/json",
    "x-app-request": "1",
    "accept-language": language || "en",
  };
}

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network_error", "Can't reach the server. Check your connection.");
  }

  if (response.status === 204) return null as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.code ?? "unknown_error",
      data?.message ?? "Something went wrong. Try again.",
      data?.fields ?? {},
    );
  }
  return data as T;
}

const v1 = (path: string) => `/api/v1${path}`;

export const api = {
  get: <T>(path: string) => send<T>(v1(path), "GET"),
  post: <T>(path: string, body: unknown = {}) => send<T>(v1(path), "POST", body),
  put: <T>(path: string, body: unknown) => send<T>(v1(path), "PUT", body),
  patch: <T>(path: string, body: unknown) => send<T>(v1(path), "PATCH", body),
  delete: <T = null>(path: string) => send<T>(v1(path), "DELETE"),
};

/** Uploads files as multipart/form-data, e.g. upload("/organization/companies/1/logo", { logo: file }). */
export async function upload<T>(path: string, files: Record<string, Blob>): Promise<T> {
  const form = new FormData();
  for (const [name, file] of Object.entries(files)) form.append(name, file);
  let response: Response;
  try {
    response = await fetch(v1(path), {
      method: "POST",
      headers: { "x-app-request": "1" },
      body: form,
    });
  } catch {
    throw new ApiError(0, "network_error", "Can't reach the server. Check your connection.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.code ?? "unknown_error",
      data?.message ?? "Upload failed. Try again.",
      data?.fields ?? {},
    );
  }
  return data as T;
}

export const session = {
  login: (email: string, password: string) =>
    send<{ ok: true }>("/api/session/login", "POST", { email, password }),
  logout: () => send("/api/session/logout", "POST", {}),
};

export const fetcher = <T,>(path: string) => api.get<T>(path);

/** Builds "/path?key=value" and drops empty values. */
export function withQuery(path: string, query: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== "") params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

/** A dropdown's value as an id, or null while nothing is chosen (never 0, which the API rejects
 * with a cryptic "invalid pk" instead of "this field is required"). */
export const idOrNull = (value: string | number | null | undefined) =>
  value === "" || value === null || value === undefined ? null : Number(value);
