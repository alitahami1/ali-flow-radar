const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname)));

app.get("/api/binance", async (req, res) => {
  try {
    const symbols = (req.query.symbols || "BTCUSDT,ETHUSDT")
      .split(",")
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    // Binance public market-data endpoint
    const r = await fetch(
      "https://data-api.binance.vision/api/v3/ticker/24hr"
    );

    const d = await r.json();

    if (!Array.isArray(d)) {
      return res.status(502).json({
        error: "Binance returned unexpected data",
        response: d
      });
    }

    const result = d
      .filter(x => symbols.includes(x.symbol))
      .map(x => ({
        symbol: x.symbol,
        lastPrice: x.lastPrice,
        priceChangePercent: x.priceChangePercent,
        quoteVolume: x.quoteVolume
      }));

    res.json(result);

  } catch (e) {
    res.status(500).json({
      error: String(e)
    });
  }
});

app.get("/api/hyperliquid", async (req, res) => {
  try {
    const user = req.query.user;

    const r = await fetch(
      "https://api.hyperliquid.xyz/info",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          type: "clearinghouseState",
          user: user
        })
      }
    );

    res.status(r.status).send(await r.text());

  } catch (e) {
    res.status(500).json({
      error: String(e)
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "ALI Flow Radar",
    version: "2.1"
  });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("ALI Flow Radar v2.1 running on " + port);
});
