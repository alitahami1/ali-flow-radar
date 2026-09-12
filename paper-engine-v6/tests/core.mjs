import assert from 'node:assert/strict';
import {initial,advance,technical} from '../engine/core.mjs';
const now=1800000000000;
const market=(options={})=>({symbol:'BTCUSDT',price:100,priceAt:now,asOf:now-1000,flow:1500,technical:{RSI14:{value:20,direction:-1}},...options});
let s=advance(initial(),[market()],now).state;
assert.equal(s.positions.length,1,'opposing technical must not block flow entry');
assert.equal(s.positions[0].side,1);
assert.equal(advance(s,[market()],now+1000).state.positions.length,1,'no duplicate entries');
assert.equal(advance(initial(),[market({priceAt:now-25000})],now).state.positions.length,0,'stale price blocked');
assert.equal(advance(initial(),[market({asOf:now-100000})],now).state.positions.length,0,'stale flow blocked');
assert.equal(advance(initial(),[market({flow:999})],now).state.positions.length,0);
assert.equal(advance(initial(),[market({flow:-1000})],now).state.positions[0].side,-1);
let stop=advance(s,[market({price:97,flow:9000,technical:{}})],now+1000);
assert.equal(stop.closed.length,1,'hard stop independent of positive flow');
assert.equal(stop.state.positions.length,0,'no same-window reentry after stop');
assert.equal(stop.state.stats['RSI14:disagree'].n,1,'learn from entry technical snapshot');
assert.equal(stop.state.closed,1);
assert(stop.state.pnl< -3,'fees and slippage included');
assert.equal(advance(stop.state,[market({price:97})],now+2000).closed.length,0,'no duplicate learning');
for(let i=1;i<=3;i++){
 const t=now+i*60000;
 s=advance(s,[market({price:101,flow:-1500,asOf:t-1000,priceAt:t})],t).state;
 if(i<3){assert.equal(s.positions.length,1);const repeat=advance(s,[market({price:101,flow:-1500,asOf:t-1000,priceAt:t})],t+1000).state;assert.equal(repeat.positions[0].opposite,i,'repeated same window does not advance persistence');}
}
assert.equal(s.closed,1);assert.equal(s.positions.length,0);
assert.equal(s.stats['RSI14:disagree'].n,1);
let paused=initial();paused.enabled=false;assert.equal(advance(paused,[market()],now).state.positions.length,0);
let open=advance(initial(),[market()],now).state;open.enabled=false;assert.equal(advance(open,[market({price:97})],now+1000).closed.length,1,'pause still monitors stops');
const past=initial();past.closed=30;const future=advance(past,[market()],now).state;assert.equal(future.positions[0].cohort,'forward');assert.equal(advance(future,[market({price:97})],now+1000).state.stats['RSI14:disagree'].validationN,1);
const bars=Array.from({length:60},(_,i)=>[0,0,0,0,100+i]);assert.equal(technical(bars).RSI14.value,100);assert.equal(technical(bars).EMA12_26.direction,1);
console.log('PASS: flow-only entry, stale data, thresholds, duplicate ticks, hard stop, persistent exit, pause, fees, learning and forward cohort.');
