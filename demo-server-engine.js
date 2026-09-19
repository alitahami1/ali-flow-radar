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
      for(const k of ["startedAt","lastScanAt","lastError","provider","balance","closedPnl","totalClosed","totalWins","totalLosses","open","closed","candidates","flowHistory"]) if(s[k]!==undefined) state[k]=s[k];
      // Backward-compatible migration: old persisted state had only the rolling closed[] window.
      if(s.totalClosed===undefined){ state.totalClosed=state.closed.length; state.totalWins=state.closed.filter(t=>num(t.pnl)>0).length; state.totalLosses=state.closed.filter(t=>num(t.pnl)<0).length; }
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
const MAX_OPEN_PER_STRATEGY = 10;
const PA_MIN_SCORE = 3;
const INDICATOR_MIN_SCORE = 2;
const SCAN_COUNT = 30;
const SCAN_MS = 10000;
const START_BALANCE = 10000;
const REENTRY_COOLDOWN_MS = 120000;
const WEAK_FLOW_USD = 10000;
const BINANCE_FAIL_COOLDOWN_MS = 5*60*1000;
const FLOW_HISTORY_LIMIT = 90;
let binanceCooldownUntil=0;
let binanceConsecutiveFails=0;

const state = {
  startedAt: Date.now(), lastScanAt: 0, lastError: null, provider: null,
  balance: START_BALANCE, closedPnl: 0, totalClosed: 0, totalWins: 0, totalLosses: 0, open: [], closed: [], candidates: [], flowHistory: {}
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
function ema(values,period){
  if(!values.length) return 0;
  const k=2/(period+1); let e=values[0];
  for(let i=1;i<values.length;i++) e=values[i]*k+e*(1-k);
  return e;
}
function priceActionSignal(candles){
  if(!Array.isArray(candles)||candles.length<20) return {side:null,bull:0,bear:0,conditions:[],features:{}};
  const a=candles.slice(-20).map(k=>({o:num(k.o),h:num(k.h),l:num(k.l),c:num(k.c)}));
  const last=a[a.length-1], prev=a[a.length-2], p2=a[a.length-3], prior=a.slice(0,-1);
  const closes=a.map(x=>x.c), e5=ema(closes,5), e10=ema(closes,10);
  const range=Math.max(1e-12,last.h-last.l), body=Math.abs(last.c-last.o);
  const upperWick=last.h-Math.max(last.o,last.c), lowerWick=Math.min(last.o,last.c)-last.l;
  const lookback=prior.slice(-10), hi=Math.max(...lookback.map(x=>x.h)), lo=Math.min(...lookback.map(x=>x.l));
  const span=Math.max(1e-12,hi-lo), zone=Math.max(span*0.035,last.c*0.0015);
  const nearSupport=Math.abs(last.l-lo)<=zone || Math.abs(last.c-lo)<=zone;
  const nearResistance=Math.abs(last.h-hi)<=zone || Math.abs(last.c-hi)<=zone;
  const supportTouches=lookback.filter(x=>Math.abs(x.l-lo)<=zone).length;
  const resistanceTouches=lookback.filter(x=>Math.abs(x.h-hi)<=zone).length;
  const bull=[],bear=[],features={};

  const add=(side,name,detail={})=>{ (side==="LONG"?bull:bear).push(name); features[name]={side,...detail}; };

  // Candle anatomy and classic single/multi-candle patterns.
  if(last.c>last.o && body/range>=0.6) add("LONG","MOMENTUM_BULL",{bodyRatio:body/range});
  if(last.c<last.o && body/range>=0.6) add("SHORT","MOMENTUM_BEAR",{bodyRatio:body/range});
  if(lowerWick/range>=0.45 && last.c>last.o) add("LONG","LOWER_WICK_REJECTION",{wickRatio:lowerWick/range});
  if(upperWick/range>=0.45 && last.c<last.o) add("SHORT","UPPER_WICK_REJECTION",{wickRatio:upperWick/range});
  if(last.c>last.o && prev.c<prev.o && last.o<=prev.c && last.c>=prev.o) add("LONG","BULLISH_ENGULFING");
  if(last.c<last.o && prev.c>prev.o && last.o>=prev.c && last.c<=prev.o) add("SHORT","BEARISH_ENGULFING");
  if(last.h<prev.h && last.l>prev.l) features.INSIDE_BAR={side:null};
  if(last.h>prev.h && last.l<prev.l) features.OUTSIDE_BAR={side:null};

  // Market structure and short trend.
  if(last.h>prev.h && last.l>prev.l) add("LONG","STRUCTURE_HH_HL");
  if(last.h<prev.h && last.l<prev.l) add("SHORT","STRUCTURE_LH_LL");
  if(e5>e10 && last.c>e5) add("LONG","TREND_UP",{ema5:e5,ema10:e10});
  if(e5<e10 && last.c<e5) add("SHORT","TREND_DOWN",{ema5:e5,ema10:e10});
  if(last.h>prev.h && prev.h>p2.h && last.l>prev.l && prev.l>p2.l) add("LONG","MULTI_CANDLE_UP_3");
  if(last.h<prev.h && prev.h<p2.h && last.l<prev.l && prev.l<p2.l) add("SHORT","MULTI_CANDLE_DOWN_3");

  // Support/resistance zones, touches and reactions.
  features.SUPPORT_ZONE={side:null,level:lo,touches:supportTouches,distancePct:Math.abs(last.c-lo)/Math.max(last.c,1e-12)*100};
  features.RESISTANCE_ZONE={side:null,level:hi,touches:resistanceTouches,distancePct:Math.abs(last.c-hi)/Math.max(last.c,1e-12)*100};
  if(nearSupport && lowerWick/range>=0.30 && last.c>last.o) add("LONG","SUPPORT_REACTION",{level:lo,touches:supportTouches});
  if(nearResistance && upperWick/range>=0.30 && last.c<last.o) add("SHORT","RESISTANCE_REACTION",{level:hi,touches:resistanceTouches});

  // Breakout, false breakout/liquidity sweep and immediate retest behavior.
  if(last.c>hi) add("LONG","BREAKOUT_HIGH",{level:hi});
  if(last.c<lo) add("SHORT","BREAKOUT_LOW",{level:lo});
  if(last.h>hi && last.c<hi) add("SHORT","FALSE_BREAKOUT_HIGH",{level:hi});
  if(last.l<lo && last.c>lo) add("LONG","FALSE_BREAKOUT_LOW",{level:lo});
  if(prev.c>hi && last.l<=hi+zone && last.c>hi) add("LONG","RETEST_BROKEN_RESISTANCE",{level:hi});
  if(prev.c<lo && last.h>=lo-zone && last.c<lo) add("SHORT","RETEST_BROKEN_SUPPORT",{level:lo});

  // Fibonacci retracement context from the recent 10-candle range. It is confirmation, never a standalone direction.
  const fib382=hi-span*0.382, fib50=hi-span*0.5, fib618=hi-span*0.618;
  const fibTol=Math.max(span*0.025,last.c*0.001);
  const fibLevels=[["FIB_382",fib382],["FIB_500",fib50],["FIB_618",fib618]];
  for(const [name,level] of fibLevels){
    if(Math.abs(last.c-level)<=fibTol) features[name]={side:null,level,distancePct:Math.abs(last.c-level)/Math.max(last.c,1e-12)*100};
  }
  const fibConfirm=Object.keys(features).filter(k=>k.startsWith("FIB_"));
  if(fibConfirm.length && e5>e10 && last.c>last.o) add("LONG","FIB_TREND_REACTION",{levels:fibConfirm});
  if(fibConfirm.length && e5<e10 && last.c<last.o) add("SHORT","FIB_TREND_REACTION",{levels:fibConfirm});

  const side=bull.length>=PA_MIN_SCORE && bull.length>bear.length?"LONG":bear.length>=PA_MIN_SCORE && bear.length>bull.length?"SHORT":null;
  return {side,bull:bull.length,bear:bear.length,conditions:side==="LONG"?bull:side==="SHORT"?bear:[],allBull:bull,allBear:bear,features,
    context:{support:lo,resistance:hi,supportTouches,resistanceTouches,fib382,fib50,fib618,ema5:e5,ema10:e10}};
}
function indicatorSignal(candles){
  if(!Array.isArray(candles)||candles.length<20) return {side:null,bull:0,bear:0,conditions:[]};
  const a=candles.slice(-20).map(k=>({o:num(k.o),h:num(k.h),l:num(k.l),c:num(k.c)}));
  const closes=a.map(x=>x.c), last=closes[closes.length-1];
  const e5=ema(closes,5), e10=ema(closes,10);
  const gains=[],losses=[];
  for(let i=1;i<closes.length;i++){const d=closes[i]-closes[i-1];gains.push(Math.max(0,d));losses.push(Math.max(0,-d));}
  const ag=gains.slice(-14).reduce((s,x)=>s+x,0)/14, al=losses.slice(-14).reduce((s,x)=>s+x,0)/14;
  const rsi=al===0?100:100-(100/(1+ag/al));
  const macd=ema(closes,12)-ema(closes,20);
  const bull=[],bear=[];
  if(e5>e10 && last>e5) bull.push("EMA_TREND_UP");
  if(e5<e10 && last<e5) bear.push("EMA_TREND_DOWN");
  if(rsi>=52 && rsi<75) bull.push("RSI_BULL");
  if(rsi<=48 && rsi>25) bear.push("RSI_BEAR");
  if(macd>0) bull.push("MACD_POSITIVE");
  if(macd<0) bear.push("MACD_NEGATIVE");
  const side=bull.length>=INDICATOR_MIN_SCORE&&bull.length>bear.length?"LONG":bear.length>=INDICATOR_MIN_SCORE&&bear.length>bull.length?"SHORT":null;
  return {side,bull:bull.length,bear:bear.length,conditions:side==="LONG"?bull:side==="SHORT"?bear:[],rsi:+rsi.toFixed(2),macd};
}
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
function lastClosedFor(symbol,strategy){ return state.closed.find(t=>t.symbol===symbol && (!strategy||t.strategy===strategy))||null; }
function entryMistakeTags(x,strategy){
  const tags=[]; const prev=lastClosedFor(x.symbol,strategy); const now=Date.now();
  if(prev && now-num(prev.closedAt)>0 && now-num(prev.closedAt)<REENTRY_COOLDOWN_MS) tags.push("REENTRY_TOO_SOON");
  if(num(x.flowMagnitudeUsd)<WEAK_FLOW_USD) tags.push("WEAK_FLOW_ENTRY");
  return tags;
}
function exitMistakeTags(t,{givebackPct,mfePct,opposite}){
  const tags=[];
  if(mfePct>=0.5 && givebackPct>=60) tags.push("LATE_EXIT");
  if(opposite && num(t.oppositeFlowScans)>=2 && givebackPct>=35) tags.push("FLOW_REVERSAL_IGNORED");
  if(num(t.mfePnl)>0 && num(t.pnl)<0) tags.push("WINNER_TURNED_LOSER");
  return tags;
}
function mistakeSummary(){
  const out={};
  for(const t of state.closed){
    for(const tag of (t.mistakeTags||[])){
      if(!out[tag]) out[tag]={count:0,pnl:0,wins:0,losses:0};
      out[tag].count++; out[tag].pnl+=num(t.pnl); if(num(t.pnl)>0)out[tag].wins++; else if(num(t.pnl)<0)out[tag].losses++;
    }
  }
  return out;
}
function priceActionFeatureStats(){
  const out={};
  for(const t of state.closed){
    if(!(t.strategy||"").includes("PRICE_ACTION")) continue;
    const pa=t.signalDetail&&t.signalDetail.priceAction?t.signalDetail.priceAction:
      (t.strategy==="PRICE_ACTION"&&t.signalDetail?{conditions:t.signalDetail.conditions,features:t.signalDetail.features}:null);
    if(!pa) continue;
    const names=new Set([...(pa.conditions||[]),...Object.keys(pa.features||{})]);
    for(const name of names){
      if(!out[name]) out[name]={trades:0,wins:0,losses:0,pnl:0,grossProfit:0,grossLoss:0};
      const s=out[name], p=num(t.pnl); s.trades++; s.pnl+=p;
      if(p>0){s.wins++;s.grossProfit+=p;} else if(p<0){s.losses++;s.grossLoss+=Math.abs(p);}
    }
  }
  for(const s of Object.values(out)){
    s.winRate=s.trades?s.wins/s.trades*100:null;
    s.expectancy=s.trades?s.pnl/s.trades:null;
    s.profitFactor=s.grossLoss?s.grossProfit/s.grossLoss:(s.grossProfit>0?null:0);
  }
  return out;
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
          const candles=k.map(z=>({o:z[1],h:z[2],l:z[3],c:z[4]}));
          const pa=priceActionSignal(candles), indicators=indicatorSignal(candles);
          return {symbol:t.symbol,price:num(t.lastPrice),netFlow:best,flowMagnitudeUsd:Math.abs(best),side:best>=0?"LONG":"SHORT",pa,indicators};
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
        let pa={side:null,bull:0,bear:0,conditions:[]}, indicators={side:null,bull:0,bear:0,conditions:[]};
        try{
          const cr=await fetch("https://www.okx.com/api/v5/market/candles?instId="+encodeURIComponent(t.instId)+"&bar=1m&limit=20",{headers:{"user-agent":"Mozilla/5.0 ALI-Flow-Radar"}});
          if(cr.ok){ const cp=await cr.json(); const candles=(cp.data||[]).slice().reverse().map(z=>({o:z[1],h:z[2],l:z[3],c:z[4]})); pa=priceActionSignal(candles); indicators=indicatorSignal(candles); }
        }catch{}
        return {symbol,price:num(t.last),netFlow:net,flowMagnitudeUsd:Math.abs(net),side:net>=0?"LONG":"SHORT",pa,indicators};
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
    // Observation-only order-flow memory: rolling aggregate delta/CVD proxy. It does NOT gate Demo entries.
    const now=Date.now();
    if(!state.flowHistory || typeof state.flowHistory!=="object") state.flowHistory={};
    for(const x of flowRows){
      const h=Array.isArray(state.flowHistory[x.symbol])?state.flowHistory[x.symbol]:[];
      h.push({at:now,netFlow:num(x.netFlow),price:num(x.price)});
      state.flowHistory[x.symbol]=h.slice(-FLOW_HISTORY_LIMIT);
      const recent=state.flowHistory[x.symbol];
      x.cvdProxyUsd=recent.reduce((s,z)=>s+num(z.netFlow),0);
      x.flowPersistence=recent.length?Math.abs(recent.reduce((s,z)=>s+(Math.sign(num(z.netFlow))===Math.sign(num(x.netFlow))?1:0),0)/recent.length):0;
    }
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
        t.mistakeTags=[...(t.entryMistakeTags||[]),...exitMistakeTags(t,{givebackPct,mfePct,opposite})];
        t.givebackPct=givebackPct;t.mfePct=mfePct;t.capturePct=mfe>0?Math.max(0,(pnl/mfe)*100):0;
        t.exitLearning={trailLimitPct:trail.limit,baseTrailLimitPct:trail.base,learnedGivebackCapPct:trail.learnedCap,learningSamples:trail.samples,efficientLearningSamples:trail.efficientSamples,flowGivebackLimitPct:flowGivebackLimit};
        state.closedPnl+=pnl; state.balance=START_BALANCE+state.closedPnl;
        state.totalClosed=num(state.totalClosed)+1;
        if(pnl>0) state.totalWins=num(state.totalWins)+1; else if(pnl<0) state.totalLosses=num(state.totalLosses)+1;
        state.closed.unshift(t); state.closed=state.closed.slice(0,500);
        state.open=state.open.filter(x=>x.id!==t.id);
        console.log("[SERVER_DEMO_CLOSE]", JSON.stringify({
          symbol:t.symbol,strategy:t.strategy||"FLOW",side:t.side,pnl:+pnl.toFixed(2),reason,
          mfePct:+mfePct.toFixed(2),givebackPct:+givebackPct.toFixed(1),capturePct:+t.capturePct.toFixed(1),
          trailLimitPct:+trail.limit.toFixed(1),learnedGivebackCapPct:trail.learnedCap==null?null:+trail.learnedCap.toFixed(1),learningSamples:trail.samples,efficientLearningSamples:trail.efficientSamples,
          oppositeFlowScans:t.oppositeFlowScans,maxOppositeFlowUsd:Math.round(num(t.maxOppositeFlowUsd)),mistakeTags:t.mistakeTags
        }));
      }
    }

    // Four deliberately separate strategy cohorts for clean comparison.
    // If both fire on the same symbol, each opens its own independently tagged virtual trade.
    const openKeys=new Set(state.open.map(x=>x.symbol+"|"+(x.strategy||"FLOW")));
    const strategyOpenCount=strategy=>state.open.filter(t=>(t.strategy||"FLOW")===strategy).length;
    for(const x of state.candidates){
      const signals=[];
      if(x.flowMagnitudeUsd>=DEMO_ENTRY_FLOW_USD) signals.push({strategy:"FLOW",side:x.side,signalDetail:{netFlowUsd:x.netFlow}});
      if(x.pa&&x.pa.side) signals.push({strategy:"PRICE_ACTION",side:x.pa.side,signalDetail:{score:x.pa.side==="LONG"?x.pa.bull:x.pa.bear,conditions:x.pa.conditions,features:x.pa.features,context:x.pa.context}});
      if(x.pa&&x.pa.side && x.flowMagnitudeUsd>=DEMO_ENTRY_FLOW_USD && x.side===x.pa.side) signals.push({strategy:"FLOW_PRICE_ACTION",side:x.side,signalDetail:{netFlowUsd:x.netFlow,priceAction:x.pa}});
      if(x.pa&&x.pa.side && x.indicators&&x.indicators.side===x.pa.side) signals.push({strategy:"PRICE_ACTION_INDICATORS",side:x.pa.side,signalDetail:{priceAction:x.pa,indicators:x.indicators}});
      for(const sig of signals){
        if(strategyOpenCount(sig.strategy)>=MAX_OPEN_PER_STRATEGY) continue;
        const key=x.symbol+"|"+sig.strategy;
        if(openKeys.has(key)||!x.price) continue;
        const entryTags=entryMistakeTags(x,sig.strategy);
        if(entryTags.includes("REENTRY_TOO_SOON")) continue;
        const risk=x.price*0.004;
        const leverage=Math.min(10,Math.max(2,x.flowMagnitudeUsd>=200000?10:x.flowMagnitudeUsd>=50000?7:x.flowMagnitudeUsd>=10000?5:3));
        const margin=Math.max(10,state.balance/(MAX_OPEN_PER_STRATEGY*4));
        const qty=margin*leverage/x.price;
        const t={id:x.symbol+"-"+sig.strategy+"-"+Date.now(),symbol:x.symbol,strategy:sig.strategy,side:sig.side,entry:x.price,current:x.price,
          leverage,marginUsed:margin,qty,netMoneyFlowUsd:x.netFlow,signalDetail:sig.signalDetail,provider,openedAt:Date.now(),mfePnl:0,maePnl:0,oppositeFlowScans:0,maxOppositeFlowUsd:0,entryMistakeTags:entryTags,
          stop:sig.side==="LONG"?x.price-risk:x.price+risk,
          tp3:sig.side==="LONG"?x.price+risk*3:x.price-risk*3};
        state.open.push(t);openKeys.add(key);
        console.log("[SERVER_DEMO_OPEN]", JSON.stringify({provider,strategy:sig.strategy,symbol:t.symbol,side:t.side,entry:t.entry,flow:Math.round(t.netMoneyFlowUsd),priceAction:sig.strategy.includes("PRICE_ACTION")?sig.signalDetail:null,leverage:t.leverage}));
      }
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
    if(Date.now()>=binanceCooldownUntil){
      try{
        rows=await scanBinance();
        binanceConsecutiveFails=0;
        await applyRows(rows,"BINANCE");
        return;
      }catch(e){
        binanceConsecutiveFails++;
        const msg=String(e&&e.message||e);
        if(/418|429/.test(msg) && binanceConsecutiveFails>=2){
          binanceCooldownUntil=Date.now()+BINANCE_FAIL_COOLDOWN_MS;
          console.warn("[SERVER_DEMO_PROVIDER_COOLDOWN]",JSON.stringify({provider:"BINANCE",reason:msg,cooldownMs:BINANCE_FAIL_COOLDOWN_MS,until:binanceCooldownUntil}));
        }
        console.warn("[SERVER_DEMO_PROVIDER_FAIL] BINANCE",msg);
      }
    }
    rows=await scanOkx();
    await applyRows(rows,"OKX");
  }catch(e){
    state.lastError=String(e&&e.message||e); state.lastScanAt=Date.now();
    console.error("[SERVER_DEMO_ERROR]",state.lastError);
  }
}
function snapshot(){
  const strategyStats={};
  for(const strategy of ["FLOW","PRICE_ACTION","FLOW_PRICE_ACTION","PRICE_ACTION_INDICATORS"]){
    const trades=state.closed.filter(t=>(t.strategy||"FLOW")===strategy);
    const wins=trades.filter(t=>num(t.pnl)>0), losses=trades.filter(t=>num(t.pnl)<0);
    const pnl=trades.reduce((s,t)=>s+num(t.pnl),0);
    strategyStats[strategy]={closed:trades.length,wins:wins.length,losses:losses.length,winRate:trades.length?wins.length/trades.length*100:null,pnl,
      avgWin:wins.length?wins.reduce((s,t)=>s+num(t.pnl),0)/wins.length:null,
      avgLoss:losses.length?losses.reduce((s,t)=>s+num(t.pnl),0)/losses.length:null};
  }
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
      openTrades:openPositions.length,closedTrades:num(state.totalClosed),wins:num(state.totalWins),losses:num(state.totalLosses),
      winRate:num(state.totalClosed)?num(state.totalWins)/num(state.totalClosed)*100:null,lastScanAt:state.lastScanAt,provider:state.provider,mistakes:mistakeSummary(),strategyStats,priceActionFeatureStats:priceActionFeatureStats()},
    summary:{openTrades:openPositions.length,closedTrades:num(state.totalClosed),wins:num(state.totalWins),losses:num(state.totalLosses),winRate:num(state.totalClosed)?num(state.totalWins)/num(state.totalClosed)*100:null}};
}
let timer=null;
async function start(){ if(timer)return; await initPersistence(); await scan(); timer=setInterval(scan,SCAN_MS); }
module.exports={start,snapshot,scan};
