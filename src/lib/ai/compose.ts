import { createServerFn } from "@tanstack/react-start";
import { ALL_CHUNKS, searchStandards } from "@/lib/standards";

export const composeAgentAnswer = createServerFn({ method: "POST" })
  .validator((input: { query: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Composer unavailable in this environment." };

    const hits = searchStandards({ query: data.query, limit: 4 });
    if (!hits.length) {
      return { ok: false as const, error: "No matching standard chunks." };
    }

    const context = hits
      .map(
        (h, i) =>
          `[${i + 1}] ${h.chunk.ruleId} (${h.chunk.severity})\n${h.chunk.heading}\n${h.chunk.content}`,
      )
      .join("\n\n");

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 420,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a Terraform agent bound by enterprise standards. Answer only from the provided InfraCop chunks. If they conflict with HashiCorp or AWS defaults, say so and follow InfraCop. Be concise. Include the rule ids you used.",
          },
          {
            role: "user",
            content: `Task: ${data.query}\n\nInfraCop chunks:\n${context}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return { ok: false as const, error: `Composer error ${res.status}` };
    }
    const body = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return {
      ok: true as const,
      text: body.choices[0]?.message.content ?? "",
      used: hits.map((h) => h.chunk.ruleId),
      corpus: ALL_CHUNKS.length,
    };
  });
