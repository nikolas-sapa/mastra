---
"@mastra/mcp": patch
---

Normalize legacy JSON Schema dialects (notably zod v3's `draft/2019-09`) to 2020-12 when converting MCP tool schemas. Previously an `MCPServer` running on zod v3 advertised tool schemas with a `$schema` the client's validator has no meta-schema for, so every tool call was rejected before execution with `no schema with key or ref ".../2019-09/schema"`. The keywords tool schemas use are equivalent across these drafts, so the declared dialect is upgraded rather than the schema rewritten.
