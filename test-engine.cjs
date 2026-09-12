const fs=require('fs'),os=require('os'),path=require('path'),assert=require('node:assert/strict'),z=require('zlib');
const create=require('./engine-runtime');
const server=fs.readFileSync(path.join(__dirname,'server.js'),'utf8');const html=z.brotliDecompressSync(Buffer.from(server.match(/const INDEX_BROTLI_B64 = `([\s\S]*?)`/)[1].replace(/\s/g,''),'base64')).toString();
let amount=999,price=100,asset="ETHUSDT";const dir=fs.mkdtempSync(path.join(os.tmpdir(),'flow-engine-'));
const request=async route=>{
 if(route.startsWith('/api/demo-scan'))return{assets:[{symbol:asset,lastPrice:price,rawNetFlow1m:amount,rawNetFlow5m:amount,rawNetFlow15m:amount}],generatedAt:Date.now()};
 if(route.startsWith('/api/binance'))return[{symbol:asset,lastPrice:price}];
 if(route.startsWith('/api/klines'))return Array.from({length:120},(_,i)=>({close:90+i*.08,high:90+i*.08+.1,low:90+i*.08-.1,volume:100}));
 throw new Error(route);
};
(async()=>{
 let e=create({html,request,dataDir:dir});await e.history();await e.cycle();assert.equal(e.snapshot().demoState.open.length,0,'999 must not open');
 amount=1001;await e.cycle();assert.equal(e.snapshot().demoState.open.length,1,'1001 must auto open without a browser');assert.equal(e.snapshot().demoState.open[0].side,'LONG');
 await e.cycle();assert.equal(e.snapshot().demoState.open.length,1,'repeat scan must not duplicate');
 e.stop();e=create({html,request,dataDir:dir});assert.equal(e.snapshot().demoState.open.length,1,'restart preserves open position');
 amount=0;price=98;await e.cycle();assert.equal(e.snapshot().demoState.open.length,0,'stop closes without browser');assert.equal(e.snapshot().demoState.closed.length,1);assert.equal(e.snapshot().learningState.total,1,'closed trade learned');assert.equal(e.snapshot().learningState.dailyReports.at(-1).trades,1,'daily report refreshes after trade');
 assert.equal(e.action({type:'open',symbol:'ETHUSDT'}),false,'cooldown blocks immediate reentry');asset='BTCUSDT';price=100;amount=-1001;await e.cycle();assert.equal(e.snapshot().demoState.open[0].side,'SHORT');
 assert.ok(e.snapshot().demoState.closed[0].advisorAtEntry,'advisor snapshot captured');
 e.stop();console.log('PASS: below-threshold, automatic LONG, duplicate prevention, restart persistence, stop execution, learning, daily refresh, automatic SHORT, advisor snapshot.');fs.rmSync(dir,{recursive:true});
})().catch(e=>{console.error(e);process.exitCode=1});
