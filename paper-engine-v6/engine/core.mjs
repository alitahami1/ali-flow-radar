export const policy = Object.freeze({entryFlow:1000,exitFlow:1000,oppositeWindows:3,stopLoss:0.02,notional:100,maxPositions:10,fee:0.001,slippage:0.0005,windowMinutes:5});
export function initial(){return {enabled:true,createdAt:Date.now(),lastTick:0,lastBackground:0,lastSuccess:0,error:null,positions:[],recent:[],closed:0,wins:0,pnl:0,capital:10000,stats:{},flowStats:{},seen:{},markets:[],gaps:0};}
const sign=n=>n>0?1:n<0?-1:0;
function ema(a,n){return a.reduce((e,v)=>v*2/(n+1)+e*(1-2/(n+1)),a[0]);}
export function technical(bars){
 const c=bars.map(b=>Number(b[4]));if(c.length<50)return {};
 let gain=0,loss=0;for(let i=1;i<=14;i++){gain+=Math.max(c[i]-c[i-1],0)/14;loss+=Math.max(c[i-1]-c[i],0)/14;}
 for(let i=15;i<c.length;i++){gain=(gain*13+Math.max(c[i]-c[i-1],0))/14;loss=(loss*13+Math.max(c[i-1]-c[i],0))/14;}
 const rsi=loss===0?(gain===0?50:100):100-100/(1+gain/loss);
 const last=c.at(-1), sma=c.slice(-20).reduce((a,b)=>a+b,0)/20;
 return {RSI14:{value:rsi,direction:rsi>55?1:rsi<45?-1:0},EMA12_26:{value:ema(c,12)-ema(c,26),direction:sign(ema(c,12)-ema(c,26))},SMA20:{value:sma,direction:sign(last-sma)}};
}
function learn(s,t){
 const bucket=Math.abs(t.flow)<10000?'1k–10k':Math.abs(t.flow)<100000?'10k–100k':'100k+';
 const f=s.flowStats[bucket]??={n:0,wins:0,pnl:0};f.n++;f.wins+=Number(t.pnl>0);f.pnl+=t.pnl;
 for(const [name,signal] of Object.entries(t.technical)){
  const relation=signal.direction===0?'neutral':signal.direction===t.side?'agree':'disagree';
  const key=name+':'+relation, row=s.stats[key]??={name,relation,n:0,wins:0,pnl:0,validationN:0,validationWins:0,validationPnl:0};
  row.n++;row.wins+=Number(t.pnl>0);row.pnl+=t.pnl;
  if(t.cohort==='forward'){row.validationN++;row.validationWins+=Number(t.pnl>0);row.validationPnl+=t.pnl;}
 }
}
export function advance(previous,markets,now=Date.now()){
 const s=structuredClone(previous); const closed=[];
 if(s.lastTick&&now-s.lastTick>90000)s.gaps++;
 s.lastTick=now;s.markets=markets;s.error=null;
 const valid=markets.filter(m=>Number.isFinite(m.price)&&m.price>0&&Number.isFinite(m.flow)&&now-m.asOf<90000&&m.asOf<=now&&now-m.priceAt<20000&&m.priceAt<=now);
 if(valid.length)s.lastSuccess=now;
 for(const p of [...s.positions]){
  const m=valid.find(m=>m.symbol===p.symbol);if(!m)continue;
  p.mark=m.price;p.markAt=m.priceAt;
  const exitPrice=m.price*(1-p.side*policy.slippage);
  p.unrealized=p.quantity*(exitPrice-p.entry)*p.side-policy.notional*policy.fee-p.quantity*exitPrice*policy.fee;
  const newWindow=m.asOf!==p.lastWindow;
  if(newWindow){p.opposite=Math.sign(m.flow)===-p.side&&Math.abs(m.flow)>=policy.exitFlow?p.opposite+1:0;p.lastWindow=m.asOf;}
  const stop=p.side*(m.price/p.entry-1)<=-policy.stopLoss;
  if(stop||p.opposite>=policy.oppositeWindows){
   const t={...p,exit:exitPrice,closedAt:now,pnl:p.unrealized,reason:stop?'hard_stop':'persistent_opposite_flow'};
   s.positions=s.positions.filter(x=>x.id!==p.id);s.closed++;s.wins+=Number(t.pnl>0);s.pnl+=t.pnl;
   s.recent.unshift(t);s.recent=s.recent.slice(0,100);closed.push(t);learn(s,t);s.seen[p.symbol]=m.asOf;
  }
 }
 const ranked=[...valid].sort((a,b)=>Math.abs(b.flow)-Math.abs(a.flow));
 for(const m of ranked){
  if(!s.enabled||s.positions.length>=policy.maxPositions||Math.abs(m.flow)<policy.entryFlow||s.seen[m.symbol]===m.asOf||s.positions.some(p=>p.symbol===m.symbol))continue;
  if(s.capital+s.pnl-s.positions.length*policy.notional<policy.notional)continue;
  const side=sign(m.flow),entry=m.price*(1+side*policy.slippage);
  s.positions.push({id:crypto.randomUUID(),symbol:m.symbol,side,entry,quantity:policy.notional/entry,openedAt:now,flow:m.flow,flowAt:m.asOf,technical:m.technical,cohort:s.closed<30?'discovery':'forward',opposite:0,lastWindow:m.asOf,mark:m.price,markAt:m.priceAt,unrealized:-policy.notional*(policy.fee*2+policy.slippage*2)});
  s.seen[m.symbol]=m.asOf;
 }
 // Keep the deduplication map bounded to current/recent symbols without affecting open trades.
 for(const [symbol,time] of Object.entries(s.seen))if(now-time>86400000)delete s.seen[symbol];
 return {state:s,closed};
}
