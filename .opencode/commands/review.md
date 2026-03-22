---
description: Review code against plan and standards
agent: code-reviewer
subtask: true
---

Review the following code/changes: $ARGUMENTS

Use the code-reviewing skill to:

1. **Plan Alignment** - Compare implementation against requirements
2. **Code Quality** - Check patterns, error handling, maintainability
3. **Architecture** - SOLID principles, separation of concerns
4. **Documentation** - Comments, function docs, standards
5. **TDD Compliance** - Were tests written first?

Categorize issues as:
- **Critical** (must fix): Blocks deployment, security, data loss
- **Important** (should fix): Performance, maintainability
- **Minor** (suggestions): Style, optional refactoring

For each issue provide:
- Specific location (file:line)
- Actionable recommendation
- Code example if helpful

Acknowledge what was done well before highlighting issues.
