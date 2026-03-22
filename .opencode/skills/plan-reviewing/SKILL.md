---
name: plan-reviewing
description: Use when a plan has been completed and needs to be reviewed against the original design plan, feature request and standards - reviews plan, identifies issues by severity, provides actionable recommendations
---

# Plan Reviewing

## Overview

Review completed plan against design plans or feature request and ensure code quality standards are met.

**Core principle:** Catch issues early through systematic review before they cascade.

## When to Use

**Use this skill when:**
- A design or implementation plan has been created
- Before starting the implementation

**Examples:**
- "I've finished creating a design plan"
- "I've finished creating an implementation plan"

## The Review Process

When reviewing completed work:

### 1. Plan Alignment Analysis
- Compare the plan against the original design planning document or feature request
- Identify any deviations from the planned approach, architecture, or requirements
- Assess whether deviations are justified improvements or problematic departures
- Verify that all functionality has been planned

### 2. Planned Code Quality Assessment
- Review any embedded code for adherence to established patterns and conventions
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
- Verify that plan includes appropriate comments and documentation
- Check that file names, function description, and inline code samples are  accurate
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
- If you find significant deviations in the plan, ask the planning agent to review and confirm the changes
- If you identify issues with the original design plan or feature request itself, recommend plan updates
- For implementation plan problems, provide clear guidance on fixes needed
- Always acknowledge what was done well before highlighting issues

## Review Template

```markdown
## Plan Review Summary

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
- **requesting-plan-review** - When review is explicitly requested

**Works with:**
- **test-driven-development** - Verify TDD was followed
- **verification-before-completion** - Confirm claims are verified
