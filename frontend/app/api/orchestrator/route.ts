export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const text: string = (body?.text ?? "").toString();
    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "Missing 'text' in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const orchestratorUrl = process.env.ORCHESTRATOR_URL || "http://localhost:9000/";

    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "message/send",
      params: {
        message: {
          kind: "message",
          message_id: crypto.randomUUID(),
          role: "user",
          parts: [
            {
              kind: "text",
              text,
            },
          ],
        },
      },
    };

    const upstream = await fetch(orchestratorUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json().catch(async () => {
      const raw = await upstream.text();
      return { raw };
    });

    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
