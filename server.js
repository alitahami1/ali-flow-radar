const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const cache = new Map();
const lastGoodMacro = new Map();

app.use(express.json({ limit: "256kb" }));
app.use(express.static(path.join(__dirname)));

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (n, min, max) =>
  Math.max(min, Math.min(max, n));


async function cached(key, ttlMs, fn) {

  const hit = cache.get(key);

  if (
    hit &&
    Date.now() - hit.time < ttlMs
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


async function fetchJson(url, options = {}) {

  const response = await fetch(url, {

    ...options,

    headers: {

      "User-Agent":
        "ALI-Flow-Radar/3.2.1",

      Accept:
        "application/json,text/plain,*/*",

      ...(options.headers || {})
    },

    timeout: 15000
  });


  const text =
    await response.text();


  let data;


  try {

    data =
      JSON.parse(text);

  } catch {

    throw new Error(

      `Non-JSON ${response.status}: ${text.slice(0,160)}`

    );
  }


  if (!response.ok) {

    throw new Error(

      data?.msg ||

      data?.message ||

      data?.error ||

      `HTTP ${response.status}`

    );
  }


  return data;
}


async function fetchText(url, options = {}) {

  const response = await fetch(url, {

    ...options,

    headers: {

      "User-Agent":
        "Mozilla/5.0 ALI-Flow-Radar/3.2.1",

      Accept:
        "text/csv,text/plain,*/*",

      ...(options.headers || {})
    },

    timeout: 15000
  });


  const text =
    await response.text();


  if (!response.ok) {

    throw new Error(

      `HTTP ${response.status}: ${text.slice(0,120)}`

    );
  }


  return text;
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


/* =====================================================
   HYPERLIQUID TRADER DISCOVERY
===================================================== */


function performanceMap(row) {

  const out = {};


  for (
    const pair
    of row?.windowPerformances || []
  ) {

    if (
      !Array.isArray(pair) ||
      !pair[0] ||
      !pair[1]
    ) {
      continue;
    }


    const key =
      String(pair[0]);


    const normalized =

      key === "day" ||
      key === "perpDay"

        ? "day"

      : key === "week" ||
        key === "perpWeek"

        ? "week"

      : key === "month" ||
        key === "perpMonth"

        ? "month"

      : key === "allTime" ||
        key === "perpAllTime"

        ? "allTime"

      : key;


    out[normalized] = {

      pnl:
        num(pair[1].pnl),

      roiPct:
        num(pair[1].roi) * 100,

      volume:
        num(pair[1].vlm)
    };
  }


  return out;
}


function traderStyle(turnover30d) {

  if (
    !Number.isFinite(turnover30d)
  ) {
    return "Unknown";
  }


  if (
    turnover30d < 20
  ) {
    return "Position";
  }


  if (
    turnover30d < 150
  ) {
    return "Swing";
  }


  if (
    turnover30d < 1000
  ) {
    return "Active";
  }


  return "HFT-like";
}


function discoveryScore(trader) {

  let score = 35;

  const p =
    trader.performance || {};


  if (
    (p.allTime?.pnl || 0) > 0
  ) {
    score += 12;
  }


  if (
    (p.month?.pnl || 0) > 0
  ) {
    score += 14;
  }


  if (
    (p.week?.pnl || 0) > 0
  ) {
    score += 10;
  }


  if (
    (p.day?.pnl || 0) > 0
  ) {
    score += 4;
  }


  score +=

    clamp(
      p.month?.roiPct || 0,
      -30,
      30
    ) *

    0.45;


  score +=

    clamp(
      p.week?.roiPct || 0,
      -15,
      15
    ) *

    0.35;


  if (

    trader.turnover30d >= 10 &&

    trader.turnover30d <= 500

  ) {

    score += 8;

  } else if (

    trader.turnover30d <= 5000

  ) {

    score += 3;

  } else {

    score -= 12;
  }


  if (
    trader.equity >= 50000
  ) {
    score += 4;
  }


  if (
    trader.equity >= 250000
  ) {
    score += 3;
  }


  if (
    (p.month?.roiPct || 0) > 200
  ) {
    score -= 8;
  }


  return Math.round(

    clamp(
      score,
      0,
      100
    )
  );
}


/* =====================================================
   HYPERLIQUID WALLET ANALYSIS
===================================================== */


function portfolioWindow(
  portfolio,
  names
) {

  if (
    !Array.isArray(portfolio)
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
          x[0] === name
      );


    if (
      !row?.[1]
    ) {
      continue;
    }


    const d =
      row[1];


    const accountValues =

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


    const firstValue =

      accountValues.length

        ? num(
            accountValues[0]?.[1]
          )

        : 0;


    const lastValue =

      accountValues.length

        ? num(
            accountValues.at(-1)?.[1]
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

      firstValue

        ? (
            (
              lastValue -
              firstValue
            ) /

            Math.abs(
              firstValue
            )
          ) *

          100

        : null;


    let peak = 0;

    let maxDrawdownPct = 0;


    for (
      const point
      of accountValues
    ) {

      const value =

        num(
          point?.[1],
          NaN
        );


      if (
        !Number.isFinite(value)
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

        maxDrawdownPct =

          Math.min(

            maxDrawdownPct,

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

      maxDrawdownPct,

      volume:
        num(d.vlm)
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
      Array.isArray(fills)

        ? fills

        : []
    )

      .filter(

        f =>
          num(f.time) >=
          cutoff
      );


  let closed = 0;

  let wins = 0;

  let closedPnl = 0;

  let fees = 0;


  for (
    const fill
    of rows
  ) {

    const pnl =
      num(fill.closedPnl);


    fees +=
      num(fill.fee);


    if (
      Math.abs(pnl) >
      1e-12
    ) {

      closed += 1;

      closedPnl += pnl;


      if (
        pnl > 0
      ) {
        wins += 1;
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

    closedPnl,

    fees
  };
}


function smartScore(
  day,
  week,
  month,
  stats30
) {

  let score = 50;


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
        (
          pnls.filter(
            x => x > 0
          ).length /

          pnls.length
        ) -

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
      stats30?.winRate
    )
  ) {

    score +=

      clamp(

        stats30.winRate -
        50,

        -25,
        25
      ) *

      0.55;
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


  if (
    (stats30?.closed || 0) >=
    20
  ) {

    score += 5;
  }


  if (
    (stats30?.closed || 0) <
    3
  ) {

    score -= 6;
  }


  return Math.round(

    clamp(
      score,
      0,
      100
    )
  );
}


/* =====================================================
   HEALTH
===================================================== */


app.get(
  "/api/health",
  (req, res) => {

    res.json({

      ok: true,

      app:
        "ALI Flow Radar",

      version:
        "3.2.1",

      macroSource:
        "Stooq",

      time:
        new Date()
          .toISOString()
    });
  }
);


/* =====================================================
   CRYPTO PRICE
===================================================== */


app.get(
  "/api/binance",
  async (
    req,
    res
  ) => {

    const symbols =

      (
        req.query.symbols ||

        "BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT"
      )

        .split(",")

        .map(

          s =>
            s
              .trim()
              .toUpperCase()
        )

        .filter(Boolean)

        .slice(
          0,
          20
        );


    try {

      const rows =

        await cached(

          "market:" +
          symbols.join(","),

          2500,

          async () => {

            let data;


            try {

              data =

                await fetchJson(

                  "https://data-api.binance.vision/api/v3/ticker/24hr"

                );

            } catch {

              data = [];


              for (
                const symbol
                of symbols
              ) {

                data.push(

                  await fetchJson(

                    "https://data-api.binance.vision/api/v3/ticker/24hr?symbol=" +

                    encodeURIComponent(
                      symbol
                    )
                  )
                );
              }
            }


            if (
              !Array.isArray(data)
            ) {

              throw new Error(

                "Unexpected Binance response"

              );
            }


            return data

              .filter(

                x =>
                  symbols.includes(
                    x.symbol
                  )
              )

              .map(

                x => ({

                  symbol:
                    x.symbol,

                  lastPrice:
                    x.lastPrice,

                  priceChangePercent:
                    x.priceChangePercent,

                  quoteVolume:
                    x.quoteVolume
                })
              );
          }
        );


      res.json(rows);

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


/* =====================================================
   CRYPTO FLOW
===================================================== */


app.get(
  "/api/flow",
  async (
    req,
    res
  ) => {

    const symbols =

      (
        req.query.symbols ||

        "BTCUSDT,ETHUSDT,SOLUSDT"
      )

        .split(",")

        .map(

          s =>
            s
              .trim()
              .toUpperCase()
        )

        .filter(Boolean)

        .slice(
          0,
          10
        );


    try {

      const rows =

        await cached(

          "flow:" +
          symbols.join(","),

          8000,

          async () => {

            const out = [];


            for (
              const symbol
              of symbols
            ) {

              try {

                const trades =

                  await fetchJson(

                    "https://data-api.binance.vision/api/v3/aggTrades?symbol=" +

                    encodeURIComponent(
                      symbol
                    ) +

                    "&limit=500"
                  );


                let takerBuy = 0;

                let takerSell = 0;

                let newest = 0;

                let oldest =
                  Infinity;


                for (
                  const trade
                  of trades
                ) {

                  const notional =

                    num(trade.p) *

                    num(trade.q);


                  if (
                    trade.m
                  ) {

                    takerSell +=
                      notional;

                  } else {

                    takerBuy +=
                      notional;
                  }


                  newest =

                    Math.max(

                      newest,

                      num(
                        trade.T
                      )
                    );


                  oldest =

                    Math.min(

                      oldest,

                      num(
                        trade.T
                      )
                    );
                }


                const total =

                  takerBuy +
                  takerSell;


                const buyRatio =

                  total

                    ? (
                        takerBuy /
                        total
                      ) *

                      100

                    : 50;


                out.push({

                  symbol,

                  takerBuy,

                  takerSell,

                  netFlow:

                    takerBuy -
                    takerSell,

                  buyRatio,

                  flowScore:

                    Math.round(
                      buyRatio
                    ),

                  sampleTrades:

                    trades.length,

                  sampleSeconds:

                    newest &&

                    Number.isFinite(
                      oldest
                    )

                      ? (
                          newest -
                          oldest
                        ) /

                        1000

                      : 0
                });

              } catch (e) {

                out.push({

                  symbol,

                  error:
                    String(e)
                });
              }
            }


            return out;
          }
        );


      res.json(rows);

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


/* =====================================================
   TRADER DISCOVERY
===================================================== */


app.get(
  "/api/traders",
  async (
    req,
    res
  ) => {

    try {

      const limit =

        clamp(

          num(
            req.query.limit,
            50
          ),

          10,
          150
        );


      const minEquity =

        Math.max(

          0,

          num(
            req.query.minEquity,
            50000
          )
        );


      const minMonthPnl =

        num(
          req.query.minMonthPnl,
          0
        );


      const maxTurnover =

        Math.max(

          1,

          num(
            req.query.maxTurnover,
            5000
          )
        );


      const traders =

        await cached(

          "hyperliquid-leaderboard",

          10 *
          60 *
          1000,

          async () => {

            const data =

              await fetchJson(

                "https://stats-data.hyperliquid.xyz/Mainnet/leaderboard"

              );


            if (
              !Array.isArray(
                data?.leaderboardRows
              )
            ) {

              throw new Error(

                "Unexpected Hyperliquid leaderboard response"

              );
            }


            return data
              .leaderboardRows
              .map(

                row => {

                  const performance =

                    performanceMap(
                      row
                    );


                  const equity =

                    num(
                      row.accountValue
                    );


                  const turnover30d =

                    equity > 0

                      ? (
                          performance
                            .month
                            ?.volume ||
                          0
                        ) /

                        equity

                      : Infinity;


                  const trader = {

                    address:
                      row.ethAddress,

                    name:
                      row.displayName ||
                      "Anonymous",

                    equity,

                    performance,

                    turnover30d,

                    style:
                      traderStyle(
                        turnover30d
                      )
                  };


                  trader.discoveryScore =

                    discoveryScore(
                      trader
                    );


                  return trader;
                }
              );
          }
        );


      const filtered =

        traders

          .filter(

            t =>
              t.address &&

              t.equity >=
              minEquity
          )

          .filter(

            t =>
              (
                t.performance
                  .month
                  ?.pnl ||
                0
              ) >=

              minMonthPnl
          )

          .filter(

            t =>
              (
                t.performance
                  .week
                  ?.pnl ||
                0
              ) >

              0
          )

          .filter(

            t =>
              (
                t.performance
                  .allTime
                  ?.pnl ||
                0
              ) >

              0
          )

          .filter(

            t =>
              t.turnover30d <=
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

        updatedAt:
          Date.now(),

        count:
          filtered.length,

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


/* =====================================================
   SMART WALLET SUMMARY
===================================================== */


app.get(
  "/api/hyperliquid/summary",
  async (
    req,
    res
  ) => {

    const user =
      req.query.user;


    if (
      !/^0x[a-fA-F0-9]{40}$/.test(
        user || ""
      )
    ) {

      return res
        .status(400)
        .json({

          error:
            "Invalid wallet address"
        });
    }


    try {

      const data =

        await cached(

          "wallet:" +
          user.toLowerCase(),

          7000,

          async () => {

            const [

              stateResult,

              portfolioResult,

              fillsResult,

              ordersResult

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
                  }),

                  hyper({
                    type:
                      "openOrders",
                    user
                  })
                ]
              );


            const state =

              stateResult.status ===
              "fulfilled"

                ? stateResult.value

                : {};


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


            const orders =

              ordersResult.status ===
              "fulfilled"

                ? ordersResult.value

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
                      num(p.szi)
                    ) >

                    0
                )

                .map(

                  p => ({

                    coin:
                      p.coin,

                    side:

                      num(p.szi) >= 0

                        ? "LONG"

                        : "SHORT",

                    size:
                      num(p.szi),

                    entryPx:
                      num(
                        p.entryPx
                      ),

                    positionValue:

                      Math.abs(

                        num(
                          p.positionValue
                        )
                      ),

                    unrealizedPnl:

                      num(
                        p.unrealizedPnl
                      ),

                    liquidationPx:

                      p.liquidationPx ==
                      null

                        ? null

                        : num(
                            p.liquidationPx
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

              smartScore(

                day,
                week,
                month,
                stats30
              );


            const tier =

              score >= 80

                ? "A+"

              : score >= 70

                ? "A"

              : score >= 60

                ? "B"

              : score >= 50

                ? "C"

                : "D";


            return {

              user,

              equity:

                num(

                  state
                    .marginSummary
                    ?.accountValue
                ),

              unrealizedPnl:

                positions.reduce(

                  (
                    sum,
                    p
                  ) =>

                    sum +
                    p.unrealizedPnl,

                  0
                ),

              openOrders:

                Array.isArray(
                  orders
                )

                  ? orders.length

                  : 0,

              positions,

              pnl: {

                day,
                week,
                month,
                allTime
              },

              stats30,

              recentFills:

                (
                  fills || []
                )

                  .slice(
                    0,
                    20
                  )

                  .map(

                    f => ({

                      coin:
                        f.coin,

                      dir:
                        f.dir,

                      px:
                        num(f.px),

                      sz:
                        num(f.sz),

                      closedPnl:
                        num(
                          f.closedPnl
                        ),

                      time:
                        num(
                          f.time
                        )
                    })
                  ),

              smartScore:
                score,

              tier,

              updatedAt:
                Date.now()
            };
          }
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


/* =====================================================
   MACRO
   STOOQ
===================================================== */


const MACRO_ASSETS = [

  {

    name:
      "Gold Spot",

    symbol:
      "XAUUSD",

    stooq:
      "xauusd",

    group:
      "Gold",

    unit:
      "USD/oz"
  },


  {

    name:
      "WTI Crude",

    symbol:
      "CL.F",

    stooq:
      "cl.f",

    group:
      "Oil",

    unit:
      "USD/bbl"
  },


  {

    name:
      "Brent Crude",

    symbol:
      "CB.F",

    stooq:
      "cb.f",

    group:
      "Oil",

    unit:
      "USD/bbl"
  },


  {

    name:
      "US Dollar Index",

    symbol:
      "DX.F",

    stooq:
      "dx.f",

    group:
      "FX",

    unit:
      "index"
  },


  {

    name:
      "EUR/USD",

    symbol:
      "EURUSD",

    stooq:
      "eurusd",

    group:
      "FX",

    unit:
      ""
  },


  {

    name:
      "GBP/USD",

    symbol:
      "GBPUSD",

    stooq:
      "gbpusd",

    group:
      "FX",

    unit:
      ""
  },


  {

    name:
      "USD/JPY",

    symbol:
      "USDJPY",

    stooq:
      "usdjpy",

    group:
      "FX",

    unit:
      ""
  }
];


function parseCsvLine(line) {

  return line
    .split(",")
    .map(
      x => x.trim()
    );
}


function parseStooqCsv(text) {

  const lines =

    String(
      text || ""
    )

      .trim()

      .split(
        /\r?\n/
      )

      .filter(Boolean);


  if (
    lines.length < 2
  ) {

    throw new Error(

      "Stooq returned no quote rows"

    );
  }


  const headers =

    parseCsvLine(
      lines[0]
    );


  const rows = [];


  for (

    let i = 1;

    i < lines.length;

    i += 1

  ) {

    const values =

      parseCsvLine(
        lines[i]
      );


    const row = {};


    headers.forEach(

      (
        header,
        index
      ) => {

        row[header] =

          values[index] ??
          "";
      }
    );


    rows.push(row);
  }


  return rows;
}


function normalizeStooqSymbol(
  value
) {

  return String(
    value || ""
  )

    .trim()

    .toLowerCase();
}


function stooqRowToMacro(
  asset,
  quote
) {

  const open =

    num(
      quote.Open,
      NaN
    );


  const close =

    num(
      quote.Close,
      NaN
    );


  if (
    !Number.isFinite(close)
  ) {

    throw new Error(

      "Stooq quote unavailable"

    );
  }


  const changePct =

    Number.isFinite(open) &&

    open !== 0

      ? (
          (
            close -
            open
          ) /

          open
        ) *

        100

      : null;


  return {

    name:
      asset.name,

    symbol:
      asset.symbol,

    group:
      asset.group,

    unit:
      asset.unit,

    price:
      close,

    open:

      Number.isFinite(open)

        ? open

        : null,

    high:
      num(
        quote.High,
        null
      ),

    low:
      num(
        quote.Low,
        null
      ),

    changePct,

    marketTimeText:

      [
        quote.Date,
        quote.Time
      ]

        .filter(Boolean)

        .join(" "),

    source:
      "Stooq",

    stale:
      false
  };
}


async function fetchMacroFromStooq() {

  const query =

    MACRO_ASSETS

      .map(
        a => a.stooq
      )

      .join("+");


  const url =

    "https://stooq.com/q/l/?s=" +

    query +

    "&f=sd2t2ohlcv&h&e=csv";


  const text =

    await fetchText(
      url
    );


  const quoteRows =

    parseStooqCsv(
      text
    );


  const bySymbol =

    new Map();


  for (
    const row
    of quoteRows
  ) {

    bySymbol.set(

      normalizeStooqSymbol(
        row.Symbol
      ),

      row
    );
  }


  const output = [];


  for (
    const asset
    of MACRO_ASSETS
  ) {

    let row =

      bySymbol.get(

        normalizeStooqSymbol(
          asset.stooq
        )
      );


    if (

      !row ||

      row.Close === "N/D" ||

      !Number.isFinite(
        Number(
          row.Close
        )
      )

    ) {

      try {

        const singleUrl =

          "https://stooq.com/q/l/?s=" +

          encodeURIComponent(
            asset.stooq
          ) +

          "&f=sd2t2ohlcv&h&e=csv";


        const singleText =

          await fetchText(
            singleUrl
          );


        row =

          parseStooqCsv(
            singleText
          )[0];

      } catch {

        row = null;
      }
    }


    try {

      if (!row) {

        throw new Error(

          "No Stooq quote"

        );
      }


      const normalized =

        stooqRowToMacro(

          asset,
          row
        );


      lastGoodMacro.set(

        asset.symbol,

        {

          ...normalized,

          savedAt:
            Date.now()
        }
      );


      output.push(
        normalized
      );

    } catch (e) {

      const previous =

        lastGoodMacro.get(
          asset.symbol
        );


      if (previous) {

        output.push({

          ...previous,

          stale:
            true,

          error:

            "Live quote unavailable; showing last good value"
        });

      } else {

        output.push({

          name:
            asset.name,

          symbol:
            asset.symbol,

          group:
            asset.group,

          unit:
            asset.unit,

          error:
            String(e),

          source:
            "Stooq"
        });
      }
    }
  }


  return output;
}


app.get(
  "/api/macro",
  async (
    req,
    res
  ) => {

    try {

      const rows =

        await cached(

          "macro-stooq-v1",

          30000,

          fetchMacroFromStooq
        );


      res.json(rows);

    } catch (e) {


      const fallback =

        MACRO_ASSETS.map(

          asset => {

            const previous =

              lastGoodMacro.get(
                asset.symbol
              );


            if (previous) {

              return {

                ...previous,

                stale:
                  true,

                error:

                  "Stooq temporarily unavailable; showing last good value"
              };
            }


            return {

              name:
                asset.name,

              symbol:
                asset.symbol,

              group:
                asset.group,

              unit:
                asset.unit,

              error:
                String(e),

              source:
                "Stooq"
            };
          }
        );


      res
        .status(200)
        .json(
          fallback
        );
    }
  }
);


/* =====================================================
   START
===================================================== */


app.listen(
  PORT,
  () => {

    console.log(

      `ALI Flow Radar v3.2.1 running on port ${PORT}`

    );
  }
);
