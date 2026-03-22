---
description: Implement a feature using strict test-driven development
agent: tdd-developer
subtask: true
---

Implement using TDD: $ARGUMENTS

Use the test-driven-development skill with strict RED-GREEN-REFACTOR:

**RED** - Write ONE failing test
- Clear name describing behavior
- Test real code (avoid mocks)
- One behavior per test

**Verify RED** - MANDATORY
- Run test, confirm it FAILS
- Failure must be because feature is missing (not typo)

**GREEN** - Write MINIMAL code
- Simplest code to pass
- No extra features
- No "improvements"

**Verify GREEN** - MANDATORY
- Run test, confirm it PASSES
- All other tests still pass
- Output pristine

**REFACTOR** - Clean up (after green only)
- Remove duplication
- Improve names
- Keep tests green

**REPEAT** - Next failing test

IRON LAW: No production code without a failing test first.
Wrote code before test? Delete it. Start over.
