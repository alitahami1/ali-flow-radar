const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const app = express();
app.use(express.static(path.join(__dirname)));

app.get("/api/binance", async (req,res)=>{
  try{
    const symbols=(req.query.symbols||"BTCUSDT,ETHUSDT").split(",").map(s=>s.trim().toUpperCase()).filter(Boolean);
    const r=await fetch("https://fapi.binance.com/fapi/v1/ticker/24hr");
    const d=await r.json();
    res.json(d.filter(x=>symbols.includes(x.symbol)));
  }catch(e){res.status(500).json({error:String(e)})}
});

app.get("/api/hyperliquid", async (req,res)=>{
  try{
    const user=req.query.user;
    const r=await fetch("https://api.hyperliquid.xyz/info",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"clearinghouseState",user})});
    res.status(r.status).send(await r.text());
  }catch(e){res.status(500).json({error:String(e)})}
});

const port=process.env.PORT||3000;
app.listen(port,()=>console.log("ALI Flow Radar running on "+port));
