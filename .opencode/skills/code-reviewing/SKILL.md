---
name: code-reviewing
description: Use when a major project step has been completed and needs to be reviewed against the original plan and coding standards - reviews implementation against plan, identifies issues by severity, provides actionable recommendations
---

# Code Reviewing

## Overview

Review completed project steps against original plans and ensure code quality standards are met.

**Core principle:** Catch issues early through systematic review before they cascade.

## When to Use

**Use this skill when:**
- A major project step has been completed
- Implementing a feature outlined in a plan
- Before merging to main branch
- After each task in subagent-driven development

**Examples:**
- "I've finished implementing the user authentication system as outlined in step 3 of our plan"
- "The API endpoints for the task management system are now complete"

## The Review Process

When reviewing completed work:

### 1. Plan Alignment Analysis
- Compare the implementation against the original planning document or step description
- Identify any deviations from the planned approach, architecture, or requirements
- Assess whether deviations are justified improvements or problematic departures
- Verify that all planned functionality has been implemented

### 2. Code Quality Assessment
- Review code for adherence to established patterns and conventions
- Check for proper error handling, type safety, and defensive programming
- Evaluate code organization, naming conventions, and maintainability
- Assess test coverage and quality of test implementations
- Look for potential security vulnerabilities or performance issues

### 3. Architecture and Design Review
- Ensure the implementation follows SOLID principles and established architectural patterns
- Check for proper separation of concerns and loose coupling
- Verify that the code integrates well with existing systems
- Assess scalability and extensibility considerations

### 4. Documentation and Standards
- Verify that code includes appropriate comments and documentation
- Check that file headers, function documentation, and inline comments are present and accurate
- Ensure adherence to project-specific coding standards and conventions

### 5. Issue Identification and Recommendations

**Categorize issues as:**
- **Critical (must fix)** - Blocks deployment, security risk, data loss potential
- **Important (should fix)** - Performance issues, maintainability concerns, incomplete implementation
- **Minor (suggestions)** - Style improvements, optional refactoring, nice-to-haves

**For each issue, provide:**
- Specific examples and file locations
- Actionable recommendations
- Code examples when helpful

### 6. Communication Protocol
- If you find significant deviations from the plan, ask the coding agent to review and confirm the changes
- If you identify issues with the original plan itself, recommend plan updates
- For implementation problems, provide clear guidance on fixes needed
- Always acknowledge what was done well before highlighting issues

## Review Template

```markdown
## Code Review Summary

### Reviewed
- [What was reviewed, which commits/files]

### Strengths
- [What was done well]

### Issues

**Critical:**
- [Issue description, location, fix recommendation]

**Important:**
- [Issue description, location, fix recommendation]

**Minor:**
- [Issue description, location, fix recommendation]

### Assessment
[Ready to proceed / Needs fixes before proceeding]
```

## Integration

**Called by:**
- **subagent-driven-development** - Review after each task
- **requesting-code-review** - When review is explicitly requested

**Works with:**
- **test-driven-development** - Verify TDD was followed
- **verification-before-completion** - Confirm claims are verified
