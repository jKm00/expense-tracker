---
description: Show lifecycle status of all plans, designs, and investigations
---

Scan the docs/ directory tree and report the lifecycle status of all tracked documents.

**Use the plan-lifecycle skill** from `.opencode/skills/plan-lifecycle/SKILL.md` for status interpretation rules.

## Steps

1. **Run the plan status script:**
   ```
   uv run {base_dir}/scripts/plan-ctl.py status [plan-name] [flags]
   ```
   Where `{base_dir}` is the plan-lifecycle skill's base directory (from the skill loader).

   Pass through all applicable flags from `$ARGUMENTS` directly to the script:
   - `--plans`, `--active`, `--completed`, `--archived`, `--legacy` → filter plan categories
   - `--designs` → show only design documents
   - `--investigations` → show only investigation documents
   - `--json` → output structured JSON

   The script handles all scanning, including plans, designs, and investigations.

2. **Present the script output to the user** as-is (the script produces formatted text output).

## Arguments

Optional: `$ARGUMENTS` can include:
- `--plans` — show only plans
- `--designs` — show only designs
- `--investigations` — show only investigations
- `--all` — show all types (default)
- `--active` — show only active work
- `--completed` — show only completed
- `--archived` — show only archived
- `--legacy` — show only legacy plans
- `--simple` — compact one-line-per-plan output (agent-interpreted, not passed to script)
