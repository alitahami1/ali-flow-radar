const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "256kb" }));

const cache = new Map();
const lastGood = new Map();
const lastGoodWallet = new Map();
const walletHistory = new Map();
const universeHistory = new Map();

const MAX_ROTATION_SNAPSHOTS = 240;

const num = (v, f = 0) =>
  Number.isFinite(Number(v))
    ? Number(v)
    : f;

const clamp = (v, a, b) =>
  Math.max(
    a,
    Math.min(
      b,
      v
    )
  );


async function cached(
  key,
  ttl,
  fn
) {

  const hit =
    cache.get(key);

  if (
    hit &&
    Date.now() -
    hit.time <
    ttl
  ) {

    return hit.value;
  }

  const value =
    await fn();

  cache.set(
    key,
    {
      time:
        Date.now(),

      value
    }
  );

  return value;
}


async function fetchText(
  url,
  options = {}
) {

  const r =
    await fetch(
      url,
      {
        ...options,

        headers: {

          "User-Agent":
            "Mozilla/5.0 ALI-Flow-Radar/5.5",

          Accept:
            "text/html,text/plain,text/csv,application/json,*/*",

          ...(
            options.headers ||
            {}
          )
        },

        timeout:
          15000
      }
    );

  const text =
    await r.text();

  if (
    !r.ok
  ) {

    throw new Error(
      `HTTP ${r.status}: ${text.slice(0, 160)}`
    );
  }

  return text;
}


async function fetchJson(
  url,
  options = {}
) {

  const text =
    await fetchText(
      url,
      options
    );

  try {

    return JSON.parse(
      text
    );

  } catch {

    throw new Error(
      "Invalid JSON response"
    );
  }
}


async function hyper(
  body
) {

  return fetchJson(
    "https://api.hyperliquid.xyz/info",
    {
      method:
        "POST",

      headers: {
        "content-type":
          "application/json"
      },

      body:
        JSON.stringify(
          body
        )
    }
  );
}


async function mapLimit(
  items,
  limit,
  worker
) {

  const out =
    new Array(
      items.length
    );

  let next =
    0;

  async function run() {

    while (
      true
    ) {

      const i =
        next++;

      if (
        i >=
        items.length
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


function ema(
  values,
  period
) {

  if (
    !values.length
  ) {
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
    let i =
      1;

    i <
    values.length;

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
    values.length <=
    period
  ) {

    return 50;
  }

  let gains =
    0;

  let losses =
    0;

  const start =
    values.length -
    period;

  for (
    let i =
      start;

    i <
    values.length;

    i++
  ) {

    const d =
      values[i] -
      values[
        i -
        1
      ];

    if (
      d >=
      0
    ) {

      gains +=
        d;

    } else {

      losses +=
        Math.abs(
          d
        );
    }
  }

  if (
    !losses
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


function returnPct(
  values,
  barsBack
) {

  if (
    !values.length ||
    values.length <=
    barsBack
  ) {

    return 0;
  }

  const last =
    values.at(
      -1
    );

  const prev =
    values.at(
      -(
        barsBack +
        1
      )
    );

  return prev

    ? (
        (
          last -
          prev
        ) /
        prev
      ) *
      100

    : 0;
}


function rawToBar(
  r
) {

  return {

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
      ),

    takerBuyBase:
      num(
        r[9]
      ),

    takerBuyQuote:
      num(
        r[10]
      )
  };
}


function aggregateBars(
  rawRows,
  minutes
) {

  const bucketMs =
    minutes *
    60000;

  const buckets =
    new Map();

  for (
    const raw
    of rawRows ||
    []
  ) {

    const r =
      Array.isArray(
        raw
      )

        ? rawToBar(
            raw
          )

        : raw;

    const key =
      Math.floor(
        r.openTime /
        bucketMs
      ) *
      bucketMs;

    let b =
      buckets.get(
        key
      );

    if (
      !b
    ) {

      b = {

        openTime:
          key,

        open:
          r.open,

        high:
          r.high,

        low:
          r.low,

        close:
          r.close,

        quoteVolume:
          0,

        takerBuyQuote:
          0,

        trades:
          0
      };

      buckets.set(
        key,
        b
      );
    }

    b.high =
      Math.max(
        b.high,
        r.high
      );

    b.low =
      Math.min(
        b.low,
        r.low
      );

    b.close =
      r.close;

    b.quoteVolume +=
      r.quoteVolume;

    b.takerBuyQuote +=
      r.takerBuyQuote;

    b.trades +=
      r.trades;
  }

  return Array
    .from(
      buckets.values()
    )
    .sort(
      (
        a,
        b
      ) =>
        a.openTime -
        b.openTime
    );
}


function atrObjects(
  rows,
  period = 14
) {

  if (
    !rows ||
    rows.length <
    2
  ) {

    return 0;
  }

  const tr =
    [];

  for (
    let i =
      1;

    i <
    rows.length;

    i++
  ) {

    const h =
      num(
        rows[i].high
      );

    const l =
      num(
        rows[i].low
      );

    const pc =
      num(
        rows[
          i -
          1
        ].close
      );

    tr.push(

      Math.max(

        h -
        l,

        Math.abs(
          h -
          pc
        ),

        Math.abs(
          l -
          pc
        )
      )
    );
  }

  const x =
    tr.slice(
      -period
    );

  return x.length

    ? x.reduce(
        (
          a,
          b
        ) =>
          a +
          b,
        0
      ) /
      x.length

    : 0;
}


function flowFromBars(
  bars,
  count
) {

  const rows =
    (
      bars ||
      []
    )
      .slice(
        -count
      );

  let total =
    0;

  let buy =
    0;

  for (
    const r
    of rows
  ) {

    total +=
      num(
        r.quoteVolume
      );

    buy +=
      num(
        r.takerBuyQuote
      );
  }

  const sell =
    Math.max(
      0,
      total -
      buy
    );

  const buyRatio =
    total

      ? buy /
        total *
        100

      : 50;

  const netFlow =
    buy -
    sell;

  const intensityPct =
    total

      ? netFlow /
        total *
        100

      : 0;

  return {

    buy,

    sell,

    total,

    netFlow,

    buyRatio,

    intensityPct,

    score:
      clamp(

        50 +

        (
          buyRatio -
          50
        ) *
        1.75,

        0,
        100
      )
  };
}


function lastSwing(
  rows,
  side,
  lookback = 12
) {

  const x =
    (
      rows ||
      []
    )
      .slice(
        -lookback
      );

  if (
    !x.length
  ) {

    return null;
  }

  return side ===
    "LOW"

    ? Math.min(
        ...x.map(
          r =>
            num(
              r.low,
              Infinity
            )
        )
      )

    : Math.max(
        ...x.map(
          r =>
            num(
              r.high,
              -Infinity
            )
        )
      );
}


function timeframeTrendScore(
  fast,
  slow,
  atrValue
) {

  if (
    !Number.isFinite(
      fast
    ) ||
    !Number.isFinite(
      slow
    )
  ) {

    return 50;
  }

  const scale =
    Math.max(

      Math.abs(
        atrValue
      ),

      Math.abs(
        slow
      ) *
      0.001,

      1e-12
    );

  return clamp(

    50 +

    (
      (
        fast -
        slow
      ) /
      scale
    ) *
    12,

    0,
    100
  );
}


/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  (
    req,
    res
  ) => {

    res.json({

      ok:
        true,

      version:
        "5.5",

      app:
        "ALI Flow Radar",

      universe:
        "Early-flow + multi-timeframe technical",

      time:
        new Date()
          .toISOString()
    });
  }
);


/* =========================================================
   BINANCE PRICES
========================================================= */

app.get(
  "/api/binance",
  async (
    req,
    res
  ) => {

    const symbols =
      String(
        req.query.symbols ||
        "BTCUSDT,ETHUSDT"
      )
        .split(
          ","
        )
        .map(
          x =>
            x
              .trim()
              .toUpperCase()
        )
        .filter(
          Boolean
        )
        .slice(
          0,
          50
        );

    try {

      const rows =
        await cached(

          "binance:all24h",

          1800,

          () =>
            fetchJson(
              "https://data-api.binance.vision/api/v3/ticker/24hr"
            )
        );

      const wanted =
        new Set(
          symbols
        );

      res.json(

        (
          Array.isArray(
            rows
          )
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
          )
      );

    } catch (
      e
    ) {

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
   500 TRADE SAMPLE
========================================================= */

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

      let buy =
        0;

      let sell =
        0;

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
          num(
            t.p
          ) *
          num(
            t.q
          );

        if (
          t.m
        ) {

          sell +=
            value;

        } else {

          buy +=
            value;
        }

        oldest =
          Math.min(
            oldest,
            num(
              t.T
            )
          );

        newest =
          Math.max(
            newest,
            num(
              t.T
            )
          );
      }

      const total =
        buy +
        sell;

      const buyRatio =
        total

          ? buy /
            total *
            100

          : 50;

      const netFlow =
        buy -
        sell;

      const flowIntensityPct =
        total

          ? netFlow /
            total *
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
  async (
    req,
    res
  ) => {

    const symbols =
      String(
        req.query.symbols ||
        "BTCUSDT,ETHUSDT"
      )
        .split(
          ","
        )
        .map(
          x =>
            x
              .trim()
              .toUpperCase()
        )
        .filter(
          Boolean
        )
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

          } catch (
            e
          ) {

            return {

              symbol,

              error:
                String(
                  e
                )
            };
          }
        }
      );

    res.json(
      rows
    );
  }
);


/* =========================================================
   KLINES
========================================================= */

app.get(
  "/api/klines",
  async (
    req,
    res
  ) => {

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
        .status(
          400
        )
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
        .status(
          400
        )
        .json({
          error:
            "Invalid interval"
        });
    }

    try {

      const rows =
        await cached(

          `klines:${symbol}:${interval}:${limit}`,

          9000,

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

    } catch (
      e
    ) {

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
   DYNAMIC TOP 20
========================================================= */

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
  flow5,
  flow15
) {

  const arr =
    universeHistory.get(
      symbol
    ) ||
    [];

  arr.push({

    time:
      Date.now(),

    flow5:
      num(
        flow5
      ),

    flow15:
      num(
        flow15
      )
  });

  while (
    arr.length >
    8
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
        x.flow5 >=
        52 &&
        x.flow15 >=
        51
    )
      .length;

  return (
    positive /
    arr.length *
    100
  );
}


async function getMinuteKlines(
  symbol
) {

  return cached(

    `universe-1m:${symbol}`,

    25000,

    () =>
      fetchJson(

        "https://data-api.binance.vision/api/v3/klines?symbol=" +

        encodeURIComponent(
          symbol
        ) +

        "&interval=1m&limit=360"
      )
  );
}


async function analyzeMarketAsset(
  ticker
) {

  const symbol =
    ticker.symbol;

  const raw =
    await getMinuteKlines(
      symbol
    );

  const one =
    (
      raw ||
      []
    )
      .map(
        rawToBar
      );

  if (
    one.length <
    40
  ) {

    throw new Error(
      "Insufficient minute data"
    );
  }

  const bars5 =
    aggregateBars(
      one,
      5
    );

  const bars15 =
    aggregateBars(
      one,
      15
    );

  const bars60 =
    aggregateBars(
      one,
      60
    );

  const closes5 =
    bars5
      .map(
        x =>
          x.close
      )
      .filter(
        x =>
          x >
          0
      );

  const closes15 =
    bars15
      .map(
        x =>
          x.close
      )
      .filter(
        x =>
          x >
          0
      );

  const closes60 =
    bars60
      .map(
        x =>
          x.close
      )
      .filter(
        x =>
          x >
          0
      );

  const last =
    closes5.at(
      -1
    ) ||
    num(
      ticker.lastPrice
    );

  const flow1m =
    flowFromBars(
      one,
      1
    );

  const flow5m =
    flowFromBars(
      one,
      5
    );

  const flow15m =
    flowFromBars(
      one,
      15
    );

  const flowComposite =
    clamp(

      flow1m.score *
      0.20 +

      flow5m.score *
      0.35 +

      flow15m.score *
      0.45,

      0,
      100
    );

  const persistenceScore =
    updateUniverseHistory(

      symbol,

      flow5m.score,

      flow15m.score
    );

  const e5Fast =
    ema(
      closes5.slice(
        -60
      ),
      9
    ) ||
    last;

  const e5Slow =
    ema(
      closes5.slice(
        -60
      ),
      21
    ) ||
    last;

  const e15Fast =
    ema(
      closes15.slice(
        -24
      ),
      5
    ) ||
    last;

  const e15Slow =
    ema(
      closes15.slice(
        -24
      ),
      13
    ) ||
    last;

  const atr5 =
    atrObjects(
      bars5,
      14
    ) ||
    last *
    0.0045;

  const rsi5 =
    rsi(
      closes5,
      14
    );

  const ret5m =
    returnPct(
      closes5,
      1
    );

  const ret15m =
    returnPct(
      closes5,
      3
    );

  const ret1h =
    returnPct(
      closes5,
      12
    );

  const ret3h =
    returnPct(

      closes60,

      Math.min(
        3,
        Math.max(
          1,
          closes60.length -
          1
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

      atr5 *
      1.8
    );

  const trend1hScore =
    clamp(

      50 +

      ret1h *
      6 +

      ret3h *
      2.5,

      0,
      100
    );

  let rsiScore =
    50;

  if (
    rsi5 >=
    50 &&
    rsi5 <=
    66
  ) {

    rsiScore =
      70 +
      (
        rsi5 -
        50
      ) *
      1.6;

  } else if (
    rsi5 >
    66 &&
    rsi5 <=
    72
  ) {

    rsiScore =
      95 -
      (
        rsi5 -
        66
      ) *
      5;

  } else if (
    rsi5 >
    72
  ) {

    rsiScore =
      clamp(

        65 -

        (
          rsi5 -
          72
        ) *
        5,

        10,
        65
      );

  } else if (
    rsi5 >=
    42
  ) {

    rsiScore =
      45 +
      (
        rsi5 -
        42
      ) *
      2.5;

  } else {

    rsiScore =
      clamp(

        45 -

        (
          42 -
          rsi5
        ) *
        2.2,

        10,
        45
      );
  }

  const qv =
    one.map(
      x =>
        x.quoteVolume
    );

  const recent5 =
    qv
      .slice(
        -5
      )
      .reduce(
        (
          a,
          b
        ) =>
          a +
          b,
        0
      );

  const prior20 =
    qv.slice(
      -25,
      -5
    );

  const avg5 =
    prior20.length

      ? prior20
          .reduce(
            (
              a,
              b
            ) =>
              a +
              b,
            0
          ) /
          Math.max(
            1,
            prior20.length /
            5
          )

      : recent5 ||
        1;

  const volumeRatio =
    avg5

      ? recent5 /
        avg5

      : 1;

  const volumeScore =
    clamp(

      48 +

      (
        volumeRatio -
        1
      ) *
      22,

      0,
      100
    );

  const technicalScore =
    clamp(

      trend5Score *
      0.28 +

      trend15Score *
      0.28 +

      trend1hScore *
      0.18 +

      rsiScore *
      0.16 +

      volumeScore *
      0.10,

      0,
      100
    );

  const distanceAtr =
    atr5

      ? (
          last -
          e5Fast
        ) /
        atr5

      : 0;

  let chasePenalty =
    0;

  if (
    distanceAtr >
    0.65
  ) {

    chasePenalty +=
      Math.min(

        22,

        (
          distanceAtr -
          0.65
        ) *
        18
      );
  }

  if (
    ret15m >
    2.2
  ) {

    chasePenalty +=
      Math.min(

        15,

        (
          ret15m -
          2.2
        ) *
        5
      );
  }

  if (
    rsi5 >
    72
  ) {

    chasePenalty +=
      Math.min(

        18,

        (
          rsi5 -
          72
        ) *
        2.5
      );
  }

  const earlyEntryScore =
    clamp(

      88 -

      Math.max(
        0,
        distanceAtr -
        0.15
      ) *
      24 -

      Math.max(
        0,
        ret15m -
        0.7
      ) *
      11 -

      Math.max(
        0,
        rsi5 -
        66
      ) *
      2 +

      Math.max(
        0,
        volumeRatio -
        1
      ) *
      8,

      0,
      100
    );

  const technicalState =

    e5Fast >
    e5Slow &&
    e15Fast >
    e15Slow &&
    ret1h >
    -0.8

      ? "BULLISH"

      : e5Fast <
        e5Slow &&
        e15Fast <
        e15Slow &&
        ret1h <
        0.8

      ? "BEARISH"

      : "MIXED";

  const setupType =

    flow15m.score >=
    56 &&
    flow5m.score >=
    57 &&
    ret15m <=
    1.6 &&
    distanceAtr <=
    0.65

      ? "ACCUMULATION"

      : flow15m.score >=
        54 &&
        flow5m.score >=
        53 &&
        flow1m.score <
        50 &&
        Math.abs(
          distanceAtr
        ) <=
        0.55

      ? "PULLBACK"

      : "INFLOW";

  return {

    symbol,

    lastPrice:
      num(
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

    persistenceScore,

    ema5m9:
      e5Fast,

    ema5m21:
      e5Slow,

    ema15m5:
      e15Fast,

    ema15m13:
      e15Slow,

    rsi14:
      rsi5,

    ret5m,

    ret15m,

    ret1h,

    ret3h,

    atr:
      atr5,

    atrPct:
      last

        ? atr5 /
          last *
          100

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


function marketRegimeFromBTC(
  btc
) {

  if (
    !btc
  ) {

    return {

      state:
        "NEUTRAL",

      score:
        50,

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
    score >=
    62

      ? "RISK_ON"

      : score <=
        42

      ? "RISK_OFF"

      : "NEUTRAL";

  return {

    state,

    score,

    btcFlow1m:
      btc.flow1m
        ?.score ??
      50,

    btcFlow5m:
      btc.flow5m
        ?.score ??
      50,

    btcFlow15m:
      btc.flow15m
        ?.score ??
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
      ).toFixed(0)}, technical ${num(
        btc.technicalScore,
        50
      ).toFixed(0)}`
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
          36
        ),
        24,
        40
      );

    try {

      const result =
        await cached(

          `universe:v55:${limit}:${scan}`,

          45000,

          async () => {

            const tickers =
              await cached(

                "universe:tickers",

                4000,

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

            const valid =
              analyzed.filter(
                Boolean
              );

            const btc =
              valid.find(
                x =>
                  x.symbol ===
                  "BTCUSDT"
              ) ||
              null;

            const marketRegime =
              marketRegimeFromBTC(
                btc
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
                        lv -
                        minLog
                      ) /
                      (
                        maxLog -
                        minLog
                      ) *
                      100,

                      0,
                      100
                    );

              x.accumulationScore =
                clamp(

                  x.flowComposite *
                  0.46 +

                  x.earlyEntryScore *
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

                  x.flowComposite *
                  0.36 +

                  x.technicalScore *
                  0.27 +

                  x.earlyEntryScore *
                  0.19 +

                  x.persistenceScore *
                  0.08 +

                  x.liquidityScore *
                  0.10 -

                  x.chasePenalty,

                  0,
                  100
                );

              if (
                x.flow15m.score <
                51
              ) {

                x.selectionScore -=
                  12;
              }

              if (
                x.flow5m.score <
                52
              ) {

                x.selectionScore -=
                  8;
              }

              if (
                x.netFlow15m <=
                0
              ) {

                x.selectionScore -=
                  15;
              }

              if (
                x.technicalState ===
                "BEARISH"
              ) {

                x.selectionScore -=
                  10;
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
                    x.netFlow15m >
                    0
                )
                .filter(
                  x =>
                    x.flow15m.score >=
                    51
                )
                .filter(
                  x =>
                    x.flow5m.score >=
                    50
                )
                .sort(
                  (
                    a,
                    b
                  ) =>
                    b.selectionScore -
                    a.selectionScore
                );

            return {

              generatedAt:
                Date.now(),

              scanCount:
                candidates.length,

              qualifiedCount:
                qualified.length,

              selectedCount:
                Math.min(
                  limit,
                  qualified.length
                ),

              marketRegime,

              methodology:
                "v5.5: 1m/5m/15m taker-buy flow + 5m/15m/1h technical + early-entry + anti-chase",

              assets:
                qualified.slice(
                  0,
                  limit
                )
            };
          }
        );

      res.json(
        result
      );

    } catch (
      e
    ) {

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
            av.at(-1)?.[1]
          )

        : 0;

    const pnl =
      pnlHistory.length

        ? num(
            pnlHistory.at(-1)?.[1]
          ) -
          num(
            pnlHistory[0]?.[1]
          )

        : 0;

    const roi =
      first

        ? (
            last -
            first
          ) /
          Math.abs(
            first
          ) *
          100

        : null;

    let peak =
      0;

    let maxDD =
      0;

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
              value -
              peak
            ) /
            peak *
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

  let closed =
    0;

  let wins =
    0;

  let pnl =
    0;

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

      pnl +=
        x;

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

        ? wins /
          closed *
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

  let score =
    50;

  const pnls =
    [
      day?.pnl,
      week?.pnl,
      month?.pnl
    ]
      .filter(
        Number.isFinite
      );

  if (
    pnls.length
  ) {

    score +=
      (
        pnls.filter(
          x =>
            x >
            0
        )
          .length /
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
            stateR.status !==
            "fulfilled" ||
            !stateR.value
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
                state.marginSummary
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

  } catch (
    e
  ) {

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

    } catch (
      e
    ) {

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

  let s =
    35;

  const p =
    t.performance;

  if (
    (
      p.week?.pnl ||
      0
    ) >
    0
  ) {

    s +=
      12;
  }

  if (
    (
      p.month?.pnl ||
      0
    ) >
    0
  ) {

    s +=
      15;
  }

  if (
    (
      p.allTime?.pnl ||
      0
    ) >
    0
  ) {

    s +=
      12;
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

    s +=
      7;
  }

  if (
    t.equity >
    100000
  ) {

    s +=
      5;
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
                          performance.month
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

      res.json({

        traders:
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
                  x.performance.month
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
            )
      });

    } catch (
      e
    ) {

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
   ROTATION
========================================================= */

function exposureSnapshot(
  summaries
) {

  const exposure =
    {};

  let gross =
    0;

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
      of w.positions ||
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

  const coins =
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
    coins
      .map(
        coin => ({

          coin,

          before:
            num(
              before.exposure
                ?.[coin]
            ),

          after:
            num(
              after.exposure
                ?.[coin]
            ),

          delta:
            num(
              after.exposure
                ?.[coin]
            ) -
            num(
              before.exposure
                ?.[coin]
            )
        })
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

            } catch (
              e
            ) {

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

        i >=
        0;

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

    } catch (
      e
    ) {

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

const MACRO =
  [
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

  const h =
    lines[0]
      .split(
        ","
      )
      .map(
        x =>
          x.trim()
      );

  const v =
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

  h.forEach(
    (
      x,
      i
    ) =>
      row[x] =
        v[i]
  );

  return row;
}


async function macroQuote(
  asset
) {

  const row =
    parseCSV(

      await fetchText(

        "https://stooq.com/q/l/?s=" +

        encodeURIComponent(
          asset.stooq
        ) +

        "&f=sd2t2ohlcv&h&e=csv"
      )
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
            close -
            open
          ) /
          open *
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

      } catch (
        e
      ) {

        const old =
          lastGood.get(
            `macro:${asset.symbol}`
          );

        out.push(

          old

            ? {
                ...old,

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

const IRAN_ITEMS =
  [
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

  if (
    !str
  ) {

    return null;
  }

  const v =
    Number(

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
        )
    );

  return Number.isFinite(
    v
  )
    ? v
    : null;
}


function extractTGJU(
  html,
  key
) {

  const e =
    key.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const patterns =
    [
      new RegExp(
        `data-market-row=["']${e}["'][\\s\\S]{0,1500}?data-price=["']([^"']+)`,
        "i"
      ),

      new RegExp(
        `${e}[\\s\\S]{0,1200}?<td[^>]*class=["'][^"']*(?:nf|market-value|price)[^"']*["'][^>]*>([\\s\\S]{0,100}?)<\\/td>`,
        "i"
      ),

      new RegExp(
        `/profile/${e}[\\s\\S]{0,1500}?([0-9]{1,3}(?:,[0-9]{3}){1,4})`,
        "i"
      )
    ];

  for (
    const re
    of patterns
  ) {

    const m =
      html.match(
        re
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

        const k =
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
            k,
            row
          );

          data.push(
            row
          );

        } else {

          const old =
            lastGood.get(
              k
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

    } catch (
      e
    ) {

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


/* =========================================================
   FRONTEND PATCH v5.5
========================================================= */

const FRONTEND_PATCH =
String.raw`
<script>
(function(){

  const V55_COOLDOWN_MS =
    15 *
    60 *
    1000;

  const V55_MAX_PORTFOLIO_RISK =
    5;

  let v55RestTimer =
    null;

  let v55WsRetryTimer =
    null;

  let v55WsFailures =
    0;

  let v55RestBusy =
    false;


  function v55Ensure(){

    if(
      !demoState.cooldowns ||
      typeof demoState.cooldowns !==
      "object"
    ){

      demoState.cooldowns =
        {};
    }

    if(
      !Number.isFinite(
        Number(
          demoState.maxPortfolioRiskPct
        )
      )
    ){

      demoState.maxPortfolioRiskPct =
        V55_MAX_PORTFOLIO_RISK;
    }

    demoState.open =
      Array.isArray(
        demoState.open
      )
        ? demoState.open
        : [];

    demoState.closed =
      Array.isArray(
        demoState.closed
      )
        ? demoState.closed
        : [];

    demoState.armed =
      Array.isArray(
        demoState.armed
      )
        ? demoState.armed
        : [];
  }


  function v55SetFeed(
    label,
    good
  ){

    if(
      $("status")
    ){

      $("status")
        .textContent =
          label;
    }

    if(
      $("socketState")
    ){

      $("socketState")
        .textContent =
          label;
    }

    if(
      $("socketSystem")
    ){

      $("socketSystem")
        .textContent =
          label;

      $("socketSystem")
        .className =
          "metric medium " +
          (
            good
              ? "good"
              : "warn"
          );
    }

    if(
      $("dot")
    ){

      $("dot")
        .classList
        .toggle(
          "live",
          !!good
        );
    }
  }


  async function v55RestTick(){

    if(
      v55RestBusy
    ){
      return;
    }

    v55RestBusy =
      true;

    try{

      const active =
        getActiveSymbols();

      if(
        !active.length
      ){
        return;
      }

      const d =
        await getJson(

          "/api/binance?symbols=" +

          encodeURIComponent(
            active.join(",")
          )
        );

      d.forEach(
        x =>
          market[
            x.symbol
          ] = {

            ...(
              market[
                x.symbol
              ] ||
              {}
            ),

            ...x,

            liveAt:
              Date.now()
          }
      );

      v55SetFeed(
        "REST LIVE",
        true
      );

      renderLivePrices();

    }catch(e){

      v55SetFeed(
        "REST RETRY",
        false
      );

    }finally{

      v55RestBusy =
        false;
    }
  }


  function v55StartRestFallback(){

    if(
      v55RestTimer
    ){
      return;
    }

    v55RestTick();

    v55RestTimer =
      setInterval(
        v55RestTick,
        2500
      );
  }


  function v55StopRestFallback(){

    if(
      v55RestTimer
    ){

      clearInterval(
        v55RestTimer
      );

      v55RestTimer =
        null;
    }
  }


  startPriceSocket =
    function(){

      const active =
        getActiveSymbols();

      const key =
        active.join(",");

      if(
        !active.length
      ){
        return;
      }

      if(
        socket &&
        currentSocketKey ===
        key &&
        socket.readyState ===
        WebSocket.OPEN
      ){

        return;
      }

      currentSocketKey =
        key;

      if(
        v55WsRetryTimer
      ){

        clearTimeout(
          v55WsRetryTimer
        );

        v55WsRetryTimer =
          null;
      }

      if(
        socket
      ){

        try{

          socket.onclose =
            null;

          socket.close();

        }catch{}
      }

      const streams =
        active
          .map(
            s =>
              s.toLowerCase() +
              "@miniTicker"
          )
          .join("/");

      const url =
        "wss://data-stream.binance.vision/stream?streams=" +
        streams;

      v55SetFeed(
        "CONNECTING",
        false
      );

      try{

        socket =
          new WebSocket(
            url
          );

      }catch(e){

        v55WsFailures++;

        v55StartRestFallback();

        return;
      }

      const connectGuard =
        setTimeout(
          () => {

            if(
              !socket ||
              socket.readyState !==
              WebSocket.OPEN
            ){

              try{

                socket &&
                socket.close();

              }catch{}

              v55StartRestFallback();
            }
          },
          7000
        );


      socket.onopen =
        function(){

          clearTimeout(
            connectGuard
          );

          v55WsFailures =
            0;

          v55StopRestFallback();

          v55SetFeed(
            "WS LIVE",
            true
          );
        };


      socket.onmessage =
        function(e){

          try{

            const packet =
              JSON.parse(
                e.data
              );

            const d =
              packet.data ||
              packet;

            const s =
              d.s;

            if(
              !s
            ){
              return;
            }

            const c =
              num(
                d.c
              );

            const o =
              num(
                d.o,
                c
              );

            market[s] = {

              ...(
                market[s] ||
                {}
              ),

              symbol:
                s,

              lastPrice:
                c,

              openPrice:
                o,

              highPrice:
                num(
                  d.h
                ),

              lowPrice:
                num(
                  d.l
                ),

              quoteVolume:
                num(
                  d.q
                ),

              priceChangePercent:
                o
                  ? (
                      c -
                      o
                    ) /
                    o *
                    100
                  : 0,

              liveAt:
                Date.now()
            };

            if(
              s ===
              "BTCUSDT"
            ){

              btcHistory.push({

                t:
                  new Date()
                    .toLocaleTimeString(
                      "fa-IR",
                      {
                        hour:
                          "2-digit",

                        minute:
                          "2-digit",

                        second:
                          "2-digit"
                      }
                    ),

                p:
                  c
              });

              if(
                btcHistory.length >
                180
              ){

                btcHistory.shift();
              }
            }

            queueLiveRender();

          }catch{}
        };


      socket.onerror =
        function(){

          try{

            socket.close();

          }catch{}
        };


      socket.onclose =
        function(){

          clearTimeout(
            connectGuard
          );

          v55WsFailures++;

          if(
            v55WsFailures >=
            2
          ){

            v55StartRestFallback();

            v55SetFeed(
              "REST LIVE",
              true
            );

            v55WsRetryTimer =
              setTimeout(
                () => {

                  currentSocketKey =
                    "";

                  startPriceSocket();

                },
                60000
              );

          }else{

            v55SetFeed(
              "RETRY",
              false
            );

            v55WsRetryTimer =
              setTimeout(
                () => {

                  currentSocketKey =
                    "";

                  startPriceSocket();

                },
                2500
              );
          }
        };
    };


  refreshUniverse =
    async function(){

      if(
        universeBusy
      ){
        return;
      }

      universeBusy =
        true;

      try{

        const d =
          await getJson(
            "/api/universe?limit=20&scan=36"
          );

        const assets =
          Array.isArray(
            d.assets
          )
            ? d.assets
            : [];

        if(
          !assets.length
        ){
          return;
        }

        universeMeta =
          d;

        assets.forEach(
          x => {

            universeData[
              x.symbol
            ] =
              x;

            market[
              x.symbol
            ] = {

              ...(
                market[
                  x.symbol
                ] ||
                {}
              ),

              symbol:
                x.symbol,

              lastPrice:
                num(
                  x.lastPrice,
                  market[
                    x.symbol
                  ]?.lastPrice
                ),

              quoteVolume:
                num(
                  x.quoteVolume24h
                ),

              priceChangePercent:
                num(
                  x.priceChangePercent24h
                )
            };

            flow[
              x.symbol
            ] = {

              symbol:
                x.symbol,

              netFlow:
                num(
                  x.netFlow15m
                ),

              buyRatio:
                num(
                  x.flow15m
                    ?.buyRatio,
                  50
                ),

              flowScore:
                num(
                  x.flowComposite,
                  50
                ),

              flow1m:
                x.flow1m,

              flow5m:
                x.flow5m,

              flow15m:
                x.flow15m,

              sampleSeconds:
                900
            };
          }
        );

        const next =
          assets
            .map(
              x =>
                x.symbol
            )
            .slice(
              0,
              20
            );

        const changed =
          next.join(",") !==
          symbols.join(",");

        symbols =
          next;

        localStorage.setItem(

          UNIVERSE_CACHE_KEY,

          JSON.stringify(
            symbols
          )
        );

        if(
          changed
        ){

          currentSocketKey =
            "";

          startPriceSocket();

          refreshKlines();
        }

        renderAssetGrid();

        renderTerminal();

        renderDemoTrading();

      }catch(e){

        console.warn(
          "v5.5 universe",
          e
        );

      }finally{

        universeBusy =
          false;
      }
    };


  refreshFlow =
    async function(){

      try{

        const missing =
          getActiveSymbols()
            .filter(
              s =>
                !universeData[
                  s
                ]
            );

        if(
          missing.length
        ){

          const d =
            await getJson(

              "/api/flow?symbols=" +

              encodeURIComponent(
                missing.join(",")
              )
            );

          d.forEach(
            x => {

              if(
                !x.error
              ){

                flow[
                  x.symbol
                ] =
                  x;
              }
            }
          );
        }

        renderTerminal();

        renderDemoTrading();

      }catch(e){

        console.warn(
          e
        );
      }
    };


  function v55Regime(){

    return universeMeta
      ?.marketRegime ||
      {
        state:
          "NEUTRAL",

        score:
          50
      };
  }


  function v55Cooldown(
    symbol
  ){

    v55Ensure();

    const until =
      Number(
        demoState.cooldowns[
          symbol
        ] ||
        0
      );

    if(
      until &&
      until <=
      Date.now()
    ){

      delete demoState
        .cooldowns[
          symbol
        ];

      saveDemo();

      return false;
    }

    return until >
      Date.now();
  }


  function v55CooldownText(
    symbol
  ){

    const until =
      Number(
        (
          demoState.cooldowns ||
          {}
        )[
          symbol
        ] ||
        0
      );

    return until >
      Date.now()

      ? Math.max(

          1,

          Math.ceil(
            (
              until -
              Date.now()
            ) /
            60000
          )
        ) +
        "m cooldown"

      : "";
  }


  buildTradePlan =
    function(
      s
    ){

      const current =
        num(
          market[
            s
          ]?.lastPrice
        );

      const u =
        universeData[
          s
        ] ||
        {};

      if(
        !current
      ){

        return {

          symbol:
            s,

          current:
            0,

          side:
            "NO TRADE",

          grade:
            "-",

          longScore:
            50,

          shortScore:
            50,

          directionScore:
            50,

          ready:
            false,

          marketAllowed:
            false,

          displayState:
            "WAIT PRICE",

          reasons:[
            "Waiting for live price"
          ],

          exitRule:
            "Waiting",

          flowScore:
            50,

          walletScore:
            50,

          rotationScore:
            50,

          technicalScore:
            50,

          entryLow:
            null,

          entryHigh:
            null,

          stop:
            null,

          tp1:
            null,

          tp2:
            null,

          tp3:
            null,

          riskDistance:
            null
        };
      }


      const tech =
        technicalData(
          s
        );

      const rot =
        rotationDataFor(
          s
        );

      const wal =
        walletComponent(
          s
        );

      const regime =
        v55Regime();

      const f1 =
        num(
          u.flow1m
            ?.score,
          50
        );

      const f5 =
        num(
          u.flow5m
            ?.score,
          50
        );

      const f15 =
        num(
          u.flow15m
            ?.score,
          50
        );

      const flowComposite =
        num(

          u.flowComposite,

          f1 *
          .20 +

          f5 *
          .35 +

          f15 *
          .45
        );

      const technicalScore =
        num(
          u.technicalScore,
          tech.score ||
          50
        );

      const technicalState =
        u.technicalState ||
        tech.state ||
        "MIXED";

      const selection =
        num(
          u.selectionScore,
          50
        );

      const early =
        num(
          u.earlyEntryScore,
          50
        );

      const chase =
        num(
          u.chasePenalty,
          0
        );

      const rsiVal =
        num(
          u.rsi14,
          50
        );

      const net15 =
        num(
          u.netFlow15m
        );

      const cooldown =
        v55Cooldown(
          s
        );


      let longScore =
        clamp(

          flowComposite *
          .29 +

          technicalScore *
          .27 +

          early *
          .17 +

          selection *
          .10 +

          wal.score *
          .08 +

          rot.score *
          .05 +

          num(
            regime.score,
            50
          ) *
          .04 -

          chase *
          .45,

          0,
          100
        );


      if(
        f15 <
        51
      ){

        longScore -=
          12;
      }

      if(
        f5 <
        52
      ){

        longScore -=
          8;
      }

      if(
        technicalState ===
        "BEARISH"
      ){

        longScore -=
          12;
      }

      if(
        rsiVal >
        72
      ){

        longScore -=
          Math.min(

            15,

            (
              rsiVal -
              72
            ) *
            2.5
          );
      }

      if(
        num(
          u.ret15m
        ) >
        2.2
      ){

        longScore -=
          8;
      }

      if(
        regime.state ===
        "RISK_OFF" &&
        s !==
        "BTCUSDT"
      ){

        longScore -=
          18;
      }

      longScore =
        clamp(
          longScore,
          0,
          100
        );

      const shortScore =
        100 -
        longScore;


      const inflowStrong =

        f5 >=
        54 &&

        f15 >=
        53 &&

        net15 >
        0;


      const techReady =

        technicalScore >=
        58 &&

        technicalState !==
        "BEARISH" &&

        rsiVal >=
        46 &&

        rsiVal <=
        72;


      const antiChaseOK =

        chase <=
        14 &&

        num(
          u.distanceAtr
        ) <=
        .80 &&

        num(
          u.ret15m
        ) <=
        2.4;


      const riskOffLong =

        inflowStrong &&

        regime.state ===
        "RISK_OFF" &&

        s !==
        "BTCUSDT";


      let side =
        "NO TRADE";

      let grade =
        "-";

      let displayState =
        "NO TRADE";


      if(
        inflowStrong &&
        techReady &&
        antiChaseOK &&
        !riskOffLong &&
        longScore >=
        80
      ){

        side =
          "LONG";

        grade =
          "A+";

        displayState =
          "INFLOW + TECH READY";

      }else if(
        inflowStrong &&
        techReady &&
        antiChaseOK &&
        !riskOffLong &&
        longScore >=
        72
      ){

        side =
          "LONG";

        grade =
          "A";

        displayState =
          "INFLOW + TECH READY";

      }else if(
        inflowStrong &&
        riskOffLong
      ){

        side =
          "WATCH LONG";

        grade =
          "WATCH";

        displayState =
          "INFLOW / BTC RISK-OFF";

      }else if(
        inflowStrong &&
        technicalState ===
        "BEARISH"
      ){

        side =
          "WATCH LONG";

        grade =
          "WATCH";

        displayState =
          "INFLOW / TECH BEARISH";

      }else if(
        inflowStrong &&
        !techReady
      ){

        side =
          "WATCH LONG";

        grade =
          "WATCH";

        displayState =
          "INFLOW / WAIT TECH";

      }else if(
        inflowStrong &&
        !antiChaseOK
      ){

        side =
          "WATCH LONG";

        grade =
          "WATCH";

        displayState =
          "INFLOW / WAIT PULLBACK";

      }else if(
        f15 >=
        51 &&
        net15 >
        0
      ){

        side =
          "WATCH LONG";

        grade =
          "WATCH";

        displayState =
          "INFLOW / BUILDING";
      }


      const a =
        Math.max(

          num(
            u.atr,
            tech.atr
          ),

          current *
          .0025
        );


      const emaFast =
        num(

          u.ema5m9,

          tech.ema9 ||
          current
        );


      const mid =

        side ===
        "LONG" ||
        side ===
        "WATCH LONG"

          ? Math.min(
              current,
              emaFast
            )

          : current;


      const entryLow =
        mid -
        a *
        .18;

      const entryHigh =
        mid +
        a *
        .18;


      const swingLow =
        num(
          u.swingLow,
          0
        );

      const baseRisk =
        a *
        1.6;


      const stop =
        swingLow >
        0 &&
        swingLow <
        mid

          ? Math.min(

              mid -
              baseRisk,

              swingLow -
              a *
              .10
            )

          : mid -
            baseRisk;


      const riskDistance =
        Math.abs(
          mid -
          stop
        );


      const tp1 =
        mid +
        riskDistance *
        1.2;

      const tp2 =
        mid +
        riskDistance *
        2;

      const tp3 =
        mid +
        riskDistance *
        3;


      const distanceToZone =

        current <
        entryLow

          ? entryLow -
            current

          : current >
            entryHigh

          ? current -
            entryHigh

          : 0;


      const actionable =
        side ===
        "LONG";


      const marketAllowed =

        actionable &&

        distanceToZone <=
        a *
        .25 &&

        antiChaseOK &&

        !cooldown &&

        !riskOffLong;


      const ready =

        actionable &&

        current >=
        entryLow &&

        current <=
        entryHigh &&

        !cooldown &&

        !riskOffLong;


      if(
        cooldown
      ){

        displayState =
          "COOLDOWN " +
          v55CooldownText(
            s
          );

      }else if(
        actionable &&
        !marketAllowed &&
        !ready
      ){

        displayState =
          "INFLOW / WAIT PULLBACK";
      }


      return {

        symbol:
          s,

        current,

        side,

        grade,

        longScore,

        shortScore,

        directionScore:
          longScore,

        entryLow,

        entryHigh,

        entryMid:
          mid,

        stop,

        tp1,

        tp2,

        tp3,

        riskDistance,

        atr:
          a,

        ready,

        marketAllowed,

        cooldown,

        riskOffLong,

        displayState,

        reasons:[

          "Flow 1m/5m/15m " +
          f1.toFixed(0) +
          "/" +
          f5.toFixed(0) +
          "/" +
          f15.toFixed(0),

          "15m Net $" +
          money(
            net15
          ),

          "Tech " +
          technicalScore.toFixed(0) +
          " " +
          technicalState,

          "RSI " +
          rsiVal.toFixed(0),

          "Early " +
          early.toFixed(0),

          "Chase " +
          chase.toFixed(0),

          "Wallet " +
          wal.score.toFixed(0),

          "BTC " +
          regime.state
        ],

        exitRule:
          "TP1 30% → BE • TP2 30% → trailing • TP3 final",

        flowScore:
          flowComposite,

        walletScore:
          wal.score,

        rotationScore:
          rot.score,

        technicalScore,

        rsi:
          rsiVal,

        universeScore:
          selection
      };
    };


  function v55OpenRisk(){

    return demoState.open
      .reduce(
        (
          sum,
          t
        ) => {

          const r =
            t.side ===
            "LONG"

              ? Math.max(
                  0,
                  num(
                    t.entry
                  ) -
                  num(
                    t.stop
                  )
                )

              : Math.max(
                  0,
                  num(
                    t.stop
                  ) -
                  num(
                    t.entry
                  )
                );

          return (
            sum +
            r *
            num(
              t.qty
            )
          );
        },
        0
      );
  }


  armDemoTrade =
    function(
      symbol
    ){

      v55Ensure();

      const p =
        buildTradePlan(
          symbol
        );

      if(
        p.side !==
        "LONG"
      ){

        return alert(
          "هنوز ورود کامل تأیید نشده؛ وضعیت را در ستون State ببین."
        );
      }

      if(
        p.cooldown
      ){

        return alert(
          "این ارز در Cooldown است."
        );
      }

      if(
        p.riskOffLong
      ){

        return alert(
          "BTC در RISK_OFF است."
        );
      }

      if(
        demoState.open
          .some(
            x =>
              x.symbol ===
              symbol
          )
      ){

        return alert(
          "این ارز معامله باز دارد."
        );
      }

      if(
        !demoState.armed
          .some(
            x =>
              x.symbol ===
              symbol
          ) &&
        demoState.open.length +
        demoState.armed.length >=
        num(
          demoState.maxOpenPositions,
          10
        )
      ){

        return alert(
          "سقف معاملات پر است."
        );
      }

      demoState.armed =
        demoState.armed
          .filter(
            x =>
              x.symbol !==
              symbol
          );

      demoState.armed
        .push({

          symbol,

          side:
            "LONG",

          leverage:
            demoState.leverage,

          armedAt:
            Date.now(),

          expiresAt:
            Date.now() +
            30 *
            60 *
            1000
        });

      saveDemo();

      startPriceSocket();

      renderDemoTrading();

      processArmedEntries();
    };


  cancelArm =
    function(
      symbol
    ){

      demoState.armed =
        demoState.armed
          .filter(
            x =>
              x.symbol !==
              symbol
          );

      saveDemo();

      renderDemoTrading();
    };


  processArmedEntries =
    function(){

      v55Ensure();

      demoState.armed =
        demoState.armed
          .filter(
            a =>
              !a.expiresAt ||
              a.expiresAt >
              Date.now()
          );

      for(
        const a
        of [
          ...demoState.armed
        ]
      ){

        if(
          demoState.open.length >=
          num(
            demoState.maxOpenPositions,
            10
          )
        ){

          break;
        }

        const p =
          buildTradePlan(
            a.symbol
          );

        if(
          p.cooldown ||
          p.riskOffLong ||
          p.side !==
          "LONG"
        ){

          continue;
        }

        if(
          p.ready
        ){

          openDemoTrade(
            a.symbol,
            "AUTO"
          );
        }
      }

      saveDemo();
    };


  openDemoTrade =
    function(
      symbol,
      type = "MARKET"
    ){

      v55Ensure();

      const p =
        buildTradePlan(
          symbol
        );

      if(
        p.side !==
        "LONG"
      ){

        return type ===
        "MARKET"

          ? alert(
              "هنوز Flow + Technical برای ورود کامل تأیید نشده."
            )

          : false;
      }

      if(
        type ===
        "AUTO" &&
        !p.ready
      ){

        return false;
      }

      if(
        type ===
        "MARKET" &&
        !p.marketAllowed
      ){

        return alert(
          "ANTI-CHASE: قیمت مناسب نیست؛ ARM ENTRY بزن و منتظر Pullback بمان."
        );
      }

      if(
        demoState.open
          .some(
            x =>
              x.symbol ===
              symbol
          )
      ){

        return alert(
          "این ارز معامله باز دارد."
        );
      }

      if(
        demoState.open.length >=
        num(
          demoState.maxOpenPositions,
          10
        )
      ){

        return alert(
          "سقف معاملات همزمان پر است."
        );
      }


      const eq =
        Math.max(
          1,
          demoEquity()
        );

      const lev =
        clamp(
          num(
            demoState.leverage,
            3
          ),
          1,
          10
        );

      const riskPct =
        clamp(
          num(
            demoState.riskPct,
            1
          ),
          .1,
          5
        );

      const maxRisk =
        eq *
        clamp(
          num(
            demoState.maxPortfolioRiskPct,
            V55_MAX_PORTFOLIO_RISK
          ),
          2,
          10
        ) /
        100;

      let riskAmount =
        Math.min(

          eq *
          riskPct /
          100,

          Math.max(
            0,
            maxRisk -
            v55OpenRisk()
          )
        );

      if(
        riskAmount <=
        0
      ){

        return alert(
          "سقف ریسک کل پورتفو پر شده است."
        );
      }

      const entry =
        p.current;

      const stop =
        Math.min(

          entry -
          p.riskDistance,

          p.stop
        );

      const dist =
        Math.abs(
          entry -
          stop
        );

      const free =
        Math.max(
          0,
          demoFreeMargin()
        );

      const qty =
        Math.min(

          riskAmount /
          dist,

          free *
          lev /
          entry
        );

      if(
        !Number.isFinite(
          qty
        ) ||
        qty <=
        0
      ){

        return alert(
          "Free Margin کافی نیست."
        );
      }

      const positionValue =
        qty *
        entry;

      const marginUsed =
        positionValue /
        lev;

      demoState.open
        .push({

          id:
            Date.now() +
            "_" +
            symbol +
            "_" +
            Math.random()
              .toString(
                36
              )
              .slice(
                2,
                7
              ),

          symbol,

          side:
            "LONG",

          grade:
            p.grade,

          score:
            p.directionScore,

          entryType:
            type,

          leverage:
            lev,

          entry,

          stop,

          initialStop:
            stop,

          tp1:
            entry +
            dist *
            1.2,

          tp2:
            entry +
            dist *
            2,

          tp3:
            entry +
            dist *
            3,

          qty,

          initialQty:
            qty,

          positionValue,

          marginUsed,

          estimatedLiquidation:
            lev >
            1

              ? Math.max(

                  0,

                  entry *
                  (
                    1 -
                    .92 /
                    lev
                  )
                )

              : null,

          riskAmount:
            qty *
            dist,

          initialRiskAmount:
            qty *
            dist,

          realizedPnl:
            0,

          openedAt:
            Date.now(),

          tp1Hit:
            false,

          tp2Hit:
            false,

          trailingActive:
            false,

          atr:
            num(
              p.atr
            ),

          highWater:
            entry,

          lowWater:
            entry
        });

      demoState.armed =
        demoState.armed
          .filter(
            x =>
              x.symbol !==
              symbol
          );

      saveDemo();

      startPriceSocket();

      renderDemoTrading();

      return true;
    };


  function v55Partial(
    t,
    qtyClose,
    exitPrice,
    label
  ){

    qtyClose =
      Math.min(

        num(
          t.qty
        ),

        Math.max(
          0,
          qtyClose
        )
      );

    if(
      qtyClose <=
      0
    ){

      return 0;
    }

    const pnl =
      (
        exitPrice -
        t.entry
      ) *
      qtyClose;

    t.qty =
      Math.max(

        0,

        num(
          t.qty
        ) -
        qtyClose
      );

    t.realizedPnl =
      num(
        t.realizedPnl
      ) +
      pnl;

    demoState.closedPnl =
      num(
        demoState.closedPnl
      ) +
      pnl;

    t.positionValue =
      t.qty *
      t.entry;

    t.marginUsed =
      t.positionValue /
      Math.max(
        1,
        num(
          t.leverage,
          1
        )
      );

    t.lastPartial =
      label;

    return pnl;
  }


  closeDemoTrade =
    function(
      id,
      reason = "MANUAL",
      forcedExit
    ){

      v55Ensure();

      const i =
        demoState.open
          .findIndex(
            x =>
              x.id ===
              id
          );

      if(
        i <
        0
      ){

        return;
      }

      const t =
        demoState.open[
          i
        ];

      const exit =
        Number.isFinite(
          Number(
            forcedExit
          )
        )

          ? Number(
              forcedExit
            )

          : num(
              market[
                t.symbol
              ]?.lastPrice,
              t.entry
            );

      const finalPnl =
        (
          exit -
          t.entry
        ) *
        num(
          t.qty
        );

      const totalPnl =
        num(
          t.realizedPnl
        ) +
        finalPnl;

      demoState.closedPnl =
        num(
          demoState.closedPnl
        ) +
        finalPnl;

      demoState.closed
        .unshift({

          ...t,

          exit,

          pnl:
            totalPnl,

          reason,

          closedAt:
            Date.now()
        });

      demoState.closed =
        demoState.closed
          .slice(
            0,
            300
          );

      demoState.open
        .splice(
          i,
          1
        );

      if(
        String(
          reason
        )
          .startsWith(
            "STOP"
          )
      ){

        demoState.cooldowns[
          t.symbol
        ] =
          Date.now() +
          V55_COOLDOWN_MS;
      }

      saveDemo();

      startPriceSocket();

      renderDemoTrading();
    };


  updateDemoPositions =
    function(
      full = true
    ){

      v55Ensure();

      for(
        const t
        of [
          ...demoState.open
        ]
      ){

        const cur =
          num(
            market[
              t.symbol
            ]?.lastPrice
          );

        if(
          !cur
        ){

          continue;
        }

        const a =
          Math.max(

            num(
              t.atr
            ),

            cur *
            .0025
          );

        t.highWater =
          Math.max(

            num(
              t.highWater,
              t.entry
            ),

            cur
          );

        if(
          cur <=
          t.stop
        ){

          closeDemoTrade(

            t.id,

            t.trailingActive

              ? "STOP TRAIL"

              : t.tp1Hit

              ? "STOP BE"

              : "STOP",

            t.stop
          );

          continue;
        }

        if(
          !t.tp1Hit &&
          cur >=
          t.tp1
        ){

          v55Partial(

            t,

            num(
              t.initialQty,
              t.qty
            ) *
            .30,

            t.tp1,

            "TP1"
          );

          t.tp1Hit =
            true;

          t.stop =
            Math.max(
              t.stop,
              t.entry
            );
        }

        if(
          !t.tp2Hit &&
          cur >=
          t.tp2
        ){

          v55Partial(

            t,

            num(
              t.initialQty,
              t.qty
            ) *
            .30,

            t.tp2,

            "TP2"
          );

          t.tp2Hit =
            true;

          t.trailingActive =
            true;

          t.stop =
            Math.max(

              t.stop,

              t.entry,

              cur -
              a *
              1.10
            );
        }

        if(
          t.trailingActive
        ){

          t.stop =
            Math.max(

              t.stop,

              cur -
              a *
              1.10
            );
        }

        if(
          cur >=
          t.tp3
        ){

          closeDemoTrade(
            t.id,
            "TP3",
            t.tp3
          );

          continue;
        }
      }

      saveDemo();

      if(
        full
      ){

        renderDemoTrading();
      }
    };


  renderDemoTrading =
    function(){

      v55Ensure();

      const plans =
        symbols.map(
          buildTradePlan
        );

      const armed =
        new Set(

          demoState.armed
            .map(
              x =>
                x.symbol
            )
        );

      $("tradeSignalRows")
        .innerHTML =
          plans
            .map(
              p => {

                const action =
                  p.side ===
                  "LONG";

                const state =
                  armed.has(
                    p.symbol
                  )

                    ? "ARMED"

                    : p.displayState;

                const zone =
                  p.entryLow ==
                  null

                    ? "--"

                    : fmt(
                        p.entryLow
                      ) +
                      " – " +
                      fmt(
                        p.entryHigh
                      );

                let buttons =
                  "--";

                if(
                  action
                ){

                  buttons =

                    '<div class="actions">' +

                    '<button class="armbtn" ' +

                    (
                      armed.has(
                        p.symbol
                      )
                        ? 'disabled'
                        : ''
                    ) +

                    ' onclick="armDemoTrade(\\'' +
                    p.symbol +
                    '\\')">' +

                    (
                      armed.has(
                        p.symbol
                      )
                        ? 'ARMED'
                        : 'ARM ENTRY'
                    ) +

                    '</button>' +

                    '<button class="goodbtn" ' +

                    (
                      !p.marketAllowed
                        ? 'disabled'
                        : ''
                    ) +

                    ' onclick="openDemoTrade(\\'' +
                    p.symbol +
                    '\\',\\'MARKET\\')">' +

                    'MARKET ' +
                    demoState.leverage +
                    'x</button>' +

                    '</div>';
                }

                return (

                  '<tr>' +

                  '<td><b>' +
                  p.symbol +
                  '</b></td>' +

                  '<td class="trade-side ' +
                  (
                    p.side ===
                    'LONG'
                      ? 'long'
                      : 'wait'
                  ) +
                  '">' +
                  p.side +
                  '</td>' +

                  '<td><span class="trade-grade ' +
                  gradeClass(
                    p.grade
                  ) +
                  '">' +
                  p.grade +
                  '</span></td>' +

                  '<td><b>' +
                  p.directionScore.toFixed(
                    0
                  ) +
                  '</b></td>' +

                  '<td><b>' +
                  fmt(
                    p.current
                  ) +
                  '</b></td>' +

                  '<td>' +
                  zone +
                  '</td>' +

                  '<td>' +
                  fmt(
                    p.stop
                  ) +
                  '</td>' +

                  '<td>' +
                  fmt(
                    p.tp1
                  ) +
                  '</td>' +

                  '<td>' +
                  fmt(
                    p.tp2
                  ) +
                  '</td>' +

                  '<td>' +
                  fmt(
                    p.tp3
                  ) +
                  '</td>' +

                  '<td><b class="' +

                  (
                    state.includes(
                      "READY"
                    )

                      ? 'good'

                      : state.includes(
                          "BEARISH"
                        ) ||
                        state.includes(
                          "RISK-OFF"
                        )

                      ? 'bad'

                      : 'warn'
                  ) +

                  '">' +
                  state +
                  '</b></td>' +

                  '<td><div class="reason-list tiny">' +
                  p.reasons.join(
                    ' • '
                  ) +
                  '<br>' +
                  p.exitRule +
                  '</div></td>' +

                  '<td>' +
                  buttons +
                  '</td>' +

                  '</tr>'
                );
              }
            )
            .join(
              ""
            );


      const op =
        demoOpenPnl();

      const bal =
        demoBalance();

      const eq =
        demoEquity();

      const used =
        demoUsedMargin();

      const free =
        demoFreeMargin();

      const wins =
        demoState.closed
          .filter(
            x =>
              x.pnl >
              0
          );

      const losses =
        demoState.closed
          .filter(
            x =>
              x.pnl <
              0
          );

      const gw =
        wins.reduce(
          (
            a,
            b
          ) =>
            a +
            b.pnl,
          0
        );

      const gl =
        Math.abs(

          losses.reduce(
            (
              a,
              b
            ) =>
              a +
              b.pnl,
            0
          )
        );


      $("demoBalance")
        .textContent =
          "$" +
          money(
            bal
          );

      $("demoEquity")
        .textContent =
          "$" +
          money(
            eq
          );

      $("demoOpenPnl")
        .textContent =
          (
            op >=
            0
              ? "+"
              : ""
          ) +
          "$" +
          money(
            op
          );

      $("demoOpenPnl")
        .className =
          "v " +
          (
            op >=
            0
              ? "good"
              : "bad"
          );

      $("demoClosedPnl")
        .textContent =
          (
            demoState.closedPnl >=
            0
              ? "+"
              : ""
          ) +
          "$" +
          money(
            demoState.closedPnl
          );

      $("demoUsedMargin")
        .textContent =
          "$" +
          money(
            used
          );

      $("demoFreeMargin")
        .textContent =
          "$" +
          money(
            free
          );

      $("demoOpenCount")
        .textContent =
          demoState.open.length;

      $("demoMaxOpenView")
        .textContent =
          demoState.maxOpenPositions;

      $("demoWinRate")
        .textContent =
          demoState.closed.length

            ? (
                wins.length /
                demoState.closed.length *
                100
              )
                .toFixed(
                  1
                ) +
              "%"

            : "--";

      $("demoProfitFactor")
        .textContent =
          gl

            ? (
                gw /
                gl
              )
                .toFixed(
                  2
                )

            : gw >
              0

            ? "∞"

            : "--";


      $("demoStartBalance")
        .value =
          demoState.initialBalance;

      $("demoRiskPct")
        .value =
          demoState.riskPct;

      $("demoLeverage")
        .value =
          demoState.leverage;

      $("demoMaxOpen")
        .value =
          demoState.maxOpenPositions;

      $("riskPreview")
        .textContent =
          demoState.riskPct +
          "%";

      $("leveragePreview")
        .textContent =
          demoState.leverage +
          "x";

      $("maxOpenPreview")
        .textContent =
          demoState.maxOpenPositions;


      $("armedRows")
        .innerHTML =
          demoState.armed
            .map(
              a => {

                const p =
                  buildTradePlan(
                    a.symbol
                  );

                return (

                  '<tr>' +

                  '<td><b>' +
                  a.symbol +
                  '</b></td>' +

                  '<td>LONG</td>' +

                  '<td>' +
                  fmt(
                    p.entryLow
                  ) +
                  ' – ' +
                  fmt(
                    p.entryHigh
                  ) +
                  '</td>' +

                  '<td>' +
                  fmt(
                    p.current
                  ) +
                  '</td>' +

                  '<td>' +
                  a.leverage +
                  'x</td>' +

                  '<td>' +
                  new Date(
                    a.armedAt
                  )
                    .toLocaleTimeString(
                      'fa-IR'
                    ) +
                  '</td>' +

                  '<td><button class="danger" onclick="cancelArm(\\'' +
                  a.symbol +
                  '\\')">Cancel</button></td>' +

                  '</tr>'
                );
              }
            )
            .join(
              ""
            ) ||

          '<tr><td colspan="7">No armed entries.</td></tr>';


      $("demoOpenRows")
        .innerHTML =
          demoState.open
            .map(
              t => {

                const cur =
                  num(
                    market[
                      t.symbol
                    ]?.lastPrice,
                    t.entry
                  );

                const pnl =
                  num(
                    t.realizedPnl
                  ) +
                  (
                    cur -
                    t.entry
                  ) *
                  t.qty;

                const ret =
                  t.marginUsed

                    ? pnl /
                      t.marginUsed *
                      100

                    : 0;

                return (

                  '<tr>' +

                  '<td><b>' +
                  t.symbol +
                  '</b></td>' +

                  '<td class="good">LONG</td>' +

                  '<td>' +
                  t.entryType +
                  '</td>' +

                  '<td>' +
                  t.leverage +
                  'x</td>' +

                  '<td>' +
                  fmt(
                    t.entry
                  ) +
                  '</td>' +

                  '<td>' +
                  fmt(
                    cur
                  ) +
                  '</td>' +

                  '<td>$' +
                  money(
                    t.positionValue
                  ) +
                  '</td>' +

                  '<td>$' +
                  money(
                    t.marginUsed
                  ) +
                  '</td>' +

                  '<td>' +
                  fmt(
                    t.stop
                  ) +
                  '</td>' +

                  '<td class="' +
                  (
                    t.tp1Hit
                      ? 'good'
                      : ''
                  ) +
                  '">' +
                  fmt(
                    t.tp1
                  ) +
                  '</td>' +

                  '<td class="' +
                  (
                    t.tp2Hit
                      ? 'good'
                      : ''
                  ) +
                  '">' +
                  fmt(
                    t.tp2
                  ) +
                  '</td>' +

                  '<td>' +
                  fmt(
                    t.tp3
                  ) +
                  '</td>' +

                  '<td>' +
                  (
                    t.estimatedLiquidation
                      ? fmt(
                          t.estimatedLiquidation
                        )
                      : '--'
                  ) +
                  '</td>' +

                  '<td class="' +
                  (
                    pnl >=
                    0
                      ? 'good'
                      : 'bad'
                  ) +
                  '">' +

                  (
                    pnl >=
                    0
                      ? '+'
                      : ''
                  ) +

                  '$' +
                  money(
                    pnl
                  ) +
                  '</td>' +

                  '<td>' +
                  ret.toFixed(
                    2
                  ) +
                  '%</td>' +

                  '<td><button class="danger" onclick="closeDemoTrade(\\'' +
                  t.id +
                  '\\',\\'MANUAL\\')">Close</button></td>' +

                  '</tr>'
                );
              }
            )
            .join(
              ""
            ) ||

          '<tr><td colspan="16">No open positions.</td></tr>';


      $("demoClosedRows")
        .innerHTML =
          demoState.closed
            .slice(
              0,
              100
            )
            .map(
              t => (

                '<tr>' +

                '<td><b>' +
                t.symbol +
                '</b></td>' +

                '<td>' +
                t.side +
                '</td>' +

                '<td>' +
                t.entryType +
                '</td>' +

                '<td>' +
                t.leverage +
                'x</td>' +

                '<td>' +
                fmt(
                  t.entry
                ) +
                '</td>' +

                '<td>' +
                fmt(
                  t.exit
                ) +
                '</td>' +

                '<td class="' +
                (
                  t.pnl >=
                  0
                    ? 'good'
                    : 'bad'
                ) +
                '">' +

                (
                  t.pnl >=
                  0
                    ? '+'
                    : ''
                ) +

                '$' +
                money(
                  t.pnl
                ) +
                '</td>' +

                '<td>' +
                t.reason +
                '</td>' +

                '<td>' +
                new Date(
                  t.closedAt
                )
                  .toLocaleString(
                    'fa-IR'
                  ) +
                '</td>' +

                '</tr>'
              )
            )
            .join(
              ""
            ) ||

          '<tr><td colspan="9">No closed trades.</td></tr>';


      const note =
        document.querySelector(
          "#demo .demo-note"
        );

      if(
        note
      ){

        const riskPct =
          eq

            ? v55OpenRisk() /
              eq *
              100

            : 0;

        note.innerHTML =

          '<b>v5.5 LIVE-FLOW</b> — ' +

          'Flow در Demo دقیقاً همان 1m/5m/15m قسمت Top 20 است. ' +

          'State مشخص می‌کند چرا هنوز ورود نداریم: ' +

          '<b>INFLOW / WAIT TECH</b>، ' +

          '<b>TECH BEARISH</b>، ' +

          '<b>WAIT PULLBACK</b> یا ' +

          '<b>BTC RISK-OFF</b>. ' +

          'ریسک باز: <b>' +

          riskPct.toFixed(
            2
          ) +

          '%</b>. Feed: <b>' +

          (
            $("socketState")
              ?.textContent ||
            '--'
          ) +

          '</b>.';
      }
    };


  window.armDemoTrade =
    armDemoTrade;

  window.cancelArm =
    cancelArm;

  window.openDemoTrade =
    openDemoTrade;

  window.closeDemoTrade =
    closeDemoTrade;


  v55Ensure();

  demoState.maxPortfolioRiskPct =
    V55_MAX_PORTFOLIO_RISK;

  saveDemo();


  const badge =
    document.querySelector(
      "h1 .pill"
    );

  if(
    badge
  ){

    badge.textContent =
      "v5.5 LIVE-FLOW";
  }


  setTimeout(
    () => {

      currentSocketKey =
        "";

      startPriceSocket();

      refreshUniverse();

      renderDemoTrading();

    },
    400
  );

})();
</script>
`;


/* =========================================================
   SERVE INDEX.HTML + PATCH
========================================================= */

function serveIndex(
  req,
  res
) {

  try {

    const file =
      path.join(
        __dirname,
        "index.html"
      );

    let html =
      fs.readFileSync(
        file,
        "utf8"
      );

    html =
      html.replace(

        /<span class="pill blue">v[^<]+<\/span>/i,

        '<span class="pill blue">v5.5 LIVE-FLOW</span>'
      );

    html =
      html.replace(

        /<\/body>/i,

        FRONTEND_PATCH +
        "\n</body>"
      );

    res
      .type(
        "html"
      )
      .send(
        html
      );

  } catch (
    e
  ) {

    res
      .status(
        500
      )
      .type(
        "text"
      )
      .send(

        "index.html unavailable: " +
        String(
          e
        )
      );
  }
}


app.get(
  "/",
  serveIndex
);

app.get(
  "/index.html",
  serveIndex
);

app.use(
  express.static(
    path.join(
      __dirname
    )
  )
);


app.listen(
  PORT,
  () =>
    console.log(
      `ALI Flow Radar v5.5 running on ${PORT}`
    )
);  const text = await r.text();

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
      num(
        rows[i][2]
      );

    const l =
      num(
        rows[i][3]
      );

    const pc =
      num(
        rows[i - 1][4]
      );

    trs.push(

      Math.max(

        h - l,

        Math.abs(
          h -
          pc
        ),

        Math.abs(
          l -
          pc
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
          a +
          b,
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

  const prev =
    values.at(
      -(barsBack + 1)
    );

  return prev
    ? (
        (
          last -
          prev
        ) /
        prev
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
        "5.4",

      app:
        "ALI Flow Radar",

      universe:
        "Dynamic early-flow + multi-timeframe technical ranking",

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
   SAMPLE FLOW
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
   DYNAMIC TOP-20 EARLY-FLOW UNIVERSE v5.4

   - Flow 1m / 5m / 15m
   - Technical 5m / 15m / 1h
   - Anti-chase
   - Early accumulation / pullback
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


function rawToBar(r) {

  return {

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
      ),

    takerBuyBase:
      num(
        r[9]
      ),

    takerBuyQuote:
      num(
        r[10]
      )
  };
}


function aggregateBars(
  rawRows,
  minutes
) {

  const bucketMs =
    minutes *
    60000;

  const buckets =
    new Map();

  for (
    const raw
    of rawRows ||
    []
  ) {

    const r =
      Array.isArray(
        raw
      )
        ? rawToBar(raw)
        : raw;

    const key =
      Math.floor(
        r.openTime /
        bucketMs
      ) *
      bucketMs;

    let b =
      buckets.get(
        key
      );

    if (!b) {

      b = {

        openTime:
          key,

        open:
          r.open,

        high:
          r.high,

        low:
          r.low,

        close:
          r.close,

        quoteVolume:
          0,

        takerBuyQuote:
          0,

        trades:
          0
      };

      buckets.set(
        key,
        b
      );
    }

    b.high =
      Math.max(
        b.high,
        r.high
      );

    b.low =
      Math.min(
        b.low,
        r.low
      );

    b.close =
      r.close;

    b.quoteVolume +=
      r.quoteVolume;

    b.takerBuyQuote +=
      r.takerBuyQuote;

    b.trades +=
      r.trades;
  }

  return Array.from(
    buckets.values()
  )
    .sort(
      (a, b) =>
        a.openTime -
        b.openTime
    );
}


function flowFromBars(
  bars,
  count
) {

  const rows =
    (
      bars ||
      []
    )
      .slice(
        -count
      );

  let total = 0;
  let buy = 0;

  for (
    const r
    of rows
  ) {

    total +=
      num(
        r.quoteVolume
      );

    buy +=
      num(
        r.takerBuyQuote
      );
  }

  const sell =
    Math.max(
      0,
      total -
      buy
    );

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

  const intensityPct =
    total
      ? (
          netFlow /
          total
        ) *
        100
      : 0;

  return {

    buy,

    sell,

    total,

    netFlow,

    buyRatio,

    intensityPct,

    score:
      clamp(
        50 +
        (
          buyRatio -
          50
        ) *
        1.75,
        0,
        100
      )
  };
}


function atrObjects(
  rows,
  period = 14
) {

  if (
    !rows ||
    rows.length <
    2
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
      num(
        rows[i].high
      );

    const l =
      num(
        rows[i].low
      );

    const pc =
      num(
        rows[i - 1].close
      );

    trs.push(

      Math.max(

        h -
        l,

        Math.abs(
          h -
          pc
        ),

        Math.abs(
          l -
          pc
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
          a +
          b,
        0
      ) /
      x.length
    : 0;
}


function lastSwing(
  rows,
  side,
  lookback = 12
) {

  const x =
    (
      rows ||
      []
    )
      .slice(
        -lookback
      );

  if (!x.length) {
    return null;
  }

  if (
    side ===
    "LOW"
  ) {

    return Math.min(
      ...x.map(
        r =>
          num(
            r.low,
            Infinity
          )
      )
    );
  }

  return Math.max(
    ...x.map(
      r =>
        num(
          r.high,
          -Infinity
        )
    )
  );
}


function updateUniverseHistory(
  symbol,
  flow5,
  flow15
) {

  const arr =
    universeHistory.get(
      symbol
    ) ||
    [];

  arr.push({

    time:
      Date.now(),

    flow5:
      num(
        flow5
      ),

    flow15:
      num(
        flow15
      )
  });

  while (
    arr.length >
    8
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
        x.flow5 >=
        52 &&
        x.flow15 >=
        51
    )
      .length;

  return (
    positive /
    arr.length
  ) *
  100;
}


function timeframeTrendScore(
  fast,
  slow,
  atrValue
) {

  if (
    !Number.isFinite(
      fast
    ) ||
    !Number.isFinite(
      slow
    )
  ) {

    return 50;
  }

  const scale =
    Math.max(

      Math.abs(
        atrValue
      ),

      Math.abs(
        slow
      ) *
      0.001,

      1e-12
    );

  return clamp(

    50 +

    (
      (
        fast -
        slow
      ) /
      scale
    ) *
    12,

    0,
    100
  );
}


async function getMinuteKlines(
  symbol
) {

  return cached(

    `universe-1m:${symbol}`,

    30000,

    () =>
      fetchJson(

        "https://data-api.binance.vision/api/v3/klines?symbol=" +

        encodeURIComponent(
          symbol
        ) +

        "&interval=1m&limit=360"
      )
  );
}


async function analyzeMarketAsset(
  ticker
) {

  const symbol =
    ticker.symbol;

  const raw =
    await getMinuteKlines(
      symbol
    );

  const one =
    (
      raw ||
      []
    )
      .map(
        rawToBar
      );

  if (
    one.length <
    40
  ) {

    throw new Error(
      "Insufficient minute data"
    );
  }

  const bars5 =
    aggregateBars(
      one,
      5
    );

  const bars15 =
    aggregateBars(
      one,
      15
    );

  const bars60 =
    aggregateBars(
      one,
      60
    );

  const closes5 =
    bars5
      .map(
        x =>
          x.close
      )
      .filter(
        x =>
          x >
          0
      );

  const closes15 =
    bars15
      .map(
        x =>
          x.close
      )
      .filter(
        x =>
          x >
          0
      );

  const closes60 =
    bars60
      .map(
        x =>
          x.close
      )
      .filter(
        x =>
          x >
          0
      );

  const last =
    closes5.at(-1) ||
    num(
      ticker.lastPrice
    );

  const flow1m =
    flowFromBars(
      one,
      1
    );

  const flow5m =
    flowFromBars(
      one,
      5
    );

  const flow15m =
    flowFromBars(
      one,
      15
    );

  const flowComposite =
    clamp(

      flow1m.score *
      0.20 +

      flow5m.score *
      0.35 +

      flow15m.score *
      0.45,

      0,
      100
    );

  const persistenceScore =
    updateUniverseHistory(

      symbol,

      flow5m.score,

      flow15m.score
    );

  const e5Fast =
    ema(
      closes5.slice(
        -60
      ),
      9
    ) ||
    last;

  const e5Slow =
    ema(
      closes5.slice(
        -60
      ),
      21
    ) ||
    last;

  const e15Fast =
    ema(
      closes15.slice(
        -24
      ),
      5
    ) ||
    last;

  const e15Slow =
    ema(
      closes15.slice(
        -24
      ),
      13
    ) ||
    last;

  const atr5 =
    atrObjects(
      bars5,
      14
    ) ||
    last *
    0.0045;

  const rsi5 =
    rsi(
      closes5,
      14
    );

  const ret5m =
    returnPct(
      closes5,
      1
    );

  const ret15m =
    returnPct(
      closes5,
      3
    );

  const ret1h =
    returnPct(
      closes5,
      12
    );

  const ret3h =
    returnPct(

      closes60,

      Math.min(
        3,
        Math.max(
          1,
          closes60.length -
          1
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

      atr5 *
      1.8
    );

  const trend1hScore =
    clamp(

      50 +

      ret1h *
      6 +

      ret3h *
      2.5,

      0,
      100
    );

  let rsiScore =
    50;

  if (
    rsi5 >=
    50 &&
    rsi5 <=
    66
  ) {

    rsiScore =
      70 +
      (
        rsi5 -
        50
      ) *
      1.6;

  } else if (
    rsi5 >
    66 &&
    rsi5 <=
    72
  ) {

    rsiScore =
      95 -
      (
        rsi5 -
        66
      ) *
      5;

  } else if (
    rsi5 >
    72
  ) {

    rsiScore =
      clamp(

        65 -

        (
          rsi5 -
          72
        ) *
        5,

        10,
        65
      );

  } else if (
    rsi5 >=
    42
  ) {

    rsiScore =
      45 +
      (
        rsi5 -
        42
      ) *
      2.5;

  } else {

    rsiScore =
      clamp(

        45 -

        (
          42 -
          rsi5
        ) *
        2.2,

        10,
        45
      );
  }

  const qv =
    one.map(
      x =>
        x.quoteVolume
    );

  const recent5 =
    qv.slice(
      -5
    )
      .reduce(
        (a, b) =>
          a +
          b,
        0
      );

  const prior20 =
    qv.slice(
      -25,
      -5
    );

  const avg5 =
    prior20.length

      ? prior20
          .reduce(
            (a, b) =>
              a +
              b,
            0
          ) /
          Math.max(
            1,
            prior20.length /
            5
          )

      : recent5 ||
        1;

  const volumeRatio =
    avg5
      ? recent5 /
        avg5
      : 1;

  const volumeScore =
    clamp(

      48 +

      (
        volumeRatio -
        1
      ) *
      22,

      0,
      100
    );

  const technicalScore =
    clamp(

      trend5Score *
      0.28 +

      trend15Score *
      0.28 +

      trend1hScore *
      0.18 +

      rsiScore *
      0.16 +

      volumeScore *
      0.10,

      0,
      100
    );

  const distanceAtr =
    atr5
      ? (
          last -
          e5Fast
        ) /
        atr5
      : 0;

  let chasePenalty =
    0;

  if (
    distanceAtr >
    0.65
  ) {

    chasePenalty +=
      Math.min(

        22,

        (
          distanceAtr -
          0.65
        ) *
        18
      );
  }

  if (
    ret15m >
    2.2
  ) {

    chasePenalty +=
      Math.min(

        15,

        (
          ret15m -
          2.2
        ) *
        5
      );
  }

  if (
    rsi5 >
    72
  ) {

    chasePenalty +=
      Math.min(

        18,

        (
          rsi5 -
          72
        ) *
        2.5
      );
  }

  const earlyEntryScore =
    clamp(

      88 -

      Math.max(
        0,
        distanceAtr -
        0.15
      ) *
      24 -

      Math.max(
        0,
        ret15m -
        0.7
      ) *
      11 -

      Math.max(
        0,
        rsi5 -
        66
      ) *
      2 +

      Math.max(
        0,
        volumeRatio -
        1
      ) *
      8,

      0,
      100
    );

  const technicalState =

    e5Fast >
    e5Slow &&
    e15Fast >
    e15Slow &&
    ret1h >
    -0.8

      ? "BULLISH"

      : e5Fast <
        e5Slow &&
        e15Fast <
        e15Slow &&
        ret1h <
        0.8

      ? "BEARISH"

      : "MIXED";

  const setupType =

    flow15m.score >=
    56 &&
    flow5m.score >=
    57 &&
    ret15m <=
    1.6 &&
    distanceAtr <=
    0.65

      ? "ACCUMULATION"

      : flow15m.score >=
        54 &&
        flow5m.score >=
        53 &&
        flow1m.score <
        50 &&
        Math.abs(
          distanceAtr
        ) <=
        0.55

      ? "PULLBACK"

      : "INFLOW";

  return {

    symbol,

    lastPrice:
      num(
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

    persistenceScore,

    ema5m9:
      e5Fast,

    ema5m21:
      e5Slow,

    ema15m5:
      e15Fast,

    ema15m13:
      e15Slow,

    rsi14:
      rsi5,

    ret5m,

    ret15m,

    ret1h,

    ret3h,

    atr:
      atr5,

    atrPct:
      last
        ? (
            atr5 /
            last
          ) *
          100
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


function marketRegimeFromBTC(
  btc
) {

  if (!btc) {

    return {

      state:
        "NEUTRAL",

      score:
        50,

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
    score >=
    62
      ? "RISK_ON"
      : score <=
        42
      ? "RISK_OFF"
      : "NEUTRAL";

  return {

    state,

    score,

    btcFlow1m:
      btc.flow1m
        ?.score ??
      50,

    btcFlow5m:
      btc.flow5m
        ?.score ??
      50,

    btcFlow15m:
      btc.flow15m
        ?.score ??
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
      ).toFixed(0)}, technical ${num(
        btc.technicalScore,
        50
      ).toFixed(0)}`
  };
}


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
          32
        ),
        24,
        36
      );

    try {

      const result =
        await cached(

          `universe:v54:${limit}:${scan}`,

          55000,

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

            const btcTicker =
              all.find(
                x =>
                  x.symbol ===
                  "BTCUSDT"
              ) ||
              {

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

              x.accumulationScore =
                clamp(

                  x.flowComposite *
                  0.46 +

                  x.earlyEntryScore *
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

                  x.flowComposite *
                  0.36 +

                  x.technicalScore *
                  0.27 +

                  x.earlyEntryScore *
                  0.19 +

                  x.persistenceScore *
                  0.08 +

                  x.liquidityScore *
                  0.10 -

                  x.chasePenalty,

                  0,
                  100
                );

              if (
                x.flow15m.score <
                51
              ) {

                x.selectionScore -=
                  12;
              }

              if (
                x.flow5m.score <
                52
              ) {

                x.selectionScore -=
                  8;
              }

              if (
                x.netFlow15m <=
                0
              ) {

                x.selectionScore -=
                  15;
              }

              if (
                x.technicalState ===
                "BEARISH"
              ) {

                x.selectionScore -=
                  10;
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
                    x.netFlow15m >
                    0
                )
                .filter(
                  x =>
                    x.flow15m.score >=
                    51
                )
                .filter(
                  x =>
                    x.flow5m.score >=
                    50
                )
                .sort(
                  (a, b) =>
                    b.selectionScore -
                    a.selectionScore
                );

            const selected =
              qualified.slice(
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
                "v5.4 selects early inflow rather than the biggest recent spike. Binance 1m klines provide taker-buy quote volume for 1m/5m/15m flow. Selection combines persistent multi-window inflow, 5m/15m/1h technical structure, liquidity, volume acceleration and an anti-chase penalty. This is still a research heuristic, not guaranteed capital flow.",

              assets:
                selected
            };
          }
        );

      res.json(result);

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
            stateR,
            portfolioR,
            fillsR
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
            stateR.status !==
            "fulfilled" ||
            !stateR.value
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
                    p.leverage
                      ?.value !=
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
   MONEY ROTATION
====================================================== */

function exposureSnapshot(
  summaries
) {

  const exposure = {};

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
      of w.positions ||
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
          .join("|");

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

        i >=
        0;

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

      if (!previous) {

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


/* ======================================================
   v5.4 FRONTEND OVERRIDE
====================================================== */

const ANTI_CHASE_PATCH = String.raw`
<script>

(function(){

  var COOLDOWN_MS =
    15 *
    60 *
    1000;

  var MAX_PORTFOLIO_RISK_PCT =
    5;


  function ensureV54State(){

    if (
      !demoState.cooldowns ||
      typeof demoState.cooldowns !==
      "object"
    ) {

      demoState.cooldowns =
        {};
    }


    if (
      !Number.isFinite(
        Number(
          demoState.maxPortfolioRiskPct
        )
      )
    ) {

      demoState.maxPortfolioRiskPct =
        MAX_PORTFOLIO_RISK_PCT;
    }


    demoState.open =
      Array.isArray(
        demoState.open
      )
        ? demoState.open
        : [];


    demoState.closed =
      Array.isArray(
        demoState.closed
      )
        ? demoState.closed
        : [];


    demoState.armed =
      Array.isArray(
        demoState.armed
      )
        ? demoState.armed
        : [];
  }


  function v54Regime(){

    return (
      universeMeta &&
      universeMeta.marketRegime
    ) || {

      state:
        "NEUTRAL",

      score:
        50
    };
  }


  function inCooldown(
    symbol
  ){

    ensureV54State();

    var until =
      Number(
        demoState
          .cooldowns[
            symbol
          ] ||
        0
      );


    if (
      until &&
      until <=
      Date.now()
    ) {

      delete demoState
        .cooldowns[
          symbol
        ];


      saveDemo();

      return false;
    }


    return until >
      Date.now();
  }


  function cooldownText(
    symbol
  ){

    var until =
      Number(
        (
          demoState.cooldowns ||
          {}
        )[
          symbol
        ] ||
        0
      );


    if (
      !until ||
      until <=
      Date.now()
    ) {

      return "";
    }


    return (

      Math.max(

        1,

        Math.ceil(
          (
            until -
            Date.now()
          ) /
          60000
        )
      ) +

      "m cooldown"
    );
  }


  refreshUniverse =
    async function(){

      if (
        universeBusy
      ) {
        return;
      }


      universeBusy =
        true;


      try {

        var d =
          await getJson(
            "/api/universe?limit=20&scan=36"
          );


        var assets =
          Array.isArray(
            d.assets
          )
            ? d.assets
            : [];


        if (
          !assets.length
        ) {
          return;
        }


        universeMeta =
          d;


        for (
          var i =
            0;

          i <
          assets.length;

          i++
        ) {

          var x =
            assets[i];


          universeData[
            x.symbol
          ] =
            x;


          market[
            x.symbol
          ] =
            Object.assign(

              {},

              market[
                x.symbol
              ] ||
              {},

              {

                symbol:
                  x.symbol,

                lastPrice:
                  num(

                    x.lastPrice,

                    market[
                      x.symbol
                    ] &&
                    market[
                      x.symbol
                    ]
                      .lastPrice
                  ),

                quoteVolume:
                  num(
                    x.quoteVolume24h
                  ),

                priceChangePercent:
                  num(
                    x.priceChangePercent24h
                  )
              }
            );


          flow[
            x.symbol
          ] = {

            symbol:
              x.symbol,

            netFlow:
              num(
                x.netFlow15m
              ),

            buyRatio:
              num(
                x.flow15m &&
                x.flow15m.buyRatio,
                50
              ),

            flowScore:
              num(
                x.flowComposite,
                50
              ),

            flow1m:
              x.flow1m,

            flow5m:
              x.flow5m,

            flow15m:
              x.flow15m,

            sampleTrades:
              0,

            sampleSeconds:
              900
          };
        }


        var next =
          assets
            .map(
              function(x){

                return x.symbol;
              }
            )
            .slice(
              0,
              20
            );


        var changed =
          next.join(",") !==
          symbols.join(",");


        symbols =
          next;


        localStorage.setItem(

          UNIVERSE_CACHE_KEY,

          JSON.stringify(
            symbols
          )
        );


        if (
          changed
        ) {

          currentSocketKey =
            "";


          startPriceSocket();

          refreshKlines();
        }


        renderAssetGrid();

        renderTerminal();

        renderDemoTrading();


      } catch(e) {

        console.warn(
          "v5.4 universe scan failed",
          e
        );

      } finally {

        universeBusy =
          false;
      }
    };


  renderAssetGrid =
    function(){

      if (
        !symbols.length
      ) {

        $("assetGrid")
          .innerHTML =
            '<div class="small">در حال اسکن ورود پول و ساختار تکنیکال بازار...</div>';

        return;
      }


      $("assetGrid")
        .innerHTML =
          symbols
            .map(
              function(
                sym,
                i
              ){

                var m =
                  market[
                    sym
                  ] ||
                  {};


                var u =
                  universeData[
                    sym
                  ] ||
                  {};


                var c =
                  num(
                    m.priceChangePercent
                  );


                var f1 =
                  num(
                    u.flow1m &&
                    u.flow1m.score,
                    50
                  );


                var f5 =
                  num(
                    u.flow5m &&
                    u.flow5m.score,
                    50
                  );


                var f15 =
                  num(
                    u.flow15m &&
                    u.flow15m.score,
                    50
                  );


                var tech =
                  num(
                    u.technicalScore,
                    50
                  );


                var r =
                  num(
                    u.rsi14,
                    50
                  );


                var early =
                  num(
                    u.earlyEntryScore,
                    50
                  );


                var chase =
                  num(
                    u.chasePenalty,
                    0
                  );


                return (

                  '<div class="asset-card">' +

                  '<div class="sym">#' +
                  (
                    i +
                    1
                  ) +
                  " " +
                  sym.replace(
                    "USDT",
                    ""
                  ) +
                  "/USDT</div>" +

                  '<div class="p">' +
                  price(
                    m.lastPrice
                  ) +
                  "</div>" +

                  '<div class="' +
                  (
                    c >=
                    0
                      ? "good"
                      : "bad"
                  ) +
                  '">' +
                  pct(c) +
                  "</div>" +

                  '<div class="tiny">FLOW 1m <b>' +
                  f1.toFixed(0) +
                  "</b> • 5m <b>" +
                  f5.toFixed(0) +
                  "</b> • 15m <b>" +
                  f15.toFixed(0) +
                  "</b></div>" +

                  '<div class="tiny">TECH <b>' +
                  tech.toFixed(0) +
                  "</b> • RSI " +
                  r.toFixed(0) +
                  " • " +
                  (
                    u.technicalState ||
                    "--"
                  ) +
                  "</div>" +

                  '<div class="tiny">EARLY <b>' +
                  early.toFixed(0) +
                  "</b> • CHASE " +
                  chase.toFixed(0) +
                  " • " +
                  (
                    u.setupType ||
                    "--"
                  ) +
                  "</div>" +

                  '<div class="tiny">15m NET <span class="' +
                  (
                    num(
                      u.netFlow15m
                    ) >=
                    0
                      ? "good"
                      : "bad"
                  ) +
                  '">' +
                  (
                    num(
                      u.netFlow15m
                    ) >=
                    0
                      ? "+"
                      : ""
                  ) +
                  "$" +
                  money(
                    u.netFlow15m
                  ) +
                  "</span></div>" +

                  "</div>"
                );
              }
            )
            .join("");
    };


  buildTradePlan =
    function(
      symbol
    ){

      var current =
        num(
          market[
            symbol
          ] &&
          market[
            symbol
          ]
            .lastPrice
        );


      var u =
        universeData[
          symbol
        ] ||
        {};


      if (
        !current
      ) {

        return {

          symbol:
            symbol,

          current:
            0,

          side:
            "NO TRADE",

          grade:
            "-",

          longScore:
            50,

          shortScore:
            50,

          directionScore:
            50,

          ready:
            false,

          marketAllowed:
            false,

          reasons:[
            "Waiting for live price"
          ],

          exitRule:
            "Waiting",

          flowScore:
            50,

          walletScore:
            50,

          rotationScore:
            50,

          technicalScore:
            50,

          entryLow:
            null,

          entryHigh:
            null,

          stop:
            null,

          tp1:
            null,

          tp2:
            null,

          tp3:
            null,

          riskDistance:
            null,

          cooldown:
            false,

          riskOffLong:
            false
        };
      }


      var tech =
        technicalData(
          symbol
        );


      var rot =
        rotationDataFor(
          symbol
        );


      var wal =
        walletComponent(
          symbol
        );


      var regime =
        v54Regime();


      var f1 =
        num(
          u.flow1m &&
          u.flow1m.score,
          50
        );


      var f5 =
        num(

          u.flow5m &&
          u.flow5m.score,

          num(
            flow[
              symbol
            ] &&
            flow[
              symbol
            ]
              .flowScore,
            50
          )
        );


      var f15 =
        num(

          u.flow15m &&
          u.flow15m.score,

          f5
        );


      var flowComposite =
        num(

          u.flowComposite,

          f1 *
          0.2 +

          f5 *
          0.35 +

          f15 *
          0.45
        );


      var selection =
        num(
          u.selectionScore,
          50
        );


      var early =
        num(
          u.earlyEntryScore,
          50
        );


      var chase =
        num(
          u.chasePenalty,
          0
        );


      var rsiVal =
        num(

          u.rsi14,

          tech.rsi ||
          50
        );


      var technicalScore =
        num(

          u.technicalScore,

          tech.score ||
          50
        );


      var technicalState =
        u.technicalState ||
        tech.state ||
        "MIXED";


      var setupType =
        u.setupType ||
        "INFLOW";


      var cooldown =
        inCooldown(
          symbol
        );


      var longScore =
        clamp(

          flowComposite *
          0.28 +

          technicalScore *
          0.27 +

          early *
          0.17 +

          selection *
          0.10 +

          wal.score *
          0.08 +

          rot.score *
          0.06 +

          num(
            regime.score,
            50
          ) *
          0.04 -

          chase *
          0.45,

          0,
          100
        );


      if (
        f15 <
        51
      ) {

        longScore -=
          12;
      }


      if (
        f5 <
        52
      ) {

        longScore -=
          8;
      }


      if (
        technicalState ===
        "BEARISH"
      ) {

        longScore -=
          12;
      }


      if (
        rsiVal >
        72
      ) {

        longScore -=
          Math.min(

            15,

            (
              rsiVal -
              72
            ) *
            2.5
          );
      }


      if (
        num(
          u.ret15m
        ) >
        2.2
      ) {

        longScore -=
          8;
      }


      if (
        regime.state ===
        "RISK_OFF" &&
        symbol !==
        "BTCUSDT"
      ) {

        longScore -=
          18;
      }


      longScore =
        clamp(
          longScore,
          0,
          100
        );


      var shortScore =
        100 -
        longScore;


      var longOK =

        f15 >=
        53 &&

        f5 >=
        54 &&

        technicalScore >=
        58 &&

        technicalState !==
        "BEARISH" &&

        rsiVal >=
        46 &&

        rsiVal <=
        72 &&

        early >=
        48 &&

        chase <=
        18 &&

        num(
          u.netFlow15m
        ) >=
        0;


      var shortOK =

        f1 <=
        42 &&

        f5 <=
        46 &&

        technicalScore <=
        42 &&

        technicalState ===
        "BEARISH" &&

        rsiVal <=
        54;


      var side =
        "NO TRADE";


      var grade =
        "-";


      if (
        longOK &&
        longScore >=
        80
      ) {

        side =
          "LONG";

        grade =
          "A+";

      } else if (
        longOK &&
        longScore >=
        72
      ) {

        side =
          "LONG";

        grade =
          "A";

      } else if (
        shortOK &&
        shortScore >=
        80
      ) {

        side =
          "SHORT";

        grade =
          "A+";

      } else if (
        shortOK &&
        shortScore >=
        72
      ) {

        side =
          "SHORT";

        grade =
          "A";

      } else if (
        longScore >=
        61
      ) {

        side =
          "WATCH LONG";

        grade =
          "WATCH";

      } else if (
        shortScore >=
        61
      ) {

        side =
          "WATCH SHORT";

        grade =
          "WATCH";
      }


      var actionable =
        side ===
        "LONG" ||
        side ===
        "SHORT";


      var atrValue =
        Math.max(

          num(
            u.atr,
            tech.atr
          ),

          current *
          0.0025
        );


      var emaFast =
        num(

          u.ema5m9,

          tech.ema9 ||
          current
        );


      var mid =

        side ===
        "LONG"

          ? Math.min(
              current,
              emaFast
            )

          : side ===
            "SHORT"

          ? Math.max(
              current,
              emaFast
            )

          : current;


      var entryLow =
        mid -
        atrValue *
        0.18;


      var entryHigh =
        mid +
        atrValue *
        0.18;


      var swingLow =
        num(
          u.swingLow,
          0
        );


      var swingHigh =
        num(
          u.swingHigh,
          0
        );


      var baseRisk =
        atrValue *
        1.6;


      var stop =
        null;


      if (
        side ===
        "LONG"
      ) {

        stop =
          Math.min(

            mid -
            baseRisk,

            swingLow >
            0 &&
            swingLow <
            mid

              ? swingLow -
                atrValue *
                0.10

              : mid -
                baseRisk
          );
      }


      if (
        side ===
        "SHORT"
      ) {

        stop =
          Math.max(

            mid +
            baseRisk,

            swingHigh >
            mid

              ? swingHigh +
                atrValue *
                0.10

              : mid +
                baseRisk
          );
      }


      var riskDistance =
        stop ==
        null
          ? baseRisk
          : Math.abs(
              mid -
              stop
            );


      var tp1 =
        null;

      var tp2 =
        null;

      var tp3 =
        null;


      if (
        side ===
        "LONG"
      ) {

        tp1 =
          mid +
          riskDistance *
          1.2;

        tp2 =
          mid +
          riskDistance *
          2;

        tp3 =
          mid +
          riskDistance *
          3;
      }


      if (
        side ===
        "SHORT"
      ) {

        tp1 =
          mid -
          riskDistance *
          1.2;

        tp2 =
          mid -
          riskDistance *
          2;

        tp3 =
          mid -
          riskDistance *
          3;
      }


      var distanceToZone =

        current <
        entryLow

          ? entryLow -
            current

          : current >
            entryHigh

          ? current -
            entryHigh

          : 0;


      var marketAllowed =

        actionable &&

        distanceToZone <=
        atrValue *
        0.25 &&

        chase <=
        14 &&

        !cooldown;


      var riskOffLong =

        side ===
        "LONG" &&

        regime.state ===
        "RISK_OFF" &&

        symbol !==
        "BTCUSDT";


      if (
        riskOffLong
      ) {

        marketAllowed =
          false;
      }


      var ready =

        actionable &&

        current >=
        entryLow &&

        current <=
        entryHigh &&

        !cooldown &&

        !riskOffLong;


      var blockedReason =

        cooldown

          ? cooldownText(
              symbol
            )

          : riskOffLong

          ? "BTC regime RISK_OFF"

          : !marketAllowed &&
            actionable

          ? "Anti-chase: wait for pullback"

          : "";


      return {

        symbol:
          symbol,

        current:
          current,

        side:
          side,

        grade:
          grade,

        longScore:
          longScore,

        shortScore:
          shortScore,

        directionScore:
          (
            side ===
            "SHORT" ||
            side ===
            "WATCH SHORT"
          )
            ? shortScore
            : longScore,

        entryLow:
          entryLow,

        entryHigh:
          entryHigh,

        entryMid:
          mid,

        stop:
          stop,

        tp1:
          tp1,

        tp2:
          tp2,

        tp3:
          tp3,

        riskDistance:
          riskDistance,

        atr:
          atrValue,

        ready:
          ready,

        marketAllowed:
          marketAllowed,

        cooldown:
          cooldown,

        riskOffLong:
          riskOffLong,

        blockedReason:
          blockedReason,

        reasons:[

          "Setup " +
          setupType,

          "Flow " +
          f1.toFixed(0) +
          "/" +
          f5.toFixed(0) +
          "/" +
          f15.toFixed(0),

          "Tech " +
          technicalScore.toFixed(0) +
          " " +
          technicalState,

          "RSI " +
          rsiVal.toFixed(0),

          "Early " +
          early.toFixed(0),

          "Chase " +
          chase.toFixed(0),

          "Wallet " +
          wal.score.toFixed(0),

          "BTC " +
          regime.state
        ],

        exitRule:
          "TP1 30% → BE • TP2 30% → trailing • TP3 final",

        flowScore:
          flowComposite,

        walletScore:
          wal.score,

        rotationScore:
          rot.score,

        technicalScore:
          technicalScore,

        rsi:
          rsiVal,

        universeScore:
          selection
      };
    };


  function currentOpenRisk(){

    return demoState.open
      .reduce(
        function(
          sum,
          t
        ){

          var riskPerUnit =

            t.side ===
            "LONG"

              ? Math.max(
                  0,
                  num(
                    t.entry
                  ) -
                  num(
                    t.stop
                  )
                )

              : Math.max(
                  0,
                  num(
                    t.stop
                  ) -
                  num(
                    t.entry
                  )
                );


          return (
            sum +
            riskPerUnit *
            num(
              t.qty
            )
          );
        },

        0
      );
  }


  armDemoTrade =
    function(
      symbol
    ){

      ensureV54State();


      var p =
        buildTradePlan(
          symbol
        );


      if (
        !(
          p.side ===
          "LONG" ||
          p.side ===
          "SHORT"
        )
      ) {

        return alert(
          "فقط سیگنال A/A+ قابل ARM است."
        );
      }


      if (
        p.cooldown
      ) {

        return alert(
          "این ارز بعد از Stop در Cooldown است."
        );
      }


      if (
        p.riskOffLong
      ) {

        return alert(
          "BTC در RISK_OFF است؛ LONG آلت‌کوین فعلاً مسدود است."
        );
      }


      if (
        demoState.open
          .some(
            function(x){

              return x.symbol ===
                symbol;
            }
          )
      ) {

        return alert(
          "برای این ارز معامله باز داری."
        );
      }


      var exists =
        demoState.armed
          .some(
            function(x){

              return x.symbol ===
                symbol;
            }
          );


      if (
        !exists &&
        demoState.open.length +
        demoState.armed.length >=
        num(
          demoState.maxOpenPositions,
          10
        )
      ) {

        return alert(
          "سقف معاملات همزمان پر است."
        );
      }


      demoState.armed =
        demoState.armed
          .filter(
            function(x){

              return x.symbol !==
                symbol;
            }
          );


      demoState.armed
        .push({

          symbol:
            symbol,

          side:
            p.side,

          leverage:
            demoState.leverage,

          armedAt:
            Date.now(),

          expiresAt:
            Date.now() +
            30 *
            60 *
            1000
        });


      saveDemo();

      startPriceSocket();

      renderDemoTrading();

      processArmedEntries();
    };


  cancelArm =
    function(
      symbol
    ){

      demoState.armed =
        demoState.armed
          .filter(
            function(x){

              return x.symbol !==
                symbol;
            }
          );


      saveDemo();

      startPriceSocket();

      renderDemoTrading();
    };


  processArmedEntries =
    function(){

      ensureV54State();


      if (
        !demoState.armed.length
      ) {
        return;
      }


      demoState.armed =
        demoState.armed
          .filter(
            function(a){

              return (
                !a.expiresAt ||
                a.expiresAt >
                Date.now()
              );
            }
          );


      var copy =
        demoState.armed
          .slice();


      for (
        var i =
          0;

        i <
        copy.length;

        i++
      ) {

        if (
          demoState.open.length >=
          num(
            demoState.maxOpenPositions,
            10
          )
        ) {
          break;
        }


        var a =
          copy[i];


        var p =
          buildTradePlan(
            a.symbol
          );


        if (
          p.cooldown ||
          p.riskOffLong
        ) {

          cancelArm(
            a.symbol
          );

          continue;
        }


        if (
          (
            p.side ===
            "LONG" ||
            p.side ===
            "SHORT"
          ) &&
          p.side ===
          a.side &&
          p.ready
        ) {

          openDemoTrade(
            a.symbol,
            "AUTO"
          );
        }
      }
    };


  openDemoTrade =
    function(
      symbol,
      type
    ){

      ensureV54State();


      type =
        type ||
        "MARKET";


      var p =
        buildTradePlan(
          symbol
        );


      if (
        !(
          p.side ===
          "LONG" ||
          p.side ===
          "SHORT"
        )
      ) {

        if (
          type ===
          "MARKET"
        ) {

          alert(
            "سیگنال A/A+ وجود ندارد."
          );
        }

        return false;
      }


      if (
        p.cooldown
      ) {

        if (
          type ===
          "MARKET"
        ) {

          alert(
            "بعد از Stop، ۱۵ دقیقه Cooldown فعال است."
          );
        }

        return false;
      }


      if (
        p.riskOffLong
      ) {

        if (
          type ===
          "MARKET"
        ) {

          alert(
            "BTC در RISK_OFF است؛ LONG آلت‌کوین مسدود است."
          );
        }

        return false;
      }


      if (
        type ===
        "AUTO" &&
        !p.ready
      ) {

        return false;
      }


      if (
        type ===
        "MARKET" &&
        !p.marketAllowed
      ) {

        alert(
          "ANTI-CHASE: قیمت از Entry Zone دور شده. ARM ENTRY بزن و منتظر Pullback بمان."
        );

        return false;
      }


      if (
        demoState.open.length >=
        num(
          demoState.maxOpenPositions,
          10
        )
      ) {

        if (
          type ===
          "MARKET"
        ) {

          alert(
            "سقف معاملات همزمان پر شده است."
          );
        }

        return false;
      }


      if (
        demoState.open
          .some(
            function(x){

              return x.symbol ===
                symbol;
            }
          )
      ) {

        if (
          type ===
          "MARKET"
        ) {

          alert(
            "این ارز معامله باز دارد."
          );
        }

        return false;
      }


      var eq =
        Math.max(
          1,
          demoEquity()
        );


      var lev =
        clamp(
          num(
            demoState.leverage,
            3
          ),
          1,
          10
        );


      var riskPct =
        clamp(
          num(
            demoState.riskPct,
            1
          ),
          0.1,
          5
        );


      var riskAmount =
        eq *
        riskPct /
        100;


      var maxPortfolioRisk =
        eq *
        clamp(

          num(
            demoState.maxPortfolioRiskPct,
            MAX_PORTFOLIO_RISK_PCT
          ),

          2,
          10
        ) /
        100;


      var availableRisk =
        Math.max(

          0,

          maxPortfolioRisk -
          currentOpenRisk()
        );


      riskAmount =
        Math.min(
          riskAmount,
          availableRisk
        );


      if (
        riskAmount <=
        0
      ) {

        if (
          type ===
          "MARKET"
        ) {

          alert(
            "سقف ریسک کل پورتفو پر شده است."
          );
        }

        return false;
      }


      var entry =
        p.current;


      var stop =

        p.side ===
        "LONG"

          ? entry -
            p.riskDistance

          : entry +
            p.riskDistance;


      if (
        p.side ===
        "LONG" &&
        p.stop !=
        null
      ) {

        stop =
          Math.min(
            stop,
            p.stop
          );
      }


      if (
        p.side ===
        "SHORT" &&
        p.stop !=
        null
      ) {

        stop =
          Math.max(
            stop,
            p.stop
          );
      }


      var dist =
        Math.abs(
          entry -
          stop
        );


      if (
        !dist
      ) {
        return false;
      }


      var free =
        Math.max(
          0,
          demoFreeMargin()
        );


      var riskQty =
        riskAmount /
        dist;


      var maxQty =
        free *
        lev /
        entry;


      var qty =
        Math.min(
          riskQty,
          maxQty
        );


      if (
        !Number.isFinite(
          qty
        ) ||
        qty <=
        0
      ) {

        if (
          type ===
          "MARKET"
        ) {

          alert(
            "Free Margin کافی نیست."
          );
        }

        return false;
      }


      var pos =
        qty *
        entry;


      var margin =
        pos /
        lev;


      var tp1 =

        p.side ===
        "LONG"

          ? entry +
            dist *
            1.2

          : entry -
            dist *
            1.2;


      var tp2 =

        p.side ===
        "LONG"

          ? entry +
            dist *
            2

          : entry -
            dist *
            2;


      var tp3 =

        p.side ===
        "LONG"

          ? entry +
            dist *
            3

          : entry -
            dist *
            3;


      var liq =

        lev >
        1

          ? (
              p.side ===
              "LONG"

                ? Math.max(

                    0,

                    entry *
                    (
                      1 -
                      0.92 /
                      lev
                    )
                  )

                : entry *
                  (
                    1 +
                    0.92 /
                    lev
                  )
            )

          : null;


      demoState.open
        .push({

          id:
            Date.now() +
            "_" +
            symbol +
            "_" +
            Math.random()
              .toString(
                36
              )
              .slice(
                2,
                7
              ),

          symbol:
            symbol,

          side:
            p.side,

          grade:
            p.grade,

          score:
            p.directionScore,

          entryType:
            type,

          leverage:
            lev,

          entry:
            entry,

          stop:
            stop,

          initialStop:
            stop,

          tp1:
            tp1,

          tp2:
            tp2,

          tp3:
            tp3,

          qty:
            qty,

          initialQty:
            qty,

          positionValue:
            pos,

          marginUsed:
            margin,

          estimatedLiquidation:
            liq,

          riskAmount:
            qty *
            dist,

          initialRiskAmount:
            qty *
            dist,

          realizedPnl:
            0,

          openedAt:
            Date.now(),

          tp1Hit:
            false,

          tp2Hit:
            false,

          trailingActive:
            false,

          atr:
            num(
              p.atr
            ),

          highWater:
            entry,

          lowWater:
            entry
        });


      demoState.armed =
        demoState.armed
          .filter(
            function(x){

              return x.symbol !==
                symbol;
            }
          );


      saveDemo();

      startPriceSocket();

      renderDemoTrading();

      return true;
    };


  function partialClose(
    t,
    qtyClose,
    exitPrice,
    label
  ){

    qtyClose =
      Math.min(

        num(
          t.qty
        ),

        Math.max(
          0,
          qtyClose
        )
      );


    if (
      qtyClose <=
      0
    ) {
      return 0;
    }


    var pnl =

      (
        t.side ===
        "LONG"
          ? 1
          : -1
      ) *

      (
        exitPrice -
        t.entry
      ) *

      qtyClose;


    t.qty =
      Math.max(

        0,

        num(
          t.qty
        ) -
        qtyClose
      );


    t.realizedPnl =
      num(
        t.realizedPnl
      ) +
      pnl;


    demoState.closedPnl =
      num(
        demoState.closedPnl
      ) +
      pnl;


    t.positionValue =
      t.qty *
      t.entry;


    t.marginUsed =
      t.positionValue /
      Math.max(
        1,
        num(
          t.leverage,
          1
        )
      );


    t.lastPartial =
      label;


    return pnl;
  }


  closeDemoTrade =
    function(
      id,
      reason,
      forcedExit
    ){

      ensureV54State();


      var i =
        demoState.open
          .findIndex(
            function(x){

              return x.id ===
                id;
            }
          );


      if (
        i <
        0
      ) {
        return;
      }


      var t =
        demoState.open[
          i
        ];


      var exit =

        Number.isFinite(
          Number(
            forcedExit
          )
        )

          ? Number(
              forcedExit
            )

          : num(

              market[
                t.symbol
              ] &&
              market[
                t.symbol
              ]
                .lastPrice,

              t.entry
            );


      var finalPnl =

        (
          t.side ===
          "LONG"
            ? 1
            : -1
        ) *

        (
          exit -
          t.entry
        ) *

        num(
          t.qty
        );


      demoState.closedPnl =
        num(
          demoState.closedPnl
        ) +
        finalPnl;


      var totalPnl =
        num(
          t.realizedPnl
        ) +
        finalPnl;


      demoState.closed
        .unshift(

          Object.assign(

            {},

            t,

            {

              exit:
                exit,

              pnl:
                totalPnl,

              reason:
                reason ||
                "MANUAL",

              closedAt:
                Date.now()
            }
          )
        );


      demoState.closed =
        demoState.closed
          .slice(
            0,
            300
          );


      demoState.open
        .splice(
          i,
          1
        );


      if (
        (
          reason ||
          ""
        )
          .indexOf(
            "STOP"
          ) ===
        0
      ) {

        demoState.cooldowns[
          t.symbol
        ] =
          Date.now() +
          COOLDOWN_MS;
      }


      saveDemo();

      startPriceSocket();

      renderDemoTrading();
    };


  updateDemoPositions =
    function(
      full
    ){

      ensureV54State();


      var copy =
        demoState.open
          .slice();


      for (
        var i =
          0;

        i <
        copy.length;

        i++
      ) {

        var t =
          copy[i];


        var cur =
          num(
            market[
              t.symbol
            ] &&
            market[
              t.symbol
            ]
              .lastPrice
          );


        if (
          !cur
        ) {
          continue;
        }


        var atrValue =
          Math.max(

            num(
              t.atr
            ),

            cur *
            0.0025
          );


        t.highWater =
          Math.max(

            num(
              t.highWater,
              t.entry
            ),

            cur
          );


        t.lowWater =
          Math.min(

            num(
              t.lowWater,
              t.entry
            ),

            cur
          );


        if (
          t.side ===
          "LONG"
        ) {

          if (
            cur <=
            t.stop
          ) {

            closeDemoTrade(

              t.id,

              t.trailingActive

                ? "STOP TRAIL"

                : t.tp1Hit

                ? "STOP BE"

                : "STOP",

              t.stop
            );

            continue;
          }


          if (
            !t.tp1Hit &&
            cur >=
            t.tp1
          ) {

            partialClose(

              t,

              num(
                t.initialQty,
                t.qty
              ) *
              0.30,

              t.tp1,

              "TP1"
            );


            t.tp1Hit =
              true;


            t.stop =
              Math.max(
                t.stop,
                t.entry
              );
          }


          if (
            !t.tp2Hit &&
            cur >=
            t.tp2
          ) {

            partialClose(

              t,

              num(
                t.initialQty,
                t.qty
              ) *
              0.30,

              t.tp2,

              "TP2"
            );


            t.tp2Hit =
              true;


            t.trailingActive =
              true;


            t.stop =
              Math.max(

                t.stop,

                t.entry,

                cur -
                atrValue *
                1.10
              );
          }


          if (
            t.trailingActive
          ) {

            t.stop =
              Math.max(

                t.stop,

                cur -
                atrValue *
                1.10
              );
          }


          if (
            cur >=
            t.tp3
          ) {

            closeDemoTrade(
              t.id,
              "TP3",
              t.tp3
            );

            continue;
          }

        } else {

          if (
            cur >=
            t.stop
          ) {

            closeDemoTrade(

              t.id,

              t.trailingActive

                ? "STOP TRAIL"

                : t.tp1Hit

                ? "STOP BE"

                : "STOP",

              t.stop
            );

            continue;
          }


          if (
            !t.tp1Hit &&
            cur <=
            t.tp1
          ) {

            partialClose(

              t,

              num(
                t.initialQty,
                t.qty
              ) *
              0.30,

              t.tp1,

              "TP1"
            );


            t.tp1Hit =
              true;


            t.stop =
              Math.min(
                t.stop,
                t.entry
              );
          }


          if (
            !t.tp2Hit &&
            cur <=
            t.tp2
          ) {

            partialClose(

              t,

              num(
                t.initialQty,
                t.qty
              ) *
              0.30,

              t.tp2,

              "TP2"
            );


            t.tp2Hit =
              true;


            t.trailingActive =
              true;


            t.stop =
              Math.min(

                t.stop,

                t.entry,

                cur +
                atrValue *
                1.10
              );
          }


          if (
            t.trailingActive
          ) {

            t.stop =
              Math.min(

                t.stop,

                cur +
                atrValue *
                1.10
              );
          }


          if (
            cur <=
            t.tp3
          ) {

            closeDemoTrade(
              t.id,
              "TP3",
              t.tp3
            );

            continue;
          }
        }
      }


      saveDemo();


      if (
        full !==
        false
      ) {

        renderDemoTrading();
      }
    };


  var oldRenderDemo =
    renderDemoTrading;


  renderDemoTrading =
    function(){

      ensureV54State();


      oldRenderDemo();


      var note =
        document.querySelector(
          "#demo .demo-note"
        );


      if (
        note
      ) {

        var eq =
          Math.max(
            1,
            demoEquity()
          );


        var risk =
          currentOpenRisk() /
          eq *
          100;


        note.innerHTML =

          'نسخه <b>5.4 ANTI-CHASE</b>: ' +

          'Flow چندبازه‌ای 1m/5m/15m + تکنیکال 5m/15m/1h + BTC Regime. ' +

          'Market فقط نزدیک Entry Zone فعال است. ' +

          'TP1: 30% و Stop→BE، TP2: 30% و Trailing، TP3: خروج نهایی. ' +

          'ریسک باز پورتفو: <b>' +

          risk.toFixed(
            2
          ) +

          '%</b> از سقف <b>' +

          num(
            demoState.maxPortfolioRiskPct,
            5
          ) +

          '%</b>. Regime: <b>' +

          v54Regime().state +

          '</b>.';
      }
    };


  window.armDemoTrade =
    armDemoTrade;


  window.cancelArm =
    cancelArm;


  window.openDemoTrade =
    openDemoTrade;


  window.closeDemoTrade =
    closeDemoTrade;


  ensureV54State();


  demoState.maxPortfolioRiskPct =
    MAX_PORTFOLIO_RISK_PCT;


  saveDemo();


  var badge =
    document.querySelector(
      "h1 .pill"
    );


  if (
    badge
  ) {

    badge.textContent =
      "v5.4 ANTI-CHASE";
  }


  setTimeout(
    function(){

      refreshUniverse();

      renderDemoTrading();
    },

    500
  );

})();
</script>
`;


/* ======================================================
   SERVE CURRENT INDEX.HTML + v5.4 PATCH
====================================================== */

function servePatchedIndex(
  req,
  res
) {

  try {

    const file =
      path.join(
        __dirname,
        "index.html"
      );


    let html =
      fs.readFileSync(
        file,
        "utf8"
      );


    html =
      html.replace(

        /<\/body>/i,

        ANTI_CHASE_PATCH +
        "\n</body>"
      );


    res
      .type("html")
      .send(html);


  } catch (e) {

    res
      .status(500)
      .type("text")
      .send(
        "index.html unavailable: " +
        String(e)
      );
  }
}


app.get(
  "/",
  servePatchedIndex
);


app.get(
  "/index.html",
  servePatchedIndex
);


app.use(
  express.static(
    path.join(
      __dirname
    )
  )
);


app.listen(
  PORT,
  () => {

    console.log(
      `ALI Flow Radar v5.4 running on ${PORT}`
    );
  }
);
