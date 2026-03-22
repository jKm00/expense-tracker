---
name: language-and-libraries
description: Use when implementing, brainstorming or planning language or library choices in the current session
---

# Architecture
Prefer using Hexagonal Architecture (Ports and Adapters) for all implementations unless explicitly instructed otherwise.

# Java
Use java 21 or newer for all implementations, version 25 or newer preferred

# Java Libraries
Never use lombok, write all boilerplate code manually.
Use Maven for all dependencies and package management.
Use latest stable versions of all libraries.
If using Spring, prefer Spring Boot 4.0.2 or newer (if newer stable release available).

# Python
Use Python 3.11 or newer for all implementations.

# Python Libraries
Use uv (astral uv) for all dependices and package manager
use PEP-723 incline dependencies if possible
example:
```
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "gooey",
#     "openpyxl",
#     "pandas",
#     "requests",
#     "XlsxWriter",
# ]
```