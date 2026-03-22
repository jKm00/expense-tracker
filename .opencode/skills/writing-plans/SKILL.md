---
name: writing-plans
description: Use when design is complete and you need detailed implementation tasks for engineers with zero codebase context - creates comprehensive implementation plans with exact file paths, complete code examples, and verification steps assuming engineer has minimal domain knowledge
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** This should be run in a dedicated worktree (created by using-git-worktrees skill).

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>/` (directory format)

**REQUIRED SUB-SKILL:** Use the plan-lifecycle skill from `.opencode/skills/plan-lifecycle/SKILL.md` for directory structure, filename conventions, and lifecycle rules.

**Plan structure:**
1. Create the plan directory: `docs/plans/YYYY-MM-DD-<feature-name>/`
2. Write `index.md` first (header, task table, batch manifest, dependency graph)
3. Write one `batch-NN.md` per batch (context header + detailed task steps)
4. Each batch file is naturally small — no need for chunked writes

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Task Independence Annotation

**IMPORTANT: Mark tasks that can be executed in parallel.**

In the plan header, include:
```markdown
**Parallel Execution:** Tasks 1-3 are independent and can run in parallel.
Tasks 4-6 depend on 1-3 completing first.
```

Within tasks, annotate dependencies:
```markdown
### Task 4: [Component Name]
**Depends on:** Task 1, Task 2
**Can parallelize with:** Task 5, Task 6
```

This enables the executor to dispatch independent tasks concurrently.

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For Agent:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## index.md Template

The index file is the entry point for agents and humans. Write this file first.

```markdown
# [Feature Name] Implementation Plan

> **For Agent:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Design Document:** [Link to design doc if one exists]

---

## Tasks

| # | Task | Summary | Batch |
|---|------|---------|-------|
| 1 | [Task name] | [One-line summary] | batch-01 |
| 2 | [Task name] | [One-line summary] | batch-01 |
| 3 | [Task name] | [One-line summary] | batch-02 |

## Batches

| Batch | Tasks | Depends On |
|-------|-------|------------|
| batch-01 | 1, 2 | — |
| batch-02 | 3 | batch-01 |

> **Note:** Batch status is NOT tracked in this table. Filenames are the single source of truth
> for lifecycle state. Run `/plan-status` to see current state.

**Parallel Execution Notes:**
- batch-01: Tasks 1, 2 are fully independent — can run in parallel
- batch-02: Task 3 depends on batch-01

## Task Dependencies

| Task | Depends On | Can Parallelize With |
|------|------------|----------------------|
| 1 | — | 2 |
| 2 | — | 1 |
| 3 | 1, 2 | — |
```

## Batch File Template

Each batch file contains the detailed implementation steps. It starts with a brief context header.

Batch files are named `batch-NN.md` where NN is zero-padded to 2 digits (01–99).
Plans should have **≤10 batches** — more than 10 means the plan should be split.

```markdown
# Batch N: [Batch Title]

> **Plan:** [Feature Name]
> **Goal:** [One sentence — same as index.md]
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 1: [Task Name]

**Depends on:** [Nothing | Task N]
**Can parallelize with:** [Task N | Nothing]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

[... detailed steps ...]
```

## Task Structure (within batch files)

```markdown
    ### Task N: [Component Name]
    
    **Files:**
    - Create: `exact/path/to/file.py`
    - Modify: `exact/path/to/existing.py:123-145`
    - Test: `tests/exact/path/to/test.py`
    
    **Step 1: Write the failing test**
    
    ```python
    def test_specific_behavior():
        result = function(input)
        assert result == expected
    ```
    
    **Step 2: Run test to verify it fails**
    
    Run: `pytest tests/path/test.py::test_name -v`
    Expected: FAIL with "function not defined"
    
    **Step 3: Write minimal implementation**
    
    ```python
    def function(input):
        return expected
    ```

    **Step 4: Run test to verify it passes**
    
    Run: `pytest tests/path/test.py::test_name -v`
    Expected: PASS
    
    **Step 5: Commit**
    
    ```bash
    git add tests/path/test.py src/path/file.py
    git commit -m "feat: add specific feature"
    ```
```

## Remember
- Engineer knows nothing about this codebase
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills
- DRY, YAGNI, TDD, frequent commits

## Execution Handoff

After saving the plan:
- Offer execution choice:

**"Plan complete and saved to `docs/plans/<dirname>/`. Three execution options:**

**1. Parallel Subagents (this session, fastest)** - Dispatch independent tasks in parallel, review after each batch

**2. Sequential Subagents (this session, safest)** - Fresh subagent per task, review between tasks

**3. Parallel Session (separate session)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?"**

**If Parallel Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use subagent-driven-development
- Stay in this session
- Dispatch tasks using @parallel-orchestrator + @code-reviewers

**If Sequential Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use subagent-driven-development
- Stay in this session
- Fresh subagent (@tdd-developer, @frontend-ui-ux-engineer, etc) per task + code review

**If Parallel Session chosen:**
- Guide them to open new session in worktree
- **REQUIRED SUB-SKILL:** New session uses @executor with executing-plans and info about plan directory location (point to `index.md`)
