export async function handler(req: Request, ctx: any): Promise<Response> {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenant_id");
  if (!tenantId) {
    return new Response(JSON.stringify({ error: "Missing tenant_id query param" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { rows } = await ctx.db.query(
      "SELECT * FROM rfq_cards WHERE tenant_id = $1 ORDER BY created_at DESC",
      [tenantId]
    );
    return new Response(JSON.stringify(rows), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
