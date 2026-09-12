const http = require("http");
const { spawn } = require("child_process");
const { ASTRA_MODEL, analyzeTelemetry } = require("./astra-advisor");

const PORT = Number(process.env.PORT || 3000);
const CORE_PORT = Number(process.env.ALI_CORE_PORT || (PORT + 1));
const CORE_HOST = "127.0.0.1";
let child;
let stopping = false;

function startCore() {
  child = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: String(CORE_PORT) },
    stdio: "inherit"
  });
  child.on("exit", () => {
    if (!stopping) setTimeout(startCore, 1500);
  });
}

function sendJson(res, status, value) {
  const body = Buffer.from(JSON.stringify(value, null, 2));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": body.length,
    "cache-control": "no-store"
  });
  res.end(body);
}

async function coreJson(pathname) {
  const response = await fetch(`http://${CORE_HOST}:${CORE_PORT}${pathname}`);
  const text = await response.text();
  if (!response.ok) throw new Error(`Core HTTP ${response.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function advisorSnapshot() {
  const results = await Promise.allSettled([
    coreJson("/api/demo-scan?limit=20&scan=40"),
    coreJson("/api/universe?limit=20"),
    coreJson("/api/binance?symbols=BTCUSDT,ETHUSDT")
  ]);

  return {
    capturedAt: new Date().toISOString(),
    demo: results[0].status === "fulfilled" ? results[0].value : { error: String(results[0].reason) },
    universe: results[1].status === "fulfilled" ? results[1].value : { error: String(results[1].reason) },
    btcEth: results[2].status === "fulfilled" ? results[2].value : { error: String(results[2].reason) }
  };
}

function proxy(req, res) {
  const upstream = http.request({
    hostname: CORE_HOST,
    port: CORE_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${CORE_HOST}:${CORE_PORT}` }
  }, upstreamRes => {
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });

  upstream.on("error", error => {
    if (!res.headersSent) sendJson(res, 503, { ok: false, error: String(error) });
    else res.end();
  });

  req.pipe(upstream);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/astra-advisor") {
    try {
      const snapshot = await advisorSnapshot();
      const result = await analyzeTelemetry(snapshot);
      sendJson(res, 200, {
        ok: true,
        version: "5.14.0",
        advisorModel: ASTRA_MODEL,
        mode: "PASSIVE_RESEARCH",
        generatedAt: new Date().toISOString(),
        result
      });
    } catch (error) {
      sendJson(res, 502, {
        ok: false,
        version: "5.14.0",
        advisorModel: ASTRA_MODEL,
        astraConfigured: Boolean(process.env.OPENAI_API_KEY),
        error: String(error?.message || error)
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    try {
      const core = await coreJson("/api/health");
      sendJson(res, 200, {
        ...core,
        version: "5.14.0",
        coreVersion: core?.version || null,
        advisorModel: ASTRA_MODEL,
        advisorProvider: "OpenAI Responses API",
        advisorMode: "PASSIVE_RESEARCH",
        astraConfigured: Boolean(process.env.OPENAI_API_KEY),
        astraEndpoint: "/api/astra-advisor"
      });
    } catch (error) {
      sendJson(res, 503, {
        ok: false,
        version: "5.14.0",
        advisorModel: ASTRA_MODEL,
        astraConfigured: Boolean(process.env.OPENAI_API_KEY),
        error: String(error?.message || error)
      });
    }
    return;
  }

  proxy(req, res);
});

startCore();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`ALI Flow Radar Astra gateway v5.14.0 listening on :${PORT}`);
  console.log(`Advisor model: ${ASTRA_MODEL}; configured=${Boolean(process.env.OPENAI_API_KEY)}`);
});

function shutdown() {
  if (stopping) return;
  stopping = true;
  if (child && !child.killed) child.kill("SIGTERM");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 4000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
