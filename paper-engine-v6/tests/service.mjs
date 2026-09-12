import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../store.mjs';
import {initial} from '../engine/core.mjs';
test('background loop runs without clients and survives restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ali-engine-')),file=path.join(dir,'state.sqlite');let calls=0;
 const feed=async()=>{calls++;const now=Date.now();return {markets:[{symbol:'BTCUSDT',price:100,priceAt:now,asOf:now-1000,flow:2000,technical:{RSI14:{direction:-1,value:20}}}],errors:[]};};
 let e=new Engine(file,{feed,interval:20});
 try{
  e.start();await new Promise(r=>setTimeout(r,35));assert.equal(calls,0,'no trading before state handover');
  const original=initial();original.closed=7;original.pnl=12.5;e.bootstrap(original);
  assert.throws(()=>e.bootstrap(initial()),/Already initialized/);
  await new Promise(r=>setTimeout(r,90));assert(calls>=2);assert.equal(e.read().positions.length,1);assert(e.read().lastBackground>0);
  await e.control(false);await e.close();
  e=new Engine(file,{feed});assert.equal(e.read().positions.length,1);assert.equal(e.read().closed,7);assert.equal(e.read().pnl,12.5);assert.equal(e.read().enabled,false);
  e.feed=async()=>{throw Error('provider offline');};await e.tick();assert.equal(e.read().positions.length,1);assert.equal(e.read().error,'provider offline');
 }finally{await e.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('concurrent ticks share one job; controls survive in-flight scans',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ali-engine-'));let calls=0;
 const e=new Engine(path.join(dir,'state.sqlite'),{feed:async()=>{calls++;await new Promise(r=>setTimeout(r,25));return {markets:[],errors:[]};}});
 try{e.bootstrap(initial());await Promise.all([e.tick(),e.tick(),e.control(false)]);assert.equal(calls,1);assert.equal(e.read().enabled,false);}finally{await e.close();fs.rmSync(dir,{recursive:true,force:true});}
});
