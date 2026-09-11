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
    version: "5.10",
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
                "v5.10 RESILIENT BIG-FLOW keeps the original dashboard, ignores small money for trade decisions, ranks meaningful inflow/outflow, and lets Demo wait for large persistent opposite flow before exiting. Hard stop-loss always has priority. The frontend reviews flow exits after 5m/15m and adapts bounded exit thresholds from Demo results. This is a research heuristic, not guaranteed capital flow.",
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
      `ALI Flow Radar v5.10 running on ${PORT}`
    );
  }
);
