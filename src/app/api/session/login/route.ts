import { forbidden, isFromApp, postJson, setSession } from "@/lib/server/session";

export async function POST(request: Request) {
  if (!isFromApp(request)) return forbidden();

  const { email, password } = await request.json();
  const response = await postJson("/auth/login/", { email, password });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return Response.json(
      data ?? { code: "error", message: "Sign-in failed.", fields: {} },
      { status: response.status },
    );
  }
  await setSession(data);
  return Response.json({ ok: true });
}
