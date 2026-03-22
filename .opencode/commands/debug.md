---
description: Debug an issue using systematic four-phase debugging
agent: debugger
subtask: true
---

Debug this issue: $ARGUMENTS

Use the systematic-debugging skill with the four-phase framework:

**Phase 1: Root Cause Investigation** (REQUIRED FIRST)
- Read error messages COMPLETELY
- Reproduce consistently
- Check recent changes (git diff)
- Trace data flow

**Phase 2: Pattern Analysis**
- Find working examples
- Compare differences
- Understand dependencies

**Phase 3: Hypothesis Testing**
- Form SINGLE hypothesis
- Test with SMALLEST change
- One variable at a time

**Phase 4: Implementation**
- Create failing test FIRST
- Fix root cause (not symptom)
- Verify fix

IRON LAW: No fixes without root cause investigation first.

If you've tried 3+ fixes and none worked, STOP and question the architecture.
