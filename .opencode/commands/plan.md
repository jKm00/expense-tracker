---
description: Create a detailed implementation plan for a feature
agent: planner
subtask: true
---

Create a detailed implementation plan for: $ARGUMENTS

Use the writing-plans skill to create a comprehensive plan that:
1. Assumes the implementing engineer has zero codebase context
2. Breaks work into bite-sized tasks (2-5 minutes each)
3. Provides exact file paths for all changes
4. Includes complete code examples (not "add validation")
5. Follows TDD - every feature has test-first steps
6. Includes exact commands with expected output

Save the plan to: `docs/plans/YYYY-MM-DD-<feature-name>/` (directory format with `index.md` + `batch-NN.md` files)

Use the plan-lifecycle skill for directory structure and filename conventions.

After creating the plan, offer execution options:
- Subagent-driven (same session, fresh subagent per task)
- Parallel session (separate session with executing-plans)
