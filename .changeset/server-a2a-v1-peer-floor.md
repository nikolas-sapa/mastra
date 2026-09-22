---
'@mastra/server': patch
---

Raise the `@mastra/core` peer dependency floor to `>=1.58.0-0`: `packages/server` imports `@mastra/core/a2a/v1` as a value, and that subpath only exists from 1.58.0, so the previous floor of `1.50.0` failed the core-imports peer check.
