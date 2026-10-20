import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { orders } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

const sizes = new Set(["XS", "S", "M", "L", "XL", "XXL"]);
const payments = new Set(["bank", "cash"]);
const unitPrice = 25; // Demo only. Replace before real sales.

export async function GET() {
  if (!(await getChatGPTUser())) {
    return Response.json({ error: "Accesso richiesto." }, { status: 401 });
  }
  const rows = await getDb().select().from(orders).orderBy(desc(orders.createdAt));
  return Response.json({ orders: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: "Dati non validi." }, { status: 400 });
  }
  const name = String(data.name ?? "").trim().replace(/\s+/g, " ");
  const phone = String(data.phone ?? "").trim();
  const size = String(data.size ?? "");
  const payment = String(data.payment ?? "");
  const quantity = Number(data.quantity);
  const digits = phone.replace(/\D/g, "");
  if (name.length < 3 || name.length > 80 || !sizes.has(size) ||
      !payments.has(payment) || !Number.isInteger(quantity) || quantity < 1 ||
      quantity > 10 || digits.length < 9 || digits.length > 15 || data.consent !== true) {
    return Response.json({ error: "Controlla i dati della prenotazione." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const order = {
    code: `PA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
    name, phone, size, quantity,
    unitPrice,
    total: quantity * unitPrice,
    payment,
    paymentStatus: "pending",
    productionStatus: "queued",
  };
  await getDb().insert(orders).values(order);
  return Response.json({ order }, { status: 201 });
}
