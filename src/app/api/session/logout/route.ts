import { clearSession, forbidden, isFromApp, postJson, readSession } from "@/lib/server/session";

export async function POST(request: Request) {
  if (!isFromApp(request)) return forbidden();

  const { refreshToken } = await readSession();
  if (refreshToken) {
    // Blacklists the refresh token so it can't be reused.
    await postJson("/auth/logout/", { refresh: refreshToken }).catch(() => null);
  }
  await clearSession();
  return new Response(null, { status: 204 });
}
