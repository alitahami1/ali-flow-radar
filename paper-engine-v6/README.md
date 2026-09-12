# Always-on paper engine: prepared, not deployed

This isolated service extends the private Sites v6 engine. It does not alter the existing `server.js`, `astra-gateway.js`, site access policy, or any currently deployed Render service.

- A server-owned loop evaluates fresh aggregate flow every 20 seconds after the prior scan finishes, with no browser requests required.
- Entries use net five-minute taker flow >= 1,000 USDT. Technical signals are observational only. Fixed hard stops, persistent opposite-flow exits, and cost assumptions match the private Site.
- The `trades` and `engine_state` SQLite tables live on a persistent 1 GB disk with WAL and FULL synchronous mode. Completed trades and learning state update atomically.
- One replica; duplicate tick calls share one in-flight scan. Pausing entries waits for an in-flight scan and preserves its results. SIGTERM stops scheduling and completes the current checkpoint.
- Only `/healthz` is unauthenticated, returning no trading data. All data and controls require a random bearer secret, held server-side in Render and Sites. There is no browser secret, public trading dashboard, or authentication bypass.
- Starts inert. A one-time authenticated `/v1/bootstrap` imports the existing private Site's v6 state before starting. It refuses to overwrite initialized data. The import carries open positions, cumulative learning and recent closes. Older D1 trade records must remain archived in the original Site; do not delete that database.

## Validation

From this directory, run `npm run build` and `npm test` on Node >=22.13. Tests include the core trading rules, independent background execution without any clients, restart persistence, refusal to overwrite history, market failure, concurrent tick deduplication, and pause during a scan. Synthetic fixtures test behavior; they do not establish live exchange connectivity or continuous uptime.

## Pending deployment

`render.pending.yaml` is a review-only proposal for one 0.5c-512mb service in Frankfurt plus a 1 GB disk. The listed base price on 12 September 2026 is $7/month compute + $0.25/month disk = $7.25/month, excluding tax and extra usage (https://render.com/pricing). Paid resources have NOT been created. Check current Render pricing and obtain the owner's cost approval before applying it. The public GitHub source contains no account data or credentials.

After approval:
1. Create the service and disk from the reviewed configuration. Set a random PAPER_ENGINE_TOKEN and the same secret in the private Site's environment.
2. Add a server-only Site adapter for `/api/engine/*` to `/v1/*`, preserving Sites authentication and same-origin write checks. Do not expose the token to the client.
3. Briefly stop the Site's old scheduler and copy its exact current state to the authenticated bootstrap endpoint. Retain original D1 trade history. Never run both schedulers as independent accounts.
4. Switch the private Site to Render and show background freshness from actual `lastBackground` and `lastSuccess` times, not configuration alone. Browser tick requests become read-only snapshots.
5. Verify successful market observations and more than one completed background cycle while no browser is open. Verify persistence after a restart. Only then mark 24-hour operation enabled.

A single instance can still pause during deployment or provider outages; no fills are manufactured during gaps and hard stops cannot be guaranteed through an outage. This remains paper trading only, not real exchange orders or guaranteed profitable learning.
