---
description: Archive a completed plan (all batches must be .completed.md)
---

Archive the plan specified by `$ARGUMENTS`.

**Use the plan-lifecycle skill** from `.opencode/skills/plan-lifecycle/SKILL.md` for validation rules.

## Steps

1. **Run the archive script:**
   ```
   uv run {base_dir}/scripts/plan-ctl.py archive $ARGUMENTS
   ```
   Where `{base_dir}` is the plan-lifecycle skill's base directory (from the skill loader).

2. **If the script succeeds:** Commit the change:
   ```
   git commit -m "chore: archive completed plan $ARGUMENTS"
   ```

3. **If the script fails:** Report the error message to the user. Do not attempt to work around it.

## Error Cases

The script validates all preconditions and produces specific error messages. Common errors:

- **Plan not found** — directory doesn't exist
- **Legacy plan** — single-file plan needs `/migrate-plan` first
- **Missing index.md** — invalid plan directory
- **Incomplete batches** — pending, in-progress, or only reviewed batches remain
- **Archive target exists** — plan already archived

All errors are surfaced by the script. Report the error message to the user as-is.
