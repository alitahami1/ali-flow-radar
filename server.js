const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "256kb" }));
app.use(express.static(path.join(__dirname)));

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

const clamp = (x, a, b) =>
  Math.max(a, Math.min(b, x));

async function cached(key, ttl, fn) {

  const hit = cache.get(key);

  if (
    hit &&
    Date.now() - hit.time < ttl
  ) {
    return hit.value;
  }

  const value = await fn();

  cache.set(key, {
    time: Date.now(),
    value
  });

  return value;
}


async function fetchText(url, options = {}) {

  const r = await fetch(url, {
    ...options,

    headers: {
      "User-Agent":
        "Mozilla/5.0 ALI-Flow-Radar/5.2",

      Accept:
        "text/html,text/plain,text/csv,application/json,*/*",

      ...(options.headers || {})
    },

    timeout: 15000
  });

  const text = await r.text();

  if (!r.ok) {
    throw new Error(
      `HTTP ${r.status}: ${text.slice(0, 140)}`
    );
  }

  return text;
}


async function fetchJson(url, options = {}) {

  const text =
    await fetchText(
      url,
      options
    );

  try {

    return JSON.parse(text);

  } catch {

    throw new Error(
      "Invalid JSON response"
    );
  }
}


async function hyper(body) {

  return fetchJson(
    "https://api.hyperliquid.xyz/info",
    {
      method: "POST",

      headers: {
        "content-type":
          "application/json"
      },

      body:
        JSON.stringify(body)
    }
  );
}


async function mapLimit(
  items,
  limit,
  worker
) {

  const out =
    new Array(items.length);

  let next = 0;

  async function run() {

    while (true) {

      const i =
        next++;

      if (
        i >= items.length
      ) {
        return;
      }

      out[i] =
        await worker(
          items[i],
          i
        );
    }
  }

  await Promise.all(

    Array.from(
      {
        length:
          Math.min(
            limit,
            items.length
          )
      },

      run
    )
  );

  return out;
}


/* ======================================================
   TECHNICAL HELPERS
====================================================== */

function ema(
  values,
  period
) {

  if (!values.length) {
    return null;
  }

  const k =
    2 /
    (
      period +
      1
    );

  let e =
    values[0];

  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    e =
      values[i] *
      k +
      e *
      (
        1 -
        k
      );
  }

  return e;
}


function rsi(
  values,
  period = 14
) {

  if (
    !values ||
    values.length <= period
  ) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  const start =
    values.length -
    period;

  for (
    let i = start;
    i < values.length;
    i++
  ) {

    const d =
      values[i] -
      values[i - 1];

    if (d >= 0) {
      gains += d;
    } else {
      losses +=
        Math.abs(d);
    }
  }

  if (
    losses === 0
  ) {
    return 100;
  }

  const rs =
    (
      gains /
      period
    ) /
    (
      losses /
      period
    );

  return (
    100 -
    100 /
    (
      1 +
      rs
    )
  );
}


function atrFromKlines(
  rows,
  period = 14
) {

  if (
    !rows ||
    rows.length < 2
  ) {
    return 0;
  }

  const trs = [];

  for (
    let i = 1;
    i < rows.length;
    i++
  ) {

    const h =
      num(rows[i][2]);

    const l =
      num(rows[i][3]);

    const previousClose =
      num(
        rows[i - 1][4]
      );

    trs.push(

      Math.max(

        h - l,

        Math.abs(
          h -
          previousClose
        ),

        Math.abs(
          l -
          previousClose
        )
      )
    );
  }

  const x =
    trs.slice(
      -period
    );

  return x.length
    ? x.reduce(
        (a, b) =>
          a + b,
        0
      ) /
      x.length
    : 0;
}


function returnPct(
  values,
  barsBack
) {

  if (
    !values.length ||
    values.length <= barsBack
  ) {
    return 0;
  }

  const last =
    values.at(-1);

  const previous =
    values.at(
      -(barsBack + 1)
    );

  return previous
    ? (
        (
          last -
          previous
        ) /
        previous
      ) *
      100
    : 0;
}


/* ======================================================
   HEALTH
====================================================== */

app.get(
  "/api/health",
  (req, res) => {

    res.json({

      ok: true,

      version:
        "5.2",

      app:
        "ALI Flow Radar",

      universe:
        "Dynamic top-20 inflow + technical ranking",

      time:
        new Date()
          .toISOString()
    });
  }
);


/* ======================================================
   BINANCE MARKET
====================================================== */

app.get(
  "/api/binance",
  async (req, res) => {

    const symbols =
      String(
        req.query.symbols ||
        "BTCUSDT,ETHUSDT"
      )
        .split(",")
        .map(
          x =>
            x.trim()
              .toUpperCase()
        )
        .filter(Boolean)
        .slice(
          0,
          40
        );

    try {

      const rows =
        await cached(

          "binance:all24h",

          2500,

          () =>
            fetchJson(
              "https://data-api.binance.vision/api/v3/ticker/24hr"
            )
        );

      const wanted =
        new Set(symbols);

      const data =
        (
          Array.isArray(rows)
            ? rows
            : []
        )
          .filter(
            x =>
              wanted.has(
                x.symbol
              )
          )
          .map(
            x => ({

              symbol:
                x.symbol,

              lastPrice:
                num(
                  x.lastPrice
                ),

              openPrice:
                num(
                  x.openPrice
                ),

              highPrice:
                num(
                  x.highPrice
                ),

              lowPrice:
                num(
                  x.lowPrice
                ),

              priceChangePercent:
                num(
                  x.priceChangePercent
                ),

              quoteVolume:
                num(
                  x.quoteVolume
                )
            })
          );

      res.json(data);

    } catch (e) {

      res
        .status(502)
        .json({
          error:
            String(e)
        });
    }
  }
);


/* ======================================================
   ORDER FLOW
====================================================== */

async function getFlowForSymbol(
  symbol
) {

  return cached(

    `flow:${symbol}`,

    7000,

    async () => {

      const trades =
        await fetchJson(

          "https://data-api.binance.vision/api/v3/aggTrades?symbol=" +

          encodeURIComponent(
            symbol
          ) +

          "&limit=500"
        );

      let buy = 0;
      let sell = 0;

      let oldest =
        Infinity;

      let newest =
        0;

      for (
        const t
        of trades ||
        []
      ) {

        const value =
          num(t.p) *
          num(t.q);

        if (t.m) {

          sell += value;

        } else {

          buy += value;
        }

        oldest =
          Math.min(
            oldest,
            num(t.T)
          );

        newest =
          Math.max(
            newest,
            num(t.T)
          );
      }

      const total =
        buy +
        sell;

      const buyRatio =
        total
          ? (
              buy /
              total
            ) *
            100
          : 50;

      const netFlow =
        buy -
        sell;

      const flowIntensityPct =
        total
          ? (
              netFlow /
              total
            ) *
            100
          : 0;

      return {

        symbol,

        takerBuy:
          buy,

        takerSell:
          sell,

        netFlow,

        buyRatio,

        flowIntensityPct,

        flowScore:
          clamp(

            50 +

            (
              buyRatio -
              50
            ) *
            1.35 +

            flowIntensityPct *
            0.9,

            0,
            100
          ),

        sampleTrades:
          Array.isArray(
            trades
          )
            ? trades.length
            : 0,

        sampleSeconds:
          newest &&
          Number.isFinite(
            oldest
          )
            ? Math.max(
                1,
                (
                  newest -
                  oldest
                ) /
                1000
              )
            : 0
      };
    }
  );
}


app.get(
  "/api/flow",
  async (req, res) => {

    const symbols =
      String(
        req.query.symbols ||
        "BTCUSDT,ETHUSDT"
      )
        .split(",")
        .map(
          x =>
            x.trim()
              .toUpperCase()
        )
        .filter(Boolean)
        .slice(
          0,
          35
        );

    const rows =
      await mapLimit(

        symbols,

        5,

        async symbol => {

          try {

            return await getFlowForSymbol(
              symbol
            );

          } catch (e) {

            return {
              symbol,
              error:
                String(e)
            };
          }
        }
      );

    res.json(rows);
  }
);


/* ======================================================
   KLINES
====================================================== */

app.get(
  "/api/klines",
  async (req, res) => {

    const symbol =
      String(
        req.query.symbol ||
        "BTCUSDT"
      )
        .trim()
        .toUpperCase();

    const interval =
      String(
        req.query.interval ||
        "5m"
      )
        .trim();

    const limit =
      clamp(
        num(
          req.query.limit,
          120
        ),
        30,
        300
      );

    const allowed =
      new Set([
        "1m",
        "3m",
        "5m",
        "15m",
        "30m",
        "1h",
        "4h"
      ]);

    if (
      !/^[A-Z0-9]{5,20}$/.test(
        symbol
      )
    ) {

      return res
        .status(400)
        .json({
          error:
            "Invalid symbol"
        });
    }

    if (
      !allowed.has(
        interval
      )
    ) {

      return res
        .status(400)
        .json({
          error:
            "Invalid interval"
        });
    }

    try {

      const rows =
        await cached(

          `klines:${symbol}:${interval}:${limit}`,

          10000,

          () =>
            fetchJson(

              "https://data-api.binance.vision/api/v3/klines?symbol=" +

              encodeURIComponent(
                symbol
              ) +

              "&interval=" +

              encodeURIComponent(
                interval
              ) +

              "&limit=" +
              limit
            )
        );

      res.json(

        (
          rows ||
          []
        )
          .map(
            r => ({

              openTime:
                num(
                  r[0]
                ),

              open:
                num(
                  r[1]
                ),

              high:
                num(
                  r[2]
                ),

              low:
                num(
                  r[3]
                ),

              close:
                num(
                  r[4]
                ),

              volume:
                num(
                  r[5]
                ),

              closeTime:
                num(
                  r[6]
                ),

              quoteVolume:
                num(
                  r[7]
                ),

              trades:
                num(
                  r[8]
                )
            })
          )
      );

    } catch (e) {

      res
        .status(502)
        .json({
          error:
            String(e)
        });
    }
  }
);


/* ======================================================
   DYNAMIC TOP 20
====================================================== */

const EXCLUDED_BASES =
  new Set([
    "USDC",
    "FDUSD",
    "TUSD",
    "USDP",
    "DAI",
    "BUSD",
    "EUR",
    "TRY",
    "BRL",
    "AEUR",
    "EURI",
    "PAXG",
    "WBTC"
  ]);


function isEligibleUSDT(
  symbol
) {

  if (
    !symbol ||
    !symbol.endsWith(
      "USDT"
    )
  ) {
    return false;
  }

  const base =
    symbol.slice(
      0,
      -4
    );

  if (
    EXCLUDED_BASES.has(
      base
    )
  ) {
    return false;
  }

  if (
    /UP$|DOWN$|BULL$|BEAR$/.test(
      base
    )
  ) {
    return false;
  }

  return /^[A-Z0-9]+$/.test(
    base
  );
}


function updateUniverseHistory(
  symbol,
  netFlow,
  buyRatio
) {

  const arr =
    universeHistory.get(
      symbol
    ) ||
    [];

  arr.push({

    time:
      Date.now(),

    netFlow,

    buyRatio
  });

  while (
    arr.length >
    6
  ) {

    arr.shift();
  }

  universeHistory.set(
    symbol,
    arr
  );

  if (
    arr.length <
    2
  ) {

    return 50;
  }

  const positive =
    arr.filter(
      x =>
        x.netFlow >
        0 &&
        x.buyRatio >=
        50
    )
      .length;

  return (
    positive /
    arr.length
  ) *
  100;
}


async function analyzeUniverseSymbol(
  ticker
) {

  const symbol =
    ticker.symbol;

  const [
    flowResult,
    klineResult
  ] =
    await Promise.allSettled([

      getFlowForSymbol(
        symbol
      ),

      cached(

        `universe-klines:${symbol}`,

        15000,

        () =>
          fetchJson(

            "https://data-api.binance.vision/api/v3/klines?symbol=" +

            encodeURIComponent(
              symbol
            ) +

            "&interval=5m&limit=72"
          )
      )
    ]);


  if (
    flowResult.status !==
    "fulfilled" ||
    klineResult.status !==
    "fulfilled"
  ) {

    throw new Error(
      "Universe analysis unavailable"
    );
  }


  const flow =
    flowResult.value;

  const klines =
    klineResult.value ||
    [];


  const closes =
    klines
      .map(
        r =>
          num(
            r[4]
          )
      )
      .filter(
        x =>
          x >
          0
      );


  const quoteVolumes =
    klines
      .map(
        r =>
          num(
            r[7]
          )
      )
      .filter(
        x =>
          x >=
          0
      );


  const last =
    closes.at(-1) ||
    num(
      ticker.lastPrice
    );


  const e9 =
    ema(
      closes.slice(
        -60
      ),
      9
    ) ||
    last;


  const e21 =
    ema(
      closes.slice(
        -60
      ),
      21
    ) ||
    last;


  const rsi14 =
    rsi(
      closes,
      14
    );


  const ret5m =
    returnPct(
      closes,
      1
    );


  const ret15m =
    returnPct(
      closes,
      3
    );


  const ret1h =
    returnPct(
      closes,
      12
    );


  const atr =
    atrFromKlines(
      klines,
      14
    ) ||
    last *
    0.0045;


  const atrPct =
    last
      ? (
          atr /
          last
        ) *
        100
      : 0;


  const recentVolume =
    quoteVolumes.at(-1) ||
    0;


  const previousVolumes =
    quoteVolumes.slice(
      -21,
      -1
    );


  const avgVolume20 =
    previousVolumes.length

      ? previousVolumes
          .reduce(
            (a, b) =>
              a + b,
            0
          ) /
          previousVolumes.length

      : recentVolume ||
        1;


  const volumeRatio =
    avgVolume20

      ? recentVolume /
        avgVolume20

      : 1;


  const emaDiffPct =
    e21
      ? (
          (
            e9 -
            e21
          ) /
          e21
        ) *
        100
      : 0;


  const trendScore =
    clamp(
      50 +
      emaDiffPct *
      28,
      0,
      100
    );


  const momentumScore =
    clamp(

      50 +

      ret15m *
      10 +

      ret1h *
      4,

      0,
      100
    );


  let rsiScore =
    50;


  if (
    rsi14 >=
    50 &&
    rsi14 <=
    68
  ) {

    rsiScore =
      65 +
      (
        rsi14 -
        50
      ) *
      1.3;

  } else if (
    rsi14 >
    68 &&
    rsi14 <=
    76
  ) {

    rsiScore =
      88 -
      (
        rsi14 -
        68
      ) *
      4;

  } else if (
    rsi14 >
    76
  ) {

    rsiScore =
      clamp(
        55 -
        (
          rsi14 -
          76
        ) *
        3,
        15,
        55
      );

  } else {

    rsiScore =
      clamp(

        50 -

        (
          50 -
          rsi14
        ) *
        1.1,

        10,
        50
      );
  }


  const volumeScore =
    clamp(

      45 +

      (
        volumeRatio -
        1
      ) *
      30,

      0,
      100
    );


  const technicalScore =
    clamp(

      trendScore *
      0.32 +

      momentumScore *
      0.28 +

      rsiScore *
      0.22 +

      volumeScore *
      0.18,

      0,
      100
    );


  const persistenceScore =
    updateUniverseHistory(

      symbol,

      flow.netFlow,

      flow.buyRatio
    );


  const inflowScore =
    clamp(

      flow.flowScore *
      0.55 +

      persistenceScore *
      0.25 +

      volumeScore *
      0.20,

      0,
      100
    );


  const technicalState =

    e9 >
    e21 &&
    rsi14 >=
    50

      ? "BULLISH"

      : e9 <
        e21 &&
        rsi14 <=
        50

      ? "BEARISH"

      : "MIXED";


  return {

    symbol,

    lastPrice:
      num(
        ticker.lastPrice
      ),

    priceChangePercent24h:
      num(
        ticker.priceChangePercent
      ),

    quoteVolume24h:
      num(
        ticker.quoteVolume
      ),

    ...flow,

    ema9:
      e9,

    ema21:
      e21,

    emaDiffPct,

    rsi14,

    ret5m,

    ret15m,

    ret1h,

    atr,

    atrPct,

    volumeRatio,

    trendScore,

    momentumScore,

    rsiScore,

    volumeScore,

    technicalScore,

    technicalState,

    persistenceScore,

    inflowScore
  };
}


/* ======================================================
   TOP 20 UNIVERSE API
====================================================== */

app.get(
  "/api/universe",
  async (req, res) => {

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
          60
        ),
        25,
        60
      );


    try {

      const tickers =
        await cached(

          "universe:tickers",

          5000,

          () =>
            fetchJson(
              "https://data-api.binance.vision/api/v3/ticker/24hr"
            )
        );


      const candidates =
        (
          Array.isArray(
            tickers
          )
            ? tickers
            : []
        )

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
            (a, b) =>
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


      const analyzed =
        await mapLimit(

          candidates,

          5,

          async ticker => {

            try {

              return await analyzeUniverseSymbol(
                ticker
              );

            } catch {

              return null;
            }
          }
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
              x >
              0
          );


      const maxLog =
        Math.max(

          1,

          ...volumes.map(
            v =>
              Math.log10(
                v +
                1
              )
          )
        );


      const minLog =
        Math.min(

          ...volumes.map(
            v =>
              Math.log10(
                v +
                1
              )
          ),

          maxLog
        );


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


        /*
          Selection:
          48% inflow
          32% technical
          10% persistence
          10% liquidity
        */

        x.selectionScore =
          clamp(

            x.inflowScore *
            0.48 +

            x.technicalScore *
            0.32 +

            x.persistenceScore *
            0.10 +

            x.liquidityScore *
            0.10,

            0,
            100
          );


        /*
          Don't chase a pump.
        */

        if (
          x.rsi14 >
          78
        ) {

          x.selectionScore -=
            10;
        }


        if (
          x.ret15m >
          4
        ) {

          x.selectionScore -=
            7;
        }


        x.selectionScore =
          clamp(
            x.selectionScore,
            0,
            100
          );
      }


      /*
        فقط ارزهایی که
        Net Flow مثبت دارند.
      */

      const positive =
        valid

          .filter(
            x =>
              x.netFlow >
              0 &&
              x.buyRatio >=
              50
          )

          .sort(
            (a, b) =>
              b.selectionScore -
              a.selectionScore
          );


      const selected =
        positive.slice(
          0,
          limit
        );


      res.json({

        generatedAt:
          Date.now(),

        scanCount:
          candidates.length,

        selectedCount:
          selected.length,

        methodology:
          "Dynamic inflow + technical ranking",

        assets:
          selected
      });


    } catch (e) {

      res
        .status(502)
        .json({
          error:
            String(e)
        });
    }
  }
);


/* ======================================================
   HYPERLIQUID WALLET
====================================================== */

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
          Array.isArray(x) &&
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
            av.at(-1)?.[1]
          )
        : 0;


    const pnl =
      pnlHistory.length

        ? num(
            pnlHistory
              .at(-1)?.[1]
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
        peak >
        0
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
    )
      .filter(
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
      Math.abs(x) >
      1e-12
    ) {

      closed++;

      pnl += x;


      if (
        x >
        0
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


  const pnls = [

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
      pnls
        .filter(
          x =>
            x >
            0
        )
        .length;


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
      month
        ?.maxDrawdownPct
    )
  ) {

    score +=
      clamp(

        12 -
        Math.abs(
          month
            .maxDrawdownPct
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
            stateResult,
            portfolioResult,
            fillsResult
          ] =
            await Promise
              .allSettled([

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
              ]);


          if (
            stateResult.status !==
            "fulfilled" ||
            !stateResult.value
              ?.marginSummary
          ) {

            throw new Error(
              "Hyperliquid state unavailable"
            );
          }


          const state =
            stateResult.value;


          const portfolio =
            portfolioResult.status ===
            "fulfilled"

              ? portfolioResult.value

              : [];


          const fills =
            fillsResult.status ===
            "fulfilled"

              ? fillsResult.value

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
                    )
                      .toUpperCase(),

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
                    p.leverage?.value !=
                    null
                      ? num(
                          p.leverage.value
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
              score >=
              80
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


    if (
      old
    ) {

      return {

        ...old,

        stale:
          true,

        staleReason:
          String(e)
      };
    }


    throw e;
  }
}


app.get(
  "/api/hyperliquid/summary",
  async (req, res) => {

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
        .status(400)
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
        .status(502)
        .json({
          error:
            String(e)
        });
    }
  }
);


/* ======================================================
   TRADER DISCOVERY
====================================================== */

function perfMap(
  row
) {

  const output = {};


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


    output[key] = {

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
      p.week?.pnl ||
      0
    ) >
    0
  ) {
    s += 12;
  }


  if (
    (
      p.month?.pnl ||
      0
    ) >
    0
  ) {
    s += 15;
  }


  if (
    (
      p.allTime?.pnl ||
      0
    ) >
    0
  ) {
    s += 12;
  }


  s +=
    clamp(
      p.month?.roiPct ||
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
  async (req, res) => {

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
            )
              .map(
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
                          performance
                            .month
                            ?.volume ||
                          0
                        ) /
                        equity

                      : Infinity;


                  const t = {

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
                    traderScore(t);


                  return t;
                }
              );
          }
        );


      const minEquity =
        num(
          req.query.minEquity,
          50000
        );


      const minPnl =
        num(
          req.query.minMonthPnl,
          0
        );


      const maxTurnover =
        num(
          req.query.maxTurnover,
          5000
        );


      const limit =
        clamp(
          num(
            req.query.limit,
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
                x.performance
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
            (a, b) =>
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
        .status(502)
        .json({
          error:
            String(e)
        });
    }
  }
);


/* ======================================================
   SMART WALLET ROTATION
====================================================== */

function exposureSnapshot(
  summaries
) {

  const exposure = {};

  let gross = 0;


  for (
    const wallet
    of summaries
  ) {

    if (
      !wallet ||
      wallet.error
    ) {
      continue;
    }


    const weight =
      num(
        wallet.smartScore,
        50
      ) /
      100;


    for (
      const p
      of wallet.positions ||
      []
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
                .exposure?.[
                  coin
                ]
            );


          const b =
            num(
              after
                .exposure?.[
                  coin
                ]
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
        (a, b) =>
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
        (a, b) =>
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
        (a, b) =>
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


  const paths = [];


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
        value <=
        0
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
        (s, x) =>
          s +
          x.value,
        0
      ),

    totalOut:
      outflows.reduce(
        (s, x) =>
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
          (a, b) =>
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
  async (req, res) => {

    const users =
      String(
        req.query.users ||
        ""
      )
        .split(",")
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
        .status(400)
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
                  String(e)
              };
            }
          }
        );


      const snapshot =
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
          .join("|");


      const history =
        walletHistory.get(
          key
        ) ||
        [];


      history.push(
        snapshot
      );


      while (
        history.length >
        MAX_ROTATION_SNAPSHOTS
      ) {

        history.shift();
      }


      walletHistory.set(
        key,
        history
      );


      let previous =
        null;


      for (
        let i =
          history.length -
          2;

        i >=
        0;

        i--
      ) {

        previous =
          history[i];


        if (
          snapshot.time -
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
            snapshot
          )
      });


    } catch (e) {

      res
        .status(502)
        .json({
          error:
            String(e)
        });
    }
  }
);


/* ======================================================
   MACRO
====================================================== */

const MACRO = [

  {
    name:
      "Gold Spot",

    symbol:
      "XAUUSD",

    stooq:
      "xauusd"
  },

  {
    name:
      "WTI",

    symbol:
      "CL.F",

    stooq:
      "cl.f"
  },

  {
    name:
      "Brent",

    symbol:
      "CB.F",

    stooq:
      "cb.f"
  },

  {
    name:
      "DXY",

    symbol:
      "DX.F",

    stooq:
      "dx.f"
  },

  {
    name:
      "EUR/USD",

    symbol:
      "EURUSD",

    stooq:
      "eurusd"
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
      .filter(Boolean);


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
      .split(",")
      .map(
        x =>
          x.trim()
      );


  const values =
    lines[1]
      .split(",")
      .map(
        x =>
          x.trim()
      );


  const row = {};


  header.forEach(
    (h, i) => {

      row[h] =
        values[i];
    }
  );


  return row;
}


async function macroQuote(
  asset
) {

  const text =
    await fetchText(

      "https://stooq.com/q/l/?s=" +

      encodeURIComponent(
        asset.stooq
      ) +

      "&f=sd2t2ohlcv&h&e=csv"
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
        .filter(Boolean)
        .join(" ")
  };
}


app.get(
  "/api/macro",
  async (req, res) => {

    const out = [];


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


        out.push(q);


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
                  String(e)
              }
        );
      }
    }


    res.json(out);
  }
);


/* ======================================================
   IRAN MARKET
====================================================== */

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
    String(str)

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
    Number(x);


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


  const patterns = [

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
  async (req, res) => {

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


      const data = [];


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

          const row = {

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


          data.push(row);


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


      res.json(data);


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
                    String(e)
                };
          }
        )
      );
    }
  }
);


app.listen(
  PORT,
  () => {

    console.log(
      `ALI Flow Radar v5.2 running on ${PORT}`
    );
  }
);
