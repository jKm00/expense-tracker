---
description: Create an isolated git worktree for development
agent: build
---

Create a git worktree for: $ARGUMENTS

Use the using-git-worktrees skill to:

1. Create a new branch: `feature/$ARGUMENTS` or `fix/$ARGUMENTS`
2. Create worktree in `[PROJECT_DIR]/.worktrees/<branch-name>`
3. Set up the isolated environment
4. Change to the new worktree directory

This keeps your main workspace clean while developing.

After setup, you can:
- Run /brainstorm to design the feature
- Run /plan to create implementation plan
- Run /execute to implement the plan
