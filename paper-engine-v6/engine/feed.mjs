import {technical} from './core.mjs';
const base='https://data-api.binance.vision/api/v3';
async function get(path){const r=await fetch(base+path,{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Binance HTTP '+r.status);return r.json();}
export async function collect(state){
 const ticker=await get('/ticker/24hr');if(!Array.isArray(ticker))throw Error('Invalid market response');
 const ranked=ticker.filter(t=>/^[A-Z0-9]+USDT$/.test(t.symbol)&&! /^(USDC|FDUSD|TUSD|DAI|USDP|EUR|USDE|USD1)USDT$/.test(t.symbol)&&Number(t.quoteVolume)>1000000&&Date.now()-t.closeTime<20000).sort((a,b)=>Number(b.quoteVolume)-Number(a.quoteVolume));
 const symbols=[...new Set([...state.positions.map(p=>p.symbol),...ranked.slice(0,20).map(t=>t.symbol)])];
 const out=[];const errors=[];
 for(let i=0;i<symbols.length;i+=5){await Promise.all(symbols.slice(i,i+5).map(async symbol=>{
  try{
   const bars=await get('/klines?symbol='+symbol+'&interval=1m&limit=100');
   if(!Array.isArray(bars))throw Error('Invalid bars');
   const now=Date.now(),done=bars.filter(b=>Number(b[6])<now),last=done.at(-1),current=bars.at(-1);
   if(!last||done.length<50||now-Number(last[6])>90000)throw Error('Stale candles');
   const window=done.slice(-5);
   if(window.some((b,j)=>j&&Number(b[0])-Number(window[j-1][0])!==60000))throw Error('Incomplete flow window');
   const fresh=ticker.find(t=>t.symbol===symbol);
   if(!fresh||now-Number(fresh.closeTime)>20000)throw Error('Stale trade quote');
   out.push({symbol,price:Number(fresh.lastPrice),priceAt:Number(fresh.closeTime),asOf:Number(last[6]),flow:window.reduce((sum,b)=>sum+2*Number(b[10])-Number(b[7]),0),technical:technical(done)});
  }catch(e){errors.push(symbol+': '+e.message);}
 }));}
 return {markets:out,errors};
}
