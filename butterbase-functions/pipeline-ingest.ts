export async function handler(req: Request, ctx: any): Promise<Response> {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return new Response(JSON.stringify({ error: "Missing x-tenant-id header" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { customer_name, customer_email, email_subject, email_body, pdf_url } = body ?? {};
  if (!customer_name || !customer_email || !email_body) {
    return new Response(
      JSON.stringify({ error: "customer_name, customer_email, and email_body are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { rows } = await ctx.db.query(
      `INSERT INTO rfq_cards (tenant_id, stage, customer_name, customer_email, email_subject, email_body, pdf_url)
       VALUES ($1, 'received', $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, customer_name, customer_email, email_subject ?? null, email_body, pdf_url ?? null]
    );
    return new Response(JSON.stringify(rows[0]), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
