"use strict";

const { Pool } = require("pg");
const pool = process.env.DATABASE_URL ? new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:30000}) : null;
let persistenceReady=false;
let persistenceBusy=false;
async function initPersistence(){
  if(!pool) return false;
  try{
    await pool.query(`CREATE TABLE IF NOT EXISTS demo_state (id integer PRIMARY KEY, payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`);
    const r=await pool.query("SELECT payload FROM demo_state WHERE id=1");
    if(r.rows[0]&&r.rows[0].payload){
      const s=r.rows[0].payload;
      for(const k of ["startedAt","lastScanAt","lastError","provider","balance","closedPnl","open","closed","candidates"]) if(s[k]!==undefined) state[k]=s[k];
      console.log("[SERVER_DEMO_STATE_RESTORED]",JSON.stringify({open:state.open.length,closed:state.closed.length,balance:state.balance,closedPnl:state.closedPnl}));
    }
    persistenceReady=true; return true;
  }catch(e){ console.error("[SERVER_DEMO_PERSIST_ERROR]",String(e&&e.message||e)); return false; }
}
async function persistState(){
  if(!pool||!persistenceReady||persistenceBusy) return;
  persistenceBusy=true;
  try{
    await pool.query("INSERT INTO demo_state(id,payload,updated_at) VALUES(1,$1::jsonb,now()) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()",[JSON.stringify(state)]);
  }catch(e){ console.error("[SERVER_DEMO_PERSIST_ERROR]",String(e&&e.message||e)); }
  finally{ persistenceBusy=false; }
}

const DEMO_ENTRY_FLOW_USD = 1000;
const MAX_OPEN = 10;
const SCAN_COUNT = 30;
const SCAN_MS = 10000;
const START_BALANCE = 10000;

const state = {
  startedAt: Date.now(), lastScanAt: 0, lastError: null, provider: null,
  balance: START_BALANCE, closedPnl: 0, open: [], closed: [], candidates: []
};

const num = (v,d=0) => Number.isFinite(Number(v)) ? Number(v) : d;
const EXCLUDED_BASES = new Set(["USDC","USDG","FDUSD","TUSD","USDP","DAI","BUSD","USDE","USDS","PYUSD","PAX","PAXG","EURT","EURC"]);
const eligible = s => {
  if(!s || !s.endsWith("USDT")) return false;
  const base=s.slice(0,-4);
  return !EXCLUDED_BASES.has(base);
};

async function j(url){
  const u=new URL(url);
  const suffix=u.pathname+u.search;
  const bases=["https://api.binance.com","https://api1.binance.com","https://api2.binance.com","https://api3.binance.com","https://data-api.binance.vision"];
  let last="unknown";
  for(const base of bases){
    try{
      const r=await fetch(base+suffix,{headers:{"user-agent":"Mozilla/5.0 ALI-Flow-Radar"}});
      if(r.ok) return r.json();
      last=String(r.status);
      if(r.status===418||r.status===429) continue;
    }catch(e){last=String(e&&e.message||e);}
  }
  throw new Error("Binance all endpoints failed: "+last);
}
function flow(rows,n){
  const a=(rows||[]).slice(-n); let buy=0,sell=0;
  for(const r of a){ const q=num(r[7]); const tb=num(r[10]); buy+=tb; sell+=Math.max(0,q-tb); }
  return buy-sell;
}
function livePnl(t,p){ return (t.side==="LONG"?1:-1)*(p-t.entry)*t.qty; }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function quantile(arr,q){
  if(!arr.length) return null;
  const a=[...arr].sort((x,y)=>x-y), pos=(a.length-1)*q, lo=Math.floor(pos), hi=Math.ceil(pos);
  return lo===hi?a[lo]:a[lo]+(a[hi]-a[lo])*(pos-lo);
}
function learnedGivebackCap(){
  // Learn from capture-efficient winners, not from historically poor exits.
  const winners=state.closed.filter(t=>num(t.pnl)>0 && num(t.mfePnl)>0 && Number.isFinite(num(t.givebackPct,NaN))).slice(0,100);
  const efficient=winners.filter(t=>num(t.capturePct,100-num(t.givebackPct))>=50);
  const source=efficient.length>=12?efficient:winners;
  const samples=source.map(t=>num(t.givebackPct));
  if(samples.length<12) return {cap:null,samples:samples.length,efficientSamples:efficient.length};
  return {cap:clamp(quantile(samples,0.5),20,40),samples:samples.length,efficientSamples:efficient.length};
}
function trailingGivebackLimit(mfePct){
  let base=50;
  if(mfePct>=3) base=20;
  else if(mfePct>=2) base=25;
  else if(mfePct>=1) base=35;
  else if(mfePct>=0.5) base=45;
  const learned=learnedGivebackCap();
  return {limit:learned.cap==null?base:Math.min(base,learned.cap),base,learnedCap:learned.cap,samples:learned.samples,efficientSamples:learned.efficientSamples||0};
}

async function scanBinance(){
  const tickers=await j("https://api.binance.com/api/v3/ticker/24hr");
    const tops=tickers.filter(x=>eligible(x.symbol)&&num(x.quoteVolume)>0)
      .sort((a,b)=>num(b.quoteVolume)-num(a.quoteVolume)).slice(0,SCAN_COUNT);
    const rows=[];
    for(let i=0;i<tops.length;i+=6){
      const batch=tops.slice(i,i+6);
      const got=await Promise.all(batch.map(async t=>{
        try{
          const k=await j("https://api.binance.com/api/v3/klines?symbol="+encodeURIComponent(t.symbol)+"&interval=1m&limit=20");
          const f1=flow(k,1),f5=flow(k,5),f15=flow(k,15);
          const best=[f1,f5,f15].sort((a,b)=>Math.abs(b)-Math.abs(a))[0]||0;
          return {symbol:t.symbol,price:num(t.lastPrice),netFlow:best,flowMagnitudeUsd:Math.abs(best),side:best>=0?"LONG":"SHORT"};
        }catch{return null;}
      }));
      rows.push(...got.filter(Boolean));
    }
    return rows;
}

async function scanOkx(){
  const r=await fetch("https://www.okx.com/api/v5/market/tickers?instType=SPOT",{headers:{"user-agent":"Mozilla/5.0 ALI-Flow-Radar"}});
  if(!r.ok) throw new Error("OKX "+r.status);
  const payload=await r.json();
  const tops=(payload.data||[])
    .filter(x=>/^[A-Z0-9]+-USDT$/.test(x.instId)&&eligible(x.instId.replace("-",""))&&num(x.volCcy24h)>0&&num(x.last)>0)
    .sort((a,b)=>num(b.volCcy24h)-num(a.volCcy24h))
    .slice(0,20);
  const rows=[];
  for(let i=0;i<tops.length;i+=5){
    const batch=tops.slice(i,i+5);
    const got=await Promise.all(batch.map(async t=>{
      try{
        const tr=await fetch("https://www.okx.com/api/v5/market/trades?instId="+encodeURIComponent(t.instId)+"&limit=100",
          {headers:{"user-agent":"Mozilla/5.0 ALI-Flow-Radar"}});
        if(!tr.ok) return null;
        const p=await tr.json();
        let net=0;
        for(const x of (p.data||[])){
          const notional=num(x.px)*num(x.sz);
          net += String(x.side).toLowerCase()==="buy" ? notional : -notional;
        }
        const symbol=t.instId.replace("-","");
        return {symbol,price:num(t.last),netFlow:net,flowMagnitudeUsd:Math.abs(net),side:net>=0?"LONG":"SHORT"};
      }catch{return null;}
    }));
    rows.push(...got.filter(Boolean));
  }
  const have=new Set(rows.map(x=>x.symbol));
  for(const t of state.open){
    if(have.has(t.symbol)) continue;
    const inst=t.symbol.replace(/USDT$/,"-USDT");
    const q=(payload.data||[]).find(x=>x.instId===inst);
    if(q&&num(q.last)>0) rows.push({symbol:t.symbol,price:num(q.last),netFlow:0,flowMagnitudeUsd:0,side:t.side,priceOnly:true});
  }
  return rows;
}

async function applyRows(rows, provider){
    state.provider=provider;
    const flowRows=rows.filter(x=>!x.priceOnly);
    state.candidates=flowRows.sort((a,b)=>b.flowMagnitudeUsd-a.flowMagnitudeUsd).slice(0,20);
    state.lastScanAt=Date.now(); state.lastError=null;
    console.log("[SERVER_DEMO_SCAN]", JSON.stringify({at:state.lastScanAt,provider,candidates:state.candidates.length,eligible:state.candidates.filter(x=>x.flowMagnitudeUsd>=DEMO_ENTRY_FLOW_USD).length,top:state.candidates.slice(0,3).map(x=>({s:x.symbol,f:Math.round(x.netFlow),side:x.side}))}));
    const prices=Object.fromEntries(rows.map(x=>[x.symbol,x.price]));
    const flowBySymbol=Object.fromEntries(flowRows.map(x=>[x.symbol,x]));
    for(const t of [...state.open]){
      const p=prices[t.symbol]||t.current||t.entry; t.current=p;
      const pnl=livePnl(t,p);
      t.mfePnl=Math.max(num(t.mfePnl),pnl);
      t.maePnl=Math.min(num(t.maePnl),pnl);

      const f=flowBySymbol[t.symbol];
      const opposite=!!(f && f.flowMagnitudeUsd>=DEMO_ENTRY_FLOW_USD && f.side!==t.side);
      t.oppositeFlowScans=opposite ? num(t.oppositeFlowScans)+1 : 0;
      if(opposite) t.maxOppositeFlowUsd=Math.max(num(t.maxOppositeFlowUsd),num(f.flowMagnitudeUsd));

      const mfe=Math.max(0,num(t.mfePnl));
      const mfePct=t.marginUsed ? (mfe/t.marginUsed)*100 : 0;
      const givebackPct=mfe>0 ? Math.max(0,((mfe-pnl)/mfe)*100) : 0;
      const trail=trailingGivebackLimit(mfePct);
      const flowGivebackLimit=Math.max(15,trail.limit-10);

      let reason=null;
      // Absolute priority: catastrophic protection.
      if(t.side==="LONG" && p<=t.stop) reason="HARD_STOP";
      else if(t.side==="SHORT" && p>=t.stop) reason="HARD_STOP";
      // Full target remains valid.
      else if(t.side==="LONG" && p>=t.tp3) reason="TP3";
      else if(t.side==="SHORT" && p<=t.tp3) reason="TP3";
      // Never let a meaningful winner become a loser.
      else if(mfePct>=1.0 && pnl<=0) reason="BREAKEVEN_PROTECT";
      // Persistent opposite flow tightens the allowed MFE giveback by another 10 points.
      else if(pnl>0 && mfePct>=0.5 && givebackPct>=flowGivebackLimit && t.oppositeFlowScans>=2) reason="PROFIT_PROTECT_FLOW";
      // A strong reversal in aggregate flow gets one-scan authority once a trade has meaningful MFE.
      else if(pnl>0 && mfePct>=0.75 && givebackPct>=20 && opposite && num(f.flowMagnitudeUsd)>=Math.max(50000,Math.abs(num(t.netMoneyFlowUsd))*1.5)) reason="PROFIT_PROTECT_FLOW_STRONG";
      // Adaptive MFE trailing: stronger winners are allowed progressively less profit giveback.
      else if(pnl>0 && mfePct>=0.5 && givebackPct>=trail.limit) reason="TRAILING_PROFIT_ADAPTIVE";

      if(reason){
        t.exit=p;t.pnl=pnl;t.exitReason=reason;t.closedAt=Date.now();
        t.givebackPct=givebackPct;t.mfePct=mfePct;t.capturePct=mfe>0?Math.max(0,(pnl/mfe)*100):0;
        t.exitLearning={trailLimitPct:trail.limit,baseTrailLimitPct:trail.base,learnedGivebackCapPct:trail.learnedCap,learningSamples:trail.samples,efficientLearningSamples:trail.efficientSamples,flowGivebackLimitPct:flowGivebackLimit};
        state.closedPnl+=pnl; state.balance=START_BALANCE+state.closedPnl;
        state.closed.unshift(t); state.closed=state.closed.slice(0,500);
        state.open=state.open.filter(x=>x.id!==t.id);
        console.log("[SERVER_DEMO_CLOSE]", JSON.stringify({
          symbol:t.symbol,side:t.side,pnl:+pnl.toFixed(2),reason,
          mfePct:+mfePct.toFixed(2),givebackPct:+givebackPct.toFixed(1),capturePct:+t.capturePct.toFixed(1),
          trailLimitPct:+trail.limit.toFixed(1),learnedGivebackCapPct:trail.learnedCap==null?null:+trail.learnedCap.toFixed(1),learningSamples:trail.samples,efficientLearningSamples:trail.efficientSamples,
          oppositeFlowScans:t.oppositeFlowScans,maxOppositeFlowUsd:Math.round(num(t.maxOppositeFlowUsd))
        }));
      }
    }

    const openSyms=new Set(state.open.map(x=>x.symbol));
    for(const x of state.candidates){
      if(state.open.length>=MAX_OPEN) break;
      if(x.flowMagnitudeUsd<DEMO_ENTRY_FLOW_USD||openSyms.has(x.symbol)||!x.price) continue;
      const risk=x.price*0.004;
      const leverage=Math.min(10,Math.max(2,x.flowMagnitudeUsd>=200000?10:x.flowMagnitudeUsd>=50000?7:x.flowMagnitudeUsd>=10000?5:3));
      const margin=Math.max(10,state.balance/MAX_OPEN);
      const qty=margin*leverage/x.price;
      const t={id:x.symbol+"-"+Date.now(),symbol:x.symbol,side:x.side,entry:x.price,current:x.price,
        leverage,marginUsed:margin,qty,netMoneyFlowUsd:x.netFlow,provider,openedAt:Date.now(),mfePnl:0,maePnl:0,oppositeFlowScans:0,maxOppositeFlowUsd:0,
        stop:x.side==="LONG"?x.price-risk:x.price+risk,
        tp3:x.side==="LONG"?x.price+risk*3:x.price-risk*3};
      state.open.push(t);openSyms.add(x.symbol);
      console.log("[SERVER_DEMO_OPEN]", JSON.stringify({provider,symbol:t.symbol,side:t.side,entry:t.entry,flow:Math.round(t.netMoneyFlowUsd),leverage:t.leverage}));
    }

    await persistState();
    const rep=snapshot().report;
    console.log("[SERVER_DEMO_REPORT]", JSON.stringify({
      at:state.lastScanAt,provider:rep.provider,
      startingBalance:+rep.startingBalance.toFixed(2),
      realizedPnl:+rep.realizedPnl.toFixed(2),
      unrealizedPnl:+rep.unrealizedPnl.toFixed(2),
      netPnl:+rep.netPnl.toFixed(2),
      equity:+rep.equity.toFixed(2),
      returnPct:+rep.returnPct.toFixed(3),
      openTrades:rep.openTrades,closedTrades:rep.closedTrades,
      wins:rep.wins,losses:rep.losses,
      winRate:rep.winRate==null?null:+rep.winRate.toFixed(2)
    }));
}

async function scan(){
  try{
    let rows=null;
    try{
      rows=await scanBinance();
      await applyRows(rows,"BINANCE");
      return;
    }catch(e){
      console.warn("[SERVER_DEMO_PROVIDER_FAIL] BINANCE",String(e&&e.message||e));
    }
    rows=await scanOkx();
    await applyRows(rows,"OKX");
  }catch(e){
    state.lastError=String(e&&e.message||e); state.lastScanAt=Date.now();
    console.error("[SERVER_DEMO_ERROR]",state.lastError);
  }
}
function snapshot(){
  const openPositions=state.open.map(t=>{
    const current=num(t.current,t.entry);
    const pnlUsd=livePnl(t,current);
    const pnlPct=t.marginUsed ? (pnlUsd/t.marginUsed)*100 : 0;
    return {...t,pnlUsd,pnlPct,
      mfePct:t.marginUsed?(num(t.mfePnl)/t.marginUsed)*100:0,
      maePct:t.marginUsed?(num(t.maePnl)/t.marginUsed)*100:0};
  });
  const openPnl=openPositions.reduce((s,t)=>s+num(t.pnlUsd),0);
  const wins=state.closed.filter(t=>num(t.pnl)>0).length, losses=state.closed.filter(t=>num(t.pnl)<0).length;
  const grossProfit=state.closed.filter(t=>num(t.pnl)>0).reduce((s,t)=>s+num(t.pnl),0);
  const grossLoss=state.closed.filter(t=>num(t.pnl)<0).reduce((s,t)=>s+num(t.pnl),0);
  const equity=state.balance+openPnl, netPnl=state.closedPnl+openPnl;
  return {...state,open:openPositions,openPnl,equity,netPnl,
    report:{startingBalance:START_BALANCE,realizedPnl:state.closedPnl,unrealizedPnl:openPnl,netPnl,equity,
      returnPct:(netPnl/START_BALANCE)*100,grossProfit,grossLoss,
      openTrades:openPositions.length,closedTrades:state.closed.length,wins,losses,
      winRate:state.closed.length?wins/state.closed.length*100:null,lastScanAt:state.lastScanAt,provider:state.provider},
    summary:{openTrades:openPositions.length,closedTrades:state.closed.length,wins,losses,winRate:state.closed.length?wins/state.closed.length*100:null}};
}
let timer=null;
async function start(){ if(timer)return; await initPersistence(); await scan(); timer=setInterval(scan,SCAN_MS); }
module.exports={start,snapshot,scan};
