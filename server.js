const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const cache = new Map();

app.use(express.json({ limit: "256kb" }));
app.use(express.static(path.join(__dirname)));

const num = (v, f = 0) =>
  Number.isFinite(Number(v)) ? Number(v) : f;

const clamp = (n, a, b) =>
  Math.max(a, Math.min(b, n));

async function cached(key, ttl, fn) {
  const hit = cache.get(key);

  if (
    hit &&
    Date.now() - hit.t < ttl
  ) {
    return hit.v;
  }

  const v = await fn();

  cache.set(key, {
    t: Date.now(),
    v
  });

  return v;
}

async function fetchJson(url, options = {}) {

  const r = await fetch(url, {
    ...options,

    headers: {
      "User-Agent": "ALI-Flow-Radar/3.2",
      Accept: "application/json,text/plain,*/*",
      ...(options.headers || {})
    },

    timeout: 15000
  });

  const text = await r.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Non-JSON ${r.status}: ${text.slice(0,140)}`
    );
  }

  if (!r.ok) {
    throw new Error(
      data?.msg ||
      data?.message ||
      data?.error ||
      `HTTP ${r.status}`
    );
  }

  return data;
}

async function hyper(body) {

  return fetchJson(
    "https://api.hyperliquid.xyz/info",
    {
      method: "POST",

      headers: {
        "content-type": "application/json"
      },

      body: JSON.stringify(body)
    }
  );
}

function perfMap(row) {

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

    out[pair[0]] = {

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

function traderStyle(turnover) {

  if (turnover < 100) {
    return "Position";
  }

  if (turnover < 500) {
    return "Swing";
  }

  if (turnover < 5000) {
    return "Active";
  }

  return "HFT-like";
}

function discoveryScore(t) {

  let s = 35;

  const p = t.performance;

  if (
    p.allTime?.pnl > 0
  ) {
    s += 12;
  }

  if (
    p.month?.pnl > 0
  ) {
    s += 14;
  }

  if (
    p.week?.pnl > 0
  ) {
    s += 10;
  }

  if (
    p.day?.pnl > 0
  ) {
    s += 4;
  }

  s +=
    clamp(
      p.month?.roiPct || 0,
      -30,
      30
    ) *
    0.45;

  s +=
    clamp(
      p.week?.roiPct || 0,
      -15,
      15
    ) *
    0.35;

  if (
    t.turnover30d >= 10 &&
    t.turnover30d <= 500
  ) {
    s += 8;
  }

  else if (
    t.turnover30d <= 5000
  ) {
    s += 3;
  }

  else {
    s -= 12;
  }

  if (
    t.equity >= 50000
  ) {
    s += 4;
  }

  if (
    t.equity >= 250000
  ) {
    s += 3;
  }

  if (
    (p.month?.roiPct || 0) >
    200
  ) {
    s -= 8;
  }

  return Math.round(
    clamp(
      s,
      0,
      100
    )
  );
}

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

    if (!row?.[1]) {
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

    const ph =
      Array.isArray(
        d.pnlHistory
      )
        ? d.pnlHistory
        : [];

    const firstAv =
      av.length
        ? num(av[0]?.[1])
        : 0;

    const lastAv =
      av.length
        ? num(av.at(-1)?.[1])
        : 0;

    const pnl =
      ph.length
        ? num(ph.at(-1)?.[1]) -
          num(ph[0]?.[1])
        : 0;

    const roi =
      firstAv
        ? (
            (
              lastAv -
              firstAv
            ) /
            Math.abs(firstAv)
          ) *
          100
        : null;

    let peak = 0;
    let dd = 0;

    for (
      const p
      of av
    ) {

      const v =
        num(
          p?.[1],
          NaN
        );

      if (
        !Number.isFinite(v)
      ) {
        continue;
      }

      peak =
        Math.max(
          peak,
          v
        );

      if (
        peak > 0
      ) {

        dd =
          Math.min(
            dd,
            (
              (
                v -
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
      maxDrawdownPct: dd,
      volume: num(d.vlm)
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

  const arr =
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
    const f
    of arr
  ) {

    const p =
      num(f.closedPnl);

    fees +=
      num(f.fee);

    if (
      Math.abs(p) >
      1e-12
    ) {

      closed++;

      closedPnl += p;

      if (
        p > 0
      ) {
        wins++;
      }
    }
  }

  return {

    fills:
      arr.length,

    closed,

    wins,

    winRate:
      closed
        ? wins /
          closed *
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

  let s = 50;

  const ps = [
    day?.pnl,
    week?.pnl,
    month?.pnl
  ].filter(
    Number.isFinite
  );

  if (
    ps.length
  ) {

    s +=
      (
        (
          ps.filter(
            x => x > 0
          ).length /
          ps.length
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

    s +=
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

    s +=
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

    s +=
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
    (stats30?.closed || 0)
    >= 20
  ) {
    s += 5;
  }

  if (
    (stats30?.closed || 0)
    < 3
  ) {
    s -= 6;
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
  "/api/health",
  (req, res) => {

    res.json({

      ok: true,

      app:
        "ALI Flow Radar",

      version:
        "3.2",

      time:
        new Date()
          .toISOString()
    });
  }
);

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

          "m:" +
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
              !Array.isArray(
                data
              )
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

          "f:" +
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

                let buy = 0;
                let sell = 0;

                let newest = 0;
                let oldest =
                  Infinity;

                for (
                  const t
                  of trades
                ) {

                  const usd =
                    num(t.p) *
                    num(t.q);

                  if (t.m) {
                    sell += usd;
                  } else {
                    buy += usd;
                  }

                  newest =
                    Math.max(
                      newest,
                      num(t.T)
                    );

                  oldest =
                    Math.min(
                      oldest,
                      num(t.T)
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

                out.push({

                  symbol,

                  takerBuy:
                    buy,

                  takerSell:
                    sell,

                  netFlow:
                    buy -
                    sell,

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

            if (
              !Array.isArray(
                d?.leaderboardRows
              )
            ) {

              throw new Error(
                "Unexpected leaderboard response"
              );
            }

            return d
              .leaderboardRows
              .map(
                row => {

                  const performance =
                    perfMap(row);

                  const equity =
                    num(
                      row.accountValue
                    );

                  const turnover30d =
                    equity > 0
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
                      traderStyle(
                        turnover30d
                      )
                  };

                  t.discoveryScore =
                    discoveryScore(t);

                  return t;
                }
              );
          }
        );

      const filtered =
        rows

          .filter(
            t =>
              t.address &&
              t.equity >=
              minEquity
          )

          .filter(
            t =>
              (
                t.performance.month
                  ?.pnl ||
                0
              ) >=
              minMonthPnl
          )

          .filter(
            t =>
              (
                t.performance.week
                  ?.pnl ||
                0
              ) >
              0
          )

          .filter(
            t =>
              (
                t.performance.allTime
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

          "hl:" +
          user.toLowerCase(),

          7000,

          async () => {

            const [
              stateR,
              portfolioR,
              fillsR,
              ordersR
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
              stateR.status ===
              "fulfilled"
                ? stateR.value
                : {};

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

            const orders =
              ordersR.status ===
              "fulfilled"
                ? ordersR.value
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
                      num(p.szi) >=
                      0
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
                            p.leverage
                              .value
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
                    s,
                    p
                  ) =>
                    s +
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

const MACRO = [

  [
    "Gold Futures",
    "GC=F",
    "Gold"
  ],

  [
    "WTI Crude",
    "CL=F",
    "Oil"
  ],

  [
    "Brent Crude",
    "BZ=F",
    "Oil"
  ],

  [
    "US Dollar Index",
    "DX-Y.NYB",
    "FX"
  ],

  [
    "EUR/USD",
    "EURUSD=X",
    "FX"
  ],

  [
    "GBP/USD",
    "GBPUSD=X",
    "FX"
  ],

  [
    "USD/JPY",
    "JPY=X",
    "FX"
  ],

  [
    "US 10Y Yield",
    "^TNX",
    "Rates"
  ]
];

app.get(
  "/api/macro",
  async (
    req,
    res
  ) => {

    try {

      const rows =
        await cached(

          "macro",

          15000,

          async () => {

            const out = [];

            for (
              const [
                name,
                symbol,
                group
              ]
              of MACRO
            ) {

              try {

                const d =
                  await fetchJson(

                    "https://query1.finance.yahoo.com/v8/finance/chart/" +

                    encodeURIComponent(
                      symbol
                    ) +

                    "?interval=5m&range=1d&includePrePost=true"
                  );

                const r =
                  d?.chart
                    ?.result?.[0];

                const m =
                  r?.meta || {};

                const closes =
                  (
                    r?.indicators
                      ?.quote?.[0]
                      ?.close ||
                    []
                  )

                    .filter(
                      x =>
                        Number.isFinite(
                          Number(x)
                        )
                    )

                    .map(Number);

                const price =
                  num(
                    m.regularMarketPrice,
                    closes.at(-1)
                  );

                const prev =
                  num(
                    m.chartPreviousClose ??
                    m.previousClose,
                    closes[0]
                  );

                out.push({

                  name,

                  symbol,

                  group,

                  price,

                  changePct:
                    prev
                      ? (
                          price -
                          prev
                        ) /
                        prev *
                        100
                      : null,

                  marketTime:
                    num(
                      m.regularMarketTime
                    ) *
                    1000
                });

              } catch (e) {

                out.push({

                  name,

                  symbol,

                  group,

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

app.listen(
  PORT,
  () =>
    console.log(
      "ALI Flow Radar v3.2 running on " +
      PORT
    )
);
