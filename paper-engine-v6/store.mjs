import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {initial,advance,policy} from './engine/core.mjs';
import {collect} from './engine/feed.mjs';
export class Engine {
 constructor(filename,{feed=collect,interval=20000}={}){
  this.db=new DatabaseSync(filename);this.feed=feed;this.interval=interval;this.inFlight=null;this.stopping=false;
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');
  this.db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)');
  for(const name of fs.readdirSync(new URL('./migrations/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort()){
   if(this.db.prepare('SELECT name FROM schema_migrations WHERE name=?').get(name))continue;
   this.db.exec('BEGIN IMMEDIATE');try{this.db.exec(fs.readFileSync(new URL('./migrations/'+name,import.meta.url),'utf8'));this.db.prepare('INSERT INTO schema_migrations VALUES (?)').run(name);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  const s=initial();s.enabled=false;s.bootstrapped=false;
  this.db.prepare('INSERT OR IGNORE INTO engine_state (id,revision,data) VALUES (1,0,?)').run(JSON.stringify(s));
 }
 read(){return JSON.parse(this.db.prepare('SELECT data FROM engine_state WHERE id=1').get().data);}
 response(){return {state:this.read(),policy,schedulerConfigured:true,engine:'render-background-v6'};}
 save(s,closed=[]){this.db.exec('BEGIN IMMEDIATE');try{
  for(const t of closed)this.db.prepare('INSERT OR IGNORE INTO trades (id,closed_at,data) VALUES (?,?,?)').run(t.id,t.closedAt,JSON.stringify(t));
  this.db.prepare('UPDATE engine_state SET data=?,revision=revision+1 WHERE id=1').run(JSON.stringify(s));this.db.exec('COMMIT');
 }catch(e){this.db.exec('ROLLBACK');throw e;}}
 bootstrap(snapshot){
  if(this.read().bootstrapped)throw Error('Already initialized; refusing to overwrite trading history');
  const s=structuredClone(snapshot);
  if(!s||typeof s.enabled!=='boolean'||!Array.isArray(s.positions)||s.positions.length>10||!Array.isArray(s.recent)||!s.stats||!s.flowStats||!s.seen||!Number.isFinite(s.capital)||!Number.isFinite(s.pnl)||!Number.isInteger(s.closed))throw Error('Invalid v6 snapshot');
  for(const p of s.positions)if(!p.id||!p.symbol||![1,-1].includes(p.side)||!(p.entry>0)||!(p.quantity>0)||!p.technical)throw Error('Invalid open position');
  for(const t of s.recent)if(!t.id||!Number.isFinite(t.closedAt)||!Number.isFinite(t.pnl))throw Error('Invalid closed trade');
  s.bootstrapped=true;s.lastBackground=0;s.error=null;s.lastTick=0;
  this.save(s,s.recent);return this.response();
 }
 async tick(){
  if(this.inFlight)return this.inFlight;
  if(this.stopping||!this.read().bootstrapped)return this.response();
  this.inFlight=(async()=>{
   const old=this.read();let state,closed=[];
   try{const feed=await this.feed(old);({state,closed}=advance(old,feed.markets,Date.now()));state.error=feed.errors?.length?feed.errors.join('; ').slice(0,1500):null;if(!feed.markets.length)state.error='No fresh market data; fills are suspended.';}
   catch(e){state={...old,lastTick:Date.now(),error:String(e.message).slice(0,1500)};}
   state.lastBackground=Date.now();this.save(state,closed);return this.response();
  })();
  try{return await this.inFlight;}finally{this.inFlight=null;}
 }
 async control(enabled){
  if(typeof enabled!=='boolean')throw Error('enabled must be boolean');
  await this.inFlight;
  const s=this.read();if(!s.bootstrapped)throw Error('Initialize from the private Site first');
  s.enabled=enabled;this.save(s);return this.response();
 }
 start(){if(this.started)return;this.started=true;const run=async()=>{try{await this.tick();}catch(e){console.error('Engine tick failed:',e.message);}finally{if(!this.stopping)this.timer=setTimeout(run,this.interval);}};void run();}
 async close(){this.stopping=true;clearTimeout(this.timer);await this.inFlight;this.db.close();}
}
