import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orders } from "../../../../db/schema";
import { isAdmin, sameOrigin } from "../../../admin-auth";

const paymentStatuses = new Set(["pending", "paid"]);
const productionStatuses = new Set(["queued", "in_production", "ready", "delivered"]);

export async function PATCH(request: Request, context: { params: Promise<{ code: string }> }) {
  if (!(await isAdmin(request))) {
    return Response.json({ error: "Accesso richiesto." }, { status: 401 });
  }
  if (!sameOrigin(request)) return Response.json({ error: "Richiesta non valida." }, { status: 403 });
  const { code } = await context.params;
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: "Dati non validi." }, { status: 400 });
  }
  const update: { paymentStatus?: string; productionStatus?: string; updatedAt: string } = {
    updatedAt: new Date().toISOString(),
  };
  if (data.paymentStatus !== undefined) {
    if (!paymentStatuses.has(String(data.paymentStatus))) {
      return Response.json({ error: "Stato pagamento non valido." }, { status: 400 });
    }
    update.paymentStatus = String(data.paymentStatus);
  }
  if (data.productionStatus !== undefined) {
    if (!productionStatuses.has(String(data.productionStatus))) {
      return Response.json({ error: "Stato produzione non valido." }, { status: 400 });
    }
    update.productionStatus = String(data.productionStatus);
  }
  if (!update.paymentStatus && !update.productionStatus) {
    return Response.json({ error: "Nessuna modifica." }, { status: 400 });
  }
  const [order] = await getDb().update(orders).set(update).where(eq(orders.code, code)).returning();
  if (!order) return Response.json({ error: "Prenotazione non trovata." }, { status: 404 });
  return Response.json({ order });
}
