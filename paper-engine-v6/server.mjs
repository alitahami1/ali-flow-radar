import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {timingSafeEqual} from 'node:crypto';
import {Engine} from './store.mjs';
const token=process.env.PAPER_ENGINE_TOKEN,dataDir=process.env.DATA_DIR;
if(!token||token.length<32)throw Error('Set PAPER_ENGINE_TOKEN to a random secret of at least 32 characters');
if(!dataDir||!path.isAbsolute(dataDir))throw Error('Set DATA_DIR to the persistent disk mount path');
fs.mkdirSync(dataDir,{recursive:true});
const engine=new Engine(path.join(dataDir,'paper-engine.sqlite'));
function authorized(req){const got=Buffer.from(req.headers.authorization||''),wanted=Buffer.from('Bearer '+token);return got.length===wanted.length&&timingSafeEqual(got,wanted);}
function send(res,status,value){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function body(req){const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>2000000)throw Error('Body too large');chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString());}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/healthz'&&req.method==='GET')return send(res,200,{ok:true});
 if(!authorized(req))return send(res,401,{error:'Unauthorized'});
 try{
  if(url.pathname==='/v1/state'&&req.method==='GET')return send(res,200,engine.response());
  // Read-only: browsers never drive the scheduler or place additional fills.
  if(url.pathname==='/v1/tick'&&req.method==='POST')return send(res,200,engine.response());
  if(url.pathname==='/v1/control'&&req.method==='POST')return send(res,200,await engine.control((await body(req)).enabled));
  if(url.pathname==='/v1/bootstrap'&&req.method==='POST')return send(res,200,engine.bootstrap((await body(req)).state));
  return send(res,404,{error:'Not found'});
 }catch(e){send(res,400,{error:e.message});}
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>{console.log('Paper engine online; waiting for one-time authenticated state import if not initialized.');engine.start();});
let stopping=false;
async function shutdown(){if(stopping)return;stopping=true;server.close();await engine.close();console.log('Paper engine checkpoint saved; shutdown complete.');}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
