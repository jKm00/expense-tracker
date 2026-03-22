---
description: Execute multiple tasks in parallel using isolated git worktrees
agent: parallel-orchestrator
subtask: true
---

Execute these tasks in parallel with git worktree isolation: $ARGUMENTS

Use the **dispatching-parallel-agents** and **using-git-worktrees** skills together.

## Benefits
- True isolation - tasks can edit ANY files
- Clean git history with feature branches
- No file conflicts during parallel work
- Easy rollback if one task fails
