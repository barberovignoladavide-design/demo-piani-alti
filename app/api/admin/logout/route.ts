import { expiredAdminCookie, sameOrigin } from "../../../admin-auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Richiesta non valida." }, { status: 403 });
  return Response.json({ ok: true }, {
    headers: { "Set-Cookie": expiredAdminCookie(), "Cache-Control": "no-store" },
  });
}
