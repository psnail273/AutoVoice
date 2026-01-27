---
name: delegated-implement
description: Implement a story by delegating to security, worker, and reviewer agents
argument-hint: "[story-file-path]"
allowed-tools: Read, Edit, Task, Bash
---

# Delegated Implementation Skill

Implement the story specified in: $ARGUMENTS

**You are an orchestrator. You MUST delegate ALL work to specialized agents using the Task tool. Do NOT perform implementation, security analysis, or code review yourself.**

## Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     STORY SKILL                              │
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │ security │ → │  worker  │ → │ security │ → │ reviewer │  │
│  │  (pre)   │   │          │   │  (post)  │   │          │  │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘  │
│       ↑                              │              │        │
│       └────────── if issues ─────────┴──────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Execution Steps

Execute these steps IN ORDER. Each step MUST use the Task tool to spawn a subagent.

### Step 1: Pre-Implementation Security Analysis

Spawn the security agent to analyze the story specification:

```
Task tool call:
  subagent_type: "security"
  description: "Security analysis (pre-implementation)"
  prompt: |
    Analyze the story file for security concerns BEFORE implementation.

    Story file: $ARGUMENTS

    Follow the instructions in .claude/agents/security.md.
    Since there is no Implementation section yet, run Pre-Implementation Analysis.

    Return a brief summary: "{N} concerns found" or "No security concerns found"
```

**Wait for security agent to complete before proceeding.**

### Step 2: Implementation

Spawn the worker agent:

```
Task tool call:
  subagent_type: "worker"
  description: "Implement story"
  prompt: |
    Implement the story according to its specification.

    Story file: $ARGUMENTS

    Follow the instructions in .claude/agents/worker.md:
    1. Read the story file (including any security concerns added)
    2. Implement the changes per the technical specification
    3. Address any security concerns identified in the Security Review
    4. Run any relevant tests
    5. Append your implementation summary to the story file

    Return a brief summary of changes made.
```

**Wait for worker agent to complete before proceeding.**

### Step 3: Post-Implementation Security Verification

Spawn the security agent again to verify the implementation:

```
Task tool call:
  subagent_type: "security"
  description: "Security verification (post-implementation)"
  prompt: |
    Verify the implementation addressed security concerns and introduced no new vulnerabilities.

    Story file: $ARGUMENTS

    Follow the instructions in .claude/agents/security.md.
    Since there IS an Implementation section, run Post-Implementation Verification.

    Return: "PASS" or "FAIL: {reason}"
```

**Wait for security agent to complete.**

**If security verification FAILS:**
- Spawn worker agent again with the security issues to fix
- Then spawn security agent again to re-verify
- Maximum 2 security fix iterations

### Step 4: Code Review

Spawn the reviewer agent:

```
Task tool call:
  subagent_type: "reviewer"
  description: "Review implementation"
  prompt: |
    Review the implementation against the story specification.

    Story file: $ARGUMENTS

    Follow the instructions in .claude/agents/reviewer.md:
    1. Read the story file for acceptance criteria
    2. Use git diff to review the changes
    3. Verify acceptance criteria are met
    4. Verify security verification passed
    5. Append your review to the story file

    Return your verdict: "APPROVED" or "CHANGES REQUESTED: [reason]"
```

### Step 5: Handle Review Result

Based on the reviewer's verdict:

**If APPROVED:**
- Proceed to Step 6

**If CHANGES REQUESTED:**
- Spawn worker agent again with the feedback
- Spawn security agent (post-implementation) to verify fixes
- Spawn reviewer agent again to verify fixes
- Maximum 3 total iterations

### Step 6: Completion

After approval (or max iterations), append completion summary to the story file:

```markdown
---

## Completion

**Skill:** delegated-implement
**Date:** {current date}
**Status:** {Complete / Needs Intervention}

### Execution Log

| Step | Agent | Mode | Result |
|------|-------|------|--------|
| 1 | security | pre-implementation | {summary} |
| 2 | worker | - | {summary} |
| 3 | security | post-implementation | {PASS/FAIL} |
| 4 | reviewer | - | {verdict} |

### Final Status

- **Iterations:** {n}
- **Security:** {PASS / FAIL}
- **Verdict:** {APPROVED / NEEDS INTERVENTION}
```

## Critical Rules

1. **NEVER skip the Task tool** - Every agent must be spawned via Task
2. **NEVER implement code yourself** - Only the worker agent implements
3. **NEVER review code yourself** - Only the reviewer agent reviews
4. **NEVER analyze security yourself** - Only the security agent analyzes
5. **ALWAYS wait for each agent** - Do not proceed until the previous agent completes
6. **ALWAYS pass the story file path** - Each agent needs the full path to the story file
7. **ALWAYS run security twice** - Pre-implementation AND post-implementation

## Output

Return a brief summary:

```
Story: {story title}
Status: {COMPLETE / NEEDS INTERVENTION}
Iterations: {n}
Security (pre): {concerns found or "None"}
Security (post): {PASS / FAIL}
Changes: {files modified}
Review: {APPROVED / issues}
```
