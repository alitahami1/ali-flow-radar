'use strict';
const {EventEmitter}=require('node:events');
const STABLE=new Set(['USDT','USDC','USD1','DAI','USDS','TUSD','FDUSD','PYUSD','USDP','GUSD','EURC','EUR','PAX','BUSD','UST','USTC']);
class LiveFeed extends EventEmitter {
 constructor({WebSocket,fetch,now=Date.now}){super();this.WebSocket=WebSocket;this.fetch=fetch;this.now=now;this.rows=new Map();this.status='CONNECTING';this.error=null;this.stopped=false;this.gaps=0;this.generation=0;this.products=[];}
 async start(){
  try{
   const res=await this.fetch('https://api.exchange.coinbase.com/products',{signal:AbortSignal.timeout(10000)});if(!res.ok)throw new Error('Coinbase products HTTP '+res.status);
   const products=await res.json();this.products=products.filter(p=>p.quote_currency==='USD'&&p.status==='online'&&!p.trading_disabled&&!STABLE.has(p.base_currency)).map(p=>p.id);
   if(!this.products.length)throw new Error('No eligible Coinbase USD products');
   this.connect();
  }catch(e){this.status='OFFLINE';this.error=e.message;if(!this.stopped)this.retry=setTimeout(()=>this.start(),10000)}
 }
 connect(){
  if(this.stopped)return;this.rows.clear();this.generation++;this.status='WARMUP';
  const ws=this.socket=new this.WebSocket('wss://ws-feed.exchange.coinbase.com');
  ws.on('open',()=>ws.send(JSON.stringify({type:'subscribe',product_ids:this.products,channels:['matches','heartbeat','ticker']})));
  ws.on('message',data=>{try{this.ingest(JSON.parse(data.toString()))}catch(e){this.error=e.message}});
  ws.on('error',e=>{this.error=e.message});
  ws.on('close',()=>{this.status='OFFLINE';if(!this.stopped)this.retry=setTimeout(()=>this.connect(),5000)});
 }
 ingest(m){
  if(m.type==='error'){this.error=m.message;this.status='ERROR';return}
  const symbol=String(m.product_id||'').replace('-','');if(!symbol)return;
  let r=this.rows.get(symbol);if(!r){r={symbol,product:m.product_id,buckets:new Map(),since:this.now(),lastId:null,heartbeat:0,priceAt:0};this.rows.set(symbol,r)}
  if(m.type==='error'){this.error=m.message;return}
  if(m.type==='heartbeat'){
   r.heartbeat=this.now();
   if(r.lastId!=null&&Number(m.last_trade_id)>r.lastId){this.gaps++;r.buckets.clear();r.since=this.now();r.lastId=Number(m.last_trade_id)}
   return;
  }
  if(m.type==='ticker'){
   const at=Date.parse(m.time),price=Number(m.price);if(price>0&&Number.isFinite(at)&&at<=this.now()+1000){r.price=price;r.priceAt=at;r.quoteVolume=Number(m.volume_24h)*price;r.change=Number(m.open_24h)>0?(price/Number(m.open_24h)-1)*100:0}return;
  }
  if(m.type!=='match'&&m.type!=='last_match')return;
  const id=Number(m.trade_id),at=Date.parse(m.time),price=Number(m.price),qty=Number(m.size);
  if(!Number.isSafeInteger(id)||!Number.isFinite(at)||at>this.now()+1000||!(price>0&&qty>0)||!['buy','sell'].includes(m.side))return;
  if(r.lastId!==null&&id<=r.lastId)return;
  if(m.type==='last_match'){r.lastId=id;return}
  if(r.lastId!==null&&id!==r.lastId+1){this.gaps++;r.buckets.clear();r.since=this.now()}
  r.lastId=id;r.price=price;r.priceAt=at;
  const sec=Math.floor(at/1000),b=r.buckets.get(sec)||{buy:0,sell:0};
  // Coinbase reports MAKER side. A maker sell is a taker buy.
  b[m.side==='sell'?'buy':'sell']+=price*qty;r.buckets.set(sec,b);
  for(const k of r.buckets.keys())if(k<sec-901)r.buckets.delete(k);
  this.status='LIVE';this.error=null;
 }
 snapshot(){
  const now=this.now(),rows=[];
  for(const r of this.rows.values()){
   const fresh=this.status==='LIVE'&&now-r.heartbeat<5000&&now-r.priceAt<5000;
   const window=seconds=>{
    if(!fresh||now-r.since<(seconds+1)*1000)return null;
    const end=Math.floor(now/1000),start=end-seconds;let buy=0,sell=0;
    for(const [sec,b] of r.buckets)if(sec>=start&&sec<end){buy+=b.buy;sell+=b.sell}
    return {buy,sell,rawNetFlow:buy-sell};
   };
   const f=window(15),a=window(60),b=window(300),c=window(900);
   rows.push({symbol:r.symbol,lastPrice:r.price||0,priceAt:r.priceAt,quoteVolume24h:r.quoteVolume||0,priceChangePercent24h:r.change||0,flowSource:'COINBASE_SPOT_USD',flowGeneration:this.generation,flowReady:!!(f||a||b||c),rawFastNetFlow:f?.rawNetFlow??null,rawNetFlow1m:a?.rawNetFlow??null,rawNetFlow5m:b?.rawNetFlow??null,rawNetFlow15m:c?.rawNetFlow??null,flow1m:a,flow5m:b,flow15m:c,flowMagnitudeUsd:Math.max(...[f,a,b,c].map(v=>Math.abs(v?.rawNetFlow||0))),dataAt:now,stale:!fresh});
  }
  return {assets:rows.sort((a,b)=>b.flowMagnitudeUsd-a.flowMagnitudeUsd),feed:{provider:'COINBASE_SPOT_USD',status:this.status,error:this.error,gaps:this.gaps,products:this.products.length,generation:this.generation,at:now}};
 }
 stop(){this.stopped=true;clearTimeout(this.retry);this.socket?.close()}
}
module.exports={LiveFeed,STABLE};
