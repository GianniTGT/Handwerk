import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gesundheitscheck für Docker/Monitoring: öffentlich, gibt nur ok/nicht ok zurück (keine Details)
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
