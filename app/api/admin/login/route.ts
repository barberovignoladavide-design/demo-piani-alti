import { adminCookie, passwordMatches, sameOrigin } from "../../../admin-auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Richiesta non valida." }, { status: 403 });
  let password: unknown;
  try {
    const body = await request.json() as Record<string, unknown>;
    password = body.password;
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length > 200 || !(await passwordMatches(password))) {
    return Response.json({ error: "Password non corretta." }, { status: 401 });
  }
  return Response.json({ ok: true }, {
    headers: { "Set-Cookie": await adminCookie(), "Cache-Control": "no-store" },
  });
}
