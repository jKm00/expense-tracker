---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session - dispatches fresh subagent for each task with code review between tasks, enabling fast iteration with quality gates
---

# Subagent-Driven Development

Execute plan by dispatching fresh subagent per task, with code review after each. Supports both legacy single-file plans and new multi-file directory plans with batch lifecycle tracking.

**Core principle:** Fresh subagent per task + review between tasks = high quality, fast iteration

**REQUIRED SUB-SKILL:** Use the plan-lifecycle skill from `.opencode/skills/plan-lifecycle/SKILL.md` for lifecycle rules when working with directory-format plans.

## Overview

**vs. Executing Plans (parallel session):**
- Same session (no context switch)
- Fresh subagent per task (no context pollution)
- Code review after each task (catch issues early)
- Faster iteration (no human-in-loop between tasks)

**When to use:**
- Staying in this session
- Tasks are mostly independent
- Want continuous progress with quality gates

**When NOT to use:**
- Need to review plan first (use executing-plans)
- Tasks are tightly coupled (manual execution better)
- Plan needs revision (brainstorm first)

## The Process

### 1. Load Plan

**Format Detection (same as executing-plans):**
1. If plan path is a `.md` file → **LEGACY** single-file plan: read it directly
2. If plan path is a directory → **NEW** multi-file plan:
   - Validate `index.md` exists (error if missing)
   - Read `index.md` for task list and batch manifest
   - Find the first batch that is NOT `.reviewed.md` and NOT `.completed.md`
   - Determine batch state:
     - **`.md` (pending):** Rename to `.in-progress.md`, load for execution
     - **`.in-progress.md` (resumed):** Load for continued execution
     - **`.verified.md` (migrated):** Load for code review only (no re-implementation)
   - Load that batch file for task details

Create TodoWrite with all tasks from the plan.

### 2. Execute Task with Subagent

For each task:

**Dispatch fresh subagent:**

For **new-format plans**, reference the current batch file (renamed to `.in-progress.md` before dispatch):
```
Task tool (general-purpose):
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N from [plan-dir]/batch-NN.in-progress.md.

    Read that task carefully. Your job is to:
    1. Implement exactly what the task specifies
    2. Write tests (following TDD if task says to)
    3. Verify implementation works
    4. Commit your work
    5. Report back

    Work from: [directory]

    Report: What you implemented, what you tested, test results, files changed, any issues
```

For **legacy plans**, reference the plan file directly:
```
Task tool (general-purpose):
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N from [plan-file].
    [... same as above ...]
```

**Subagent reports back** with summary of work.

### 3. Review Subagent's Work

**Dispatch code-reviewer subagent:**
```
Task tool (code-reviewing):
  WHAT_WAS_IMPLEMENTED: [from subagent's report]
  PLAN_OR_REQUIREMENTS: Task N from [plan-dir]/batch-NN.in-progress.md (new-format) or [plan-file] (legacy)
  BASE_SHA: [commit before task]
  HEAD_SHA: [current commit]
  DESCRIPTION: [task summary]
```

**Code reviewer returns:** Strengths, Issues (Critical/Important/Minor), Assessment

### 4. Apply Review Feedback

**If issues found:**
- Fix Critical issues immediately
- Fix Important issues before next task
- Note Minor issues

**Dispatch follow-up subagent if needed:**
```
"Fix issues from code review: [list issues]"
```

### 5. Mark Complete, Next Task

- Mark task as completed in TodoWrite
- Move to next task
- Repeat steps 2-5

### 5a. Batch Boundary (new-format plans only)

When all tasks in the current batch are complete (or for `.verified.md` batches, immediately):

1. **Dispatch code-reviewer** for the full batch (if not already done per-task)
2. **After code review approves — batch-level gate:**
   - Rename current batch file → `batch-NN.reviewed.md`
     - From `.in-progress.md` → `.reviewed.md` (normal execution)
     - From `.verified.md` → `.reviewed.md` (migrated plans — code review only)
   - This is automatic — does NOT wait for human approval
3. **Load next batch:**
   - Find the next batch that is NOT `.reviewed.md` and NOT `.completed.md`
   - If pending (`.md`): rename to `.in-progress.md`, dispatch subagents for execution
   - If verified (`.verified.md`): dispatch code-reviewer only (no re-implementation)
   - Continue dispatching subagents for tasks in the new batch
4. **After ALL batches are `.reviewed.md` — plan-level gate:**
   - Present summary to human, ask for final approval
   - After human approves: rename ALL `batch-NN.reviewed.md` → `batch-NN.completed.md`
   - Suggest: "All batches complete. Run `/archive-plan <name>` when ready to archive."

### 6. Final Review

After all tasks complete, dispatch final code-reviewer:
- Reviews entire implementation
- Checks all plan requirements met
- Validates overall architecture

### 7. Complete Development

After final review passes:
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use finishing-a-development-branch
- Follow that skill to verify tests, present options, execute choice

## Example Workflow

```
You: I'm using Subagent-Driven Development to execute this plan.

[Load plan, create TodoWrite]

Task 1: Hook installation script

[Dispatch implementation subagent]
Subagent: Implemented install-hook with tests, 5/5 passing

[Get git SHAs, dispatch code-reviewer]
Reviewer: Strengths: Good test coverage. Issues: None. Ready.

[Mark Task 1 complete]

Task 2: Recovery modes

[Dispatch implementation subagent]
Subagent: Added verify/repair, 8/8 tests passing

[Dispatch code-reviewer]
Reviewer: Strengths: Solid. Issues (Important): Missing progress reporting

[Dispatch fix subagent]
Fix subagent: Added progress every 100 conversations

[Verify fix, mark Task 2 complete]

...

[After all tasks]
[Dispatch final code-reviewer]
Final reviewer: All requirements met, ready to merge

Done!
```

## Advantages

**vs. Manual execution:**
- Subagents follow TDD naturally
- Fresh context per task (no confusion)
- Parallel-safe (subagents don't interfere)

**vs. Executing Plans:**
- Same session (no handoff)
- Continuous progress (no waiting)
- Review checkpoints automatic

**Cost:**
- More subagent invocations
- But catches issues early (cheaper than debugging later)

## Red Flags

**Never:**
- Skip code review between tasks
- Proceed with unfixed Critical issues
- Dispatch multiple implementation subagents in parallel (conflicts)
- Implement without reading plan task

**If subagent fails task:**
- Dispatch fix subagent with specific instructions
- Don't try to fix manually (context pollution)

## Integration

**Required workflow skills:**
- **writing-plans** - REQUIRED: Creates the plan that this skill executes
- **plan-lifecycle** - REQUIRED: Lifecycle rules for multi-file plans (batch renames, completion gates)
- **requesting-code-review** - REQUIRED: Review after each task (see Step 3)
- **finishing-a-development-branch** - REQUIRED: Complete development after all tasks (see Step 7)

**Subagents must use:**
- **test-driven-development** - Subagents follow TDD for each task

**Alternative workflow:**
- **executing-plans** - Use for parallel session instead of same-session execution
