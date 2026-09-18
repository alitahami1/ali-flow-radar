"use strict";

const DEMO_ENTRY_FLOW_USD = 1000;
const MAX_OPEN = 10;
const SCAN_COUNT = 30;
const SCAN_MS = 10000;
const START_BALANCE = 10000;

const state = {
  startedAt: Date.now(), lastScanAt: 0, lastError: null,
  balance: START_BALANCE, closedPnl: 0, open: [], closed: [], candidates: []
};

const num = (v,d=0) => Number.isFinite(Number(v)) ? Number(v) : d;
const eligible = s => s && s.endsWith("USDT") && !/(USDC|FDUSD|TUSD|USDP|DAI|BUSD|PAXG)USDT$/.test(s);

async function j(url){
  const r=await fetch(url,{headers:{"user-agent":"ALI-Flow-Radar/5.16"}});
  if(!r.ok) throw new Error("Binance "+r.status);
  return r.json();
}
function flow(rows,n){
  const a=(rows||[]).slice(-n); let buy=0,sell=0;
  for(const r of a){ const q=num(r[7]); const tb=num(r[10]); buy+=tb; sell+=Math.max(0,q-tb); }
  return buy-sell;
}
function livePnl(t,p){ return (t.side==="LONG"?1:-1)*(p-t.entry)*t.qty; }

async function scan(){
  try{
    const tickers=await j("https://data-api.binance.vision/api/v3/ticker/24hr");
    const tops=tickers.filter(x=>eligible(x.symbol)&&num(x.quoteVolume)>0)
      .sort((a,b)=>num(b.quoteVolume)-num(a.quoteVolume)).slice(0,SCAN_COUNT);
    const rows=[];
    for(let i=0;i<tops.length;i+=6){
      const batch=tops.slice(i,i+6);
      const got=await Promise.all(batch.map(async t=>{
        try{
          const k=await j("https://data-api.binance.vision/api/v3/klines?symbol="+encodeURIComponent(t.symbol)+"&interval=1m&limit=20");
          const f1=flow(k,1),f5=flow(k,5),f15=flow(k,15);
          const best=[f1,f5,f15].sort((a,b)=>Math.abs(b)-Math.abs(a))[0]||0;
          return {symbol:t.symbol,price:num(t.lastPrice),netFlow:best,flowMagnitudeUsd:Math.abs(best),side:best>=0?"LONG":"SHORT"};
        }catch{return null;}
      }));
      rows.push(...got.filter(Boolean));
    }
    state.candidates=rows.sort((a,b)=>b.flowMagnitudeUsd-a.flowMagnitudeUsd).slice(0,20);
    state.lastScanAt=Date.now(); state.lastError=null;

    const prices=Object.fromEntries(rows.map(x=>[x.symbol,x.price]));
    for(const t of [...state.open]){
      const p=prices[t.symbol]||t.current||t.entry; t.current=p;
      const pnl=livePnl(t,p); t.mfePnl=Math.max(num(t.mfePnl),pnl); t.maePnl=Math.min(num(t.maePnl),pnl);
      let reason=null;
      if(t.side==="LONG" && p<=t.stop) reason="HARD_STOP";
      if(t.side==="SHORT" && p>=t.stop) reason="HARD_STOP";
      if(t.side==="LONG" && p>=t.tp3) reason="TP3";
      if(t.side==="SHORT" && p<=t.tp3) reason="TP3";
      if(reason){
        t.exit=p;t.pnl=pnl;t.exitReason=reason;t.closedAt=Date.now();
        state.closedPnl+=pnl; state.balance=START_BALANCE+state.closedPnl;
        state.closed.unshift(t); state.closed=state.closed.slice(0,500);
        state.open=state.open.filter(x=>x.id!==t.id);
      }
    }

    const openSyms=new Set(state.open.map(x=>x.symbol));
    for(const x of state.candidates){
      if(state.open.length>=MAX_OPEN) break;
      if(x.flowMagnitudeUsd<DEMO_ENTRY_FLOW_USD||openSyms.has(x.symbol)||!x.price) continue;
      const risk=Math.max(x.price*0.0025,x.price*0.004);
      const leverage=Math.min(10,Math.max(2,x.flowMagnitudeUsd>=200000?10:x.flowMagnitudeUsd>=50000?7:x.flowMagnitudeUsd>=10000?5:3));
      const margin=Math.max(10,state.balance/MAX_OPEN);
      const qty=margin*leverage/x.price;
      const t={id:x.symbol+"-"+Date.now(),symbol:x.symbol,side:x.side,entry:x.price,current:x.price,
        leverage,marginUsed:margin,qty,netMoneyFlowUsd:x.netFlow,openedAt:Date.now(),mfePnl:0,maePnl:0,
        stop:x.side==="LONG"?x.price-risk:x.price+risk,
        tp3:x.side==="LONG"?x.price+risk*3:x.price-risk*3};
      state.open.push(t);openSyms.add(x.symbol);
    }
  }catch(e){ state.lastError=String(e&&e.message||e); state.lastScanAt=Date.now(); }
}
function snapshot(){
  const openPnl=state.open.reduce((s,t)=>s+livePnl(t,num(t.current,t.entry)),0);
  const wins=state.closed.filter(t=>num(t.pnl)>0).length, losses=state.closed.filter(t=>num(t.pnl)<0).length;
  return {...state,openPnl,equity:state.balance+openPnl,netPnl:state.closedPnl+openPnl,
    summary:{openTrades:state.open.length,closedTrades:state.closed.length,wins,losses,winRate:state.closed.length?wins/state.closed.length*100:null}};
}
let timer=null;
function start(){ if(timer)return; scan(); timer=setInterval(scan,SCAN_MS); }
module.exports={start,snapshot,scan};
