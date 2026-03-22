---
name: requesting-plan-review
description: Use when completing plans - dispatches plan-reviewer to review plan before proceeding
---

# Requesting plan Review

Dispatch @plan-reviewer agent to catch issues before they cascade.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**
- After each plan completion


## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch @plan-reviewer subagent:**

Use Task tool with plan-reviewing skill template:

**Placeholders:**
- `{WHAT_WAS_IMPLEMENTED}` - What you just built
- `{PLAN_OR_REQUIREMENTS}` - What it should do
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit
- `{DESCRIPTION}` - Brief summary

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Fix Major issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

## Example

```
[Just completed Creating implementation plan for phase 1 of feature X]

You: Let me request plan review before proceeding.

BASE_SHA=$(git log --oneline | grep -i "phase 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch @plan-reviewer subagent]
  WHAT_WAS_IMPLEMENTED: Implementation plan for phase 1 of feature X
  PLAN_OR_REQUIREMENTS: Phase 1 from docs/design/featureX-design.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661
  DESCRIPTION: Wrote implementation plan for phase 1 of feature X

[Subagent returns]:
  Strengths: Clean plan, real tests
  Issues:
    Important: Missing library description
    Minor: API might need pagination in future
  Assessment: Ready to proceed

You: [Fix progress indicators]
[Continue to implementation]
```

## Integration with Workflows

**Subagent-Driven Development:**
- Review after EACH planning task
- Catch issues before they compound
- Fix before moving to next task

**Executing Plans:**
- Review after each plan step
- Get feedback, apply, continue

**Ad-Hoc Development:**
- Review before merge

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification
