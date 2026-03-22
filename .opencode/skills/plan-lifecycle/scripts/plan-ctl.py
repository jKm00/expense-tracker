#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""plan-ctl: Mechanical plan lifecycle operations for opencode plans.

Subcommands:
  status      Report plan, design, and investigation states
  transition  Change a batch's lifecycle state
  archive     Move a completed plan to archive
  doc-status  Create or update .status.md companion files

Usage:
  uv run plan-ctl.py status [plan-name] [--json] [--plans|--designs|--investigations|--active|--completed|--archived|--legacy]
  uv run plan-ctl.py transition <plan-name> <batch> <new-state> [--json] [--no-git] [--migration]
  uv run plan-ctl.py archive <plan-name|all> [--json] [--no-git]
  uv run plan-ctl.py doc-status create <path-to-doc> [--json] [--no-git]
  uv run plan-ctl.py doc-status update <path-to-doc> "<section-name>" <new-status> [--json] [--no-git]
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VALID_TRANSITIONS: dict[str, list[str]] = {
    "pending": ["in-progress"],
    "in-progress": ["reviewed"],
    "verified": ["reviewed"],
    "reviewed": ["completed"],
    "completed": [],
}

MIGRATION_TRANSITIONS: dict[str, list[str]] = {
    "pending": ["verified"],
}

STATE_SUFFIXES: dict[str, str] = {
    "pending": ".md",
    "in-progress": ".in-progress.md",
    "verified": ".verified.md",
    "reviewed": ".reviewed.md",
    "completed": ".completed.md",
}

# Status markers for .status.md companion files (designs/investigations)
STATUS_SYMBOLS: dict[str, str] = {
    "pending": "\u2b1a pending",       # ⬚ pending
    "in-progress": "\U0001f504 in-progress",  # 🔄 in-progress
    "completed": "\u2705 completed",   # ✅ completed
}

# Regex to extract status from a table row like "| Section | ✅ completed |"
STATUS_ROW_RE = re.compile(
    r"^\|\s*(.+?)\s*\|\s*(?:[\u2b1a\U0001f504\u2705]\s*)?(pending|in-progress|completed)\s*\|$"
)

# Regex to match the top-level Status field: **Status:** <value>
TOP_STATUS_RE = re.compile(r"^\*\*Status:\*\*\s+(pending|in-progress|completed)\s*$")

# Regex to match batch filenames and extract number + state
# Matches: batch-01.md, batch-01.in-progress.md, batch-01.verified.md, etc.
BATCH_RE = re.compile(
    r"^batch-(\d+)(?:\.(in-progress|verified|reviewed|completed))?\.md$"
)

# ---------------------------------------------------------------------------
# Exit codes
# ---------------------------------------------------------------------------

EXIT_SUCCESS = 0
EXIT_VALIDATION = 1  # Bad input, missing plan/batch, invalid transition
EXIT_RUNTIME = 2     # Filesystem error, git error, permissions


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def parse_batch_state(filename: str) -> tuple[int, str] | None:
    """Extract batch number and state from a batch filename.

    Returns (batch_number, state) or None if the filename doesn't match.

    Examples:
        parse_batch_state("batch-01.md") -> (1, "pending")
        parse_batch_state("batch-02.in-progress.md") -> (2, "in-progress")
        parse_batch_state("batch-03.verified.md") -> (3, "verified")
        parse_batch_state("index.md") -> None
    """
    m = BATCH_RE.match(filename)
    if not m:
        return None
    num = int(m.group(1))
    state = m.group(2) if m.group(2) else "pending"
    return (num, state)


def build_batch_filename(batch_num: int, state: str) -> str:
    """Construct a batch filename from number and state.

    Examples:
        build_batch_filename(1, "pending") -> "batch-01.md"
        build_batch_filename(2, "in-progress") -> "batch-02.in-progress.md"
    """
    suffix = STATE_SUFFIXES[state]
    return f"batch-{batch_num:02d}{suffix}"


def validate_plan_dir(plan_path: Path) -> list[tuple[int, str, str]]:
    """Validate a plan directory exists and has index.md.

    Returns list of (batch_number, state, filename) tuples sorted by batch number.
    Prints error to stderr and calls sys.exit on failure.
    """
    if not plan_path.is_dir():
        print(f"Plan not found: {plan_path}/", file=sys.stderr)
        sys.exit(EXIT_VALIDATION)
    if not (plan_path / "index.md").is_file():
        print(
            f"Invalid plan directory: {plan_path}/ is missing index.md",
            file=sys.stderr,
        )
        sys.exit(EXIT_VALIDATION)
    batches: list[tuple[int, str, str]] = []
    for f in sorted(plan_path.iterdir()):
        parsed = parse_batch_state(f.name)
        if parsed:
            batches.append((parsed[0], parsed[1], f.name))
    return batches


def git_add(paths: list[Path], *, no_git: bool) -> bool:
    """Run ``git add`` on the given paths.

    Returns True if staged successfully (or if --no-git).
    Prints error and exits with EXIT_RUNTIME on failure.
    """
    if no_git:
        return True
    try:
        result = subprocess.run(
            ["git", "add", "--"] + [str(p) for p in paths],
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        print(
            "Git error: git not found. Use --no-git to skip git staging.",
            file=sys.stderr,
        )
        print(
            "Note: file operation succeeded but git staging failed.",
            file=sys.stderr,
        )
        sys.exit(EXIT_RUNTIME)
    if result.returncode != 0:
        stderr_msg = result.stderr.strip()
        # Detect "not a git repository"
        if "not a git repository" in stderr_msg.lower():
            print(
                "Git error: not a git repository. Use --no-git to skip git staging.",
                file=sys.stderr,
            )
        else:
            print(
                f"Git error: git add failed: {stderr_msg}. Use --no-git to skip git staging.",
                file=sys.stderr,
            )
        print(
            "Note: file operation succeeded but git staging failed.",
            file=sys.stderr,
        )
        sys.exit(EXIT_RUNTIME)
    return True


def classify_plan(
    batches: list[tuple[int, str, str]],
) -> str:
    """Classify a plan based on its batch states.

    Returns one of: "completed", "active", "awaiting_code_review",
    "awaiting_final_approval".

    Classification logic (evaluated in order — first match wins):
    1. Completed — all batches are "completed"
    2. Active — any batch is "pending" or "in-progress"
    3. Awaiting Code Review — any batch is "verified" and none are pending/in-progress
    4. Awaiting Final Approval — all batches are "reviewed"
    """
    states = {state for _, state, _ in batches}
    if states == {"completed"}:
        return "completed"
    if "pending" in states or "in-progress" in states:
        return "active"
    if "verified" in states:
        return "awaiting_code_review"
    if states == {"reviewed"}:
        return "awaiting_final_approval"
    # Mixed reviewed+completed: some batches done, plan-level completion not yet triggered
    if states.issubset({"reviewed", "completed"}) and "reviewed" in states:
        return "awaiting_final_approval"
    return "active"


def status_file_path(doc_path: Path) -> Path:
    """Compute the .status.md companion file path for a document.

    Example: docs/design/my-design.md -> docs/design/my-design.status.md
    """
    return doc_path.parent / (doc_path.stem + ".status.md")


def extract_sections(doc_path: Path) -> list[str]:
    """Read a markdown file and return all ## heading names.

    Only extracts level-2 headings (## Foo). Ignores #, ###, ####, etc.
    Returns headings in document order.

    Example:
        extract_sections(Path("docs/design/my-design.md"))
        -> ["Problem", "Approach", "Architecture", "Components"]
    """
    try:
        content = doc_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"Document not found: {doc_path}", file=sys.stderr)
        sys.exit(EXIT_VALIDATION)
    except OSError as e:
        print(f"Filesystem error: could not read {doc_path}: {e}", file=sys.stderr)
        sys.exit(EXIT_RUNTIME)

    sections: list[str] = []
    for line in content.splitlines():
        # Match exactly "## Heading" (not # or ### or deeper)
        if line.startswith("## ") and not line.startswith("### "):
            heading = line[3:].strip()
            if heading:
                sections.append(heading)
    return sections


def generate_status_md(title: str, doc_filename: str, sections: list[str]) -> str:
    """Generate the content of a .status.md companion file.

    Args:
        title: The document title (from the first # heading, or the filename)
        doc_filename: The source document filename (e.g., "my-design.md")
        sections: List of ## heading names from the document

    Returns:
        Complete .status.md content as a string.
    """
    from datetime import date

    today = date.today().isoformat()
    pending_symbol = STATUS_SYMBOLS["pending"]

    lines = [
        f"# Status: {title}",
        "",
        f"**Document:** [{doc_filename}]({doc_filename})",
        f"**Created:** {today}",
        "**Status:** in-progress",
        "",
        "## Sections",
        "",
        "| Section | Status |",
        "|---------|--------|",
    ]
    for section in sections:
        lines.append(f"| {section} | {pending_symbol} |")
    lines.append("")  # trailing newline

    return "\n".join(lines)


def parse_status_file(status_path: Path) -> dict:
    """Parse a .status.md file and return structured data.

    Returns:
        {
            "name": "my-design",
            "path": "docs/design/my-design.md",
            "status_file": "docs/design/my-design.status.md",
            "status": "in-progress",
            "sections": [
                {"name": "Problem", "status": "completed"},
                {"name": "Approach", "status": "pending"},
            ],
            "sections_completed": 1,
            "sections_total": 2,
        }
    """
    try:
        content = status_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(
            f"Status file not found: {status_path}. Run doc-status create first.",
            file=sys.stderr,
        )
        sys.exit(EXIT_VALIDATION)
    except OSError as e:
        print(
            f"Filesystem error: could not read {status_path}: {e}",
            file=sys.stderr,
        )
        sys.exit(EXIT_RUNTIME)

    # Extract top-level status
    overall_status = "in-progress"
    for line in content.splitlines():
        m = TOP_STATUS_RE.match(line)
        if m:
            overall_status = m.group(1)
            break

    # Extract document reference path from **Document:** [name](name)
    doc_ref = ""
    for line in content.splitlines():
        if line.startswith("**Document:**"):
            # Extract filename from markdown link: [name.md](name.md)
            link_match = re.search(r"\[([^\]]+)\]\(([^)]+)\)", line)
            if link_match:
                doc_ref = link_match.group(2)  # the URL part
            break

    # Extract sections from table
    sections: list[dict[str, str]] = []
    for line in content.splitlines():
        m = STATUS_ROW_RE.match(line)
        if m:
            section_name = m.group(1).strip()
            section_status = m.group(2).strip()
            sections.append({"name": section_name, "status": section_status})

    # Derive the document name from the status file name
    # my-design.status.md -> my-design
    stem = status_path.name
    if stem.endswith(".status.md"):
        name = stem[: -len(".status.md")]
    else:
        name = status_path.stem

    # Compute doc path (sibling of status file)
    doc_path = str(status_path.parent / doc_ref) if doc_ref else ""

    completed_count = sum(1 for s in sections if s["status"] == "completed")

    return {
        "name": name,
        "path": doc_path,
        "status_file": str(status_path),
        "status": overall_status,
        "sections": sections,
        "sections_completed": completed_count,
        "sections_total": len(sections),
    }


def find_doc_statuses(base_dir: Path) -> list[dict]:
    """Scan a directory for .status.md companion files and return metadata.

    Silently returns an empty list if the directory doesn't exist.
    Non-fatal errors (unreadable files) are logged to stderr but don't stop scanning.

    Args:
        base_dir: Directory to scan (e.g., Path("docs/design"))

    Returns:
        List of dicts from parse_status_file(), sorted by name.
    """
    if not base_dir.is_dir():
        return []

    results: list[dict] = []
    try:
        for entry in sorted(base_dir.iterdir()):
            if entry.name == "archive":
                continue  # archived docs handled separately
            if entry.is_file() and entry.name.endswith(".status.md"):
                try:
                    data = parse_status_file(entry)
                    results.append(data)
                except SystemExit:
                    # parse_status_file calls sys.exit on errors — catch and skip
                    # This shouldn't happen for well-formed files, but we don't
                    # want one bad file to crash the entire status scan.
                    print(
                        f"Warning: could not parse {entry} — skipping. "
                        f"Recreate with `doc-status create`.",
                        file=sys.stderr,
                    )
    except OSError as e:
        print(f"Warning: could not read {base_dir}/: {e}", file=sys.stderr)

    return results


def find_archived_docs(archive_dir: Path) -> list[dict]:
    """Scan an archive directory for design/investigation documents.

    Archived docs may or may not have .status.md files. We just list them.
    Silently returns an empty list if the directory doesn't exist.

    Args:
        archive_dir: Directory to scan (e.g., Path("docs/design/archive"))

    Returns:
        List of dicts with "name" and "path" keys.
    """
    if not archive_dir.is_dir():
        return []

    results: list[dict] = []
    try:
        for entry in sorted(archive_dir.iterdir()):
            # Only include .md files that are NOT .status.md
            if (entry.is_file()
                    and entry.name.endswith(".md")
                    and not entry.name.endswith(".status.md")):
                results.append({
                    "name": entry.stem,
                    "path": str(entry),
                })
    except OSError as e:
        print(f"Warning: could not read {archive_dir}/: {e}", file=sys.stderr)

    return results


def find_all_statuses(plans_dir: Path) -> dict:
    """Scan plans, designs, and investigations and return all status data.

    Extends find_plans() with design and investigation scanning.

    The plans_dir is used to derive the design and investigation directories:
    - plans_dir = docs/plans -> design_dir = docs/design, investigation_dir = docs/investigation
    - This convention follows the standard docs/ directory layout.
    """
    # Get plan data (existing logic)
    data = find_plans(plans_dir)

    # Derive design and investigation directories from plans_dir
    # docs/plans -> docs/design, docs/investigation
    docs_root = plans_dir.parent  # docs/
    design_dir = docs_root / "design"
    investigation_dir = docs_root / "investigation"

    # Scan designs
    design_statuses = find_doc_statuses(design_dir)
    design_archived = find_archived_docs(design_dir / "archive")

    # Classify designs by status
    data["designs_in_progress"] = [
        d for d in design_statuses if d["status"] != "completed"
    ]
    data["designs_completed"] = [
        d for d in design_statuses if d["status"] == "completed"
    ]
    data["designs_archived"] = design_archived

    # Scan investigations
    investigation_statuses = find_doc_statuses(investigation_dir)
    investigation_archived = find_archived_docs(investigation_dir / "archive")

    data["investigations_in_progress"] = [
        d for d in investigation_statuses if d["status"] != "completed"
    ]
    data["investigations_completed"] = [
        d for d in investigation_statuses if d["status"] == "completed"
    ]
    data["investigations_archived"] = investigation_archived

    return data


# ---------------------------------------------------------------------------
# Status subcommand
# ---------------------------------------------------------------------------

def find_plans(plans_dir: Path) -> dict:
    """Scan the plans directory and return structured plan data.

    Returns a dict with keys: active, awaiting_code_review,
    awaiting_final_approval, completed, archived, legacy.
    """
    result: dict[str, list] = {
        "active": [],
        "awaiting_code_review": [],
        "awaiting_final_approval": [],
        "completed": [],
        "archived": [],
        "legacy": [],
    }

    if not plans_dir.is_dir():
        print(f"Plans directory not found: {plans_dir}/", file=sys.stderr)
        sys.exit(EXIT_VALIDATION)

    # Scan top-level entries
    try:
        entries = sorted(plans_dir.iterdir())
    except OSError as e:
        print(f"Filesystem error: could not read {plans_dir}/: {e}", file=sys.stderr)
        sys.exit(EXIT_RUNTIME)

    for entry in entries:
        # Skip the archive directory (handled separately)
        if entry.name == "archive":
            continue

        # Directory with index.md = new-format plan
        if entry.is_dir() and (entry / "index.md").is_file():
            batches: list[tuple[int, str, str]] = []
            for f in sorted(entry.iterdir()):
                parsed = parse_batch_state(f.name)
                if parsed:
                    batches.append((parsed[0], parsed[1], f.name))

            if not batches:
                # Directory with index.md but no batch files — treat as empty plan
                result["active"].append({
                    "name": entry.name,
                    "path": str(entry),
                    "classification": "active",
                    "batches": [],
                })
                continue

            classification = classify_plan(batches)
            plan_data = {
                "name": entry.name,
                "path": str(entry),
                "classification": classification,
                "batches": [
                    {"number": num, "state": state, "filename": fname}
                    for num, state, fname in batches
                ],
            }
            result[classification].append(plan_data)

        # .md file at top level (not inside a directory) = legacy plan
        elif entry.is_file() and entry.suffix == ".md":
            result["legacy"].append({
                "name": entry.stem,
                "path": str(entry),
            })

    # Scan archive directory
    archive_dir = plans_dir / "archive"
    if archive_dir.is_dir():
        try:
            for entry in sorted(archive_dir.iterdir()):
                if entry.is_dir() and (entry / "index.md").is_file():
                    result["archived"].append({
                        "name": entry.name,
                        "path": str(entry),
                    })
        except OSError as e:
            # Archive scan failure is non-fatal — log to stderr but continue
            print(f"Warning: could not read {archive_dir}/: {e}", file=sys.stderr)

    return result


def cmd_status(args: argparse.Namespace) -> None:
    """Report plan, design, and investigation states."""
    plans_dir = Path(args.plans_dir)
    data = find_all_statuses(plans_dir)

    # If filtering to a single plan, find it across all categories
    if args.plan_name:
        found = None
        found_category = ""
        all_categories = [
            "active", "awaiting_code_review", "awaiting_final_approval",
            "completed",
            "designs_in_progress", "designs_completed",
            "investigations_in_progress", "investigations_completed",
            "archived", "designs_archived", "investigations_archived",
            "legacy",
        ]
        for category in all_categories:
            for item in data.get(category, []):
                if item["name"] == args.plan_name:
                    found = item
                    found_category = category
                    break
            if found:
                break
        if not found:
            print(f"Plan not found: {args.plan_name}", file=sys.stderr)
            sys.exit(EXIT_VALIDATION)

        if args.json_output:
            # Output the plan dict as-is — no internal fields added
            print(json.dumps(found, indent=2))
        else:
            _print_single_plan_text(found, found_category)
        return

    # Apply filter flags
    show_categories: list[str] = []
    if args.active:
        show_categories.extend([
            "active",
            "designs_in_progress",
            "investigations_in_progress",
        ])
    if args.completed:
        show_categories.extend([
            "completed",
            "designs_completed",
            "investigations_completed",
        ])
    if args.archived:
        show_categories.extend([
            "archived",
            "designs_archived",
            "investigations_archived",
        ])
    if args.legacy:
        show_categories.append("legacy")
    if args.plans:
        show_categories.extend(["active", "awaiting_code_review",
                                 "awaiting_final_approval", "completed"])
    if args.designs:
        show_categories.extend([
            "designs_in_progress", "designs_completed", "designs_archived",
        ])
    if args.investigations:
        show_categories.extend([
            "investigations_in_progress", "investigations_completed",
            "investigations_archived",
        ])

    # If no filter flags, show everything
    if not show_categories:
        show_categories = [
            "active", "awaiting_code_review", "awaiting_final_approval",
            "completed",
            "designs_in_progress", "designs_completed",
            "investigations_in_progress", "investigations_completed",
            "archived", "designs_archived", "investigations_archived",
            "legacy",
        ]

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique_categories: list[str] = []
    for c in show_categories:
        if c not in seen:
            seen.add(c)
            unique_categories.append(c)

    # Build filtered output
    filtered = {cat: data[cat] for cat in unique_categories}

    if args.json_output:
        # For JSON output, merge design/investigation sub-categories
        # into flat "designs" and "investigations" arrays to match the design spec
        json_out: dict = {}
        for cat, items in filtered.items():
            if cat.startswith("designs_"):
                json_out.setdefault("designs", []).extend(items)
            elif cat.startswith("investigations_"):
                json_out.setdefault("investigations", []).extend(items)
            else:
                json_out[cat] = items
        # Ensure designs/investigations keys exist even if empty
        json_out.setdefault("designs", [])
        json_out.setdefault("investigations", [])
        print(json.dumps(json_out, indent=2))
    else:
        _print_status_text(filtered)


def _print_single_plan_text(plan: dict, category: str) -> None:
    """Print a single plan in human-readable text format."""
    if category in ("archived", "legacy"):
        print(f"  {plan['name']}")
    else:
        print(f"  {plan['name']}/")
        for batch in plan.get("batches", []):
            print(f"    batch-{batch['number']:02d}  {batch['state']}")


def _print_status_text(data: dict[str, list]) -> None:
    """Print all plans in human-readable text format."""
    category_headers = {
        "active": "Active Plans",
        "awaiting_code_review": "Awaiting Code Review",
        "awaiting_final_approval": "Awaiting Final Approval",
        "completed": "Completed Plans",
        "designs_in_progress": "Designs In Progress",
        "designs_completed": "Completed Designs",
        "investigations_in_progress": "Investigations In Progress",
        "investigations_completed": "Completed Investigations",
        "archived": "Archived Plans",
        "designs_archived": "Archived Designs",
        "investigations_archived": "Archived Investigations",
        "legacy": "Legacy Plans (not tracked)",
    }

    # Categories that contain design/investigation doc entries
    doc_categories = {
        "designs_in_progress", "designs_completed",
        "investigations_in_progress", "investigations_completed",
    }
    archived_doc_categories = {"designs_archived", "investigations_archived"}

    any_output = False
    for category, items in data.items():
        if not items:
            continue
        if any_output:
            print()  # blank line between sections
        header = category_headers.get(category, category)
        print(header)
        for item in items:
            if category in doc_categories:
                # Design/investigation with status tracking
                completed = item.get("sections_completed", 0)
                total = item.get("sections_total", 0)
                status = item.get("status", "")
                print(f"  {item['name']}  {status}  ({completed}/{total} sections completed)")
            elif category in archived_doc_categories:
                # Archived design/investigation (minimal info)
                print(f"  {item['name']}")
            elif category in ("archived", "legacy"):
                if category == "archived":
                    print(f"  {item['name']}/")
                else:
                    print(f"  {item['name']}.md")
            else:
                # Plan with batches
                print(f"  {item['name']}/")
                for batch in item.get("batches", []):
                    print(f"    batch-{batch['number']:02d}  {batch['state']}")
        any_output = True

    if not any_output:
        print("No plans found.")


# ---------------------------------------------------------------------------
# Transition subcommand
# ---------------------------------------------------------------------------

def _normalize_batch_arg(batch_arg: str) -> str:
    """Normalize a batch argument to the 'batch-NN' format.

    Accepts: 'batch-01', '01', '1', 'all'
    Returns: 'batch-01', 'batch-01', 'batch-01', 'all'
    """
    if batch_arg == "all":
        return "all"
    # Strip 'batch-' prefix if present
    num_str = batch_arg.removeprefix("batch-")
    try:
        num = int(num_str)
    except ValueError:
        print(
            f"Invalid batch identifier: '{batch_arg}'. "
            f"Use 'batch-NN', 'NN', or 'all'.",
            file=sys.stderr,
        )
        sys.exit(EXIT_VALIDATION)
    return f"batch-{num:02d}"


def cmd_transition(args: argparse.Namespace) -> None:
    """Change a batch's lifecycle state."""
    plans_dir = Path(args.plans_dir)
    plan_path = plans_dir / args.plan_name
    new_state = args.new_state
    no_git = args.no_git

    # Validate target state
    all_valid_states = set()
    for targets in VALID_TRANSITIONS.values():
        all_valid_states.update(targets)
    for targets in MIGRATION_TRANSITIONS.values():
        all_valid_states.update(targets)
    if new_state not in all_valid_states:
        print(
            f'Invalid state: "{new_state}". '
            f"Valid states: in-progress, verified, reviewed, completed",
            file=sys.stderr,
        )
        sys.exit(EXIT_VALIDATION)

    # Validate plan directory
    batches = validate_plan_dir(plan_path)

    # Normalize batch argument
    batch_key = _normalize_batch_arg(args.batch)

    # --- Special case: completed (plan-level, all batches) ---
    if new_state == "completed":
        if batch_key != "all":
            print(
                f"completed transition requires batch argument to be 'all'. "
                f"Got: '{args.batch}'. "
                f"Completion is a plan-level operation — all batches transition together.",
                file=sys.stderr,
            )
            sys.exit(EXIT_VALIDATION)

        # Validate all batches are reviewed
        non_reviewed = [
            (num, state, fname)
            for num, state, fname in batches
            if state != "reviewed"
        ]
        if non_reviewed:
            details = ", ".join(
                f"batch-{num:02d} is {state}" for num, state, _ in non_reviewed
            )
            print(
                f"Cannot complete plan: {details}. All batches must be reviewed.",
                file=sys.stderr,
            )
            sys.exit(EXIT_VALIDATION)

        # Perform all transitions
        transitions: list[dict] = []
        git_paths: list[Path] = []
        for num, _state, fname in batches:
            old_path = plan_path / fname
            new_fname = build_batch_filename(num, "completed")
            new_path = plan_path / new_fname
            try:
                old_path.rename(new_path)
            except OSError as e:
                print(
                    f"Filesystem error: could not rename {fname} -> {new_fname}: {e}",
                    file=sys.stderr,
                )
                sys.exit(EXIT_RUNTIME)
            git_paths.extend([old_path, new_path])
            transitions.append({
                "batch": f"batch-{num:02d}",
                "from_state": "reviewed",
                "old_filename": fname,
                "new_filename": new_fname,
            })

        git_staged = git_add(git_paths, no_git=no_git) if git_paths else True

        if args.json_output:
            print(json.dumps({
                "plan": args.plan_name,
                "batch": "all",
                "to_state": "completed",
                "transitions": transitions,
                "git_staged": git_staged and not no_git,
            }, indent=2))
        else:
            print("Transitioned all batches: reviewed -> completed")
            for t in transitions:
                print(f"  {t['old_filename']} -> {t['new_filename']}")
            if not no_git:
                print("  Staged in git.")
        return

    # --- Normal (single batch) transition ---
    if batch_key == "all":
        print(
            f"'all' batch argument is only valid for the 'completed' state. "
            f"Got state: '{new_state}'.",
            file=sys.stderr,
        )
        sys.exit(EXIT_VALIDATION)

    # Find the batch
    batch_num_str = batch_key.removeprefix("batch-")
    batch_num = int(batch_num_str)
    current_batch = None
    for num, state, fname in batches:
        if num == batch_num:
            current_batch = (num, state, fname)
            break

    if current_batch is None:
        found_list = ", ".join(fname for _, _, fname in batches) if batches else "(none)"
        print(
            f"Batch {batch_key} not found in plan {args.plan_name}/. "
            f"Found: {found_list}",
            file=sys.stderr,
        )
        sys.exit(EXIT_VALIDATION)

    cur_num, cur_state, cur_fname = current_batch

    # Check if transition is valid
    valid_targets = list(VALID_TRANSITIONS.get(cur_state, []))
    if args.migration:
        valid_targets.extend(MIGRATION_TRANSITIONS.get(cur_state, []))

    if new_state not in valid_targets:
        # Special error for verified without --migration
        if (
            new_state == "verified"
            and cur_state == "pending"
            and not args.migration
        ):
            print(
                "pending -> verified requires --migration flag. "
                "This transition is reserved for /migrate-plan only.",
                file=sys.stderr,
            )
            sys.exit(EXIT_VALIDATION)

        valid_from = list(VALID_TRANSITIONS.get(cur_state, []))
        valid_from.extend(MIGRATION_TRANSITIONS.get(cur_state, []))
        print(
            f"Invalid transition: {cur_state} -> {new_state}. "
            f"Valid transitions from {cur_state}: {', '.join(valid_from) if valid_from else 'none'}",
            file=sys.stderr,
        )
        sys.exit(EXIT_VALIDATION)

    # Perform the rename
    old_path = plan_path / cur_fname
    new_fname = build_batch_filename(cur_num, new_state)
    new_path = plan_path / new_fname
    try:
        old_path.rename(new_path)
    except OSError as e:
        print(
            f"Filesystem error: could not rename {cur_fname} -> {new_fname}: {e}",
            file=sys.stderr,
        )
        sys.exit(EXIT_RUNTIME)

    git_staged = git_add([old_path, new_path], no_git=no_git)

    if args.json_output:
        print(json.dumps({
            "plan": args.plan_name,
            "batch": batch_key,
            "from_state": cur_state,
            "to_state": new_state,
            "old_filename": cur_fname,
            "new_filename": new_fname,
            "git_staged": git_staged and not no_git,
        }, indent=2))
    else:
        print(f"Transitioned {batch_key}: {cur_state} -> {new_state}")
        print(f"  {plan_path}/{cur_fname} -> {plan_path}/{new_fname}")
        if not no_git:
            print("  Staged in git.")


# ---------------------------------------------------------------------------
# Archive subcommand
# ---------------------------------------------------------------------------

def _archive_one(
    plan_name: str,
    plans_dir: Path,
    *,
    no_git: bool = False,
) -> dict:
    """Archive a single completed plan.

    Returns a result dict with keys: plan, from_path, to_path, batches_moved.
    Raises SystemExit only on hard errors (filesystem, git).
    Raises ValueError for validation errors (incomplete plan, already archived).
    """
    plan_path = plans_dir / plan_name

    # Check for legacy single-file plan
    legacy_path = plans_dir / f"{plan_name}.md"
    if legacy_path.is_file() and not plan_path.is_dir():
        raise ValueError(
            f"Cannot archive legacy plan {plan_name}.md. "
            f"Run /migrate-plan {plan_name} first."
        )

    # Validate plan directory
    batches = validate_plan_dir(plan_path)

    # Validate that batch files exist
    if not batches:
        raise ValueError(
            f"Cannot archive: no batch files found in {plan_path}/"
        )

    # Validate all batches are completed
    non_completed = [
        (num, state, fname)
        for num, state, fname in batches
        if state != "completed"
    ]
    if non_completed:
        # Distinguish between reviewed (needs human approval) and other states
        reviewed_batches = [
            (num, state, fname)
            for num, state, fname in non_completed
            if state == "reviewed"
        ]
        other_batches = [
            (num, state, fname)
            for num, state, fname in non_completed
            if state != "reviewed"
        ]

        if reviewed_batches and not other_batches:
            details = ", ".join(
                f"batch-{num:02d} is {state}" for num, state, _ in reviewed_batches
            )
            raise ValueError(
                f"Cannot archive: {details}. "
                f"Plan has not received final human approval. "
                f"Run plan-level completion first."
            )
        else:
            details = ", ".join(
                f"batch-{num:02d} is {state}" for num, state, _ in non_completed
            )
            raise ValueError(
                f"Cannot archive: {details}. All batches must be completed."
            )

    # Check archive target doesn't exist
    archive_dir = plans_dir / "archive"
    archive_target = archive_dir / plan_name

    if archive_target.exists():
        raise ValueError(
            f"Cannot archive: {archive_target}/ already exists."
        )

    # Create archive directory if needed
    try:
        archive_dir.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        print(
            f"Filesystem error: could not create {archive_dir}/: {e}",
            file=sys.stderr,
        )
        sys.exit(EXIT_RUNTIME)

    # Move plan to archive
    try:
        shutil.move(str(plan_path), str(archive_target))
    except OSError as e:
        print(
            f"Filesystem error: could not move {plan_path}/ to archive: {e}",
            file=sys.stderr,
        )
        sys.exit(EXIT_RUNTIME)

    # Stage in git
    git_staged_ok = git_add([plan_path, archive_target], no_git=no_git)

    batch_count = len(batches)

    return {
        "plan": plan_name,
        "from_path": str(plan_path),
        "to_path": str(archive_target),
        "batches_moved": batch_count,
        "git_staged": git_staged_ok and not no_git,
    }


def cmd_archive(args: argparse.Namespace) -> None:
    """Move a completed plan (or all completed plans) to the archive directory."""
    plans_dir = Path(args.plans_dir)
    no_git = args.no_git

    # Special case: archive all completed plans
    if args.plan_name == "all":
        results: list[dict] = []
        errors: list[dict] = []  # list of {"plan": name, "type": error_type, "error": msg}
        
        # Scan for all plan directories
        if not plans_dir.is_dir():
            print(f"Plans directory not found: {plans_dir}/", file=sys.stderr)
            sys.exit(EXIT_VALIDATION)
        
        try:
            entries = sorted(plans_dir.iterdir())
        except OSError as e:
            print(f"Filesystem error: could not read {plans_dir}/: {e}", file=sys.stderr)
            sys.exit(EXIT_RUNTIME)
        
        completed_plans: list[tuple[str, list]] = []
        for entry in entries:
            # Skip archive directory
            if entry.name == "archive":
                continue
            
            # Only process directories with index.md
            if entry.is_dir() and (entry / "index.md").is_file():
                batches: list[tuple[int, str, str]] = []
                for f in sorted(entry.iterdir()):
                    parsed = parse_batch_state(f.name)
                    if parsed:
                        batches.append((parsed[0], parsed[1], f.name))
                
                # Check if plan is completed
                if classify_plan(batches) == "completed":
                    completed_plans.append((entry.name, batches))
        
        # Archive each completed plan
        for plan_name, _ in completed_plans:
            try:
                result = _archive_one(plan_name, plans_dir, no_git=no_git)
                results.append(result)
            except ValueError as e:
                # ValueError = validation error (incomplete plan, already exists, etc.)
                errors.append({"plan": plan_name, "type": "validation", "error": str(e)})
            except SystemExit as e:
                # SystemExit = runtime error (filesystem, git, etc.)
                errors.append({"plan": plan_name, "type": "runtime", "error": str(e)})
        
        # Report results
        if args.json_output:
            # JSON output includes both results and errors
            output = {
                "archived": results,
                "errors": errors,
                "archived_count": len(results),
                "error_count": len(errors),
            }
            print(json.dumps(output, indent=2))
            # Set exit code based on errors
            if errors:
                # Determine exit code from error types
                has_validation_error = any(e.get("type") == "validation" for e in errors)
                sys.exit(EXIT_VALIDATION if has_validation_error else EXIT_RUNTIME)
        else:
            if results:
                print(f"Archived {len(results)} completed plan(s):")
                for r in results:
                    print(f"  {r['plan']}")
            else:
                print("No completed plans found.")
            
            if errors:
                print(f"\nFailed to archive {len(errors)} plan(s):")
                for error_entry in errors:
                    print(f"  {error_entry['plan']}: {error_entry['error']}")
                # Determine exit code from error types
                has_validation_error = any(e.get("type") == "validation" for e in errors)
                sys.exit(EXIT_VALIDATION if has_validation_error else EXIT_RUNTIME)
        
        return

    # Single-plan archive (existing behavior)
    try:
        result = _archive_one(args.plan_name, plans_dir, no_git=no_git)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        sys.exit(EXIT_VALIDATION)

    if args.json_output:
        print(json.dumps(result, indent=2))
    else:
        print(f"Archived {result['plan']} to {result['to_path']}/")
        print(f"  Moved {result['batches_moved']} batches (all completed).")
        if not no_git:
            print("  Staged in git.")



# ---------------------------------------------------------------------------
# Subcommand: doc-status
# ---------------------------------------------------------------------------

def cmd_doc_status(args: argparse.Namespace) -> None:
    """Dispatch to create or update sub-action for doc-status."""
    action = args.doc_action
    if action == "create":
        _doc_status_create(args)
    elif action == "update":
        _doc_status_update(args)
    else:
        print(f"Unknown doc-status action: {action}", file=sys.stderr)
        sys.exit(EXIT_VALIDATION)


def _doc_status_create(args: argparse.Namespace) -> None:
    """Create a .status.md companion file for a design/investigation document."""
    doc_path = Path(args.doc_path)
    no_git = args.no_git

    # Validate source document exists
    if not doc_path.is_file():
        print(f"Document not found: {doc_path}", file=sys.stderr)
        sys.exit(EXIT_VALIDATION)

    # Compute status file path
    sf_path = status_file_path(doc_path)

    # Check if status file already exists
    if sf_path.exists():
        print(
            f"Status file already exists: {sf_path}. "
            f"Delete it manually to recreate.",
            file=sys.stderr,
        )
        sys.exit(EXIT_VALIDATION)

    # Extract ## headings from the document
    sections = extract_sections(doc_path)
    if not sections:
        print(
            f"No sections found in {doc_path}. Document must have ## headings.",
            file=sys.stderr,
        )
        sys.exit(EXIT_VALIDATION)

    # Extract title from first # heading
    title = doc_path.stem  # fallback
    try:
        content = doc_path.read_text(encoding="utf-8")
        for line in content.splitlines():
            if line.startswith("# ") and not line.startswith("## "):
                title = line[2:].strip()
                break
    except OSError:
        pass  # Use filename as fallback title

    # Generate status file content
    status_content = generate_status_md(title, doc_path.name, sections)

    # Write the status file
    try:
        sf_path.write_text(status_content, encoding="utf-8")
    except OSError as e:
        print(
            f"Filesystem error: could not write {sf_path}: {e}",
            file=sys.stderr,
        )
        sys.exit(EXIT_RUNTIME)

    # Git stage
    git_staged = git_add([sf_path], no_git=no_git)

    if args.json_output:
        print(json.dumps({
            "action": "create",
            "doc": str(doc_path),
            "status_file": str(sf_path),
            "sections_created": len(sections),
            "git_staged": git_staged and not no_git,
        }, indent=2))
    else:
        print(f"Created {sf_path} ({len(sections)} sections, all pending)")
        if not no_git:
            print("  Staged in git.")


def _doc_status_update(args: argparse.Namespace) -> None:
    """Update a section's status in an existing .status.md file."""
    doc_path = Path(args.doc_path)
    section_name = args.section_name
    new_status = args.new_status
    no_git = args.no_git

    # Validate new_status
    if new_status not in STATUS_SYMBOLS:
        print(
            f'Invalid status: "{new_status}". '
            f"Valid statuses: pending, in-progress, completed",
            file=sys.stderr,
        )
        sys.exit(EXIT_VALIDATION)

    # Compute and validate status file path
    sf_path = status_file_path(doc_path)
    if not sf_path.is_file():
        print(
            f"Status file not found: {sf_path}. Run doc-status create first.",
            file=sys.stderr,
        )
        sys.exit(EXIT_VALIDATION)

    # Read existing status file
    try:
        content = sf_path.read_text(encoding="utf-8")
    except OSError as e:
        print(
            f"Filesystem error: could not read {sf_path}: {e}",
            file=sys.stderr,
        )
        sys.exit(EXIT_RUNTIME)

    # Find and update the section in the table
    lines = content.splitlines()
    found = False
    old_status = ""
    section_names: list[str] = []

    for i, line in enumerate(lines):
        m = STATUS_ROW_RE.match(line)
        if m:
            row_section = m.group(1).strip()
            row_status = m.group(2).strip()
            section_names.append(row_section)
            if row_section == section_name:
                old_status = row_status
                new_symbol = STATUS_SYMBOLS[new_status]
                lines[i] = f"| {row_section} | {new_symbol} |"
                found = True

    if not found:
        available = ", ".join(section_names) if section_names else "(none)"
        print(
            f'Section "{section_name}" not found in {sf_path}. '
            f"Available sections: {available}",
            file=sys.stderr,
        )
        sys.exit(EXIT_VALIDATION)

    # Count completed sections after the update
    completed_count = 0
    total_count = 0
    for line in lines:
        m = STATUS_ROW_RE.match(line)
        if m:
            total_count += 1
            if m.group(2).strip() == "completed":
                completed_count += 1

    # Auto-promote/demote top-level Status
    # Guard: if no sections parsed, don't change overall status (malformed file)
    new_overall = "completed" if (total_count > 0 and completed_count == total_count) else "in-progress"
    status_line_found = False
    for i, line in enumerate(lines):
        if TOP_STATUS_RE.match(line):
            lines[i] = f"**Status:** {new_overall}"
            status_line_found = True
            break

    if not status_line_found:
        print(
            f"Malformed status file: missing **Status:** line in {sf_path}. "
            f"Please recreate with `doc-status create`.",
            file=sys.stderr,
        )
        sys.exit(EXIT_VALIDATION)

    # Write updated content
    updated_content = "\n".join(lines)
    # Ensure trailing newline
    if not updated_content.endswith("\n"):
        updated_content += "\n"

    try:
        sf_path.write_text(updated_content, encoding="utf-8")
    except OSError as e:
        print(
            f"Filesystem error: could not write {sf_path}: {e}",
            file=sys.stderr,
        )
        sys.exit(EXIT_RUNTIME)

    # Git stage
    git_staged = git_add([sf_path], no_git=no_git)

    if args.json_output:
        print(json.dumps({
            "action": "update",
            "doc": str(doc_path),
            "status_file": str(sf_path),
            "section": section_name,
            "from_status": old_status,
            "to_status": new_status,
            "sections_completed": completed_count,
            "sections_total": total_count,
            "overall_status": new_overall,
            "git_staged": git_staged and not no_git,
        }, indent=2))
    else:
        print(f"Updated {sf_path}")
        print(f'  Section "{section_name}": {old_status} -> {new_status}')
        print(
            f"  Overall status: {new_overall} "
            f"({completed_count}/{total_count} sections completed)"
        )
        if not no_git:
            print("  Staged in git.")


# ---------------------------------------------------------------------------
# Argument parser
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="plan-ctl",
        description="Mechanical plan lifecycle operations for opencode plans.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # --- status ---
    sp_status = subparsers.add_parser("status", help="Report plan and batch states")
    sp_status.add_argument("plan_name", nargs="?", default=None,
                           help="Filter to a single plan (optional)")
    sp_status.add_argument("--json", action="store_true", dest="json_output",
                           help="Output structured JSON")
    sp_status.add_argument("--plans-dir", default="docs/plans",
                           help="Override the plans directory (default: docs/plans)")
    # Filter flags (mutually exclusive would be too strict — allow combining)
    sp_status.add_argument("--plans", action="store_true",
                           help="Show only plans (exclude legacy)")
    sp_status.add_argument("--active", action="store_true",
                           help="Show only active plans")
    sp_status.add_argument("--completed", action="store_true",
                           help="Show only completed plans")
    sp_status.add_argument("--archived", action="store_true",
                           help="Show only archived plans")
    sp_status.add_argument("--legacy", action="store_true",
                           help="Show only legacy single-file plans")
    sp_status.add_argument("--designs", action="store_true",
                           help="Show only designs")
    sp_status.add_argument("--investigations", action="store_true",
                           help="Show only investigations")
    sp_status.set_defaults(func=cmd_status)

    # --- transition ---
    sp_trans = subparsers.add_parser("transition",
                                     help="Change a batch's lifecycle state")
    sp_trans.add_argument("plan_name", help="Plan directory name")
    sp_trans.add_argument("batch", help="Batch identifier (e.g., batch-01 or 01, or 'all' for completed)")
    sp_trans.add_argument("new_state",
                          help="Target state: in-progress, verified, reviewed, completed")
    sp_trans.add_argument("--json", action="store_true", dest="json_output",
                          help="Output structured JSON")
    sp_trans.add_argument("--no-git", action="store_true", dest="no_git",
                          help="Skip automatic git add after rename")
    sp_trans.add_argument("--migration", action="store_true",
                          help="Allow pending -> verified transition (for /migrate-plan only)")
    sp_trans.add_argument("--plans-dir", default="docs/plans",
                          help="Override the plans directory (default: docs/plans)")
    sp_trans.set_defaults(func=cmd_transition)

    # --- archive ---
    sp_archive = subparsers.add_parser("archive",
                                         help="Move a completed plan to archive")
    sp_archive.add_argument("plan_name", help="Plan directory name, or 'all' to archive all completed plans")
    sp_archive.add_argument("--json", action="store_true", dest="json_output",
                            help="Output structured JSON")
    sp_archive.add_argument("--no-git", action="store_true", dest="no_git",
                            help="Skip automatic git add after move")
    sp_archive.add_argument("--plans-dir", default="docs/plans",
                            help="Override the plans directory (default: docs/plans)")
    sp_archive.set_defaults(func=cmd_archive)

    # --- doc-status ---
    sp_doc = subparsers.add_parser("doc-status",
                                    help="Create or update .status.md companion files")
    doc_sub = sp_doc.add_subparsers(dest="doc_action", required=True)

    # doc-status create
    sp_doc_create = doc_sub.add_parser("create",
                                        help="Create a .status.md for a document")
    sp_doc_create.add_argument("doc_path",
                               help="Path to the design/investigation document")
    sp_doc_create.add_argument("--json", action="store_true", dest="json_output",
                               help="Output structured JSON")
    sp_doc_create.add_argument("--no-git", action="store_true", dest="no_git",
                               help="Skip automatic git add")

    # doc-status update
    sp_doc_update = doc_sub.add_parser("update",
                                        help="Update a section's status")
    sp_doc_update.add_argument("doc_path",
                               help="Path to the design/investigation document")
    sp_doc_update.add_argument("section_name",
                               help="Name of the section to update (must match a ## heading)")
    sp_doc_update.add_argument("new_status",
                               help="Target status: pending, in-progress, or completed")
    sp_doc_update.add_argument("--json", action="store_true", dest="json_output",
                               help="Output structured JSON")
    sp_doc_update.add_argument("--no-git", action="store_true", dest="no_git",
                               help="Skip automatic git add")

    sp_doc.set_defaults(func=cmd_doc_status)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
