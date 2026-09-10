<!doctype html>
<html lang="fa" dir="rtl">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
/>

<meta
  name="theme-color"
  content="#f5f7fa"
/>

<title>
ALI Flow Radar Terminal v4
</title>


<script src="https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js"></script>

<script src="https://cdn.jsdelivr.net/npm/cytoscape@3.30.4/dist/cytoscape.min.js"></script>


<style>

:root{

  --bg:#f4f6f8;

  --panel:#ffffff;

  --panel2:#fafbfd;

  --line:#dfe5eb;

  --text:#17212b;

  --muted:#7b8794;

  --good:#169b62;

  --bad:#d84b4b;

  --warn:#d99a24;

  --accent:#2779bd;

  --blue-soft:#eaf4fb;

  --red-soft:#fff0ef;

  --green-soft:#ebf8f1;

  --shadow:
    0 2px 9px
    rgba(30,50,70,.05);

}


*{
  box-sizing:border-box
}


html,
body{

  margin:0;

  min-height:100%;

  background:var(--bg);

  color:var(--text);

  font-family:
    Inter,
    Tahoma,
    "Segoe UI",
    sans-serif;

}


body{
  overflow-x:hidden
}


header{

  position:sticky;

  top:0;

  z-index:50;

  background:
    rgba(255,255,255,.94);

  border-bottom:
    1px solid
    var(--line);

  backdrop-filter:
    blur(14px);

}


.header-inner{

  max-width:1600px;

  margin:auto;

  padding:
    11px 18px;

}


.topline{

  display:flex;

  align-items:center;

  justify-content:
    space-between;

  gap:15px;

}


.brandline{

  display:flex;

  align-items:center;

  gap:12px;

}


.logo{

  width:34px;

  height:34px;

  border-radius:50%;

  border:
    2px solid
    var(--line);

  display:flex;

  align-items:center;

  justify-content:center;

  font-weight:800;

  background:#fff;

}


.brand h1{

  margin:0;

  font-size:18px;

  letter-spacing:.3px;

}


.brand small{

  color:var(--muted);

  font-size:10px;

}


.livebox{

  display:flex;

  align-items:center;

  gap:6px;

  font-size:11px;

  color:var(--muted);

}


.dot{

  width:8px;

  height:8px;

  border-radius:50%;

  background:var(--warn);

}


.dot.live{

  background:var(--good);

  box-shadow:
    0 0 8px
    rgba(22,155,98,.6);

}


nav{

  display:flex;

  gap:7px;

  margin-top:10px;

  overflow:auto;

  padding-bottom:2px;

}


button,
input,
select{

  font:inherit;

}


button{

  border:
    1px solid
    var(--line);

  color:var(--text);

  background:#fff;

  border-radius:8px;

  padding:
    8px 11px;

  cursor:pointer;

}


button:hover{

  border-color:#aab8c4;

}


button.active{

  background:var(--blue-soft);

  border-color:#a8cce3;

  color:#126092;

  font-weight:700;

}


button.primary{

  background:#1e72a8;

  color:#fff;

  border-color:#1e72a8;

}


button.good{

  background:var(--green-soft);

  color:var(--good);

  border-color:#b9e7d2;

}


button.danger{

  color:var(--bad);

  border-color:#efcccc;

}


button:disabled{

  opacity:.5;

  cursor:not-allowed;

}


main{

  max-width:1600px;

  margin:auto;

  padding:16px;

}


.tab{

  display:none;

}


.tab.active{

  display:block;

}


.grid{

  display:grid;

  grid-template-columns:
    repeat(12,1fr);

  gap:12px;

}


.s2{grid-column:span 2}
.s3{grid-column:span 3}
.s4{grid-column:span 4}
.s5{grid-column:span 5}
.s6{grid-column:span 6}
.s7{grid-column:span 7}
.s8{grid-column:span 8}
.s9{grid-column:span 9}
.s12{grid-column:span 12}


.card{

  background:var(--panel);

  border:
    1px solid
    var(--line);

  border-radius:15px;

  box-shadow:var(--shadow);

  padding:14px;

}


.card-title{

  display:flex;

  justify-content:
    space-between;

  align-items:center;

  gap:10px;

  margin-bottom:9px;

}


.card-title h2{

  margin:0;

  font-size:14px;

}


.card-title small{

  color:var(--muted);

  font-size:10px;

}


.metric{

  font-size:29px;

  font-weight:800;

  letter-spacing:-1px;

}


.metric.medium{

  font-size:22px;

}


.label{

  color:var(--muted);

  font-size:10px;

  letter-spacing:.3px;

  text-transform:uppercase;

}


.small{

  font-size:11px;

  color:var(--muted);

}


.tiny{

  font-size:9px;

  color:var(--muted);

}


.good-text{
  color:var(--good)
}


.bad-text{
  color:var(--bad)
}


.warn-text{
  color:var(--warn)
}


.accent-text{
  color:var(--accent)
}


.kpi-row{

  display:flex;

  flex-wrap:wrap;

  gap:14px;

}


.kpi{

  min-width:100px;

}


.kpi b{

  display:block;

  font-size:17px;

  margin-top:2px;

}


.pill{

  display:inline-block;

  border:
    1px solid
    var(--line);

  border-radius:999px;

  padding:
    2px 7px;

  font-size:9px;

  background:#fff;

}


.pill.good{

  color:var(--good);

  background:var(--green-soft);

  border-color:#bce7d3;

}


.pill.bad{

  color:var(--bad);

  background:var(--red-soft);

  border-color:#f0c5c5;

}


.pill.blue{

  color:#176b9d;

  background:var(--blue-soft);

  border-color:#bcd9e9;

}


.sep{

  height:1px;

  background:var(--line);

  margin:
    10px 0;

}


table{

  width:100%;

  border-collapse:
    collapse;

  font-size:11px;

}


th,
td{

  padding:
    8px 9px;

  border-bottom:
    1px solid
    var(--line);

  text-align:right;

  white-space:nowrap;

}


th{

  color:var(--muted);

  font-size:10px;

  font-weight:600;

}


.scroll{

  overflow:auto;

}


.signal{

  padding:
    9px 10px;

  border:
    1px solid
    var(--line);

  border-radius:10px;

  margin-top:7px;

  background:var(--panel2);

}


.signal.strong{

  border-color:#b9d8eb;

  background:#f5fbff;

}


.alert-item{

  padding:
    9px 10px;

  border-right:
    3px solid
    var(--accent);

  border-radius:8px;

  background:#fbfcfd;

  margin-top:7px;

}


.flowbar{

  height:5px;

  background:#eef1f4;

  border-radius:50px;

  overflow:hidden;

  margin-top:4px;

}


.flowbar i{

  display:block;

  height:100%;

  background:#3191cb;

}


.prob-grid{

  display:grid;

  grid-template-columns:
    1fr 1fr;

  gap:8px;

}


.prob-box{

  padding:9px;

  border:
    1px solid
    var(--line);

  border-radius:9px;

  text-align:center;

}


.prob-box.up{

  background:var(--green-soft);

  color:var(--good);

}


.prob-box.down{

  background:var(--red-soft);

  color:var(--bad);

}


.prob-num{

  font-size:24px;

  font-weight:800;

}


.chart{

  width:100%;

  height:260px;

}


.chart.large{

  height:330px;

}


#networkGraph{

  width:100%;

  height:300px;

  border-radius:12px;

  background:#fcfdfe;

  border:
    1px solid
    var(--line);

}


.live-strip{

  display:grid;

  grid-template-columns:
    repeat(5,1fr);

  gap:8px;

}


.live-item{

  padding:9px;

  border:
    1px solid
    var(--line);

  border-radius:9px;

  background:#fff;

}


.form2{

  display:grid;

  grid-template-columns:
    2fr auto;

  gap:8px;

}


.form4{

  display:grid;

  grid-template-columns:
    1fr 2fr 1fr auto;

  gap:8px;

}


.filters{

  display:grid;

  grid-template-columns:
    repeat(4,1fr)
    auto;

  gap:8px;

}


input,
select{

  width:100%;

  padding:
    9px 10px;

  border:
    1px solid
    var(--line);

  border-radius:8px;

  background:#fff;

  color:var(--text);

}


.modal{

  display:none;

  position:fixed;

  inset:0;

  z-index:100;

  background:
    rgba(20,30,40,.45);

  padding:20px;

  overflow:auto;

}


.modal.open{

  display:block;

}


.modal-box{

  max-width:1100px;

  margin:
    35px auto;

  background:#fff;

  border:
    1px solid
    var(--line);

  border-radius:15px;

  padding:16px;

}


.footer{

  padding:25px;

  text-align:center;

  color:var(--muted);

  font-size:9px;

}


@media(max-width:1000px){

  .s2,
  .s3,
  .s4,
  .s5,
  .s6,
  .s7,
  .s8,
  .s9{

    grid-column:
      span 12;

  }


  .filters,
  .form4{

    grid-template-columns:
      1fr 1fr;

  }


  .live-strip{

    grid-template-columns:
      1fr 1fr;

  }

}


@media(max-width:600px){

  main{
    padding:8px
  }


  .grid{
    gap:8px
  }


  .card{
    padding:10px
  }


  .metric{
    font-size:24px
  }


  .filters,
  .form4,
  .form2,
  .prob-grid{

    grid-template-columns:
      1fr;

  }


  .live-strip{

    grid-template-columns:
      1fr;

  }

}

</style>

</head>


<body>


<header>

<div class="header-inner">

  <div class="topline">

    <div class="brandline">

      <div class="logo">
        A
      </div>

      <div class="brand">

        <h1>
          ALI FLOW RADAR
          <span class="pill blue">
            v4 TERMINAL
          </span>
        </h1>

        <small>
          AI-assisted market intelligence terminal
        </small>

      </div>

    </div>


    <div class="livebox">

      <span
        id="dot"
        class="dot"
      >
      </span>

      <span id="status">
        CONNECTING
      </span>

    </div>

  </div>


  <nav>

    <button
      class="tabbtn active"
      data-tab="terminal"
    >
      Terminal
    </button>

    <button
      class="tabbtn"
      data-tab="discover"
    >
      Trader Discovery
    </button>

    <button
      class="tabbtn"
      data-tab="wallets"
    >
      Smart Wallets
    </button>

    <button
      class="tabbtn"
      data-tab="macro"
    >
      Macro
    </button>

    <button
      class="tabbtn"
      data-tab="alerts"
    >
      Alerts
    </button>

    <button
      class="tabbtn"
      data-tab="system"
    >
      System
    </button>

  </nav>

</div>

</header>



<main>


<section
  id="terminal"
  class="tab active"
>

<div class="grid">


<div class="card s4">

  <div class="card-title">

    <h2>
      Market Intelligence
    </h2>

    <small>
      LIVE ENGINE
    </small>

  </div>


  <div class="label">
    Composite Confidence
  </div>

  <div
    id="globalConfidence"
    class="metric"
  >
    --
  </div>


  <div class="sep"></div>


  <div class="kpi-row">

    <div class="kpi">

      <span class="label">
        BTC
      </span>

      <b id="btcPrice">
        --
      </b>

    </div>


    <div class="kpi">

      <span class="label">
        ETH
      </span>

      <b id="ethPrice">
        --
      </b>

    </div>


    <div class="kpi">

      <span class="label">
        Alerts
      </span>

      <b id="alertCount">
        0
      </b>

    </div>


    <div class="kpi">

      <span class="label">
        Wallets
      </span>

      <b id="walletCount">
        0
      </b>

    </div>

  </div>


  <div class="sep"></div>


  <div id="marketMode">
    --
  </div>

</div>



<div class="card s4">

  <div class="card-title">

    <h2>
      BTC Probability Engine
    </h2>

    <small>
      HEURISTIC
    </small>

  </div>


  <div class="prob-grid">

    <div class="prob-box up">

      <div class="label">
        P(UP)
      </div>

      <div
        id="probUp"
        class="prob-num"
      >
        --
      </div>

    </div>


    <div class="prob-box down">

      <div class="label">
        P(DOWN)
      </div>

      <div
        id="probDown"
        class="prob-num"
      >
        --
      </div>

    </div>

  </div>


  <div class="sep"></div>


  <div class="small">

    Flow:
    <b id="probFlow">
      --
    </b>

    •

    Momentum:
    <b id="probMomentum">
      --
    </b>

    •

    Wallet:
    <b id="probWallet">
      --
    </b>

  </div>

</div>



<div class="card s4">

  <div class="card-title">

    <h2>
      Top Smart Money Signal
    </h2>

    <small>
      CONSENSUS
    </small>

  </div>


  <div
    id="topConsensus"
    class="metric medium"
  >
    --
  </div>


  <div
    id="topConsensusDetail"
    class="small"
    style="margin-top:6px"
  >
    Follow smart wallets to build consensus.
  </div>


  <div
    id="consensusList"
    style="margin-top:9px"
  >
  </div>

</div>



<div class="card s5">

  <div class="card-title">

    <h2>
      Probability Lattice
    </h2>

    <small>
      MULTI-ASSET
    </small>

  </div>

  <div
    id="probChart"
    class="chart large"
  >
  </div>

</div>



<div class="card s7">

  <div class="card-title">

    <h2>
      Smart Wallet Relationship Graph
    </h2>

    <small>
      POSITION NETWORK
    </small>

  </div>

  <div id="networkGraph">
  </div>

</div>



<div class="card s12">

  <div class="card-title">

    <h2>
      BTC Live Pulse
    </h2>

    <small id="pulseRound">
      LIVE
    </small>

  </div>


  <div class="live-strip">

    <div class="live-item">

      <div class="label">
        Current Price
      </div>

      <div
        id="pulsePrice"
        class="metric medium"
      >
        --
      </div>

    </div>


    <div class="live-item">

      <div class="label">
        24H Change
      </div>

      <div
        id="pulse24h"
        class="metric medium"
      >
        --
      </div>

    </div>


    <div class="live-item">

      <div class="label">
        Buy Ratio
      </div>

      <div
        id="pulseBuyRatio"
        class="metric medium"
      >
        --
      </div>

    </div>


    <div class="live-item">

      <div class="label">
        Net Flow
      </div>

      <div
        id="pulseNet"
        class="metric medium"
      >
        --
      </div>

    </div>


    <div class="live-item">

      <div class="label">
        Confidence
      </div>

      <div
        id="pulseConfidence"
        class="metric medium"
      >
        --
      </div>

    </div>

  </div>


  <div
    id="btcPulseChart"
    class="chart"
    style="margin-top:10px"
  >
  </div>

</div>



<div class="card s8">

  <div class="card-title">

    <h2>
      Early Money Radar
    </h2>

    <small>
      PRICE HAS NOT MOVED YET
    </small>

  </div>

  <div id="earlyMoney">
  </div>

</div>



<div class="card s4">

  <div class="card-title">

    <h2>
      Latest Alerts
    </h2>

    <small>
      LIVE
    </small>

  </div>

  <div id="terminalAlerts">
  </div>

</div>



<div class="card s12 scroll">

  <div class="card-title">

    <h2>
      Live Market Board
    </h2>

    <small>
      CRYPTO
    </small>

  </div>

  <table>

    <thead>

      <tr>

        <th>
          Asset
        </th>

        <th>
          Price
        </th>

        <th>
          24H
        </th>

        <th>
          Volume
        </th>

        <th>
          Buy Ratio
        </th>

        <th>
          Net Flow
        </th>

        <th>
          Flow Score
        </th>

        <th>
          Probability
        </th>

      </tr>

    </thead>

    <tbody id="marketRows">
    </tbody>

  </table>

</div>


</div>

</section>



<section
  id="discover"
  class="tab"
>

<div class="grid">


<div class="card s12">

  <div class="card-title">

    <h2>
      Trader Discovery
    </h2>

    <small>
      HYPERLIQUID LEADERBOARD
    </small>

  </div>


  <div class="filters">

    <input
      id="minEquity"
      type="number"
      value="50000"
      placeholder="Min Equity"
    >


    <input
      id="minMonthPnl"
      type="number"
      value="0"
      placeholder="Min Month PnL"
    >


    <input
      id="maxTurnover"
      type="number"
      value="5000"
      placeholder="Max Turnover"
    >


    <input
      id="discoverLimit"
      type="number"
      value="50"
      placeholder="Limit"
    >


    <button
      id="discoverBtn"
      class="primary"
    >
      Scan Traders
    </button>

  </div>

</div>


<div class="card s12 scroll">

<table>

<thead>

<tr>

<th>Rank</th>

<th>Trader</th>

<th>Score</th>

<th>Equity</th>

<th>Day PnL</th>

<th>Week PnL</th>

<th>Month PnL</th>

<th>Month ROI</th>

<th>All Time</th>

<th>Turnover</th>

<th>Style</th>

<th>Action</th>

</tr>

</thead>

<tbody id="discoverRows">
</tbody>

</table>

</div>


</div>

</section>



<section
  id="wallets"
  class="tab"
>

<div class="grid">


<div class="card s12">

  <div class="card-title">

    <h2>
      Smart Wallet Watchlist
    </h2>

    <small>
      HYPERLIQUID
    </small>

  </div>


  <div class="form4">

    <input
      id="walletName"
      placeholder="Trader name"
    >


    <input
      id="walletAddress"
      placeholder="0x..."
    >


    <select id="walletTag">

      <option>
        Manual
      </option>

      <option>
        Discovery
      </option>

      <option>
        Review
      </option>

    </select>


    <button
      id="addWallet"
      class="primary"
    >
      Add Wallet
    </button>

  </div>

</div>


<div class="card s12 scroll">

<table>

<thead>

<tr>

<th>Trader</th>

<th>Tier</th>

<th>Score</th>

<th>Equity</th>

<th>Day PnL</th>

<th>Week PnL</th>

<th>Month PnL</th>

<th>Month ROI</th>

<th>Win Rate</th>

<th>Drawdown</th>

<th>Positions</th>

<th>Action</th>

</tr>

</thead>

<tbody id="walletRows">
</tbody>

</table>

</div>


</div>

</section>



<section
  id="macro"
  class="tab"
>

<div class="grid">


<div class="card s12">

  <div class="card-title">

    <h2>
      Global Macro Radar
    </h2>

    <small>
      GOLD • OIL • FX
    </small>

  </div>

  <div id="macroCards" class="grid">
  </div>

</div>


<div class="card s7">

  <div class="card-title">

    <h2>
      Macro Cross-Asset Map
    </h2>

    <small>
      DAILY MOVE
    </small>

  </div>

  <div
    id="macroChart"
    class="chart large"
  >
  </div>

</div>


<div class="card s5 scroll">

  <div class="card-title">

    <h2>
      Macro Board
    </h2>

    <small>
      LIVE SNAPSHOT
    </small>

  </div>

  <table>

    <thead>

      <tr>

        <th>
          Market
        </th>

        <th>
          Price
        </th>

        <th>
          Move
        </th>

        <th>
          Group
        </th>

      </tr>

    </thead>

    <tbody id="macroRows">
    </tbody>

  </table>

</div>


</div>

</section>



<section
  id="alerts"
  class="tab"
>

<div class="grid">


<div class="card s4">

  <div class="card-title">

    <h2>
      Alert Engine
    </h2>

    <small>
      SETTINGS
    </small>

  </div>


  <div class="label">
    Minimum Flow Score
  </div>

  <input
    id="flowThreshold"
    type="number"
    value="67"
  >


  <br><br>


  <div class="label">
    Minimum Smart Score
  </div>

  <input
    id="walletThreshold"
    type="number"
    value="70"
  >


  <br><br>


  <div class="label">
    Maximum 24H move for Early Signal
  </div>

  <input
    id="moveThreshold"
    type="number"
    value="3"
    step="0.1"
  >


  <br><br>


  <button
    id="saveSettings"
    class="primary"
  >
    Save Settings
  </button>


  <button id="notify">
    Enable Notifications
  </button>

</div>



<div class="card s8">

  <div class="card-title">

    <h2>
      Alert Log
    </h2>

    <small>
      LAST 50 EVENTS
    </small>

  </div>

  <div id="alertLog">
  </div>

</div>


</div>

</section>



<section
  id="system"
  class="tab"
>

<div class="grid">


<div class="card s3">

  <div class="label">
    Backend
  </div>

  <div
    id="backendState"
    class="metric medium"
  >
    --
  </div>

</div>


<div class="card s3">

  <div class="label">
    Crypto API
  </div>

  <div
    id="cryptoState"
    class="metric medium"
  >
    --
  </div>

</div>


<div class="card s3">

  <div class="label">
    Macro API
  </div>

  <div
    id="macroState"
    class="metric medium"
  >
    --
  </div>

</div>


<div class="card s3">

  <div class="label">
    Updated
  </div>

  <div
    id="updatedState"
    class="metric medium"
  >
    --
  </div>

</div>


<div class="card s12">

  <div class="signal">
    Crypto prices: Binance Vision
  </div>

  <div class="signal">
    Crypto flow: Binance aggregate trades
  </div>

  <div class="signal">
    Trader discovery: Hyperliquid public leaderboard
  </div>

  <div class="signal">
    Smart wallet positions: Hyperliquid public Info API
  </div>

  <div class="signal">
    Macro: Stooq snapshot
  </div>

  <div class="signal">
    Probability engine: ALI Flow Radar composite heuristic
  </div>

</div>


</div>

</section>


</main>



<div class="footer">

ALI Flow Radar is a market research and monitoring tool.
Probability and confidence scores are analytical heuristics and are not guarantees of future returns.

</div>



<div
  id="walletModal"
  class="modal"
>

<div class="modal-box">

  <div
    style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:10px
    "
  >

    <h2 id="modalTitle">
      Wallet
    </h2>

    <button id="closeModal">
      Close
    </button>

  </div>

  <div id="modalBody">
  </div>

</div>

</div>



<script>


/* ======================================================
   STATE
====================================================== */


const DEFAULT_SYMBOLS = [

  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT"

];


let symbols =

  JSON.parse(
    localStorage.getItem(
      "afr4_symbols"
    ) || "null"
  ) ||

  DEFAULT_SYMBOLS;


let wallets =

  JSON.parse(
    localStorage.getItem(
      "afr4_wallets"
    ) || "[]"
  );


let alerts =

  JSON.parse(
    localStorage.getItem(
      "afr4_alerts"
    ) || "[]"
  );


let settings =

  JSON.parse(
    localStorage.getItem(
      "afr4_settings"
    ) ||
    '{"flow":67,"wallet":70,"move":3}'
  );


let market = {};

let flow = {};

let walletData = {};

let discovered = [];

let macroData = [];

let btcHistory = [];

let cooldown = {};


const $ =
  id =>
    document.getElementById(id);


const num =
  (v,f=0) => {

    const n =
      Number(v);

    return Number.isFinite(n)
      ? n
      : f;

  };


const clamp =
  (v,a,b) =>
    Math.max(
      a,
      Math.min(
        b,
        v
      )
    );


function save(){

  localStorage.setItem(
    "afr4_symbols",
    JSON.stringify(symbols)
  );

  localStorage.setItem(
    "afr4_wallets",
    JSON.stringify(wallets)
  );

  localStorage.setItem(
    "afr4_alerts",
    JSON.stringify(alerts)
  );

  localStorage.setItem(
    "afr4_settings",
    JSON.stringify(settings)
  );

}


function money(v){

  v = num(v);

  const a =
    Math.abs(v);

  if(a >= 1e9)
    return (v/1e9).toFixed(2) + "B";

  if(a >= 1e6)
    return (v/1e6).toFixed(2) + "M";

  if(a >= 1e3)
    return (v/1e3).toFixed(1) + "K";

  return v.toFixed(0);

}


function price(v){

  v =
    Number(v);

  if(
    !Number.isFinite(v)
  )
    return "--";


  if(
    Math.abs(v) < 1
  )
    return v.toFixed(5);


  if(
    Math.abs(v) < 100
  )
    return v.toFixed(3);


  return v.toLocaleString(
    undefined,
    {
      maximumFractionDigits:2
    }
  );

}


function pct(v){

  v =
    Number(v);

  if(
    !Number.isFinite(v)
  )
    return "--";


  return (
    v >= 0
      ? "+"
      : ""
  ) +
    v.toFixed(2) +
    "%";

}


function shortAddress(a){

  if(!a)
    return "--";


  return (
    a.slice(0,6) +
    "…" +
    a.slice(-4)
  );

}


function signClass(v){

  return num(v) >= 0
    ? "good-text"
    : "bad-text";

}


async function getJson(url){

  const r =
    await fetch(
      url,
      {
        cache:"no-store"
      }
    );


  const text =
    await r.text();


  let d;


  try{

    d =
      JSON.parse(text);

  }
  catch{

    throw new Error(
      "Invalid server response"
    );

  }


  if(!r.ok){

    throw new Error(
      d.error ||
      "HTTP " +
      r.status
    );

  }


  return d;

}


/* ======================================================
   NAV
====================================================== */


document
.querySelectorAll(".tabbtn")
.forEach(

  btn => {

    btn.addEventListener(
      "click",
      () => {

        document
        .querySelectorAll(".tabbtn")
        .forEach(
          x =>
            x.classList.remove(
              "active"
            )
        );


        document
        .querySelectorAll(".tab")
        .forEach(
          x =>
            x.classList.remove(
              "active"
            )
        );


        btn.classList.add(
          "active"
        );


        $(
          btn.dataset.tab
        ).classList.add(
          "active"
        );


        setTimeout(
          resizeCharts,
          100
        );

      }
    );

  }

);


/* ======================================================
   CHARTS
====================================================== */


const pulseChart =
  echarts.init(
    $("btcPulseChart")
  );


const probChart =
  echarts.init(
    $("probChart")
  );


const macroChart =
  echarts.init(
    $("macroChart")
  );


let cy =
  cytoscape({

    container:
      $("networkGraph"),

    elements:[],

    style:[

      {

        selector:"node",

        style:{

          "background-color":
            "#d9e5ec",

          "label":
            "data(label)",

          "font-size":
            9,

          "text-valign":
            "bottom",

          "text-margin-y":
            7,

          "color":
            "#4e5f6d"

        }

      },


      {

        selector:
          "node[type='wallet']",

        style:{

          "background-color":
            "#33495b",

          "width":
            30,

          "height":
            30,

          "color":
            "#17212b",

          "font-weight":
            600

        }

      },


      {

        selector:
          "node[type='coin']",

        style:{

          "background-color":
            "#2e8fc3",

          "width":
            22,

          "height":
            22

        }

      },


      {

        selector:
          "edge[side='LONG']",

        style:{

          "line-color":
            "#4cbf8a",

          "target-arrow-color":
            "#4cbf8a"

        }

      },


      {

        selector:
          "edge[side='SHORT']",

        style:{

          "line-color":
            "#e46d6d",

          "target-arrow-color":
            "#e46d6d"

        }

      },


      {

        selector:"edge",

        style:{

          "width":
            1.4,

          "curve-style":
            "bezier",

          "target-arrow-shape":
            "triangle",

          "arrow-scale":
            .7,

          "opacity":
            .7

        }

      }

    ],

    layout:{
      name:"cose"
    }

  });


function resizeCharts(){

  pulseChart.resize();

  probChart.resize();

  macroChart.resize();

  cy.resize();

}


/* ======================================================
   HEALTH
====================================================== */


async function refreshHealth(){

  try{

    const d =
      await getJson(
        "/api/health"
      );


    $("backendState")
      .textContent =
        d.ok
          ? "LIVE"
          : "ERROR";


    $("backendState")
      .className =
        "metric medium " +
        (
          d.ok
            ? "good-text"
            : "bad-text"
        );

  }
  catch{

    $("backendState")
      .textContent =
        "OFFLINE";


    $("backendState")
      .className =
        "metric medium bad-text";

  }

}


/* ======================================================
   CRYPTO MARKET
====================================================== */


async function refreshMarket(){

  try{

    const d =
      await getJson(

        "/api/binance?symbols=" +

        encodeURIComponent(
          symbols.join(",")
        )

      );


    market = {};


    d.forEach(

      x => {

        market[
          x.symbol
        ] = x;

      }

    );


    $("dot")
      .classList.add(
        "live"
      );


    $("status")
      .textContent =
        "LIVE";


    $("cryptoState")
      .textContent =
        "LIVE";


    $("cryptoState")
      .className =
        "metric medium good-text";


    $("updatedState")
      .textContent =
        new Date()
          .toLocaleTimeString(
            "fa-IR"
          );


    const btc =
      market.BTCUSDT;


    if(btc){

      btcHistory.push({

        t:
          new Date()
          .toLocaleTimeString(
            "fa-IR",
            {
              hour:"2-digit",
              minute:"2-digit",
              second:"2-digit"
            }
          ),

        p:
          num(
            btc.lastPrice
          )

      });


      if(
        btcHistory.length >
        120
      ){

        btcHistory.shift();

      }

    }


    renderTerminal();

  }
  catch{

    $("dot")
      .classList.remove(
        "live"
      );


    $("status")
      .textContent =
        "API ERROR";


    $("cryptoState")
      .textContent =
        "ERROR";


    $("cryptoState")
      .className =
        "metric medium bad-text";

  }

}


async function refreshFlow(){

  try{

    const d =
      await getJson(

        "/api/flow?symbols=" +

        encodeURIComponent(

          symbols
          .slice(0,10)
          .join(",")

        )

      );


    flow = {};


    d.forEach(

      x => {

        flow[
          x.symbol
        ] = x;

      }

    );


    renderTerminal();

    runMarketAlerts();

  }
  catch{}

}


/* ======================================================
   WALLET CONSENSUS
====================================================== */


function getConsensus(){

  const coins = {};


  for(
    const w
    of wallets
  ){

    const d =
      walletData[
        w.address
        .toLowerCase()
      ];


    if(
      !d ||
      d.error
    )
      continue;


    const weight =
      num(
        d.smartScore,
        50
      ) /
      100;


    for(
      const p
      of d.positions || []
    ){

      if(!coins[p.coin]){

        coins[p.coin] = {

          coin:
            p.coin,

          longCount:
            0,

          shortCount:
            0,

          longValue:
            0,

          shortValue:
            0

        };

      }


      if(
        p.side ===
        "LONG"
      ){

        coins[p.coin]
          .longCount++;


        coins[p.coin]
          .longValue +=

            num(
              p.positionValue
            ) *

            weight;

      }
      else{

        coins[p.coin]
          .shortCount++;


        coins[p.coin]
          .shortValue +=

            num(
              p.positionValue
            ) *

            weight;

      }

    }

  }


  return Object
  .values(coins)
  .map(

    x => {

      const total =

        x.longValue +
        x.shortValue;


      const net =

        x.longValue -
        x.shortValue;


      const bias =

        total
          ? net /
            total
          : 0;


      return {

        ...x,

        net,

        bias,

        total

      };

    }

  )
  .sort(

    (a,b) =>

      Math.abs(b.net) -

      Math.abs(a.net)

  );

}


/* ======================================================
   PROBABILITY ENGINE
====================================================== */


function assetProbability(
  symbol
){

  const m =
    market[symbol] ||
    {};


  const f =
    flow[symbol] ||
    {};


  const flowScore =

    num(
      f.flowScore,
      50
    );


  const momentum =

    clamp(

      50 +

      num(
        m.priceChangePercent
      ) *

      4,

      0,
      100

    );


  let walletScore = 50;


  const coin =

    symbol
    .replace(
      "USDT",
      ""
    );


  const c =

    getConsensus()
    .find(
      x =>
        x.coin === coin
    );


  if(c){

    walletScore =

      clamp(

        50 +

        c.bias *
        45,

        0,
        100

      );

  }


  const probability =

    clamp(

      flowScore *
      .48 +

      momentum *
      .22 +

      walletScore *
      .30,

      0,
      100

    );


  return {

    probability,

    flowScore,

    momentum,

    walletScore

  };

}


/* ======================================================
   TERMINAL
====================================================== */


function renderTerminal(){

  const btc =
    market.BTCUSDT ||
    {};


  const eth =
    market.ETHUSDT ||
    {};


  $("btcPrice")
    .textContent =
      price(
        btc.lastPrice
      );


  $("ethPrice")
    .textContent =
      price(
        eth.lastPrice
      );


  $("walletCount")
    .textContent =
      wallets.length;


  $("alertCount")
    .textContent =

      alerts
      .filter(

        a =>
          Date.now() -
          a.time <
          86400000

      )
      .length;


  const btcP =
    assetProbability(
      "BTCUSDT"
    );


  $("probUp")
    .textContent =

      btcP.probability
      .toFixed(0) +
      "%";


  $("probDown")
    .textContent =

      (
        100 -
        btcP.probability
      )
      .toFixed(0) +
      "%";


  $("probFlow")
    .textContent =

      btcP.flowScore
      .toFixed(0);


  $("probMomentum")
    .textContent =

      btcP.momentum
      .toFixed(0);


  $("probWallet")
    .textContent =

      btcP.walletScore
      .toFixed(0);


  $("globalConfidence")
    .textContent =

      btcP.probability
      .toFixed(0) +
      "/100";


  $("globalConfidence")
    .className =

      "metric " +

      (
        btcP.probability >=
        55

          ? "good-text"

        : btcP.probability <=
          45

          ? "bad-text"

          : "warn-text"
      );


  $("marketMode")
    .innerHTML =

      btcP.probability >= 60

        ? `
          <span class="pill good">
          BULLISH REGIME
          </span>
          `

      : btcP.probability <= 40

        ? `
          <span class="pill bad">
          BEARISH REGIME
          </span>
          `

      : `
        <span class="pill blue">
        NEUTRAL / MIXED
        </span>
        `;


  const btcF =
    flow.BTCUSDT ||
    {};


  $("pulsePrice")
    .textContent =
      price(
        btc.lastPrice
      );


  $("pulse24h")
    .textContent =
      pct(
        btc.priceChangePercent
      );


  $("pulse24h")
    .className =

      "metric medium " +

      signClass(
        btc.priceChangePercent
      );


  $("pulseBuyRatio")
    .textContent =

      btcF.buyRatio == null

        ? "--"

        : num(
            btcF.buyRatio
          )
          .toFixed(1) +
          "%";


  $("pulseNet")
    .textContent =

      btcF.netFlow == null

        ? "--"

        : "$" +
          money(
            btcF.netFlow
          );


  $("pulseNet")
    .className =

      "metric medium " +

      signClass(
        btcF.netFlow
      );


  $("pulseConfidence")
    .textContent =

      btcP.probability
      .toFixed(0) +
      "%";


  renderMarketBoard();

  renderProbabilityChart();

  renderPulseChart();

  renderEarlyMoney();

  renderConsensus();

  renderNetwork();

  renderTerminalAlerts();

}


/* ======================================================
   MARKET TABLE
====================================================== */


function renderMarketBoard(){

  $("marketRows")
  .innerHTML =

    symbols
    .map(

      symbol => {

        const m =
          market[symbol] ||
          {};


        const f =
          flow[symbol] ||
          {};


        const p =
          assetProbability(
            symbol
          );


        return `

        <tr>

        <td>
          <b>
          ${symbol}
          </b>
        </td>


        <td>
          ${price(
            m.lastPrice
          )}
        </td>


        <td
          class="${signClass(
            m.priceChangePercent
          )}"
        >
          ${pct(
            m.priceChangePercent
          )}
        </td>


        <td>
          ${money(
            m.quoteVolume
          )}
        </td>


        <td>
          ${
            f.buyRatio == null

              ? "--"

              : num(
                  f.buyRatio
                )
                .toFixed(1) +
                "%"
          }
        </td>


        <td
          class="${signClass(
            f.netFlow
          )}"
        >
          ${
            f.netFlow == null

              ? "--"

              : "$" +
                money(
                  f.netFlow
                )
          }
        </td>


        <td>

          ${
            f.flowScore == null

              ? "--"

              : f.flowScore
          }


          <div class="flowbar">

            <i
              style="
              width:${
                f.flowScore || 0
              }%
              "
            >
            </i>

          </div>

        </td>


        <td>

          ${
            p.probability
            .toFixed(0)
          }%

        </td>

        </tr>

        `;

      }

    )
    .join("");

}


/* ======================================================
   EARLY MONEY
====================================================== */


function renderEarlyMoney(){

  const rows =

    symbols
    .map(

      s => {

        const m =
          market[s];


        const f =
          flow[s];


        if(
          !m ||
          !f ||
          f.error
        )
          return null;


        return {

          symbol:
            s,

          priceMove:
            num(
              m.priceChangePercent
            ),

          flowScore:
            num(
              f.flowScore
            ),

          buyRatio:
            num(
              f.buyRatio
            ),

          netFlow:
            num(
              f.netFlow
            ),

          probability:
            assetProbability(
              s
            )
            .probability

        };

      }

    )
    .filter(Boolean)
    .sort(

      (a,b) =>

        Math.abs(
          b.flowScore -
          50
        ) -

        Math.abs(
          a.flowScore -
          50
        )

    )
    .slice(0,6);


  $("earlyMoney")
  .innerHTML =

    rows.length

      ? rows
        .map(

          x => {

            const bullish =

              x.flowScore >=
              50;


            const isEarly =

              Math.abs(
                x.priceMove
              ) <=
              num(
                settings.move,
                3
              ) &&

              Math.abs(
                x.flowScore -
                50
              ) >= 12;


            return `

            <div
              class="signal ${
                isEarly
                  ? "strong"
                  : ""
              }"
            >

              <b>
                ${x.symbol}
              </b>

              <span
                class="${
                  bullish
                    ? "good-text"
                    : "bad-text"
                }"
              >

                ${
                  bullish
                    ? "BUY PRESSURE"
                    : "SELL PRESSURE"
                }

              </span>


              ${
                isEarly

                  ? `
                    <span class="pill blue">
                    EARLY
                    </span>
                    `

                  : ""
              }


              <div class="small">

                Probability:
                ${x.probability.toFixed(0)}%

                •

                Flow:
                ${x.flowScore}

                •

                24H:
                ${pct(x.priceMove)}

                •

                Net:
                $${money(x.netFlow)}

              </div>

            </div>

            `;

          }

        )
        .join("")

      : `
        <div class="small">
        Waiting for flow data...
        </div>
        `;

}


/* ======================================================
   CONSENSUS
====================================================== */


function renderConsensus(){

  const rows =
    getConsensus();


  if(!rows.length){

    $("topConsensus")
      .textContent =
        "NO SIGNAL";


    $("topConsensusDetail")
      .textContent =
        "Follow smart wallets to build consensus.";


    $("consensusList")
      .innerHTML =
        "";


    return;

  }


  const top =
    rows[0];


  $("topConsensus")
    .textContent =

      `${top.coin} ${
        top.net >= 0
          ? "LONG"
          : "SHORT"
      }`;


  $("topConsensus")
    .className =

      "metric medium " +

      (
        top.net >= 0
          ? "good-text"
          : "bad-text"
      );


  $("topConsensusDetail")
    .textContent =

      `${top.longCount} long wallets • ${top.shortCount} short wallets • weighted $${money(
        Math.abs(
          top.net
        )
      )}`;


  $("consensusList")
    .innerHTML =

      rows
      .slice(0,5)
      .map(

        x => `

        <div class="signal">

          <b>
            ${x.coin}
          </b>

          <span
            class="${
              x.net >= 0
                ? "good-text"
                : "bad-text"
            }"
          >

            ${
              x.net >= 0
                ? "LONG"
                : "SHORT"
            }

          </span>

          ${
            Math.max(
              x.longCount,
              x.shortCount
            ) >= 3

              ? `
                <span class="pill blue">
                COORDINATED
                </span>
                `

              : ""
          }

        </div>

        `

      )
      .join("");

}


/* ======================================================
   NETWORK
====================================================== */


function renderNetwork(){

  const elements = [];

  const seenCoins =
    new Set();


  wallets.forEach(

    (w,index) => {

      const walletId =
        "w" + index;


      elements.push({

        data:{

          id:
            walletId,

          label:
            w.name,

          type:
            "wallet"

        }

      });


      const d =
        walletData[
          w.address
          .toLowerCase()
        ];


      if(
        !d ||
        d.error
      )
        return;


      for(
        const p
        of d.positions || []
      ){

        const coinId =
          "c_" +
          p.coin;


        if(
          !seenCoins.has(
            coinId
          )
        ){

          seenCoins.add(
            coinId
          );


          elements.push({

            data:{

              id:
                coinId,

              label:
                p.coin,

              type:
                "coin"

            }

          });

        }


        elements.push({

          data:{

            id:
              walletId +
              "_" +
              coinId,

            source:
              walletId,

            target:
              coinId,

            side:
              p.side,

            value:
              p.positionValue

          }

        });

      }

    }

  );


  cy.elements()
  .remove();


  cy.add(
    elements
  );


  if(
    elements.length
  ){

    cy.layout({

      name:"cose",

      animate:false,

      idealEdgeLength:
        90,

      nodeRepulsion:
        5000

    })
    .run();

  }

}


/* ======================================================
   CHARTS
====================================================== */


function renderPulseChart(){

  pulseChart.setOption({

    animation:false,

    grid:{

      left:45,

      right:15,

      top:15,

      bottom:35

    },

    tooltip:{
      trigger:"axis"
    },

    xAxis:{

      type:"category",

      boundaryGap:false,

      data:
        btcHistory.map(
          x => x.t
        ),

      axisLabel:{

        fontSize:9,

        color:"#8b98a4"

      },

      axisLine:{

        lineStyle:{
          color:"#dfe5eb"
        }

      }

    },

    yAxis:{

      type:"value",

      scale:true,

      axisLabel:{

        fontSize:9,

        color:"#8b98a4"

      },

      splitLine:{

        lineStyle:{
          color:"#edf1f4"
        }

      }

    },

    series:[

      {

        type:"line",

        smooth:true,

        showSymbol:false,

        data:
          btcHistory.map(
            x => x.p
          ),

        lineStyle:{

          width:2,

          color:"#2b7fb4"

        },

        areaStyle:{

          color:
            "rgba(43,127,180,.08)"

        }

      }

    ]

  });

}


function renderProbabilityChart(){

  const data =

    symbols
    .slice(0,8)
    .map(

      s => {

        const p =
          assetProbability(
            s
          );


        return {

          name:
            s.replace(
              "USDT",
              ""
            ),

          value:
            Number(
              p.probability
              .toFixed(1)
            )

        };

      }

    );


  probChart.setOption({

    tooltip:{
      trigger:"axis"
    },

    grid:{

      left:45,

      right:15,

      top:15,

      bottom:30

    },

    xAxis:{

      type:"category",

      data:
        data.map(
          x => x.name
        ),

      axisLabel:{
        color:"#677482"
      },

      axisLine:{

        lineStyle:{
          color:"#dfe5eb"
        }

      }

    },

    yAxis:{

      min:0,

      max:100,

      axisLabel:{

        formatter:
          "{value}%",

        color:"#677482"

      },

      splitLine:{

        lineStyle:{
          color:"#edf1f4"
        }

      }

    },

    series:[

      {

        type:"bar",

        data:
          data.map(
            x => x.value
          ),

        barWidth:"42%",

        itemStyle:{

          color:params =>

            params.value >= 60

              ? "#3bb47c"

            : params.value <= 40

              ? "#dc6565"

              : "#6ba6ca",

          borderRadius:[
            5,5,0,0
          ]

        },

        label:{

          show:true,

          position:"top",

          formatter:
            "{c}%",

          fontSize:9

        }

      }

    ]

  });

}


/* ======================================================
   TRADER DISCOVERY
====================================================== */


async function discoverTraders(){

  $("discoverRows")
  .innerHTML =

    `
    <tr>

      <td colspan="12">
        Scanning Hyperliquid leaderboard...
      </td>

    </tr>
    `;


  try{

    const q =

      new URLSearchParams({

        minEquity:
          $("minEquity")
          .value ||
          50000,

        minMonthPnl:
          $("minMonthPnl")
          .value ||
          0,

        maxTurnover:
          $("maxTurnover")
          .value ||
          5000,

        limit:
          $("discoverLimit")
          .value ||
          50

      });


    const d =
      await getJson(

        "/api/traders?" +
        q.toString()

      );


    discovered =
      d.traders ||
      [];


    renderDiscovered();

  }
  catch(e){

    $("discoverRows")
    .innerHTML =

      `
      <tr>

        <td
          colspan="12"
          class="bad-text"
        >
          ${e.message}
        </td>

      </tr>
      `;

  }

}


function renderDiscovered(){

  $("discoverRows")
  .innerHTML =

    discovered.length

      ? discovered
        .map(

          (t,i) => {

            const p =
              t.performance ||
              {};


            const followed =

              wallets.some(

                w =>

                  w.address
                  .toLowerCase() ===

                  t.address
                  .toLowerCase()

              );


            return `

            <tr>

            <td>
              ${i+1}
            </td>


            <td>

              <b>
                ${t.name || "Anonymous"}
              </b>

              <div class="tiny">
                ${shortAddress(t.address)}
              </div>

            </td>


            <td>
              <b>
              ${t.discoveryScore}
              </b>
            </td>


            <td>
              $${money(t.equity)}
            </td>


            <td
              class="${signClass(
                p.day?.pnl
              )}"
            >
              $${money(
                p.day?.pnl
              )}
            </td>


            <td
              class="${signClass(
                p.week?.pnl
              )}"
            >
              $${money(
                p.week?.pnl
              )}
            </td>


            <td
              class="${signClass(
                p.month?.pnl
              )}"
            >
              $${money(
                p.month?.pnl
              )}
            </td>


            <td
              class="${signClass(
                p.month?.roiPct
              )}"
            >
              ${pct(
                p.month?.roiPct
              )}
            </td>


            <td
              class="${signClass(
                p.allTime?.pnl
              )}"
            >
              $${money(
                p.allTime?.pnl
              )}
            </td>


            <td>
              ${num(
                t.turnover30d
              ).toFixed(0)}x
            </td>


            <td>
              ${t.style}
            </td>


            <td>

              <button
                ${
                  followed
                    ? "disabled"
                    : ""
                }
                onclick="followTrader(${i})"
              >

                ${
                  followed
                    ? "Following"
                    : "Follow"
                }

              </button>

            </td>

            </tr>

            `;

          }

        )
        .join("")

      : `
        <tr>

          <td colspan="12">
            No traders found.
          </td>

        </tr>
        `;

}


window.followTrader =

  i => {

    const t =
      discovered[i];


    if(!t)
      return;


    const exists =

      wallets.some(

        w =>

          w.address
          .toLowerCase() ===

          t.address
          .toLowerCase()

      );


    if(exists)
      return;


    wallets.push({

      name:
        t.name ||
        "Trader-" +
        (
          wallets.length +
          1
        ),

      address:
        t.address,

      tag:
        "Discovery"

    });


    save();

    renderDiscovered();

    refreshWallets();


    pushAlert(

      "follow:" +
      t.address,

      `Followed ${
        t.name ||
        shortAddress(
          t.address
        )
      } • Discovery Score ${
        t.discoveryScore
      }`

    );

};


$("discoverBtn")
.onclick =
  discoverTraders;


/* ======================================================
   WALLET DATA
====================================================== */


async function refreshWallets(){

  await Promise.all(

    wallets.map(

      async w => {

        try{

          walletData[
            w.address
            .toLowerCase()
          ] =

            await getJson(

              "/api/hyperliquid/summary?user=" +

              encodeURIComponent(
                w.address
              )

            );

        }
        catch(e){

          walletData[
            w.address
            .toLowerCase()
          ] = {

            error:
              String(e)

          };

        }

      }

    )

  );


  renderWallets();

  renderTerminal();

  runWalletAlerts();

}


function renderWallets(){

  $("walletCount")
  .textContent =
    wallets.length;


  if(
    !wallets.length
  ){

    $("walletRows")
    .innerHTML =

      `
      <tr>

        <td
          colspan="12"
          class="small"
        >
          No wallets followed yet.
        </td>

      </tr>
      `;

    return;

  }


  $("walletRows")
  .innerHTML =

    wallets
    .map(

      (w,i) => {

        const d =
          walletData[
            w.address
            .toLowerCase()
          ] ||
          {};


        if(d.error){

          return `

          <tr>

            <td>

              ${w.name}

              <div class="tiny">
                ${shortAddress(w.address)}
              </div>

            </td>

            <td
              colspan="10"
              class="bad-text"
            >
              API error
            </td>

            <td>

              <button
                class="danger"
                onclick="removeWallet(${i})"
              >
                Remove
              </button>

            </td>

          </tr>

          `;

        }


        const day =
          d.pnl?.day?.pnl;


        const week =
          d.pnl?.week?.pnl;


        const month =
          d.pnl?.month?.pnl;


        const roi =
          d.pnl?.month?.roi;


        const dd =
          d.pnl?.month?.maxDrawdownPct;


        const winRate =
          d.stats30?.winRate;


        return `

        <tr>

        <td>

          <b>
            ${w.name}
          </b>

          <div class="tiny">
            ${w.tag}
            •
            ${shortAddress(w.address)}
          </div>

        </td>


        <td>

          <span class="pill blue">
            ${d.tier || "--"}
          </span>

        </td>


        <td>
          <b>
            ${d.smartScore ?? "--"}
          </b>
        </td>


        <td>
          $${money(d.equity)}
        </td>


        <td
          class="${signClass(day)}"
        >
          ${
            day == null
              ? "--"
              : "$" +
                money(day)
          }
        </td>


        <td
          class="${signClass(week)}"
        >
          ${
            week == null
              ? "--"
              : "$" +
                money(week)
          }
        </td>


        <td
          class="${signClass(month)}"
        >
          ${
            month == null
              ? "--"
              : "$" +
                money(month)
          }
        </td>


        <td
          class="${signClass(roi)}"
        >
          ${
            roi == null
              ? "--"
              : pct(roi)
          }
        </td>


        <td>
          ${
            winRate == null
              ? "--"
              : num(winRate)
                .toFixed(1) +
                "%"
          }
        </td>


        <td
          class="${signClass(dd)}"
        >
          ${
            dd == null
              ? "--"
              : pct(dd)
          }
        </td>


        <td>
          ${
            d.positions?.length ||
            0
          }
        </td>


        <td>

          <button
            onclick="openWallet(${i})"
          >
            Details
          </button>

          <button
            class="danger"
            onclick="removeWallet(${i})"
          >
            Remove
          </button>

        </td>

        </tr>

        `;

      }

    )
    .join("");

}


$("addWallet")
.onclick =
  () => {

    const name =

      $("walletName")
      .value
      .trim() ||

      "Trader-" +
      (
        wallets.length +
        1
      );


    const address =

      $("walletAddress")
      .value
      .trim();


    const tag =
      $("walletTag")
      .value;


    if(
      !/^0x[a-fA-F0-9]{40}$/.test(
        address
      )
    ){

      alert(
        "Invalid Hyperliquid wallet address."
      );

      return;

    }


    if(

      wallets.some(

        w =>

          w.address
          .toLowerCase() ===

          address
          .toLowerCase()

      )

    ){

      alert(
        "Wallet already exists."
      );

      return;

    }


    wallets.push({

      name,
      address,
      tag

    });


    save();


    $("walletName")
    .value = "";


    $("walletAddress")
    .value = "";


    refreshWallets();

};


window.removeWallet =

  i => {

    wallets.splice(
      i,
      1
    );


    save();

    renderDiscovered();

    refreshWallets();

};


/* ======================================================
   WALLET MODAL
====================================================== */


window.openWallet =

  i => {

    const w =
      wallets[i];


    const d =

      walletData[
        w.address
        .toLowerCase()
      ] ||
      {};


    $("modalTitle")
    .textContent =

      w.name +
      " — " +
      shortAddress(
        w.address
      );


    const positions =

      (
        d.positions ||
        []
      )
      .map(

        p => `

        <tr>

        <td>
          ${p.coin}
        </td>


        <td
          class="${
            p.side === "LONG"
              ? "good-text"
              : "bad-text"
          }"
        >
          ${p.side}
        </td>


        <td>
          $${money(
            p.positionValue
          )}
        </td>


        <td>
          ${price(
            p.entryPx
          )}
        </td>


        <td
          class="${signClass(
            p.unrealizedPnl
          )}"
        >
          $${money(
            p.unrealizedPnl
          )}
        </td>


        <td>
          ${
            p.leverage == null

              ? "--"

              : p.leverage +
                "x"
          }
        </td>

        </tr>

        `

      )
      .join("");


    const fills =

      (
        d.recentFills ||
        []
      )
      .map(

        f => `

        <tr>

        <td>
          ${f.coin}
        </td>


        <td>
          ${f.dir}
        </td>


        <td>
          ${price(
            f.px
          )}
        </td>


        <td>
          ${f.sz}
        </td>


        <td
          class="${signClass(
            f.closedPnl
          )}"
        >
          $${money(
            f.closedPnl
          )}
        </td>


        <td>
          ${
            new Date(
              f.time
            )
            .toLocaleString(
              "fa-IR"
            )
          }
        </td>

        </tr>

        `

      )
      .join("");


    $("modalBody")
    .innerHTML =

      `

      <div class="kpi-row">

        <div class="kpi">

          <span class="label">
            Smart Score
          </span>

          <b>
            ${
              d.smartScore ??
              "--"
            }
          </b>

        </div>


        <div class="kpi">

          <span class="label">
            Equity
          </span>

          <b>
            $${money(
              d.equity
            )}
          </b>

        </div>


        <div class="kpi">

          <span class="label">
            Win Rate
          </span>

          <b>
            ${
              d.stats30?.winRate ==
              null

                ? "--"

                : num(
                    d.stats30
                    .winRate
                  )
                  .toFixed(1) +
                  "%"
            }
          </b>

        </div>


        <div class="kpi">

          <span class="label">
            Open Positions
          </span>

          <b>
            ${
              d.positions?.length ||
              0
            }
          </b>

        </div>

      </div>


      <div class="sep"></div>


      <h3>
        Open Positions
      </h3>


      <div class="scroll">

      <table>

      <thead>

      <tr>

      <th>Coin</th>

      <th>Side</th>

      <th>Value</th>

      <th>Entry</th>

      <th>uPnL</th>

      <th>Leverage</th>

      </tr>

      </thead>


      <tbody>

      ${
        positions ||

        `
        <tr>

        <td colspan="6">
          No open positions.
        </td>

        </tr>
        `
      }

      </tbody>

      </table>

      </div>


      <div class="sep"></div>


      <h3>
        Recent Fills
      </h3>


      <div class="scroll">

      <table>

      <thead>

      <tr>

      <th>Coin</th>

      <th>Direction</th>

      <th>Price</th>

      <th>Size</th>

      <th>PnL</th>

      <th>Time</th>

      </tr>

      </thead>


      <tbody>

      ${
        fills ||

        `
        <tr>

        <td colspan="6">
          No recent fills.
        </td>

        </tr>
        `
      }

      </tbody>

      </table>

      </div>

      `;


    $("walletModal")
    .classList.add(
      "open"
    );

};


$("closeModal")
.onclick =

  () =>
    $("walletModal")
    .classList.remove(
      "open"
    );


$("walletModal")
.addEventListener(

  "click",

  e => {

    if(
      e.target.id ===
      "walletModal"
    ){

      $("walletModal")
      .classList.remove(
        "open"
      );

    }

  }

);


/* ======================================================
   MACRO
====================================================== */


async function refreshMacro(){

  try{

    macroData =
      await getJson(
        "/api/macro"
      );


    $("macroState")
    .textContent =
      "LIVE";


    $("macroState")
    .className =
      "metric medium good-text";


    renderMacro();

  }
  catch{

    $("macroState")
    .textContent =
      "ERROR";


    $("macroState")
    .className =
      "metric medium bad-text";

  }

}


function renderMacro(){

  const valid =

    macroData.filter(
      x =>
        !x.error ||
        x.price != null
    );


  $("macroCards")
  .innerHTML =

    valid
    .slice(0,4)
    .map(

      x => `

      <div class="card s3">

        <div class="label">
          ${x.name}
        </div>

        <div class="metric medium">
          ${price(x.price)}
        </div>

        <div
          class="${signClass(
            x.changePct
          )}"
        >
          ${pct(
            x.changePct
          )}
        </div>

        <div class="tiny">
          ${x.marketTimeText || "--"}
        </div>

      </div>

      `

    )
    .join("");


  $("macroRows")
  .innerHTML =

    macroData
    .map(

      x => `

      <tr>

      <td>
        <b>
          ${x.name}
        </b>
      </td>


      <td>
        ${
          x.price == null

            ? "--"

            : price(
                x.price
              )
        }
      </td>


      <td
        class="${signClass(
          x.changePct
        )}"
      >
        ${
          x.changePct == null

            ? "--"

            : pct(
                x.changePct
              )
        }
      </td>


      <td>
        ${x.group}
      </td>

      </tr>

      `

    )
    .join("");


  macroChart.setOption({

    animation:true,

    grid:{

      left:55,

      right:20,

      top:15,

      bottom:35

    },

    tooltip:{
      trigger:"axis"
    },

    xAxis:{

      type:"category",

      data:

        valid.map(
          x =>
            x.symbol
        ),

      axisLabel:{

        rotate:30,

        fontSize:9,

        color:"#677482"

      },

      axisLine:{

        lineStyle:{
          color:"#dfe5eb"
        }

      }

    },

    yAxis:{

      type:"value",

      axisLabel:{

        formatter:
          "{value}%",

        color:"#677482"

      },

      splitLine:{

        lineStyle:{
          color:"#edf1f4"
        }

      }

    },

    series:[

      {

        type:"bar",

        data:

          valid.map(
            x =>
              num(
                x.changePct
              )
          ),

        itemStyle:{

          color:params =>

            params.value >= 0
              ? "#49af7d"
              : "#db6b6b",

          borderRadius:[
            4,4,0,0
          ]

        }

      }

    ]

  });

}


/* ======================================================
   ALERTS
====================================================== */


function pushAlert(
  key,
  msg
){

  const now =
    Date.now();


  if(

    now -

    (
      cooldown[key] ||
      0
    )

    < 120000

  )
    return;


  cooldown[key] =
    now;


  alerts.unshift({

    time:
      now,

    msg

  });


  alerts =
    alerts.slice(
      0,
      100
    );


  save();

  renderAlerts();


  if(

    "Notification"
    in window &&

    Notification
    .permission ===
    "granted"

  ){

    new Notification(

      "ALI Flow Radar",

      {
        body:
          msg
      }

    );

  }

}


function runMarketAlerts(){

  for(
    const s
    of symbols
  ){

    const m =
      market[s];


    const f =
      flow[s];


    if(
      !m ||
      !f ||
      f.error
    )
      continue;


    const score =
      num(
        f.flowScore
      );


    const move =

      Math.abs(

        num(
          m.priceChangePercent
        )

      );


    if(

      move <=
      num(
        settings.move,
        3
      ) &&

      score >=
      num(
        settings.flow,
        67
      )

    ){

      pushAlert(

        "early-buy:" +
        s,

        `${s}: EARLY BUY • Flow ${score} • 24H ${pct(
          m.priceChangePercent
        )}`

      );

    }


    if(

      move <=
      num(
        settings.move,
        3
      ) &&

      score <=
      100 -
      num(
        settings.flow,
        67
      )

    ){

      pushAlert(

        "early-sell:" +
        s,

        `${s}: EARLY SELL • Flow ${score} • 24H ${pct(
          m.priceChangePercent
        )}`

      );

    }

  }

}


function runWalletAlerts(){

  for(
    const w
    of wallets
  ){

    const d =

      walletData[
        w.address
        .toLowerCase()
      ];


    if(
      !d ||
      d.error
    )
      continue;


    if(

      num(
        d.smartScore
      ) <

      num(
        settings.wallet,
        70
      )

    )
      continue;


    for(
      const p
      of d.positions || []
    ){

      if(

        num(
          p.positionValue
        ) >=
        50000

      ){

        pushAlert(

          "wallet:" +
          w.address +
          ":" +
          p.coin +
          ":" +
          p.side,

          `${w.name}: ${p.side} ${p.coin} • $${money(
            p.positionValue
          )} • Score ${d.smartScore}`

        );

      }

    }

  }

}


function renderAlerts(){

  $("alertLog")
  .innerHTML =

    alerts.length

      ? alerts
        .slice(0,50)
        .map(

          a => `

          <div class="alert-item">

            ${a.msg}

            <div class="tiny">

              ${
                new Date(
                  a.time
                )
                .toLocaleString(
                  "fa-IR"
                )
              }

            </div>

          </div>

          `

        )
        .join("")

      : `
        <div class="small">
          No alerts yet.
        </div>
        `;


  $("alertCount")
  .textContent =

    alerts
    .filter(

      a =>

        Date.now() -
        a.time <
        86400000

    )
    .length;

}


function renderTerminalAlerts(){

  $("terminalAlerts")
  .innerHTML =

    alerts.length

      ? alerts
        .slice(0,5)
        .map(

          a => `

          <div class="alert-item">

            ${a.msg}

            <div class="tiny">

              ${
                new Date(
                  a.time
                )
                .toLocaleTimeString(
                  "fa-IR"
                )
              }

            </div>

          </div>

          `

        )
        .join("")

      : `
        <div class="small">
          Waiting for signals...
        </div>
        `;

}


/* ======================================================
   SETTINGS
====================================================== */


$("flowThreshold")
.value =
  settings.flow;


$("walletThreshold")
.value =
  settings.wallet;


$("moveThreshold")
.value =
  settings.move;


$("saveSettings")
.onclick =

  () => {

    settings.flow =

      num(
        $("flowThreshold")
        .value,
        67
      );


    settings.wallet =

      num(
        $("walletThreshold")
        .value,
        70
      );


    settings.move =

      num(
        $("moveThreshold")
        .value,
        3
      );


    save();


    pushAlert(

      "settings",

      "Alert settings updated."

    );

};


$("notify")
.onclick =

  async () => {

    if(
      !(
        "Notification"
        in window
      )
    ){

      alert(
        "Notifications are not supported by this browser."
      );

      return;

    }


    await Notification
    .requestPermission();

};


/* ======================================================
   START
====================================================== */


renderAlerts();

renderWallets();

refreshHealth();

refreshMarket();

refreshFlow();

refreshWallets();

refreshMacro();


setInterval(
  refreshMarket,
  3000
);


setInterval(
  refreshFlow,
  15000
);


setInterval(
  refreshWallets,
  20000
);


setInterval(
  refreshMacro,
  60000
);


setInterval(
  refreshHealth,
  30000
);


window.addEventListener(

  "resize",

  resizeCharts

);


</script>

</body>

</html>
