"use strict";

/**
 * ALI Flow Radar — passive learning/test engine.
 * Additive only: technicals never block PURE MONEY FLOW demo entries here.
 */

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h"];
const METHODS = ["marketStructure","supportResistance","priceAction","fibonacci","riskReward","ichimoku","macd","rsi","ema","atr","adx","vwap","volumeProfile"];
const MAX_EVENTS = Math.max(1000, Number(process.env.LEARNING_MAX_EVENTS || 10000));
const events = [];

function finite(v) { const n=Number(v); return Number.isFinite(n)?n:null; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function push(event){ events.push(event); if(events.length>MAX_EVENTS) events.splice(0,events.length-MAX_EVENTS); return event; }
function normalizeTechnical(input={}){
  const out={};
  for(const tf of TIMEFRAMES){ const src=input[tf]||{}; out[tf]={}; for(const m of METHODS) if(src[m]!==undefined) out[tf][m]=src[m]; }
  return out;
}

/**
 * Experimental leverage recommendation for DEMO.
 * Leverage is based on evidence quality, not indicator count.
 * Missing/weak evidence defaults low. High volatility/conflict reduces leverage.
 * This function is intentionally bounded to 2x..10x.
 */
function recommendLeverage(evidence={}){
  const flowStrength=clamp(finite(evidence.flowStrength)??0,0,1);
  const flowPersistence=clamp(finite(evidence.flowPersistence)??0,0,1);
  const validatedContext=clamp(finite(evidence.validatedContext)??0,0,1);
  const higherTfAgreement=clamp(finite(evidence.higherTfAgreement)??0,0,1);
  const srSafety=clamp(finite(evidence.supportResistanceSafety)??0,0,1);
  const volatilityRisk=clamp(finite(evidence.volatilityRisk)??0.5,0,1);
  const signalConflict=clamp(finite(evidence.signalConflict)??0.5,0,1);
  const sampleConfidence=clamp(finite(evidence.sampleConfidence)??0,0,1);

  const positive =
    0.30*flowStrength +
    0.20*flowPersistence +
    0.15*validatedContext +
    0.10*higherTfAgreement +
    0.10*srSafety +
    0.15*sampleConfidence;
  const penalty=0.55*volatilityRisk+0.45*signalConflict;
  const confidence=clamp(positive*(1-0.65*penalty),0,1);

  let leverage=2;
  if(confidence>=0.80 && sampleConfidence>=0.70) leverage=10;
  else if(confidence>=0.68 && sampleConfidence>=0.55) leverage=7;
  else if(confidence>=0.55 && sampleConfidence>=0.40) leverage=5;
  else if(confidence>=0.40) leverage=3;

  return { leverage, confidence, mode:"DYNAMIC_EVIDENCE_BASED", min:2, max:10 };
}

function recordEntry(trade={},telemetry={}){
  const lev=telemetry.leverageEvidence ? recommendLeverage(telemetry.leverageEvidence) : null;
  return push({
    type:"ENTRY",time:Date.now(),tradeId:String(trade.id||trade.tradeId||""),
    symbol:String(trade.symbol||trade.coin||"").toUpperCase(),side:String(trade.side||"").toUpperCase(),
    entryPrice:finite(trade.entryPrice||trade.price),leverage:finite(trade.leverage),
    recommendedLeverage:lev,netMoneyFlowUsd:finite(telemetry.netMoneyFlowUsd??trade.netMoneyFlowUsd),
    technical:normalizeTechnical(telemetry.technical),executionPolicy:"PURE_MONEY_FLOW",technicalCanBlockTrade:false
  });
}
function recordExit(trade={},outcome={},telemetry={}){
  return push({
    type:"EXIT",time:Date.now(),tradeId:String(trade.id||trade.tradeId||""),
    symbol:String(trade.symbol||trade.coin||"").toUpperCase(),side:String(trade.side||"").toUpperCase(),
    exitPrice:finite(outcome.exitPrice||outcome.price),pnlPct:finite(outcome.pnlPct),pnlUsd:finite(outcome.pnlUsd),
    mfePct:finite(outcome.mfePct),maePct:finite(outcome.maePct),profitGivebackPct:finite(outcome.profitGivebackPct),
    realizedR:finite(outcome.realizedR),exitReason:outcome.exitReason||null,
    oppositeFlowUsd:finite(telemetry.oppositeFlowUsd),oppositeFlowPersistence:finite(telemetry.oppositeFlowPersistence),
    technical:normalizeTechnical(telemetry.technical)
  });
}
function snapshot(){
  const entries=events.filter(x=>x.type==="ENTRY"), exits=events.filter(x=>x.type==="EXIT");
  const closed=exits.filter(x=>x.pnlPct!==null||x.pnlUsd!==null), wins=closed.filter(x=>(x.pnlPct??x.pnlUsd??0)>0);
  const pnlPct=closed.map(x=>x.pnlPct).filter(Number.isFinite);
  return {mode:"PASSIVE_OBSERVER",executionPolicy:"PURE_MONEY_FLOW",technicalCanBlockTrade:false,
    leveragePolicy:"DYNAMIC_EVIDENCE_BASED_2X_10X",timeframes:TIMEFRAMES,methods:METHODS,
    samples:{events:events.length,entries:entries.length,exits:exits.length,closed:closed.length},
    winRate:closed.length?wins.length/closed.length:null,
    avgPnlPct:pnlPct.length?pnlPct.reduce((a,b)=>a+b,0)/pnlPct.length:null,
    readyForValidation:closed.length>=Number(process.env.LEARNING_MIN_CLOSED_TRADES||30)};
}
function recent(limit=200){const n=Math.max(1,Math.min(1000,Number(limit)||200));return events.slice(-n);}
module.exports={TIMEFRAMES,METHODS,recommendLeverage,recordEntry,recordExit,snapshot,recent};
