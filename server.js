const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "256kb" }));
app.use(express.static(path.join(__dirname)));

const cache = new Map();
const walletHistory = new Map();
const lastGood = new Map();
const lastGoodWallet = new Map();
const MAX_HISTORY = 240;

const num = (v, fallback = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
};

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

  const r = await fetch(
    url,
    {
      ...options,

      headers: {
        "User-Agent":
          "Mozilla/5.0 ALI-Flow-Radar/4.7",

        Accept:
          "text/html,text/plain,text/csv,application/json,*/*",

        ...(options.headers || {})
      },

      timeout:
        15000
    }
  );

  const text =
    await r.text();

  if (!r.ok) {

    throw new Error(
      `HTTP ${r.status}: ${text.slice(0,120)}`
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

    return JSON.parse(
      text
    );

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


/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  (req, res) => {

    res.json({
      ok:
        true,

      version:
        "4.7",

      app:
        "ALI Flow Radar",

      time:
        new Date()
          .toISOString()
    });
  }
);


/* =========================================================
   BINANCE PRICE
========================================================= */

app.get(
  "/api/binance",
  async (req, res) => {

    const symbols =
      String(
        req.query.symbols ||
        "BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT"
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
          20
        );

    try {

      const data =
        await cached(
          "binance:" +
          symbols.join(","),

          3000,

          async () => {

            let rows;

            try {

              rows =
                await fetchJson(
                  "https://data-api.binance.vision/api/v3/ticker/24hr"
                );

            } catch {

              rows = [];

              for (
                const symbol
                of symbols
              ) {

                rows.push(

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
                rows
              )
            ) {

              throw new Error(
                "Bad Binance response"
              );
            }

            return rows

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
                    num(
                      x.lastPrice
                    ),

                  priceChangePercent:
                    num(
                      x.priceChangePercent
                    ),

                  quoteVolume:
                    num(
                      x.quoteVolume
                    ),

                  highPrice:
                    num(
                      x.highPrice
                    ),

                  lowPrice:
                    num(
                      x.lowPrice
                    )
                })
              );
          }
        );

      res.json(
        data
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


/* =========================================================
   BINANCE FLOW
========================================================= */

app.get(
  "/api/flow",
  async (req, res) => {

    const symbols =
      String(
        req.query.symbols ||
        "BTCUSDT,ETHUSDT,SOLUSDT"
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
          10
        );

    try {

      const output =
        [];

      for (
        const symbol
        of symbols
      ) {

        try {

          const trades =
            await cached(

              "flow:" +
              symbol,

              7000,

              () =>
                fetchJson(

                  "https://data-api.binance.vision/api/v3/aggTrades?symbol=" +

                  encodeURIComponent(
                    symbol
                  ) +

                  "&limit=500"
                )
            );

          let buy = 0;
          let sell = 0;

          let oldest =
            Infinity;

          let newest =
            0;

          for (
            const t
            of trades
          ) {

            const value =
              num(t.p) *
              num(t.q);

            if (t.m) {

              sell +=
                value;

            } else {

              buy +=
                value;
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

          output.push({

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

          output.push({
            symbol,
            error:
              String(e)
          });
        }
      }

      res.json(
        output
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


/* =========================================================
   BINANCE KLINES FOR DEMO TRADE ENGINE
========================================================= */

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

    const allowedIntervals =
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
      !allowedIntervals.has(
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

      if (
        !Array.isArray(
          rows
        )
      ) {

        throw new Error(
          "Bad klines response"
        );
      }

      res.json(

        rows.map(
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
      Math.abs(x) >
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

  let score =
    50;

  const pnls = [
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
        (
          positives /
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

  return cached(

    "wallet:" +
    user.toLowerCase(),

    10000,

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
        !stateR.value ||
        !stateR.value.marginSummary
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

      const summary = {

        user,

        equity:
          num(
            state
              .marginSummary
              ?.accountValue
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

        recentFills:
          (
            fills ||
            []
          )
            .slice(
              0,
              20
            ),

        stale:
          false,

        updatedAt:
          Date.now()
      };

      lastGoodWallet.set(
        user.toLowerCase(),
        summary
      );

      return summary;
    }
  );
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

      const old =
        lastGoodWallet
          .get(
            user.toLowerCase()
          );

      if (
        old
      ) {

        return res.json({

          ...old,

          stale:
            true,

          staleReason:
            String(e)
        });
      }

      res
        .status(502)
        .json({
          error:
            String(e)
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
            (a,b) =>
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


/* =========================================================
   MONEY ROTATION
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


function historyKey(
  users
) {

  return users
    .map(
      x =>
        x.toLowerCase()
    )
    .sort()
    .join("|");
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
        (a,b) =>
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
        (a,b) =>
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
        (a,b) =>
          b.value -
          a.value
      );

  const source =
    outflows
      .map(
        x => ({

          ...x,

          remaining:
            x.value
        })
      );

  const target =
    inflows
      .map(
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
        (s,x) =>
          s +
          x.value,
        0
      ),

    totalOut:
      outflows.reduce(
        (s,x) =>
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
          (a,b) =>
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

    try {

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

      const summaries =
        [];

      for (
        let i =
          0;

        i <
        users.length;

        i +=
          3
      ) {

        const batch =
          users.slice(
            i,
            i +
            3
          );

        const data =
          await Promise.all(

            batch.map(
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
            )
          );

        summaries.push(
          ...data
        );

        await sleep(
          250
        );
      }

      const snap =
        exposureSnapshot(
          summaries
        );

      const key =
        historyKey(
          users
        );

      if (
        !walletHistory.has(
          key
        )
      ) {

        walletHistory.set(
          key,
          []
        );
      }

      const hist =
        walletHistory.get(
          key
        );

      hist.push(
        snap
      );

      while (
        hist.length >
        MAX_HISTORY
      ) {

        hist.shift();
      }

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


/* =========================================================
   GLOBAL MACRO
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

  const row =
    {};

  header
    .forEach(
      (h,i) => {

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
        .filter(
          Boolean
        )
        .join(" ")
  };
}


app.get(
  "/api/macro",
  async (req, res) => {

    const out =
      [];

    for (
      const asset
      of MACRO
    ) {

      try {

        const q =
          await cached(

            "macro:" +
            asset.symbol,

            30000,

            () =>
              macroQuote(
                asset
              )
          );

        lastGood.set(

          "macro:" +
          asset.symbol,

          q
        );

        out.push(
          q
        );

      } catch (e) {

        const previous =
          lastGood.get(

            "macro:" +
            asset.symbol
          );

        if (
          previous
        ) {

          out.push({

            ...previous,

            stale:
              true
          });

        } else {

          out.push({

            ...asset,

            error:
              String(e)
          });
        }
      }
    }

    res.json(
      out
    );
  }
);


/* =========================================================
   IRAN
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

  if (
    !str
  ) {
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
          "iran:" +
          item.key;

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

          data.push(
            row
          );

        } else {

          const old =
            lastGood.get(
              cacheKey
            );

          if (
            old
          ) {

            data.push({

              ...old,

              stale:
                true
            });

          } else {

            data.push({

              ...item,

              value:
                null,

              error:
                "TGJU parse unavailable"
            });
          }
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

                "iran:" +
                item.key
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


/* =========================================================
   FAMOUS
========================================================= */

app.get(
  "/api/famous",
  (req, res) => {

    res.json({

      crypto: [

        {
          name:
            "Arthur Hayes",

          specialty:
            "Crypto / Macro",

          liveWallet:
            false
        },

        {
          name:
            "Andrew Kang",

          specialty:
            "Crypto / Macro",

          liveWallet:
            false
        },

        {
          name:
            "GCR",

          specialty:
            "Crypto Trading",

          liveWallet:
            false
        },

        {
          name:
            "Hsaka",

          specialty:
            "Crypto Trading",

          liveWallet:
            false
        },

        {
          name:
            "James Wynn",

          specialty:
            "High-risk Crypto Trading",

          liveWallet:
            false
        }
      ],

      forexMacro: [

        {
          name:
            "George Soros",

          specialty:
            "FX / Global Macro"
        },

        {
          name:
            "Stanley Druckenmiller",

          specialty:
            "Global Macro / FX / Rates"
        },

        {
          name:
            "Paul Tudor Jones",

          specialty:
            "Macro / Futures / Commodities"
        },

        {
          name:
            "Bill Lipschutz",

          specialty:
            "FX Trading"
        },

        {
          name:
            "Kathy Lien",

          specialty:
            "FX / Macro"
        }
      ],

      note:
        "Profiles are informational. No live position is claimed unless a verified wallet is explicitly added by the user."
    });
  }
);


/* =========================================================
   START
========================================================= */

app.listen(
  PORT,
  () => {

    console.log(
      "ALI Flow Radar v4.7 running on " +
      PORT
    );
  }
);
