---
name: plan-lifecycle
description: Use when creating, executing, or managing implementation plans — codifies multi-file plan structure, batch lifecycle states, completion tracking, and archival rules
---

# Plan Lifecycle

## Overview

Codifies the rules for multi-file plan structure, batch lifecycle states, completion tracking, and archival. This is the single source of truth for lifecycle rules — referenced by writing-plans, executing-plans, subagent-driven-development skills, and by the planner and executor agents.

**Announce at start:** "I'm using the plan-lifecycle skill for lifecycle management."

## Plan Directory Structure

```
docs/plans/YYYY-MM-DD-<feature-name>/
├── index.md                      # Header, task table, batch manifest, dependency graph
├── batch-01.md                   # Pending — not yet started
├── batch-01.in-progress.md       # Currently being executed (renamed from batch-01.md)
├── batch-01.verified.md          # Auto-verified by /migrate-plan (migration only, never by executor)
├── batch-01.reviewed.md          # Code-reviewed + approved by code-reviewer agent
├── batch-01.completed.md         # Full plan done + human signed off
├── batch-02.md                   # Pending
└── batch-03.md                   # Pending
```

At any given time, each batch slot has exactly **one file** — its current state determines the filename.

## Batch Lifecycle States (5-State Model)

| State | Filename | Created By | Description |
|-------|----------|------------|-------------|
| Pending | `batch-NN.md` | Planner | Not yet started |
| In Progress | `batch-NN.in-progress.md` | Executor | Executor is actively running this batch |
| Verified | `batch-NN.verified.md` | `/migrate-plan` only | Files/symbols confirmed in codebase — **not** a code review; never created during normal execution |
| Reviewed | `batch-NN.reviewed.md` | Executor (after code-reviewer) | Code-reviewer agent approved; executor proceeds to next batch |
| Completed | `batch-NN.completed.md` | Executor (after human approves) | Full plan approved — all batches move to this state simultaneously |

Normal execution flow: `Pending → In Progress → Reviewed → Completed`
Migration flow only: `Pending → Verified` (`.verified.md` never appears in normal execution)

## Plan Lifecycle Script

All mechanical plan lifecycle operations (status scanning, batch state transitions,
archiving) are handled by the `plan-ctl.py` script. Agents MUST use this script
instead of manual file renames or moves.

**Script location:** `scripts/plan-ctl.py` (relative to this skill's base directory)

**Invocation:** The skill loader provides the base directory for this skill. Construct
the full path and run via `uv`:
```
uv run {base_dir}/scripts/plan-ctl.py <command> [args] [flags]
```
Where `{base_dir}` is the "Base directory for this skill" path provided by the skill loader.

**Commands:**
- `status [plan-name]` — Report state of all plans (or a single plan)
- `transition <plan-name> <batch> <new-state>` — Rename a batch file to a new state
- `archive <plan-name>` — Move a completed plan to docs/plans/archive/
- `doc-status create <path>` — Create a `.status.md` companion file for a design/investigation document
- `doc-status update <path> "<section>" <status>` — Update a section's status in an existing `.status.md` file

**Global flags:**
- `--json` — Output structured JSON instead of text
- `--no-git` — Skip automatic `git add` after file operations

**Status-specific flags:**
- `--designs` — Show only design documents
- `--investigations` — Show only investigation documents
- `--plans`, `--active`, `--completed`, `--archived`, `--legacy` — Filter plan categories

**Transition-specific flags:**
- `--migration` — Allow pending → verified transition (reserved for /migrate-plan)

**Examples:**
```bash
# Check status of all plans, designs, and investigations
uv run {base_dir}/scripts/plan-ctl.py status

# Check status of designs only
uv run {base_dir}/scripts/plan-ctl.py status --designs

# Start working on a batch
uv run {base_dir}/scripts/plan-ctl.py transition 2026-02-20-feature batch-01 in-progress

# Mark a batch as reviewed after code review
uv run {base_dir}/scripts/plan-ctl.py transition 2026-02-20-feature batch-01 reviewed

# Mark a batch as verified during migration (requires --migration flag)
uv run {base_dir}/scripts/plan-ctl.py transition 2026-02-20-feature batch-01 verified --migration

# Complete all batches after human approval
uv run {base_dir}/scripts/plan-ctl.py transition 2026-02-20-feature all completed

# Archive a completed plan
uv run {base_dir}/scripts/plan-ctl.py archive 2026-02-20-feature

# Create a status file for a design document
uv run {base_dir}/scripts/plan-ctl.py doc-status create docs/design/my-design.md

# Update a section status in a design's status file
uv run {base_dir}/scripts/plan-ctl.py doc-status update docs/design/my-design.md "Architecture" completed
```

The script enforces valid state transitions and stages changes in git automatically.
Agents should commit after script operations at logical boundaries.

## State Transitions

### PENDING → IN PROGRESS
- **Trigger:** Executor begins working on this batch
- **Action:** `uv run {base_dir}/scripts/plan-ctl.py transition <plan> batch-NN in-progress`
- **Who:** Executor agent (or subagent-driven-development orchestrator)
- **When:** Immediately before executing the first task in the batch

### IN PROGRESS → REVIEWED (batch-level gate — automatic)
- **Trigger:** All tasks in the batch pass AND code-reviewer agent approves
- **Action:** `uv run {base_dir}/scripts/plan-ctl.py transition <plan> batch-NN reviewed`
- **Who:** Executor agent
- **When:** Immediately after code-reviewer gives the green light
- **Does NOT wait for human approval** — executor immediately proceeds to next batch

### ALL REVIEWED → ALL COMPLETED (plan-level gate — human approval)
- **Trigger:** Every batch in the plan is `.reviewed.md` AND the human approves the full implementation
- **Action:** `uv run {base_dir}/scripts/plan-ctl.py transition <plan> all completed`
- **Who:** Executor agent, after human says "approved" / "looks good" / "complete"
- **When:** After the final batch reaches `.reviewed.md` state and the human reviews the full plan outcome
- **Scope:** This is a plan-level operation — ALL batches transition together

### ALL COMPLETED → ARCHIVED (explicit only)
- **Trigger:** User runs `/archive-plan <name>` command
- **Action:** `uv run {base_dir}/scripts/plan-ctl.py archive <plan>`
- **Who:** User-initiated via `/archive-plan` command
- **NOT automatic.** After plan-level completion, suggest: "All batches complete. Run `/archive-plan <name>` when ready to archive."

## Error / Rollback

- If a batch fails mid-execution, the file stays as `.in-progress.md` — this is the correct state
- The executor stops and asks for help (no `.failed.md` state)
- A stuck `.in-progress.md` is visible in `/plan-status` and signals "needs attention"
- If the human rejects at the plan-level gate, batches stay as `.reviewed.md` — the executor re-addresses specific batches as directed

## Creating a Plan (for planner / writing-plans)

1. Create directory: `docs/plans/YYYY-MM-DD-<name>/`
2. Write `index.md` with header, task table, batch manifest, dependency graph
3. Write one `batch-NN.md` per batch with context header + detailed task steps
4. Batch files are named `batch-NN.md` where NN is zero-padded to 2 digits (01–99)
   - If a plan exceeds 99 batches, use 3-digit numbering (`batch-001.md`) — but plans should have **≤10 batches**
5. Commit all plan files to git

> **Note:** The `.opencode/` configuration files (agents, skills, commands) that reference this lifecycle are NOT tracked by git. Only the plan files themselves (in `docs/plans/`) are committed.

## Executing a Plan (for executor / executing-plans / subagent-driven-development)

### Format Detection
1. Receive plan path
2. If path ends with `.md` and is a file → **LEGACY** single-file plan — execute as before, no lifecycle tracking
3. If path is a directory → **NEW** multi-file plan:
   - Validate: directory MUST contain `index.md`
   - If `index.md` is missing: report error "Invalid plan directory: missing index.md" and STOP

### Execution Flow (new format)
1. Read `index.md` for task list and batch manifest
2. Scan batch filenames to find the first batch that is NOT `.reviewed.md` and NOT `.completed.md`
3. Determine batch state and act accordingly:
   - **`.md` (pending):** Rename to `.in-progress.md`, execute all tasks, then code review
   - **`.in-progress.md` (resumed):** Continue execution from where it left off, then code review
   - **`.verified.md` (migrated):** Skip implementation (code already exists), run code review ONLY
4. After code review approval: rename to `.reviewed.md`
5. Immediately load next batch, repeat steps 2-4
6. After ALL batches are `.reviewed.md` (or `.completed.md`): present summary, ask human for final approval
7. After human approves: rename ALL `batch-NN.reviewed.md` → `batch-NN.completed.md`
8. Suggest: "All batches complete. Run `/archive-plan <name>` when ready to archive."

### Handling .verified.md Batches (migration only)
`.verified.md` batches are created by `/migrate-plan` — the code exists but has NOT been code-reviewed.
When the executor encounters a `.verified.md` batch:
1. Do NOT re-implement the tasks (the code is already in the codebase)
2. DO run the code-reviewer agent on the existing code
3. After code review approval: rename `.verified.md` → `.reviewed.md`
4. Continue to next batch

## Archiving (explicit, user-initiated)

Plans:
- `/archive-plan <name>` moves completed plan directory to `docs/plans/archive/<name>/`
- ALL batches must be `.completed.md` — error if any are pending, in-progress, or only reviewed

Designs:
- `/archive-design <name>` moves completed design + `.status.md` to `docs/design/archive/`

Investigations:
- `/archive-investigation <name>` moves completed investigation to `docs/investigation/archive/`

## Design/Investigation Tracking

Designs (`docs/design/`) and investigations (`docs/investigation/`) are single-file documents with companion `<docname>.status.md` files:

```markdown
# Status: [Document Title]

**Document:** [filename.md](filename.md)
**Created:** YYYY-MM-DD
**Status:** in-progress | completed

## Sections

| Section | Status |
|---------|--------|
| Problem | ✅ completed |
| Approach | ⬚ pending |
```

- Create `.status.md` when creating the document
- Update section statuses as work progresses
- When all sections are `✅ completed`, change top-level Status to `completed`
- Suggest archival when complete (do NOT auto-archive)

## Backward Compatibility

- Single `.md` file at `docs/plans/` = legacy plan, no lifecycle tracking
- Directory at `docs/plans/` = new multi-file plan with full lifecycle
- Both formats supported indefinitely — detection is trivial
- `/migrate-plan <name>` converts legacy → new format
- Legacy plans appear as "Legacy Plans (N single-file, not tracked)" in `/plan-status`

## Filename Reference

| Pattern | Meaning |
|---------|---------|
| `batch-NN.md` | Pending batch |
| `batch-NN.in-progress.md` | Batch currently executing |
| `batch-NN.verified.md` | Auto-verified by `/migrate-plan` only (never by executor) |
| `batch-NN.reviewed.md` | Code-reviewed and approved (batch-level gate passed) |
| `batch-NN.completed.md` | Full plan approved by human (plan-level gate passed) |
| `<docname>.status.md` | Companion status tracker for designs/investigations |
| `_original.md` | Original single-file plan preserved during migration |
