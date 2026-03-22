---
name: executing-plans
description: Use when partner provides a complete implementation plan to execute in controlled batches with review checkpoints - loads plan, reviews critically, executes tasks in batches, reports for review between batches
---

# Executing Plans

## Overview

Load plan, review critically, execute tasks in batches, report for review between batches. Supports both legacy single-file plans and new multi-file directory plans with batch lifecycle tracking.

**Core principle:** Batch execution with checkpoints for architect review.

**REQUIRED SUB-SKILL:** Use the plan-lifecycle skill from `.opencode/skills/plan-lifecycle/SKILL.md` for lifecycle rules and filename conventions.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## The Process

### Step 1: Load and Review Plan

**Format Detection:**
1. Receive plan path
2. If path ends with `.md` and is a file → **LEGACY** single-file plan:
   - Read the file directly
   - Execute as described below (no lifecycle tracking, no batch renames)
3. If path is a directory → **NEW** multi-file plan:
   - Validate: directory MUST contain `index.md`
   - If `index.md` is missing: report error "Invalid plan directory: missing index.md" and STOP
   - Read `index.md` for task list, batch manifest, and dependency graph
   - Scan batch filenames to determine current state:
     - Find the first batch that is NOT `.reviewed.md` and NOT `.completed.md`
     - That is the next batch to work on (may be pending, in-progress, or verified)

**Review:**
1. Review plan critically — identify any questions or concerns
2. If concerns: Raise them with your human partner before starting
3. If no concerns: Create TodoWrite from the task table in `index.md` (or from the plan file for legacy), then proceed

### Step 2: Execute Batch

**For new-format plans:**
1. **Determine batch state and act accordingly:**
   - **`.md` (pending):** Transition to in-progress, then execute all tasks, then proceed to Step 3:
     ```
     uv run {base_dir}/scripts/plan-ctl.py transition <plan> batch-NN in-progress
     ```
     Where `{base_dir}` is the plan-lifecycle skill's base directory (from the skill loader).
   - **`.in-progress.md` (resumed):** Continue execution, then proceed to Step 3
   - **`.verified.md` (migrated):** Skip implementation (code exists), go directly to Step 3 for code review only
2. Read the batch file for detailed task steps
3. For each task in the batch (skip for `.verified.md`):
   a. Mark as in_progress in TodoWrite
   b. Follow each step exactly (plan has bite-sized steps)
   c. Run verifications as specified
   d. Mark as completed in TodoWrite

**For legacy plans:**
1. Default: First 5 tasks
2. For each task: mark in_progress, follow steps, verify, mark completed

### Step 3: Review and Report
When batch complete (or for `.verified.md` batches, immediately):
- Show what was implemented (or for `.verified.md`: show what exists in codebase)
- Show verification output
- Run code review (dispatch @code-reviewer)

**For new-format plans — after code review approves:**
- **Batch-level gate:** Transition the batch to reviewed:
  ```
  uv run {base_dir}/scripts/plan-ctl.py transition <plan> batch-NN reviewed
  ```
  Where `{base_dir}` is the plan-lifecycle skill's base directory (from the skill loader).
  - Works from `.in-progress.md` → `.reviewed.md` (normal execution)
  - Works from `.verified.md` → `.reviewed.md` (migrated plans — code review only, no re-implementation)
- This is automatic — does NOT wait for human approval between batches
- Immediately proceed to Step 4 to continue with next batch

**For legacy plans:**
- Say: "Ready for feedback." and wait for human response

### Step 4: Continue to Next Batch

**For new-format plans:**
- Load the next pending batch file from the plan directory
- Repeat Steps 2-3 for each batch
- Continue until all batches are `.reviewed.md`

**For legacy plans:**
- Wait for human feedback
- Apply changes if needed
- Execute next batch
- Repeat until complete

### Step 5: Plan-Level Completion (new-format plans only)

After ALL batches are `.reviewed.md`:

1. **Present summary** of all batches and their outcomes to the human
2. **Ask for final approval:** "All N batches have been code-reviewed. Please review the full implementation and confirm completion."
3. **After human approves:** Complete all batches (plan-level operation):
   ```
   uv run {base_dir}/scripts/plan-ctl.py transition <plan> all completed
   ```
   Where `{base_dir}` is the plan-lifecycle skill's base directory (from the skill loader).
4. **Suggest archival:** "All batches complete. Run `/archive-plan <name>` when ready to archive."
5. **Use finishing-a-development-branch skill** if on a development branch

### Step 6: Complete Development (legacy plans)

After all tasks complete and verified:
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use finishing-a-development-branch
- Follow that skill to verify tests, present options, execute choice

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker mid-batch (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Between batches: just report and wait
- Stop when blocked, don't guess
