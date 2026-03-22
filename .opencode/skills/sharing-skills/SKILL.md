---
name: sharing-skills
description: Use when you've developed a broadly useful skill and want to contribute it upstream via pull request - guides process of branching, committing, pushing, and creating PR to contribute skills back to upstream repository
---

# Sharing Skills

## Overview

Contribute skills from your local branch back to the upstream repository.

**Workflow:** Branch → Edit/Create skill → Commit → Push → PR

## When to Share

**Share when:**
- Skill applies broadly (not project-specific)
- Pattern/technique others would benefit from
- Well-tested and documented
- Follows writing-skills guidelines

**Keep personal when:**
- Project-specific or organization-specific
- Experimental or unstable
- Contains sensitive information
- Too narrow/niche for general use

## Prerequisites

- `gh` CLI installed and authenticated
- Working directory is your local skills clone
- **REQUIRED:** Skill has been tested using writing-skills TDD process

## Sharing Workflow

### 1. Ensure You're on Main and Synced

```bash
cd [PROJECT_ROOT]/.opencode/skill/
git checkout main
git pull upstream main
git push origin main  # Push to your fork
```

### 2. Create Feature Branch

```bash
# Branch name: add-skillname-skill
skill_name="your-skill-name"
git checkout -b "add-${skill_name}-skill"
```

### 3. Create or Edit Skill

```bash
# Work on your skill in skills/
# Create new skill or edit existing one
# Skill should be in skill/skill-name/SKILL.md
```

### 4. Commit Changes

```bash
# Add and commit
git add skill/your-skill-name/
git commit -m "Add ${skill_name} skill

$(cat <<'EOF'
Brief description of what this skill does and why it's useful.

Tested with: [describe testing approach]
EOF
)"
```

### 5. Push to Your Fork

```bash
git push -u origin "add-${skill_name}-skill"
```

### 6. Create Pull Request

```bash
# Create PR to upstream using gh CLI
gh pr create \
  --repo upstream-org/upstream-repo \
  --title "Add ${skill_name} skill" \
  --body "$(cat <<'EOF'
## Summary
Brief description of the skill and what problem it solves.

## Testing
Describe how you tested this skill (pressure scenarios, baseline tests, etc.).

## Context
Any additional context about why this skill is needed and how it should be used.
EOF
)"
```

## After PR is Merged

Once your PR is merged:

1. Sync your local main branch:
```bash
cd [PROJECT_ROOT]/.opencode/skill/
git checkout main
git pull upstream main
git push origin main
```

2. Delete the feature branch:
```bash
git branch -d "add-${skill_name}-skill"
git push origin --delete "add-${skill_name}-skill"
```

## Multi-Skill Contributions

**Do NOT batch multiple skills in one PR.**

Each skill should:
- Have its own feature branch
- Have its own PR
- Be independently reviewable

**Why?** Individual skills can be reviewed, iterated, and merged independently.

## Related Skills

- **writing-skills** - REQUIRED: How to create well-tested skills before sharing
