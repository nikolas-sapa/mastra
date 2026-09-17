---
"@mastra/core": patch
---

Prevent replacement subscriptions from replaying aborted active runs. An aborted run whose run ID remains in `activeThreadRunIds` could be re-enqueued by a replacement subscription, emitting a duplicate `agent_start` and terminal lifecycle after `agent_end(aborted)`. The runtime now tracks aborted run IDs and skips replay for them, while still allowing pending inbound signals to be delivered after abort recovery.
