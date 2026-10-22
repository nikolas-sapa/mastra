---
'@mastra/core': patch
---

Fix parallel step restart and time-travel skipping branches at index > 0 by replacing premature loop break with continue in executeParallel.
