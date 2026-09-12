'use strict';
// Trusted application code only; the VM is an adapter for the shared browser strategy.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
module.exports=function createEngine({html,request,dataDir,feedStatus=()=>({})}){
  fs.mkdirSync(dataDir,{recursive:true});
  const filename=path.join(dataDir,'engine-state.json');
  let storage={};
  if(fs.existsSync(filename))storage=JSON.parse(fs.readFileSync(filename,'utf8'));
  let persistError=null;
  const flush=()=>{try{fs.writeFileSync(filename+'.tmp',JSON.stringify(storage),{mode:0o600});fs.renameSync(filename+'.tmp',filename);persistError=null}catch(e){persistError=e.message;throw e}};
  const elements=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',classList:{contains:()=>false,add(){},remove(){}},style:{}});return elements.get(id)};
  const context=vm.createContext({console,Date,Math,JSON,Number,Set,Map,URLSearchParams,
    localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>{storage[k]=String(v);flush()}},
    document:{getElementById:element,querySelectorAll:()=>[]},window:{addEventListener(){}},
    setTimeout(){},setInterval(){},clearTimeout(){},clearInterval(){},alert:()=>{},confirm:()=>false,
    requestEngine:request
  });
  const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInContext(source.slice(0,source.lastIndexOf('boot();setInterval')),context);
  vm.runInContext(`
    startPriceSocket=()=>{};renderDemoTrading=()=>{};renderAdvisor=()=>{};renderTerminal=()=>{};
    renderLivePrices=()=>{};renderAssetGrid=()=>{};
    getJson=requestEngine;
    globalThis.engineApi={
      snapshot:()=>({demoState,learningState,autoTradeStats,demoSymbols,demoFlowData,market,methods:advisorDemoMethodStats(),lastDemoScanAt}),
      scan:refreshDemoScanner,
      history:refreshKlines,
      tick:async()=>{
        const rows=await getJson('/api/binance?symbols='+encodeURIComponent(getActiveSymbols().join(',')));
        for(const x of rows){if(!x.stale&&num(x.lastPrice)>0)market[x.symbol]={...market[x.symbol],...x,liveAt:num(x.liveAt,num(x.priceAt,Date.now()))}}
        const fresh=Object.values(market).some(x=>Date.now()-num(x.liveAt,0)<15000);
        if(fresh){updateDemoPositions();autoSyncDemoFromMoney()}
        else autoTradeStats.lastReason='WAIT FRESH MARKET PRICES';
      },
      daily:runDailyLearningReview,
      action:(a)=>{
        if(a.type==='close')return closeDemoTrade(String(a.id),'MANUAL');
        if(a.type==='cancel')return cancelArm(String(a.symbol));
        if(a.type==='open')return openDemoTrade(String(a.symbol),'MARKET');
        if(a.type==='arm')return armDemoTrade(String(a.symbol));
        if(a.type==='settings'){
          demoState.riskPct=clamp(num(a.riskPct,1),.1,5);demoState.leverage=clamp(num(a.leverage,3),1,10);demoState.maxOpenPositions=clamp(num(a.maxOpenPositions,20),1,20);
          if(!demoState.open.length&&!demoState.closed.length)demoState.initialBalance=Math.max(100,num(a.initialBalance,10000));saveDemo();return true;
        }
        if(a.type==='reset')throw new Error('Reset disabled during continuous research; preserve the journal');
        throw new Error('Unknown engine action');
      }
    };
  `,context);
  const api=context.engineApi,timers=[],status={startedAt:Date.now(),lastTickAt:0,lastError:null,mode:'SERVER_CONTINUOUS',technicalAuthority:false};
  const loop=(fn,ms)=>{let busy=false;const run=async()=>{if(busy)return;busy=true;try{await fn()}catch(e){status.lastError=e.message;console.warn('Engine loop:',e.message)}finally{busy=false}};run();timers.push(setInterval(run,ms))};
  return {
    start(){loop(()=>api.scan(),1000);loop(async()=>{await api.tick();status.lastTickAt=Date.now();status.lastError=null},500);loop(()=>api.history(),30000);loop(()=>api.daily(),60000)},
    stop(){timers.forEach(clearInterval);flush()},
    snapshot(){return JSON.parse(JSON.stringify({...api.snapshot(),engine:{...status,persistError,feed:feedStatus(),uptimeSeconds:Math.round((Date.now()-status.startedAt)/1000)}}))},
    action(a){return api.action(a)},
    // Used by deterministic regression tests with synthetic market responses.
    async cycle(){await api.scan();await api.tick();await api.daily()},
    async history(){await api.history()}
  };
};
