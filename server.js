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
    version: "5.9",
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
    const rawBuyRatio = total ? (buy / total) * 100 : 50;
    const rawNetFlow = buy - sell;
    const rawFlowIntensityPct = total ? (rawNetFlow / total) * 100 : 0;

    // SMALL-MONEY FILTER: tiny imbalances are neutral for trading decisions.
    const minDecisionUsd = Math.max(25000, Math.min(5000000, total * 0.06));
    const meaningfulFlow = Math.abs(rawNetFlow) >= minDecisionUsd;
    const netFlow = meaningfulFlow ? rawNetFlow : 0;
    const buyRatio = meaningfulFlow ? rawBuyRatio : 50;
    const flowIntensityPct = meaningfulFlow ? rawFlowIntensityPct : 0;

    return {
      symbol,
      takerBuy: buy,
      takerSell: sell,
      netFlow,
      buyRatio,
      flowIntensityPct,
      flowScore: meaningfulFlow
        ? clamp(50 + (buyRatio - 50) * 1.35 + flowIntensityPct * 0.9, 0, 100)
        : 50,
      rawNetFlow,
      rawBuyRatio,
      rawFlowIntensityPct,
      minDecisionUsd,
      meaningfulFlow,
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
  const rawBuyRatio = total ? (buy / total) * 100 : 50;
  const rawNetFlow = buy - sell;
  const rawIntensityPct = total ? (rawNetFlow / total) * 100 : 0;

  // Small structural flow is ignored too, so 1m/5m/15m does not vote on noise.
  const minDecisionUsd = Math.max(25000, Math.min(10000000, total * 0.04));
  const meaningfulFlow = Math.abs(rawNetFlow) >= minDecisionUsd;
  const netFlow = meaningfulFlow ? rawNetFlow : 0;
  const buyRatio = meaningfulFlow ? rawBuyRatio : 50;
  const intensityPct = meaningfulFlow ? rawIntensityPct : 0;

  return {
    buy,
    sell,
    total,
    netFlow,
    buyRatio,
    intensityPct,
    score: meaningfulFlow ? clamp(50 + (buyRatio - 50) * 1.75, 0, 100) : 50,
    rawNetFlow,
    rawBuyRatio,
    rawIntensityPct,
    minDecisionUsd,
    meaningfulFlow
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
                "v5.9 PATIENT BIG-FLOW keeps the original dashboard, ignores small money for trade decisions, ranks meaningful inflow/outflow, and lets Demo wait for large persistent opposite flow before exiting. Hard stop-loss always has priority. The frontend reviews flow exits after 5m/15m and adapts bounded exit thresholds from Demo results. This is a research heuristic, not guaranteed capital flow.",
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
      `ALI Flow Radar v5.9 running on ${PORT}`
    );
  }
);
