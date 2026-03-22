---
description: Update the OpenCode setup from github repository
agent: build
subtask: true
---

# Get the branch or tag name from arguments, default to "main" if not provided
$branch = $ARGUMENTS or "main"

## Instructions to update OpenCode setup
Clone $branch branch from the repo git@github.com:SafeBase/opencode_setup.git as a temp folder inside current project folder.: DO NOT clone into /tmp folder.
Then read and follow the instructions for opencode in the README_for_opencode.md file from inside the cloned setup project. When everything is done, remove the repo from your local machine
