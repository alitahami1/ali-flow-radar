const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '256kb' }));

const cache = new Map();
const walletHistory = new Map();
const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  return v;
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const r = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'ALI-Flow-Radar/5.6',
        'Accept': 'application/json,text/plain,*/*',
        ...(options.headers || {})
      }
    });

    const text = await r.text();

    if (!r.ok) {
      throw new Error(`HTTP ${r.status}: ${text.slice(0, 160)}`);
    }

    return text;

  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, options = {}) {
  return JSON.parse(await fetchText(url, options));
}

async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;

  async function runner() {
    while (true) {
      const i = next++;

      if (i >= items.length) return;

      try {
        out[i] = await worker(items[i], i);
      } catch (e) {
        out[i] = {
          error: String(e),
          item: items[i]
        };
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(limit, items.length) },
      runner
    )
  );

  return out;
}

function ema(values, period) {
  if (!values.length) return 0;

  const k = 2 / (period + 1);
  let e = values[0];

  for (let i = 1; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
  }

  return e;
}

function rsi(values, period = 14) {
  if (values.length <= period) return 50;

  let g = 0;
  let l = 0;

  for (let i = values.length - period; i < values.length; i++) {
    const d = values[i] - values[i - 1];

    if (d >= 0) g += d;
    else l += Math.abs(d);
  }

  if (!l) return 100;

  const rs = g / l;

  return 100 - 100 / (1 + rs);
}

function atr(rows, period = 14) {
  if (!rows || rows.length < 2) return 0;

  const tr = [];

  for (let i = 1; i < rows.length; i++) {
    const h = num(rows[i][2]);
    const lo = num(rows[i][3]);
    const pc = num(rows[i - 1][4]);

    tr.push(
      Math.max(
        h - lo,
        Math.abs(h - pc),
        Math.abs(lo - pc)
      )
    );
  }

  const x = tr.slice(-period);

  return x.length
    ? x.reduce((a, b) => a + b, 0) / x.length
    : 0;
}

function pctFrom(values, back) {
  if (values.length <= back) return 0;

  const a = values.at(-(back + 1));
  const b = values.at(-1);

  return a
    ? ((b - a) / a) * 100
    : 0;
}

function flowWindow(rows, count) {
  const x = rows.slice(-count);

  let q = 0;
  let buy = 0;

  for (const r of x) {
    q += num(r[7]);
    buy += num(r[10]);
  }

  const sell = Math.max(0, q - buy);
  const net = buy - sell;

  const intensity = q
    ? net / q * 100
    : 0;

  return {
    buy,
    sell,
    net,
    intensity,
    buyRatio: q ? buy / q * 100 : 50,
    quote: q
  };
}

const EXCLUDED = new Set([
  'USDC',
  'FDUSD',
  'TUSD',
  'USDP',
  'DAI',
  'BUSD',
  'EUR',
  'TRY',
  'BRL',
  'AEUR',
  'EURI',
  'PAXG',
  'WBTC'
]);

function eligible(symbol) {
  if (!symbol || !symbol.endsWith('USDT')) return false;

  const base = symbol.slice(0, -4);

  if (EXCLUDED.has(base)) return false;

  if (/UP$|DOWN$|BULL$|BEAR$/.test(base)) {
    return false;
  }

  return /^[A-Z0-9]+$/.test(base);
}

app.get('/api/health', (req, res) => {

  res.json({
    ok: true,
    version: '5.6 FLOW-FIRST',
    engine:
      'Inflow=>LONG / Outflow=>SHORT / reverse-flow=>EXIT',
    time: new Date().toISOString()
  });

});

app.get('/api/binance', async (req, res) => {

  const symbols = String(
    req.query.symbols || 'BTCUSDT,ETHUSDT'
  )
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50);

  try {

    const rows = await cached(
      'ticker24-all',
      2200,
      () =>
        fetchJson(
          'https://data-api.binance.vision/api/v3/ticker/24hr'
        )
    );

    const wanted = new Set(symbols);

    res.json(
      rows
        .filter(x => wanted.has(x.symbol))
        .map(x => ({
          symbol: x.symbol,
          lastPrice: num(x.lastPrice),
          priceChangePercent: num(x.priceChangePercent),
          quoteVolume: num(x.quoteVolume)
        }))
    );

  } catch (e) {

    res.status(502).json({
      error: String(e)
    });

  }
});

async function fastFlow(symbol) {

  const trades = await fetchJson(
    `https://data-api.binance.vision/api/v3/aggTrades?symbol=${encodeURIComponent(symbol)}&limit=500`
  );

  let buy = 0;
  let sell = 0;

  let oldest = Infinity;
  let newest = 0;

  let lastPrice = 0;

  for (const t of trades || []) {

    const value =
      num(t.p) *
      num(t.q);

    if (t.m) {
      sell += value;
    } else {
      buy += value;
    }

    oldest = Math.min(
      oldest,
      num(t.T)
    );

    newest = Math.max(
      newest,
      num(t.T)
    );

    lastPrice = num(
      t.p,
      lastPrice
    );
  }

  const total =
    buy + sell;

  const netFlow =
    buy - sell;

  return {

    symbol,

    lastPrice,

    takerBuy: buy,

    takerSell: sell,

    netFlow,

    buyRatio:
      total
        ? buy / total * 100
        : 50,

    intensity:
      total
        ? netFlow / total * 100
        : 0,

    sampleSeconds:
      newest &&
      Number.isFinite(oldest)
        ? Math.max(
            1,
            (newest - oldest) / 1000
          )
        : 0,

    ts: Date.now()
  };
}

app.get('/api/flow', async (req, res) => {

  const symbols = String(
    req.query.symbols ||
    'BTCUSDT,ETHUSDT'
  )
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30);

  const rows =
    await mapLimit(
      symbols,
      8,
      async s => fastFlow(s)
    );

  res.json(rows);
});

async function scanSymbol(
  symbol,
  ticker
) {

  const raw =
    await fetchJson(
      `https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1m&limit=90`
    );

  if (
    !Array.isArray(raw) ||
    raw.length < 30
  ) {
    throw new Error(
      'Not enough klines'
    );
  }

  const closes =
    raw.map(
      r => num(r[4])
    );

  const f1 =
    flowWindow(
      raw,
      2
    );

  const f5 =
    flowWindow(
      raw,
      5
    );

  const f15 =
    flowWindow(
      raw,
      15
    );

  const last =
    closes.at(-1);

  const ema9 =
    ema(
      closes.slice(-45),
      9
    );

  const ema21 =
    ema(
      closes.slice(-60),
      21
    );

  const r =
    rsi(
      closes,
      14
    );

  const a =
    atr(
      raw,
      14
    );

  const m5 =
    pctFrom(
      closes,
      5
    );

  const m15 =
    pctFrom(
      closes,
      15
    );

  const m60 =
    pctFrom(
      closes,
      60
    );

  const recentVol =
    raw
      .slice(-5)
      .reduce(
        (s, x) =>
          s + num(x[7]),
        0
      ) / 5;

  const oldVol =
    raw
      .slice(-20, -5)
      .reduce(
        (s, x) =>
          s + num(x[7]),
        0
      ) / 15;

  const volumeAccel =
    oldVol
      ? recentVol / oldVol
      : 1;

  /*
    FLOW FIRST

    جریان 1 دقیقه اهمیت بیشتر دارد.

    بعد 5 دقیقه.

    بعد 15 دقیقه.
  */

  const signedFlow =
    f1.intensity * 0.48 +
    f5.intensity * 0.34 +
    f15.intensity * 0.18;

  const side =
    signedFlow >= 0
      ? 'LONG'
      : 'SHORT';

  const direction =
    side === 'LONG'
      ? 1
      : -1;

  const agreement =
    [
      f1.intensity,
      f5.intensity,
      f15.intensity
    ]
      .filter(
        v =>
          Math.sign(
            v || direction
          ) === direction
      )
      .length;

  let technical = 50;

  technical +=
    direction *
    (ema9 - ema21) /
    Math.max(
      a,
      last * 0.001
    ) *
    8;

  technical +=
    direction *
    m5 *
    2.0;

  technical +=
    direction *
    m15 *
    1.0;

  technical +=
    direction *
    m60 *
    0.35;

  if (
    side === 'LONG'
  ) {

    technical +=
      (
        r >= 48 &&
        r <= 72
      )
        ? 7
        : (
            r > 78
              ? -8
              : 0
          );

  } else {

    technical +=
      (
        r <= 52 &&
        r >= 28
      )
        ? 7
        : (
            r < 22
              ? -8
              : 0
          );

  }

  technical =
    clamp(
      technical,
      0,
      100
    );

  const quoteVol =
    num(
      ticker.quoteVolume
    );

  const liquidityScore =
    clamp(
      Math.log10(
        Math.max(
          quoteVol,
          1
        )
      ) *
      12 -
      35,
      0,
      100
    );

  const flowScore =
    clamp(
      Math.abs(
        signedFlow
      ) *
      2.1 +
      agreement *
      8,
      0,
      100
    );

  const volScore =
    clamp(
      45 +
      (
        volumeAccel - 1
      ) *
      35,
      0,
      100
    );

  const chase =
    Math.abs(m5) > 3.5
      ? Math.min(
          18,
          (
            Math.abs(m5) -
            3.5
          ) *
          4
        )
      : 0;

  const score =
    clamp(
      flowScore * 0.48 +
      technical * 0.25 +
      volScore * 0.15 +
      liquidityScore * 0.12 -
      chase,
      0,
      100
    );

  return {

    symbol,

    base:
      symbol.slice(
        0,
        -4
      ),

    side,

    score:
      Math.round(
        score
      ),

    price:
      last,

    change24h:
      num(
        ticker.priceChangePercent
      ),

    quoteVolume:
      quoteVol,

    flow1m:
      f1,

    flow5m:
      f5,

    flow15m:
      f15,

    signedFlow,

    technical:
      Math.round(
        technical
      ),

    rsi:
      r,

    ema9,

    ema21,

    atr:
      a,

    momentum5m:
      m5,

    momentum15m:
      m15,

    volumeAccel,

    agreement,

    ts:
      Date.now()
  };
}

app.get('/api/universe', async (req, res) => {

  const limit =
    clamp(
      num(
        req.query.limit,
        20
      ),
      10,
      20
    );

  const scan =
    clamp(
      num(
        req.query.scan,
        45
      ),
      25,
      60
    );

  try {

    const data =
      await cached(
        `universe56:${limit}:${scan}`,
        9000,
        async () => {

          const tickers =
            await fetchJson(
              'https://data-api.binance.vision/api/v3/ticker/24hr'
            );

          const liquid =
            tickers
              .filter(
                x =>
                  eligible(
                    x.symbol
                  ) &&
                  num(
                    x.quoteVolume
                  ) >= 5000000
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

          const scanned =
            await mapLimit(
              liquid,
              7,
              async t =>
                scanSymbol(
                  t.symbol,
                  t
                )
            );

          const good =
            scanned
              .filter(
                x =>
                  x &&
                  !x.error &&
                  Number.isFinite(
                    x.score
                  )
              );

          /*
             نکته مهم:

             هم INFLOW
             هم OUTFLOW

             وارد Top20 می‌شوند.

             Outflow = SHORT
          */

          return good
            .sort(
              (a, b) =>
                b.score -
                a.score
            )
            .slice(
              0,
              limit
            );
        }
      );

    res.json({
      version: '5.6',
      ts: Date.now(),
      rows: data
    });

  } catch (e) {

    res.status(502).json({
      error: String(e)
    });

  }
});

async function hyper(body) {

  return fetchJson(
    'https://api.hyperliquid.xyz/info',
    {
      method: 'POST',

      headers: {
        'content-type':
          'application/json'
      },

      body:
        JSON.stringify(body)
    }
  );
}

async function walletSummary(
  user
) {

  const [
    state,
    mids
  ] =
    await Promise.all([

      hyper({
        type:
          'clearinghouseState',
        user
      }),

      hyper({
        type:
          'allMids'
      })

    ]);

  const positions = [];

  for (
    const a
    of state?.assetPositions ||
       []
  ) {

    const p =
      a.position ||
      {};

    const szi =
      num(
        p.szi
      );

    if (!szi) continue;

    const coin =
      p.coin;

    const mark =
      num(
        mids?.[coin],
        num(
          p.entryPx
        )
      );

    const value =
      Math.abs(
        szi *
        mark
      );

    positions.push({

      coin,

      side:
        szi > 0
          ? 'LONG'
          : 'SHORT',

      size:
        Math.abs(
          szi
        ),

      mark,

      value,

      pnl:
        num(
          p.unrealizedPnl
        )
    });
  }

  const longValue =
    positions
      .filter(
        p =>
          p.side ===
          'LONG'
      )
      .reduce(
        (s, p) =>
          s +
          p.value,
        0
      );

  const shortValue =
    positions
      .filter(
        p =>
          p.side ===
          'SHORT'
      )
      .reduce(
        (s, p) =>
          s +
          p.value,
        0
      );

  return {

    user,

    equity:
      num(
        state
          ?.marginSummary
          ?.accountValue
      ),

    positions,

    longValue,

    shortValue,

    ts:
      Date.now()
  };
}

app.get(
  '/api/wallet',
  async (
    req,
    res
  ) => {

    const user =
      String(
        req.query.user ||
        ''
      )
        .trim();

    if (
      !/^0x[a-fA-F0-9]{40}$/
        .test(user)
    ) {

      return res
        .status(400)
        .json({
          error:
            'Invalid wallet'
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

function exposureSnapshot(
  summaries
) {

  const exposure = {};

  for (
    const w
    of summaries
  ) {

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
          'LONG'
            ? 1
            : -1
        ) *
        p.value;

      exposure[p.coin] =
        (
          exposure[p.coin] ||
          0
        ) +
        signed;
    }
  }

  return {
    time:
      Date.now(),

    exposure
  };
}

function rotation(
  before,
  after
) {

  const coins =
    [
      ...new Set([
        ...Object.keys(
          before.exposure
        ),

        ...Object.keys(
          after.exposure
        )
      ])
    ];

  const net =
    coins
      .map(
        coin => ({

          coin,

          delta:
            num(
              after
                .exposure[
                  coin
                ]
            ) -
            num(
              before
                .exposure[
                  coin
                ]
            )

        })
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
          x.delta > 0
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
          x.delta < 0
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

  return {

    windowSeconds:
      Math.round(
        (
          after.time -
          before.time
        ) /
        1000
      ),

    inflows,

    outflows,

    net
  };
}

app.get(
  '/api/rotation',
  async (
    req,
    res
  ) => {

    const users =
      String(
        req.query.users ||
        ''
      )
        .split(',')

        .map(
          x =>
            x.trim()
        )

        .filter(
          x =>
            /^0x[a-fA-F0-9]{40}$/
              .test(x)
        )

        .slice(
          0,
          20
        );

    if (
      !users.length
    ) {

      return res.json({

        warmup:
          true,

        inflows:
          [],

        outflows:
          []
      });
    }

    try {

      const summaries =
        await mapLimit(
          users,
          4,
          u =>
            walletSummary(
              u
            )
        );

      const snap =
        exposureSnapshot(
          summaries.filter(
            x =>
              !x.error
          )
        );

      const key =
        users
          .map(
            x =>
              x.toLowerCase()
          )
          .sort()
          .join('|');

      const hist =
        walletHistory.get(
          key
        ) ||
        [];

      hist.push(
        snap
      );

      while (
        hist.length > 20
      ) {
        hist.shift();
      }

      walletHistory.set(
        key,
        hist
      );

      const previous =
        hist.length > 1
          ? hist[
              Math.max(
                0,
                hist.length -
                4
              )
            ]
          : null;

      if (
        !previous
      ) {

        return res.json({

          warmup:
            true,

          wallets:
            users.length,

          inflows:
            [],

          outflows:
            []
        });
      }

      res.json({

        warmup:
          false,

        wallets:
          users.length,

        rotation:
          rotation(
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

function perfMap(row) {

  const out = {};

  for (
    const item
    of row?.windowPerformances ||
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

    let k =
      String(
        item[0]
      )
        .replace(
          'perp',
          ''
        );

    k =
      k.charAt(0)
        .toLowerCase() +
      k.slice(1);

    out[k] = {

      pnl:
        num(
          item[1].pnl
        ),

      roi:
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

  return out;
}

app.get(
  '/api/traders',
  async (
    req,
    res
  ) => {

    try {

      const raw =
        await cached(
          'hl-leaderboard',
          300000,
          () =>
            fetchJson(
              'https://stats-data.hyperliquid.xyz/Mainnet/leaderboard'
            )
        );

      const minEquity =
        num(
          req.query.minEquity,
          50000
        );

      const limit =
        clamp(
          num(
            req.query.limit,
            40
          ),
          10,
          80
        );

      const rows =
        (
          raw.leaderboardRows ||
          []
        )
          .map(
            r => {

              const p =
                perfMap(r);

              const equity =
                num(
                  r.accountValue
                );

              const monthPnl =
                num(
                  p.month
                    ?.pnl
                );

              const roi =
                num(
                  p.month
                    ?.roi
                );

              const turnover =
                equity
                  ? num(
                      p.month
                        ?.volume
                    ) /
                    equity
                  : 9999;

              const score =
                clamp(

                  50 +

                  (
                    monthPnl > 0
                      ? 15
                      : -10
                  ) +

                  clamp(
                    roi,
                    -20,
                    30
                  ) +

                  (
                    turnover <
                    500
                      ? 8
                      : 0
                  ),

                  0,

                  100
                );

              return {

                address:
                  r.ethAddress,

                name:
                  r.displayName ||
                  'Anonymous',

                equity,

                monthPnl,

                roi,

                turnover,

                score:
                  Math.round(
                    score
                  )
              };
            }
          )

          .filter(
            x =>
              x.address &&
              x.equity >=
              minEquity
          )

          .sort(
            (a, b) =>
              b.score -
              a.score
          )

          .slice(
            0,
            limit
          );

      res.json({
        traders:
          rows
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

const zlib =
  require(
    'zlib'
  );

/*
  FRONT-END فشرده‌شده داخل خود server.js است.
  این کار باعث می‌شود فقط یک فایل در GitHub عوض کنی.
*/

const INDEX_GZIP_B64 = `
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
`.replace(/\s+/g, '');

const HTML =
  zlib
    .gunzipSync(
      Buffer.from(
        INDEX_GZIP_B64,
        'base64'
      )
    )
    .toString(
      'utf8'
    );

app.get(
  '/',
  (
    req,
    res
  ) =>
    res
      .type('html')
      .send(HTML)
);

app.get(
  '/index.html',
  (
    req,
    res
  ) =>
    res
      .type('html')
      .send(HTML)
);

app.listen(
  PORT,
  () =>
    console.log(
      `ALI Flow Radar v5.6 FLOW-FIRST running on ${PORT}`
    )
);
