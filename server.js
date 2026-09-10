const MACRO = [

  {
    name: "Gold Spot",
    symbol: "XAUUSD",
    stooq: "xauusd",
    group: "Gold"
  },

  {
    name: "WTI Crude",
    symbol: "CL.F",
    stooq: "cl.f",
    group: "Oil"
  },

  {
    name: "Brent Crude",
    symbol: "CB.F",
    stooq: "cb.f",
    group: "Oil"
  },

  {
    name: "US Dollar Index",
    symbol: "DX.F",
    stooq: "dx.f",
    group: "FX"
  },

  {
    name: "EUR/USD",
    symbol: "EURUSD",
    stooq: "eurusd",
    group: "FX"
  },

  {
    name: "GBP/USD",
    symbol: "GBPUSD",
    stooq: "gbpusd",
    group: "FX"
  },

  {
    name: "USD/JPY",
    symbol: "USDJPY",
    stooq: "usdjpy",
    group: "FX"
  }

];


async function fetchText(
  url
) {

  const r =
    await fetch(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0"
        },

        timeout:
          12000
      }
    );

  const text =
    await r.text();

  if (!r.ok) {

    throw new Error(
      "HTTP " +
      r.status
    );
  }

  return text;
}


function parseStooq(
  text
) {

  const lines =
    text
      .trim()
      .split(
        /\r?\n/
      );

  if (
    lines.length <
    2
  ) {

    throw new Error(
      "No Stooq data"
    );
  }

  const headers =
    lines[0]
      .split(",");

  const values =
    lines[1]
      .split(",");

  const row = {};

  headers.forEach(
    (
      h,
      i
    ) => {

      row[
        h.trim()
      ] =
        values[i]
          ?.trim();
    }
  );

  if (
    !row.Close ||
    row.Close ===
    "N/D"
  ) {

    throw new Error(
      "Quote unavailable"
    );
  }

  return row;
}


async function getStooqQuote(
  asset
) {

  const url =

    "https://stooq.com/q/l/?s=" +

    encodeURIComponent(
      asset.stooq
    ) +

    "&f=sd2t2ohlcv&h&e=csv";


  const text =
    await fetchText(
      url
    );


  const q =
    parseStooq(
      text
    );


  const open =
    num(
      q.Open,
      NaN
    );


  const close =
    num(
      q.Close,
      NaN
    );


  const changePct =

    Number.isFinite(
      open
    ) &&

    Number.isFinite(
      close
    ) &&

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

    price:
      close,

    open,

    high:
      num(
        q.High,
        null
      ),

    low:
      num(
        q.Low,
        null
      ),

    changePct,

    marketTimeText:
      (
        q.Date ||
        ""
      ) +
      " " +
      (
        q.Time ||
        ""
      ),

    source:
      "Stooq"
  };
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

          "macro-stooq",

          30000,

          async () => {

            const out = [];


            for (
              const asset
              of MACRO
            ) {

              try {

                out.push(

                  await getStooqQuote(
                    asset
                  )
                );

              } catch (e) {

                out.push({

                  name:
                    asset.name,

                  symbol:
                    asset.symbol,

                  group:
                    asset.group,

                  error:
                    String(e)
                });
              }
            }


            return out;
          }
        );


      res.json(
        rows
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
