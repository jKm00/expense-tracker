---
description: Execute an implementation plan task-by-task
agent: executor
subtask: true
---

Execute the implementation plan: $ARGUMENTS

Use the executing-plans skill to:
1. Load and review the plan critically
2. Raise any concerns BEFORE starting
3. Execute tasks in batches of 3
4. Follow each step EXACTLY as written
5. Report progress between batches
6. Stop and ask when blocked

Required sub-skills during execution:
- test-driven-development for all code
- systematic-debugging if tests fail
- verification-before-completion before marking done
- finishing-a-development-branch after all tasks

Remember: Ask for clarification, never guess. Stop when blocked.
