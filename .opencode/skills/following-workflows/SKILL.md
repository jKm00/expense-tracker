---
name: following-workflows
description: How to follow workflows, depending on the task. Use when receiving a prompt from the user, or you complete a major project step
---

# Finding correct workflows

## Overview

Review your agent instructions to see if you have specific workkflows specified
**Core principle:** If you have workkflows defined, then always follow these, no exceptions!

## When to Use

**Use this skill when:**
- A major project step has been complete
- The user gives you a prompt

**Examples:**
- "I've finished implementing the user authentication system as outlined in step 3 of our plan, and there are no known issues"
- "The API endpoints for the task management system are now complete and fully reviewed"
- User: "I need you to ..."
- User: "Make a design for ..."

## The process

When looking for workflows:
Look though your agent instructions:
- look for specified workflow triggers
  - If any of them match, follow the specified workflow
- look though the workflows
  - if any of them seems to match the task at hand, follow the workflow
- if no specified workflow seems to match, suggest a workflow using available subagents
  -  NEVER do ad hoc work without running workflows that dispach work to subagents
