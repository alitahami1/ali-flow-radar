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
      "User-Agent": "Mozilla/5.0 ALI-Flow-Radar/5.10",
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

const BINANCE_REST_BASES = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com"
];

async function binanceJson(pathname) {
  let lastError = null;
  for (const base of BINANCE_REST_BASES) {
    try {
      return await fetchJson(base + pathname);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("All Binance market-data endpoints failed");
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
    version: "5.11",
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
      binanceJson("/api/v3/ticker/24hr")
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
    const trades = await binanceJson(
      `/api/v3/aggTrades?symbol=${encodeURIComponent(symbol)}&limit=500`
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
      binanceJson(
        `/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`
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
      binanceJson(
        `/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1m&limit=360`
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
          `universe:v510:${limit}:${scan}`,
          18000,
          async () => {
            const tickers =
              await cached(
                "universe:tickers",
                5000,
                () =>
                  binanceJson(
                    "/api/v3/ticker/24hr"
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
                "v5.11 MONEY-FLOW FIX keeps the original dashboard, ignores small money for trade decisions, ranks meaningful inflow/outflow, and lets Demo wait for large persistent opposite flow before exiting. Hard stop-loss always has priority. The frontend reviews flow exits after 5m/15m and adapts bounded exit thresholds from Demo results. This is a research heuristic, not guaranteed capital flow.",
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
      .filter(x => {
        const grossBase = Math.max(num(before.gross), num(after.gross), 1);
        const minRotationUsd = Math.max(75000, Math.min(5000000, grossBase * 0.00075));
        return Math.abs(x.delta) >= minRotationUsd;
      })
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
      `ALI Flow Radar v5.11 running on ${PORT}`
    );
  }
);
