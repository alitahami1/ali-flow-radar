const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const zlib = require("zlib");

const app = express();
const PORT = process.env.PORT || 3000;

const INDEX_BROTLI_B64 = `
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
`.replace(/\s+/g, "");
const INDEX_HTML = zlib.brotliDecompressSync(Buffer.from(INDEX_BROTLI_B64, "base64")).toString("utf8");

app.use(express.json({ limit: "256kb" }));

const cache = new Map();
const lastGood = new Map();
const lastGoodWallet = new Map();
const walletHistory = new Map();
const universeHistory = new Map();
const MAX_ROTATION_SNAPSHOTS = 240;

const num = (v, fallback = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
};

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < ttl) return hit.value;
  const value = await fn();
  cache.set(key, { time: Date.now(), value });
  return value;
}

async function fetchText(url, options = {}) {
  const r = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": "Mozilla/5.0 ALI-Flow-Radar/5.6",
      Accept: "text/html,text/plain,text/csv,application/json,*/*",
      ...(options.headers || {})
    },
    timeout: 15000
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 140)}`);
  return text;
}

async function fetchJson(url, options = {}) {
  const text = await fetchText(url, options);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON response");
  }
}

async function hyper(body) {
  return fetchJson("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  async function run() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return out;
}

function ema(values, period) {
  if (!values.length) return null;
  const k = 2 / (period + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

function rsi(values, period = 14) {
  if (!values || values.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  const start = values.length - period;
  for (let i = start; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gains += d;
    else losses += Math.abs(d);
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - 100 / (1 + rs);
}

function atrFromKlines(rows, period = 14) {
  if (!rows || rows.length < 2) return 0;
  const trs = [];
  for (let i = 1; i < rows.length; i++) {
    const h = num(rows[i][2]);
    const l = num(rows[i][3]);
    const pc = num(rows[i - 1][4]);
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const x = trs.slice(-period);
  return x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0;
}

function returnPct(values, barsBack) {
  if (!values.length || values.length <= barsBack) return 0;
  const last = values.at(-1);
  const prev = values.at(-(barsBack + 1));
  return prev ? ((last - prev) / prev) * 100 : 0;
}

/* =========================================================
   HEALTH
========================================================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    version: "5.6",
    app: "ALI Flow Radar",
    universe: "Dynamic early-flow + multi-timeframe technical ranking",
    time: new Date().toISOString()
  });
});

/* =========================================================
   BINANCE MARKET
========================================================= */

app.get("/api/binance", async (req, res) => {
  const symbols = String(req.query.symbols || "BTCUSDT,ETHUSDT")
    .split(",")
    .map(x => x.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 40);

  try {
    const rows = await cached("binance:all24h", 2500, () =>
      fetchJson("https://data-api.binance.vision/api/v3/ticker/24hr")
    );

    const wanted = new Set(symbols);
    const data = (Array.isArray(rows) ? rows : [])
      .filter(x => wanted.has(x.symbol))
      .map(x => ({
        symbol: x.symbol,
        lastPrice: num(x.lastPrice),
        openPrice: num(x.openPrice),
        highPrice: num(x.highPrice),
        lowPrice: num(x.lowPrice),
        priceChangePercent: num(x.priceChangePercent),
        quoteVolume: num(x.quoteVolume)
      }));

    res.json(data);
  } catch (e) {
    res.status(502).json({ error: String(e) });
  }
});

async function getFlowForSymbol(symbol) {
  return cached(`flow:${symbol}`, 3500, async () => {
    const trades = await fetchJson(
      `https://data-api.binance.vision/api/v3/aggTrades?symbol=${encodeURIComponent(symbol)}&limit=500`
    );

    let buy = 0;
    let sell = 0;
    let oldest = Infinity;
    let newest = 0;

    for (const t of trades || []) {
      const value = num(t.p) * num(t.q);
      if (t.m) sell += value;
      else buy += value;
      oldest = Math.min(oldest, num(t.T));
      newest = Math.max(newest, num(t.T));
    }

    const total = buy + sell;
    const buyRatio = total ? (buy / total) * 100 : 50;
    const netFlow = buy - sell;
    const flowIntensityPct = total ? (netFlow / total) * 100 : 0;

    return {
      symbol,
      takerBuy: buy,
      takerSell: sell,
      netFlow,
      buyRatio,
      flowIntensityPct,
      flowScore: clamp(50 + (buyRatio - 50) * 1.35 + flowIntensityPct * 0.9, 0, 100),
      sampleTrades: Array.isArray(trades) ? trades.length : 0,
      sampleSeconds:
        newest && Number.isFinite(oldest) ? Math.max(1, (newest - oldest) / 1000) : 0
    };
  });
}

app.get("/api/flow", async (req, res) => {
  const symbols = String(req.query.symbols || "BTCUSDT,ETHUSDT")
    .split(",")
    .map(x => x.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 40);

  const rows = await mapLimit(symbols, 5, async symbol => {
    try {
      return await getFlowForSymbol(symbol);
    } catch (e) {
      return { symbol, error: String(e) };
    }
  });

  res.json(rows);
});

app.get("/api/klines", async (req, res) => {
  const symbol = String(req.query.symbol || "BTCUSDT").trim().toUpperCase();
  const interval = String(req.query.interval || "5m").trim();
  const limit = clamp(num(req.query.limit, 120), 30, 300);
  const allowed = new Set(["1m", "3m", "5m", "15m", "30m", "1h", "4h"]);

  if (!/^[A-Z0-9]{5,20}$/.test(symbol)) return res.status(400).json({ error: "Invalid symbol" });
  if (!allowed.has(interval)) return res.status(400).json({ error: "Invalid interval" });

  try {
    const rows = await cached(`klines:${symbol}:${interval}:${limit}`, 10000, () =>
      fetchJson(
        `https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`
      )
    );

    res.json(
      (rows || []).map(r => ({
        openTime: num(r[0]),
        open: num(r[1]),
        high: num(r[2]),
        low: num(r[3]),
        close: num(r[4]),
        volume: num(r[5]),
        closeTime: num(r[6]),
        quoteVolume: num(r[7]),
        trades: num(r[8])
      }))
    );
  } catch (e) {
    res.status(502).json({ error: String(e) });
  }
});

/* =========================================================
   DYNAMIC TOP-20 EARLY-FLOW UNIVERSE
========================================================= */

const EXCLUDED_BASES = new Set([
  "USDC", "FDUSD", "TUSD", "USDP", "DAI", "BUSD", "EUR", "TRY", "BRL",
  "AEUR", "EURI", "PAXG", "WBTC"
]);

function isEligibleUSDT(symbol) {
  if (!symbol || !symbol.endsWith("USDT")) return false;
  const base = symbol.slice(0, -4);
  if (EXCLUDED_BASES.has(base)) return false;
  if (/UP$|DOWN$|BULL$|BEAR$/.test(base)) return false;
  return /^[A-Z0-9]+$/.test(base);
}

function rawToBar(r) {
  return {
    openTime: num(r[0]),
    open: num(r[1]),
    high: num(r[2]),
    low: num(r[3]),
    close: num(r[4]),
    volume: num(r[5]),
    closeTime: num(r[6]),
    quoteVolume: num(r[7]),
    trades: num(r[8]),
    takerBuyBase: num(r[9]),
    takerBuyQuote: num(r[10])
  };
}

function aggregateBars(rawRows, minutes) {
  const bucketMs = minutes * 60000;
  const buckets = new Map();

  for (const raw of rawRows || []) {
    const r = Array.isArray(raw) ? rawToBar(raw) : raw;
    const key = Math.floor(r.openTime / bucketMs) * bucketMs;
    let b = buckets.get(key);

    if (!b) {
      b = {
        openTime: key,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        quoteVolume: 0,
        takerBuyQuote: 0,
        trades: 0
      };
      buckets.set(key, b);
    }

    b.high = Math.max(b.high, r.high);
    b.low = Math.min(b.low, r.low);
    b.close = r.close;
    b.quoteVolume += r.quoteVolume;
    b.takerBuyQuote += r.takerBuyQuote;
    b.trades += r.trades;
  }

  return Array.from(buckets.values()).sort((a, b) => a.openTime - b.openTime);
}

function flowFromBars(bars, count) {
  const rows = (bars || []).slice(-count);
  let total = 0;
  let buy = 0;

  for (const r of rows) {
    total += num(r.quoteVolume);
    buy += num(r.takerBuyQuote);
  }

  const sell = Math.max(0, total - buy);
  const buyRatio = total ? (buy / total) * 100 : 50;
  const netFlow = buy - sell;
  const intensityPct = total ? (netFlow / total) * 100 : 0;

  return {
    buy,
    sell,
    total,
    netFlow,
    buyRatio,
    intensityPct,
    score: clamp(50 + (buyRatio - 50) * 1.75, 0, 100)
  };
}

function atrObjects(rows, period = 14) {
  if (!rows || rows.length < 2) return 0;
  const trs = [];
  for (let i = 1; i < rows.length; i++) {
    const h = num(rows[i].high);
    const l = num(rows[i].low);
    const pc = num(rows[i - 1].close);
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const x = trs.slice(-period);
  return x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0;
}

function lastSwing(rows, side, lookback = 12) {
  const x = (rows || []).slice(-lookback);
  if (!x.length) return null;
  if (side === "LOW") return Math.min(...x.map(r => num(r.low, Infinity)));
  return Math.max(...x.map(r => num(r.high, -Infinity)));
}

function updateUniverseHistory(symbol, flow5, flow15, side = "LONG") {
  const arr = universeHistory.get(symbol) || [];
  arr.push({
    time: Date.now(),
    flow5: num(flow5),
    flow15: num(flow15)
  });
  while (arr.length > 8) arr.shift();
  universeHistory.set(symbol, arr);

  if (arr.length < 2) return 50;
  const sameDirection = arr.filter(x =>
    side === "SHORT"
      ? x.flow5 <= 48 && x.flow15 <= 49
      : x.flow5 >= 52 && x.flow15 >= 51
  ).length;

  return (sameDirection / arr.length) * 100;
}

function timeframeTrendScore(fast, slow, atrValue) {
  if (!Number.isFinite(fast) || !Number.isFinite(slow)) return 50;

  const scale = Math.max(
    Math.abs(atrValue),
    Math.abs(slow) * 0.001,
    1e-12
  );

  return clamp(
    50 + ((fast - slow) / scale) * 12,
    0,
    100
  );
}

async function getMinuteKlines(symbol) {
  return cached(
    `universe-1m:${symbol}`,
    15000,
    () =>
      fetchJson(
        `https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1m&limit=360`
      )
  );
}

async function analyzeMarketAsset(ticker) {
  const symbol = ticker.symbol;
  const raw = await getMinuteKlines(symbol);
  const one = (raw || []).map(rawToBar);

  if (one.length < 40) {
    throw new Error("Insufficient minute data");
  }

  const bars5 = aggregateBars(one, 5);
  const bars15 = aggregateBars(one, 15);
  const bars60 = aggregateBars(one, 60);

  const closes5 = bars5.map(x => x.close).filter(x => x > 0);
  const closes15 = bars15.map(x => x.close).filter(x => x > 0);
  const closes60 = bars60.map(x => x.close).filter(x => x > 0);

  const last = closes5.at(-1) || num(ticker.lastPrice);

  const flow1m = flowFromBars(one, 1);
  const flow5m = flowFromBars(one, 5);
  const flow15m = flowFromBars(one, 15);

  const flowComposite = clamp(
    flow1m.score * 0.20 +
    flow5m.score * 0.35 +
    flow15m.score * 0.45,
    0,
    100
  );

  const flowDirection =
    flowComposite >= 50
      ? "LONG"
      : "SHORT";

  const persistenceScore =
    updateUniverseHistory(
      symbol,
      flow5m.score,
      flow15m.score,
      flowDirection
    );

  const e5Fast = ema(closes5.slice(-60), 9) || last;
  const e5Slow = ema(closes5.slice(-60), 21) || last;

  const e15Fast = ema(closes15.slice(-24), 5) || last;
  const e15Slow = ema(closes15.slice(-24), 13) || last;

  const atr5 =
    atrObjects(bars5, 14) ||
    last * 0.0045;

  const rsi5 = rsi(closes5, 14);

  const ret5m = returnPct(closes5, 1);
  const ret15m = returnPct(closes5, 3);
  const ret1h = returnPct(closes5, 12);

  const ret3h =
    returnPct(
      closes60,
      Math.min(
        3,
        Math.max(
          1,
          closes60.length - 1
        )
      )
    );

  const trend5Score =
    timeframeTrendScore(
      e5Fast,
      e5Slow,
      atr5
    );

  const trend15Score =
    timeframeTrendScore(
      e15Fast,
      e15Slow,
      atr5 * 1.8
    );

  const trend1hScore =
    clamp(
      50 +
      ret1h * 6 +
      ret3h * 2.5,
      0,
      100
    );

  let rsiScore = 50;

  if (rsi5 >= 50 && rsi5 <= 66) {
    rsiScore =
      70 +
      (rsi5 - 50) * 1.6;
  } else if (rsi5 > 66 && rsi5 <= 72) {
    rsiScore =
      95 -
      (rsi5 - 66) * 5;
  } else if (rsi5 > 72) {
    rsiScore =
      clamp(
        65 -
        (rsi5 - 72) * 5,
        10,
        65
      );
  } else if (rsi5 >= 42) {
    rsiScore =
      45 +
      (rsi5 - 42) * 2.5;
  } else {
    rsiScore =
      clamp(
        45 -
        (42 - rsi5) * 2.2,
        10,
        45
      );
  }

  const qv =
    one.map(
      x => x.quoteVolume
    );

  const recent5 =
    qv
      .slice(-5)
      .reduce(
        (a, b) => a + b,
        0
      );

  const prior20 =
    qv.slice(-25, -5);

  const avg5 =
    prior20.length
      ? prior20.reduce(
          (a, b) => a + b,
          0
        ) /
        Math.max(
          1,
          prior20.length / 5
        )
      : recent5 || 1;

  const volumeRatio =
    avg5
      ? recent5 / avg5
      : 1;

  const volumeScore =
    clamp(
      48 +
      (volumeRatio - 1) * 22,
      0,
      100
    );

  const technicalScore =
    clamp(
      trend5Score * 0.28 +
      trend15Score * 0.28 +
      trend1hScore * 0.18 +
      rsiScore * 0.16 +
      volumeScore * 0.10,
      0,
      100
    );

  const distanceAtr =
    atr5
      ? (last - e5Fast) /
        atr5
      : 0;

  let chasePenalty = 0;

  if (distanceAtr > 0.65) {
    chasePenalty +=
      Math.min(
        22,
        (distanceAtr - 0.65) * 18
      );
  }

  if (ret15m > 2.2) {
    chasePenalty +=
      Math.min(
        15,
        (ret15m - 2.2) * 5
      );
  }

  if (rsi5 > 72) {
    chasePenalty +=
      Math.min(
        18,
        (rsi5 - 72) * 2.5
      );
  }

  const earlyEntryScore =
    clamp(
      88 -
      Math.max(
        0,
        distanceAtr - 0.15
      ) * 24 -
      Math.max(
        0,
        ret15m - 0.7
      ) * 11 -
      Math.max(
        0,
        rsi5 - 66
      ) * 2 +
      Math.max(
        0,
        volumeRatio - 1
      ) * 8,
      0,
      100
    );

  const technicalState =
    e5Fast > e5Slow &&
    e15Fast > e15Slow &&
    ret1h > -0.8
      ? "BULLISH"
      : e5Fast < e5Slow &&
        e15Fast < e15Slow &&
        ret1h < 0.8
      ? "BEARISH"
      : "MIXED";

  const setupType =
    flowDirection === "LONG"
      ? (
          flow15m.score >= 56 &&
          flow5m.score >= 57 &&
          ret15m <= 1.6 &&
          distanceAtr <= 0.65
            ? "ACCUMULATION"
            : flow15m.score >= 54 &&
              flow5m.score >= 53 &&
              flow1m.score < 50 &&
              Math.abs(distanceAtr) <= 0.55
            ? "PULLBACK"
            : "INFLOW"
        )
      : (
          flow15m.score <= 44 &&
          flow5m.score <= 43 &&
          ret15m >= -1.6 &&
          distanceAtr >= -0.65
            ? "DISTRIBUTION"
            : flow15m.score <= 46 &&
              flow5m.score <= 47 &&
              flow1m.score > 50 &&
              Math.abs(distanceAtr) <= 0.55
            ? "BOUNCE"
            : "OUTFLOW"
        );

  return {
    symbol,
    lastPrice: num(
      ticker.lastPrice,
      last
    ),
    priceChangePercent24h:
      num(
        ticker.priceChangePercent
      ),
    quoteVolume24h:
      num(
        ticker.quoteVolume
      ),
    flow1m,
    flow5m,
    flow15m,
    flowComposite,
    flowDirection,
    persistenceScore,
    ema5m9: e5Fast,
    ema5m21: e5Slow,
    ema15m5: e15Fast,
    ema15m13: e15Slow,
    rsi14: rsi5,
    ret5m,
    ret15m,
    ret1h,
    ret3h,
    atr: atr5,
    atrPct:
      last
        ? (atr5 / last) * 100
        : 0,
    volumeRatio,
    volumeScore,
    trend5Score,
    trend15Score,
    trend1hScore,
    technicalScore,
    technicalState,
    distanceAtr,
    chasePenalty,
    earlyEntryScore,
    setupType,
    swingLow:
      lastSwing(
        bars5,
        "LOW",
        12
      ),
    swingHigh:
      lastSwing(
        bars5,
        "HIGH",
        12
      ),
    netFlow1m:
      flow1m.netFlow,
    netFlow5m:
      flow5m.netFlow,
    netFlow15m:
      flow15m.netFlow
  };
}

function marketRegimeFromBTC(btc) {
  if (!btc) {
    return {
      state: "NEUTRAL",
      score: 50,
      reason:
        "BTC data unavailable"
    };
  }

  const score =
    clamp(
      btc.flowComposite *
        0.42 +
      btc.technicalScore *
        0.43 +
      clamp(
        50 +
        num(
          btc.priceChangePercent24h
        ) *
        2.5,
        0,
        100
      ) *
        0.15,
      0,
      100
    );

  const state =
    score >= 62
      ? "RISK_ON"
      : score <= 42
      ? "RISK_OFF"
      : "NEUTRAL";

  return {
    state,
    score,
    btcFlow1m:
      btc.flow1m?.score ??
      50,
    btcFlow5m:
      btc.flow5m?.score ??
      50,
    btcFlow15m:
      btc.flow15m?.score ??
      50,
    btcTechnical:
      btc.technicalScore ??
      50,
    btcTrend:
      btc.technicalState,
    reason:
      `${state}: BTC flow ${num(
        btc.flowComposite,
        50
      ).toFixed(
        0
      )}, technical ${num(
        btc.technicalScore,
        50
      ).toFixed(
        0
      )}`
  };
}

app.get(
  "/api/universe",
  async (
    req,
    res
  ) => {
    const limit =
      clamp(
        num(
          req.query.limit,
          20
        ),
        5,
        20
      );

    const scan =
      clamp(
        num(
          req.query.scan,
          32
        ),
        24,
        36
      );

    try {
      const result =
        await cached(
          `universe:v56:${limit}:${scan}`,
          18000,
          async () => {
            const tickers =
              await cached(
                "universe:tickers",
                5000,
                () =>
                  fetchJson(
                    "https://data-api.binance.vision/api/v3/ticker/24hr"
                  )
              );

            const all =
              Array.isArray(
                tickers
              )
                ? tickers
                : [];

            const candidates =
              all
                .filter(
                  x =>
                    isEligibleUSDT(
                      x.symbol
                    )
                )
                .filter(
                  x =>
                    num(
                      x.quoteVolume
                    ) >
                    0
                )
                .sort(
                  (
                    a,
                    b
                  ) =>
                    num(
                      b.quoteVolume
                    ) -
                    num(
                      a.quoteVolume
                    )
                )
                .slice(
                  0,
                  scan
                );

            const btcTicker =
              all.find(
                x =>
                  x.symbol ===
                  "BTCUSDT"
              ) || {
                symbol:
                  "BTCUSDT",
                lastPrice:
                  0,
                quoteVolume:
                  0,
                priceChangePercent:
                  0
              };

            const analyzed =
              await mapLimit(
                candidates,
                6,
                async ticker => {
                  try {
                    return await analyzeMarketAsset(
                      ticker
                    );
                  } catch {
                    return null;
                  }
                }
              );

            let btc =
              analyzed.find(
                x =>
                  x?.symbol ===
                  "BTCUSDT"
              ) ||
              null;

            if (!btc) {
              try {
                btc =
                  await analyzeMarketAsset(
                    btcTicker
                  );
              } catch {}
            }

            const marketRegime =
              marketRegimeFromBTC(
                btc
              );

            const valid =
              analyzed.filter(
                Boolean
              );

            const volumes =
              valid
                .map(
                  x =>
                    x.quoteVolume24h
                )
                .filter(
                  x =>
                    x > 0
                );

            const maxLog =
              Math.max(
                1,
                ...volumes.map(
                  v =>
                    Math.log10(
                      v + 1
                    )
                )
              );

            const minLog =
              volumes.length
                ? Math.min(
                    ...volumes.map(
                      v =>
                        Math.log10(
                          v +
                            1
                        )
                    )
                  )
                : maxLog;

            for (
              const x
              of valid
            ) {
              const lv =
                Math.log10(
                  x.quoteVolume24h +
                    1
                );

              x.liquidityScore =
                maxLog ===
                minLog
                  ? 70
                  : clamp(
                      (
                        (
                          lv -
                          minLog
                        ) /
                        (
                          maxLog -
                          minLog
                        )
                      ) *
                        100,
                      0,
                      100
                    );

              const shortSide =
                x.flowComposite <
                  50 ||
                x.netFlow15m <
                  0;

              x.moneySide =
                shortSide
                  ? "SHORT"
                  : "LONG";

              x.directionalFlowScore =
                shortSide
                  ? 100 -
                    x.flowComposite
                  : x.flowComposite;

              x.directionalTechnicalScore =
                shortSide
                  ? 100 -
                    x.technicalScore
                  : x.technicalScore;

              const shortDistance =
                Math.max(
                  0,
                  -x.distanceAtr -
                    0.15
                );

              const shortMove =
                Math.max(
                  0,
                  -x.ret15m -
                    0.7
                );

              const shortRsi =
                Math.max(
                  0,
                  34 -
                    x.rsi14
                );

              const shortEarlyEntryScore =
                clamp(
                  88 -
                    shortDistance *
                      24 -
                    shortMove *
                      11 -
                    shortRsi *
                      2 +
                    Math.max(
                      0,
                      x.volumeRatio -
                        1
                    ) *
                      8,
                  0,
                  100
                );

              x.directionalEarlyEntryScore =
                shortSide
                  ? shortEarlyEntryScore
                  : x.earlyEntryScore;

              let directionalChasePenalty =
                x.chasePenalty;

              if (
                shortSide
              ) {
                directionalChasePenalty =
                  0;

                if (
                  x.distanceAtr <
                  -0.65
                ) {
                  directionalChasePenalty +=
                    Math.min(
                      22,
                      (
                        -x.distanceAtr -
                        0.65
                      ) *
                        18
                    );
                }

                if (
                  x.ret15m <
                  -2.2
                ) {
                  directionalChasePenalty +=
                    Math.min(
                      15,
                      (
                        -x.ret15m -
                        2.2
                      ) *
                        5
                    );
                }

                if (
                  x.rsi14 <
                  28
                ) {
                  directionalChasePenalty +=
                    Math.min(
                      18,
                      (
                        28 -
                        x.rsi14
                      ) *
                        2.5
                    );
                }
              }

              x.accumulationScore =
                clamp(
                  x.directionalFlowScore *
                    0.46 +
                    x.directionalEarlyEntryScore *
                      0.28 +
                    x.volumeScore *
                      0.12 +
                    x.persistenceScore *
                      0.14,
                  0,
                  100
                );

              x.selectionScore =
                clamp(
                  x.directionalFlowScore *
                    0.40 +
                    x.directionalTechnicalScore *
                      0.23 +
                    x.directionalEarlyEntryScore *
                      0.15 +
                    x.persistenceScore *
                      0.10 +
                    x.liquidityScore *
                      0.12 -
                    directionalChasePenalty,
                  0,
                  100
                );

              const flow5Ok =
                shortSide
                  ? x.flow5m
                      .score <=
                    50
                  : x.flow5m
                      .score >=
                    50;

              const flow15Ok =
                shortSide
                  ? x.flow15m
                      .score <=
                    49
                  : x.flow15m
                      .score >=
                    51;

              const netOk =
                shortSide
                  ? x.netFlow15m <
                    0
                  : x.netFlow15m >
                    0;

              if (!flow15Ok) {
                x.selectionScore -=
                  10;
              }

              if (!flow5Ok) {
                x.selectionScore -=
                  7;
              }

              if (!netOk) {
                x.selectionScore -=
                  12;
              }

              if (
                !shortSide &&
                x.technicalState ===
                  "BEARISH"
              ) {
                x.selectionScore -=
                  8;
              }

              if (
                shortSide &&
                x.technicalState ===
                  "BULLISH"
              ) {
                x.selectionScore -=
                  8;
              }

              x.selectionScore =
                clamp(
                  x.selectionScore,
                  0,
                  100
                );
            }

            const qualified =
              valid
                .filter(
                  x =>
                    x.moneySide ===
                    "LONG"
                      ? (
                          x.netFlow15m >
                            0 &&
                          x.flow15m
                            .score >=
                            51 &&
                          x.flow5m
                            .score >=
                            50
                        )
                      : (
                          x.netFlow15m <
                            0 &&
                          x.flow15m
                            .score <=
                            49 &&
                          x.flow5m
                            .score <=
                            50
                        )
                )
                .sort(
                  (
                    a,
                    b
                  ) =>
                    b.selectionScore -
                    a.selectionScore
                );

            const qualifiedSet =
              new Set(
                qualified.map(
                  x =>
                    x.symbol
                )
              );

            const fallback =
              valid
                .filter(
                  x =>
                    !qualifiedSet.has(
                      x.symbol
                    )
                )
                .sort(
                  (
                    a,
                    b
                  ) =>
                    b.selectionScore -
                    a.selectionScore
                );

            const selected =
              [
                ...qualified,
                ...fallback
              ].slice(
                0,
                limit
              );

            return {
              generatedAt:
                Date.now(),
              scanCount:
                candidates.length,
              qualifiedCount:
                qualified.length,
              selectedCount:
                selected.length,
              marketRegime,
              methodology:
                "v5.6 FLOW-FIRST keeps the original dashboard but ranks both inflow and outflow. Inflow candidates feed LONG, outflow candidates feed SHORT. Fast aggTrades flow is used by Demo for quick decisions, while 1m/5m/15m structure, technicals, liquidity and anti-chase remain confirmation filters. This is a research heuristic, not guaranteed capital flow.",
              assets:
                selected
            };
          }
        );

      res.json(
        result
      );
    } catch (e) {
      res
        .status(
          502
        )
        .json({
          error:
            String(
              e
            )
        });
    }
  }
);

/* =========================================================
   HYPERLIQUID WALLET
========================================================= */

function portfolioWindow(
  portfolio,
  names
) {
  if (
    !Array.isArray(
      portfolio
    )
  ) {
    return null;
  }

  for (
    const name
    of names
  ) {
    const row =
      portfolio.find(
        x =>
          Array.isArray(
            x
          ) &&
          x[0] ===
            name
      );

    if (
      !row?.[1]
    ) {
      continue;
    }

    const d =
      row[1];

    const av =
      Array.isArray(
        d.accountValueHistory
      )
        ? d.accountValueHistory
        : [];

    const pnlHistory =
      Array.isArray(
        d.pnlHistory
      )
        ? d.pnlHistory
        : [];

    const first =
      av.length
        ? num(
            av[0]?.[1]
          )
        : 0;

    const last =
      av.length
        ? num(
            av.at(
              -1
            )?.[1]
          )
        : 0;

    const pnl =
      pnlHistory.length
        ? num(
            pnlHistory.at(
              -1
            )?.[1]
          ) -
          num(
            pnlHistory[0]?.[1]
          )
        : 0;

    const roi =
      first
        ? (
            (
              last -
              first
            ) /
            Math.abs(
              first
            )
          ) *
          100
        : null;

    let peak = 0;
    let maxDD = 0;

    for (
      const point
      of av
    ) {
      const value =
        num(
          point?.[1],
          NaN
        );

      if (
        !Number.isFinite(
          value
        )
      ) {
        continue;
      }

      peak =
        Math.max(
          peak,
          value
        );

      if (
        peak > 0
      ) {
        maxDD =
          Math.min(
            maxDD,
            (
              (
                value -
                peak
              ) /
              peak
            ) *
              100
          );
      }
    }

    return {
      pnl,
      roi,
      maxDrawdownPct:
        maxDD,
      volume:
        num(
          d.vlm
        )
    };
  }

  return null;
}

function fillStats(
  fills,
  days
) {
  const cutoff =
    Date.now() -
    days *
      86400000;

  const rows =
    (
      Array.isArray(
        fills
      )
        ? fills
        : []
    ).filter(
      f =>
        num(
          f.time
        ) >=
        cutoff
    );

  let closed = 0;
  let wins = 0;
  let pnl = 0;

  for (
    const f
    of rows
  ) {
    const x =
      num(
        f.closedPnl
      );

    if (
      Math.abs(
        x
      ) >
      1e-12
    ) {
      closed++;
      pnl += x;

      if (
        x > 0
      ) {
        wins++;
      }
    }
  }

  return {
    fills:
      rows.length,
    closed,
    wins,
    winRate:
      closed
        ? (
            wins /
            closed
          ) *
          100
        : null,
    closedPnl:
      pnl
  };
}

function walletScore(
  day,
  week,
  month,
  stats
) {
  let score = 50;

  const pnls =
    [
      day?.pnl,
      week?.pnl,
      month?.pnl
    ].filter(
      Number.isFinite
    );

  if (
    pnls.length
  ) {
    const positives =
      pnls.filter(
        x =>
          x > 0
      ).length;

    score +=
      (
        positives /
          pnls.length -
        0.5
      ) *
      24;
  }

  if (
    Number.isFinite(
      month?.roi
    )
  ) {
    score +=
      clamp(
        month.roi,
        -30,
        30
      ) *
      0.55;
  }

  if (
    Number.isFinite(
      stats?.winRate
    )
  ) {
    score +=
      clamp(
        stats.winRate -
          50,
        -25,
        25
      ) *
      0.5;
  }

  if (
    Number.isFinite(
      month?.maxDrawdownPct
    )
  ) {
    score +=
      clamp(
        12 -
          Math.abs(
            month.maxDrawdownPct
          ),
        -12,
        12
      ) *
      0.65;
  }

  return Math.round(
    clamp(
      score,
      0,
      100
    )
  );
}

async function walletSummary(
  user
) {
  const key =
    user.toLowerCase();

  try {
    const summary =
      await cached(
        `wallet:${key}`,
        12000,
        async () => {
          const [
            stateR,
            portfolioR,
            fillsR
          ] =
            await Promise.allSettled(
              [
                hyper({
                  type:
                    "clearinghouseState",
                  user
                }),
                hyper({
                  type:
                    "portfolio",
                  user
                }),
                hyper({
                  type:
                    "userFills",
                  user,
                  aggregateByTime:
                    true
                })
              ]
            );

          if (
            stateR.status !==
              "fulfilled" ||
            !stateR
              .value
              ?.marginSummary
          ) {
            throw new Error(
              "Hyperliquid state unavailable"
            );
          }

          const state =
            stateR.value;

          const portfolio =
            portfolioR.status ===
            "fulfilled"
              ? portfolioR.value
              : [];

          const fills =
            fillsR.status ===
            "fulfilled"
              ? fillsR.value
              : [];

          const day =
            portfolioWindow(
              portfolio,
              [
                "perpDay",
                "day"
              ]
            );

          const week =
            portfolioWindow(
              portfolio,
              [
                "perpWeek",
                "week"
              ]
            );

          const month =
            portfolioWindow(
              portfolio,
              [
                "perpMonth",
                "month"
              ]
            );

          const allTime =
            portfolioWindow(
              portfolio,
              [
                "perpAllTime",
                "allTime"
              ]
            );

          const stats30 =
            fillStats(
              fills,
              30
            );

          const positions =
            (
              state.assetPositions ||
              []
            )
              .map(
                x =>
                  x.position ||
                  x
              )
              .filter(
                p =>
                  Math.abs(
                    num(
                      p.szi
                    )
                  ) >
                  0
              )
              .map(
                p => ({
                  coin:
                    String(
                      p.coin ||
                        ""
                    ).toUpperCase(),
                  side:
                    num(
                      p.szi
                    ) >=
                    0
                      ? "LONG"
                      : "SHORT",
                  size:
                    num(
                      p.szi
                    ),
                  positionValue:
                    Math.abs(
                      num(
                        p.positionValue
                      )
                    ),
                  entryPx:
                    num(
                      p.entryPx
                    ),
                  unrealizedPnl:
                    num(
                      p.unrealizedPnl
                    ),
                  leverage:
                    p.leverage
                      ?.value !=
                    null
                      ? num(
                          p.leverage
                            .value
                        )
                      : null
                })
              );

          const score =
            walletScore(
              day,
              week,
              month,
              stats30
            );

          return {
            user,
            equity:
              num(
                state
                  .marginSummary
                  .accountValue
              ),
            positions,
            pnl: {
              day,
              week,
              month,
              allTime
            },
            stats30,
            smartScore:
              score,
            tier:
              score >= 80
                ? "A+"
                : score >=
                    70
                ? "A"
                : score >=
                    60
                ? "B"
                : score >=
                    50
                ? "C"
                : "D",
            stale:
              false,
            updatedAt:
              Date.now()
          };
        }
      );

    lastGoodWallet.set(
      key,
      summary
    );

    return summary;
  } catch (e) {
    const old =
      lastGoodWallet.get(
        key
      );

    if (old) {
      return {
        ...old,
        stale:
          true,
        staleReason:
          String(
            e
          )
      };
    }

    throw e;
  }
}

app.get(
  "/api/hyperliquid/summary",
  async (
    req,
    res
  ) => {
    const user =
      String(
        req.query.user ||
          ""
      );

    if (
      !/^0x[a-fA-F0-9]{40}$/.test(
        user
      )
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            "Invalid wallet"
        });
    }

    try {
      res.json(
        await walletSummary(
          user
        )
      );
    } catch (e) {
      res
        .status(
          502
        )
        .json({
          error:
            String(
              e
            )
        });
    }
  }
);

/* =========================================================
   TRADER DISCOVERY
========================================================= */

function perfMap(
  row
) {
  const output =
    {};

  for (
    const item
    of row
      ?.windowPerformances ||
      []
  ) {
    if (
      !Array.isArray(
        item
      ) ||
      !item[1]
    ) {
      continue;
    }

    let key =
      String(
        item[0]
      );

    if (
      key ===
      "perpDay"
    ) {
      key =
        "day";
    }

    if (
      key ===
      "perpWeek"
    ) {
      key =
        "week";
    }

    if (
      key ===
      "perpMonth"
    ) {
      key =
        "month";
    }

    if (
      key ===
      "perpAllTime"
    ) {
      key =
        "allTime";
    }

    output[
      key
    ] = {
      pnl:
        num(
          item[1].pnl
        ),
      roiPct:
        num(
          item[1].roi
        ) *
        100,
      volume:
        num(
          item[1].vlm
        )
    };
  }

  return output;
}

function traderScore(
  t
) {
  let s = 35;
  const p =
    t.performance;

  if (
    (
      p.week
        ?.pnl ||
      0
    ) >
    0
  ) {
    s += 12;
  }

  if (
    (
      p.month
        ?.pnl ||
      0
    ) >
    0
  ) {
    s += 15;
  }

  if (
    (
      p.allTime
        ?.pnl ||
      0
    ) >
    0
  ) {
    s += 12;
  }

  s +=
    clamp(
      p.month
        ?.roiPct ||
        0,
      -30,
      30
    ) *
    0.5;

  if (
    t.turnover30d <
    500
  ) {
    s += 7;
  }

  if (
    t.equity >
    100000
  ) {
    s += 5;
  }

  return Math.round(
    clamp(
      s,
      0,
      100
    )
  );
}

app.get(
  "/api/traders",
  async (
    req,
    res
  ) => {
    try {
      const rows =
        await cached(
          "leaderboard",
          10 *
            60 *
            1000,
          async () => {
            const d =
              await fetchJson(
                "https://stats-data.hyperliquid.xyz/Mainnet/leaderboard"
              );

            return (
              d.leaderboardRows ||
              []
            ).map(
              row => {
                const performance =
                  perfMap(
                    row
                  );

                const equity =
                  num(
                    row.accountValue
                  );

                const turnover30d =
                  equity
                    ? (
                        performance.month
                          ?.volume ||
                        0
                      ) /
                      equity
                    : Infinity;

                const t =
                  {
                    address:
                      row.ethAddress,
                    name:
                      row.displayName ||
                      "Anonymous",
                    equity,
                    performance,
                    turnover30d,
                    style:
                      turnover30d <
                      20
                        ? "Position"
                        : turnover30d <
                            150
                        ? "Swing"
                        : turnover30d <
                            1000
                        ? "Active"
                        : "HFT-like"
                  };

                t.discoveryScore =
                  traderScore(
                    t
                  );

                return t;
              }
            );
          }
        );

      const minEquity =
        num(
          req.query
            .minEquity,
          50000
        );

      const minPnl =
        num(
          req.query
            .minMonthPnl,
          0
        );

      const maxTurnover =
        num(
          req.query
            .maxTurnover,
          5000
        );

      const limit =
        clamp(
          num(
            req.query
              .limit,
            50
          ),
          10,
          100
        );

      const filtered =
        rows
          .filter(
            x =>
              x.address &&
              x.equity >=
                minEquity
          )
          .filter(
            x =>
              (
                x
                  .performance
                  .month
                  ?.pnl ||
                0
              ) >=
              minPnl
          )
          .filter(
            x =>
              x.turnover30d <=
              maxTurnover
          )
          .sort(
            (
              a,
              b
            ) =>
              b.discoveryScore -
              a.discoveryScore
          )
          .slice(
            0,
            limit
          );

      res.json({
        traders:
          filtered
      });
    } catch (e) {
      res
        .status(
          502
        )
        .json({
          error:
            String(
              e
            )
        });
    }
  }
);

/* =========================================================
   MONEY ROTATION
========================================================= */

function exposureSnapshot(
  summaries
) {
  const exposure =
    {};

  let gross = 0;

  for (
    const w
    of summaries
  ) {
    if (
      !w ||
      w.error
    ) {
      continue;
    }

    const weight =
      num(
        w.smartScore,
        50
      ) /
      100;

    for (
      const p
      of (
        w.positions ||
        []
      )
    ) {
      const signed =
        (
          p.side ===
          "LONG"
            ? 1
            : -1
        ) *
        p.positionValue *
        weight;

      exposure[
        p.coin
      ] =
        (
          exposure[
            p.coin
          ] ||
          0
        ) +
        signed;

      gross +=
        Math.abs(
          signed
        );
    }
  }

  return {
    time:
      Date.now(),
    exposure,
    gross
  };
}

function rotationCalc(
  before,
  after
) {
  const allCoins =
    Array.from(
      new Set([
        ...Object.keys(
          before.exposure ||
            {}
        ),
        ...Object.keys(
          after.exposure ||
            {}
        )
      ])
    );

  const net =
    allCoins
      .map(
        coin => {
          const a =
            num(
              before
                .exposure
                ?.[coin]
            );

          const b =
            num(
              after
                .exposure
                ?.[coin]
            );

          return {
            coin,
            before:
              a,
            after:
              b,
            delta:
              b -
              a
          };
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          Math.abs(
            b.delta
          ) -
          Math.abs(
            a.delta
          )
      );

  const inflows =
    net
      .filter(
        x =>
          x.delta >
          0
      )
      .map(
        x => ({
          coin:
            x.coin,
          value:
            x.delta
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.value -
          a.value
      );

  const outflows =
    net
      .filter(
        x =>
          x.delta <
          0
      )
      .map(
        x => ({
          coin:
            x.coin,
          value:
            Math.abs(
              x.delta
            )
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.value -
          a.value
      );

  const source =
    outflows.map(
      x => ({
        ...x,
        remaining:
          x.value
      })
    );

  const target =
    inflows.map(
      x => ({
        ...x,
        remaining:
          x.value
      })
    );

  const paths =
    [];

  for (
    const s
    of source
  ) {
    for (
      const t
      of target
    ) {
      if (
        s.remaining <=
        0
      ) {
        break;
      }

      if (
        t.remaining <=
        0
      ) {
        continue;
      }

      const value =
        Math.min(
          s.remaining,
          t.remaining
        );

      if (
        value <= 0
      ) {
        continue;
      }

      paths.push({
        from:
          s.coin,
        to:
          t.coin,
        value
      });

      s.remaining -=
        value;

      t.remaining -=
        value;
    }
  }

  return {
    windowSeconds:
      Math.max(
        1,
        Math.round(
          (
            after.time -
            before.time
          ) /
            1000
        )
      ),
    totalIn:
      inflows.reduce(
        (
          s,
          x
        ) =>
          s +
          x.value,
        0
      ),
    totalOut:
      outflows.reduce(
        (
          s,
          x
        ) =>
          s +
          x.value,
        0
      ),
    inflows,
    outflows,
    net,
    paths:
      paths
        .sort(
          (
            a,
            b
          ) =>
            b.value -
            a.value
        )
        .slice(
          0,
          30
        )
  };
}

app.get(
  "/api/rotation",
  async (
    req,
    res
  ) => {
    const users =
      String(
        req.query.users ||
          ""
      )
        .split(
          ","
        )
        .map(
          x =>
            x.trim()
        )
        .filter(
          x =>
            /^0x[a-fA-F0-9]{40}$/.test(
              x
            )
        )
        .slice(
          0,
          25
        );

    if (
      !users.length
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            "No wallets"
        });
    }

    try {
      const summaries =
        await mapLimit(
          users,
          3,
          async user => {
            try {
              return await walletSummary(
                user
              );
            } catch (e) {
              return {
                user,
                error:
                  String(
                    e
                  )
              };
            }
          }
        );

      const snap =
        exposureSnapshot(
          summaries
        );

      const key =
        users
          .map(
            x =>
              x.toLowerCase()
          )
          .sort()
          .join(
            "|"
          );

      const hist =
        walletHistory.get(
          key
        ) ||
        [];

      hist.push(
        snap
      );

      while (
        hist.length >
        MAX_ROTATION_SNAPSHOTS
      ) {
        hist.shift();
      }

      walletHistory.set(
        key,
        hist
      );

      let previous =
        null;

      for (
        let i =
          hist.length -
          2;
        i >= 0;
        i--
      ) {
        previous =
          hist[i];

        if (
          snap.time -
            previous.time >=
          60000
        ) {
          break;
        }
      }

      if (
        !previous
      ) {
        return res.json({
          warmup:
            true,
          wallets:
            users.length
        });
      }

      res.json({
        warmup:
          false,
        wallets:
          users.length,
        rotation:
          rotationCalc(
            previous,
            snap
          )
      });
    } catch (e) {
      res
        .status(
          502
        )
        .json({
          error:
            String(
              e
            )
        });
    }
  }
);

/* =========================================================
   MACRO
========================================================= */

const MACRO = [
  {
    name:
      "Gold Spot",
    symbol:
      "XAUUSD",
    stooq:
      "xauusd",
    group:
      "Gold"
  },
  {
    name:
      "WTI",
    symbol:
      "CL.F",
    stooq:
      "cl.f",
    group:
      "Oil"
  },
  {
    name:
      "Brent",
    symbol:
      "CB.F",
    stooq:
      "cb.f",
    group:
      "Oil"
  },
  {
    name:
      "DXY",
    symbol:
      "DX.F",
    stooq:
      "dx.f",
    group:
      "FX"
  },
  {
    name:
      "EUR/USD",
    symbol:
      "EURUSD",
    stooq:
      "eurusd",
    group:
      "FX"
  }
];

function parseCSV(
  text
) {
  const lines =
    text
      .trim()
      .split(
        /\r?\n/
      )
      .filter(
        Boolean
      );

  if (
    lines.length <
    2
  ) {
    throw new Error(
      "No CSV data"
    );
  }

  const header =
    lines[0]
      .split(
        ","
      )
      .map(
        x =>
          x.trim()
      );

  const values =
    lines[1]
      .split(
        ","
      )
      .map(
        x =>
          x.trim()
      );

  const row =
    {};

  header.forEach(
    (
      h,
      i
    ) =>
      row[h] =
        values[i]
  );

  return row;
}

async function macroQuote(
  asset
) {
  const text =
    await fetchText(
      `https://stooq.com/q/l/?s=${encodeURIComponent(
        asset.stooq
      )}&f=sd2t2ohlcv&h&e=csv`
    );

  const row =
    parseCSV(
      text
    );

  const open =
    num(
      row.Open,
      NaN
    );

  const close =
    num(
      row.Close,
      NaN
    );

  if (
    !Number.isFinite(
      close
    )
  ) {
    throw new Error(
      "No quote"
    );
  }

  return {
    ...asset,
    price:
      close,
    changePct:
      Number.isFinite(
        open
      ) &&
      open
        ? (
            (
              close -
              open
            ) /
            open
          ) *
          100
        : null,
    time:
      [
        row.Date,
        row.Time
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        )
  };
}

app.get(
  "/api/macro",
  async (
    req,
    res
  ) => {
    const out =
      [];

    for (
      const asset
      of MACRO
    ) {
      try {
        const q =
          await cached(
            `macro:${asset.symbol}`,
            30000,
            () =>
              macroQuote(
                asset
              )
          );

        lastGood.set(
          `macro:${asset.symbol}`,
          q
        );

        out.push(
          q
        );
      } catch (e) {
        const previous =
          lastGood.get(
            `macro:${asset.symbol}`
          );

        out.push(
          previous
            ? {
                ...previous,
                stale:
                  true
              }
            : {
                ...asset,
                error:
                  String(
                    e
                  )
              }
        );
      }
    }

    res.json(
      out
    );
  }
);

/* =========================================================
   IRAN MARKET
========================================================= */

const IRAN_ITEMS = [
  {
    key:
      "price_dollar_rl",
    name:
      "USD Free Market"
  },
  {
    key:
      "geram18",
    name:
      "Gold 18K"
  },
  {
    key:
      "mesghal",
    name:
      "Mesghal"
  },
  {
    key:
      "sekee",
    name:
      "Emami Coin"
  }
];

function cleanNumber(
  str
) {
  if (!str) {
    return null;
  }

  const x =
    String(
      str
    )
      .replace(
        /<[^>]+>/g,
        ""
      )
      .replace(
        /,/g,
        ""
      )
      .replace(
        /[^0-9.\-]/g,
        ""
      );

  const value =
    Number(
      x
    );

  return Number.isFinite(
    value
  )
    ? value
    : null;
}

function extractTGJU(
  html,
  key
) {
  const escaped =
    key.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const patterns =
    [
      new RegExp(
        `data-market-row=["']${escaped}["'][\\s\\S]{0,1500}?data-price=["']([^"']+)`,
        "i"
      ),
      new RegExp(
        `${escaped}[\\s\\S]{0,1200}?<td[^>]*class=["'][^"']*(?:nf|market-value|price)[^"']*["'][^>]*>([\\s\\S]{0,100}?)<\\/td>`,
        "i"
      ),
      new RegExp(
        `/profile/${escaped}[\\s\\S]{0,1500}?([0-9]{1,3}(?:,[0-9]{3}){1,4})`,
        "i"
      )
    ];

  for (
    const regex
    of patterns
  ) {
    const m =
      html.match(
        regex
      );

    const value =
      cleanNumber(
        m?.[1]
      );

    if (
      Number.isFinite(
        value
      ) &&
      value >
        0
    ) {
      return value;
    }
  }

  return null;
}

app.get(
  "/api/iran",
  async (
    req,
    res
  ) => {
    try {
      const html =
        await cached(
          "tgju-home",
          30000,
          () =>
            fetchText(
              "https://www.tgju.org/"
            )
        );

      const data =
        [];

      for (
        const item
        of IRAN_ITEMS
      ) {
        const value =
          extractTGJU(
            html,
            item.key
          );

        const cacheKey =
          `iran:${item.key}`;

        if (
          Number.isFinite(
            value
          )
        ) {
          const row =
            {
              ...item,
              value,
              stale:
                false,
              time:
                Date.now()
            };

          lastGood.set(
            cacheKey,
            row
          );

          data.push(
            row
          );
        } else {
          const old =
            lastGood.get(
              cacheKey
            );

          data.push(
            old
              ? {
                  ...old,
                  stale:
                    true
                }
              : {
                  ...item,
                  value:
                    null,
                  error:
                    "TGJU parse unavailable"
                }
          );
        }
      }

      res.json(
        data
      );
    } catch (e) {
      res.json(
        IRAN_ITEMS.map(
          item => {
            const old =
              lastGood.get(
                `iran:${item.key}`
              );

            return old
              ? {
                  ...old,
                  stale:
                    true
                }
              : {
                  ...item,
                  value:
                    null,
                  error:
                    String(
                      e
                    )
                };
          }
        )
      );
    }
  }
);

app.get(
  "/",
  (
    req,
    res
  ) =>
    res
      .type(
        "html"
      )
      .send(
        INDEX_HTML
      )
);

app.get(
  "/index.html",
  (
    req,
    res
  ) =>
    res
      .type(
        "html"
      )
      .send(
        INDEX_HTML
      )
);

app.listen(
  PORT,
  () => {
    console.log(
      `ALI Flow Radar v5.6 running on ${PORT}`
    );
  }
);
