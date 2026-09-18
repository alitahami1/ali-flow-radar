"use strict";

/**
 * ALI Flow Radar — passive learning/test engine.
 * Additive only: this module does not change entry/exit execution or UI.
 * It records technical context beside PURE MONEY FLOW demo trades so
 * hypotheses can be compared against real demo outcomes before promotion.
 */

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h"];
const METHODS = [
  "marketStructure",
  "supportResistance",
  "priceAction",
  "fibonacci",
  "riskReward",
  "ichimoku",
  "macd",
  "rsi",
  "ema",
  "atr",
  "adx",
  "vwap",
  "volumeProfile"
];

const MAX_EVENTS = Math.max(1000, Number(process.env.LEARNING_MAX_EVENTS || 10000));
const events = [];

function finite(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function push(event) {
  events.push(event);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  return event;
}

function normalizeTechnical(input = {}) {
  const out = {};
  for (const tf of TIMEFRAMES) {
    const src = input[tf] || {};
    out[tf] = {};
    for (const method of METHODS) {
      if (src[method] !== undefined) out[tf][method] = src[method];
    }
  }
  return out;
}

function recordEntry(trade = {}, telemetry = {}) {
  return push({
    type: "ENTRY",
    time: Date.now(),
    tradeId: String(trade.id || trade.tradeId || ""),
    symbol: String(trade.symbol || trade.coin || "").toUpperCase(),
    side: String(trade.side || "").toUpperCase(),
    entryPrice: finite(trade.entryPrice || trade.price),
    leverage: finite(trade.leverage),
    netMoneyFlowUsd: finite(telemetry.netMoneyFlowUsd ?? trade.netMoneyFlowUsd),
    technical: normalizeTechnical(telemetry.technical),
    executionPolicy: "PURE_MONEY_FLOW",
    technicalCanBlockTrade: false
  });
}

function recordExit(trade = {}, outcome = {}, telemetry = {}) {
  return push({
    type: "EXIT",
    time: Date.now(),
    tradeId: String(trade.id || trade.tradeId || ""),
    symbol: String(trade.symbol || trade.coin || "").toUpperCase(),
    side: String(trade.side || "").toUpperCase(),
    exitPrice: finite(outcome.exitPrice || outcome.price),
    pnlPct: finite(outcome.pnlPct),
    pnlUsd: finite(outcome.pnlUsd),
    mfePct: finite(outcome.mfePct),
    maePct: finite(outcome.maePct),
    profitGivebackPct: finite(outcome.profitGivebackPct),
    realizedR: finite(outcome.realizedR),
    exitReason: outcome.exitReason || null,
    oppositeFlowUsd: finite(telemetry.oppositeFlowUsd),
    oppositeFlowPersistence: finite(telemetry.oppositeFlowPersistence),
    technical: normalizeTechnical(telemetry.technical)
  });
}

function snapshot() {
  const entries = events.filter(x => x.type === "ENTRY");
  const exits = events.filter(x => x.type === "EXIT");
  const closed = exits.filter(x => x.pnlPct !== null || x.pnlUsd !== null);
  const wins = closed.filter(x => (x.pnlPct ?? x.pnlUsd ?? 0) > 0);
  const pnlPct = closed.map(x => x.pnlPct).filter(Number.isFinite);
  return {
    mode: "PASSIVE_OBSERVER",
    executionPolicy: "PURE_MONEY_FLOW",
    technicalCanBlockTrade: false,
    timeframes: TIMEFRAMES,
    methods: METHODS,
    samples: { events: events.length, entries: entries.length, exits: exits.length, closed: closed.length },
    winRate: closed.length ? wins.length / closed.length : null,
    avgPnlPct: pnlPct.length ? pnlPct.reduce((a,b) => a+b, 0) / pnlPct.length : null,
    readyForValidation: closed.length >= Number(process.env.LEARNING_MIN_CLOSED_TRADES || 30)
  };
}

function recent(limit = 200) {
  const n = Math.max(1, Math.min(1000, Number(limit) || 200));
  return events.slice(-n);
}

module.exports = {
  TIMEFRAMES,
  METHODS,
  recordEntry,
  recordExit,
  snapshot,
  recent
};
