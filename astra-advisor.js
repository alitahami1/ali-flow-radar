const ASTRA_MODEL = process.env.OPENAI_MODEL || "gpt-6-astra";
const ASTRA_EFFORT = process.env.OPENAI_REASONING_EFFORT || "medium";

function extractText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  const parts = [];
  for (const item of data?.output || []) {
    for (const part of item?.content || []) {
      if (typeof part?.text === "string") parts.push(part.text);
    }
  }
  return parts.join("\n").trim();
}

async function analyzeTelemetry(snapshot) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const instructions = [
    "You are a passive research assistant for ALI Flow Radar.",
    "Analyze supplied market telemetry for technical-method research and data-quality review only.",
    "Do not control or modify the application's execution logic.",
    "Return concise JSON with keys market_read, technical_research, method_review, data_quality, risk_notes, backtest_ideas, confidence."
  ].join(" ");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: ASTRA_MODEL,
      reasoning: { effort: ASTRA_EFFORT },
      instructions,
      input: `Review this telemetry snapshot:\n${JSON.stringify(snapshot)}`,
      max_output_tokens: 1800
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}: ${JSON.stringify(data).slice(0, 500)}`);

  const text = extractText(data);
  let analysis;
  try {
    analysis = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, ""));
  } catch {
    analysis = { summary: text };
  }

  return {
    model: data.model || ASTRA_MODEL,
    responseId: data.id || null,
    analysis,
    usage: data.usage || null
  };
}

module.exports = {
  ASTRA_MODEL,
  analyzeTelemetry
};
