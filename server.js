const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const zlib = require("zlib");

const app = express();
const PORT = process.env.PORT || 3000;

const INDEX_BROTLI_B64 = `
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
u6Xq3v6cAw==
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
    version: "5.12",
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
      flow15m.netFlow,
    rawNetFlow1m:
      flow1m.rawNetFlow,
    rawNetFlow5m:
      flow5m.rawNetFlow,
    rawNetFlow15m:
      flow15m.rawNetFlow,
    minDecisionUsd1m:
      flow1m.minDecisionUsd,
    minDecisionUsd5m:
      flow5m.minDecisionUsd,
    minDecisionUsd15m:
      flow15m.minDecisionUsd
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
                "v5.12 MONEY-FLOW DISPLAY FIX keeps the original dashboard, ignores small money for trade decisions, ranks meaningful inflow/outflow, and lets Demo wait for large persistent opposite flow before exiting. Hard stop-loss always has priority. The frontend reviews flow exits after 5m/15m and adapts bounded exit thresholds from Demo results. This is a research heuristic, not guaranteed capital flow.",
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
      `ALI Flow Radar v5.12 running on ${PORT}`
    );
  }
);
