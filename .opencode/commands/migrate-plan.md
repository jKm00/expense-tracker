---
description: Convert a legacy single-file plan to multi-file directory format
---

Convert the legacy plan specified by `$ARGUMENTS` to the new multi-file directory format.

**Use the plan-lifecycle skill** from `.opencode/skills/plan-lifecycle/SKILL.md` for directory structure, filename conventions, and verification rules.

## Steps

1. **Validate input:**
   - Parse plan name from `$ARGUMENTS` (e.g., `2026-02-18-sd-image-build-plan`)
   - Check that `docs/plans/<name>.md` exists and is a file
   - Error if file not found: "Plan not found: `docs/plans/<name>.md`"
   - Error if already a directory: "Plan `<name>` is already in directory format"

2. **Parse the single-file plan:**
   - Read `docs/plans/<name>.md`
   - Extract header: Goal, Architecture, Tech Stack, Parallel Execution notes
   - Extract all tasks: Task number, name, summary, dependency annotations (`**Depends on:**`, `**Can parallelize with:**`)
   - Extract any existing batch/parallel execution groupings from the plan header

3. **Compute batch boundaries:**
   - Use dependency annotations to group tasks into batches
   - If the plan has explicit parallel execution notes (e.g., "Tasks 1-3 are independent"), use those as batch boundaries
   - If no explicit groupings, use dependency graph: tasks with no unmet dependencies go in the same batch
   - Target 3-5 tasks per batch when possible (but follow dependencies over size targets)

4. **Create the new directory structure:**
   - Create directory: `docs/plans/<name>/`

5. **Write `index.md`:**
   - Copy the plan header (Goal, Architecture, Tech Stack)
   - Add `> **For Agent:** REQUIRED SUB-SKILL: Use executing-plans skill to implement this plan task-by-task.`
   - Build the Tasks table: `| # | Task | Summary | Batch |`
   - Build the Batches table: `| Batch | Tasks | Depends On |`
   - Add the note: "Batch status is NOT tracked in this table. Filenames are the single source of truth."
   - Add Parallel Execution Notes from the original plan
   - Build Task Dependencies table: `| Task | Depends On | Can Parallelize With |`

6. **Write batch files:**
   - For each batch, create `batch-NN.md` with:
     - Context header: `# Batch N: [Title]`
     - `> **Plan:** [Plan Name]`
     - `> **Goal:** [Goal from header]`
     - `> **See:** [index.md](index.md) for full architecture, dependencies, and task list`
     - `---`
     - All tasks assigned to this batch (copy task content verbatim from original)

7. **Smart Verification — check if tasks are already implemented:**

   For each task in the plan:

   a. **Read the task description** and identify specific file paths, function names, config values, or other concrete artifacts mentioned

   b. **Check if those files/symbols exist** in the current codebase:
      - Use `ls`, `grep`, or `find` to check for file existence
      - Use `grep` to check for function/class/variable names in expected files
      - No test execution required — this is a presence check only

   c. **Classify each task:**
      - **Clearly implemented** — Key files/symbols from the task description exist → mark as verified
      - **Ambiguous** — Files exist but differ from plan, or no specific files/symbols to check → ask the human: "Task N: [description] — does this appear to have been implemented? [Yes/No/Skip]"
      - **Clearly NOT implemented** — Expected files/code don't exist → leave as pending

   d. **Determine batch-level state:**
      - If ALL tasks in a batch are verified → transition to verified:
        ```
        uv run {base_dir}/scripts/plan-ctl.py transition <plan-name> batch-NN verified --migration
        ```
        Where `{base_dir}` is the plan-lifecycle skill's base directory (from the skill loader).
      - If ANY task is not implemented or skipped → leave as `batch-NN.md` (pending)

8. **Preserve the original file:**
   - Move `docs/plans/<name>.md` → `docs/plans/<name>/_original.md`

9. **Commit the migration:**
   ```
   git add docs/plans/<name>/
   git add docs/plans/<name>.md  # stages the deletion of the original file
   git commit -m "chore: migrate plan <name> to multi-file directory format"
   ```

10. **Report summary:**
   ```
   Migrated to docs/plans/<name>/
   - Batches 1-3: verified (files/symbols found in codebase)
   - Batch 4: pending (tasks 10, 11 not found in codebase)
   ```
   - If all batches are `.verified.md`: "All batches auto-verified. Consider running code review on batches, then run plan-level approval to mark completed."

## Error Cases

- Plan file not found → "Plan not found: `docs/plans/<name>.md`"
- Plan is already a directory → "Plan `<name>` is already in directory format"
- Directory already exists → "Directory `docs/plans/<name>/` already exists. Remove it first or choose a different name."
