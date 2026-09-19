---
"@mastra/core": patch
---

Log a recovered model-chain failover at `warn` instead of `error` (fixes #24441). When a `models` chain fails on one model but succeeds on a fallback, the failed attempt was logged twice at `error` level with no `warn` downgrade, so a log pipeline that alerts on level alone paged on transient blips the user never saw. A per-model failure that will fall through to another model in the chain is now logged at `warn` (naming the model being tried next); `error` is reserved for the terminal `Exhausted all fallback models.` case.
