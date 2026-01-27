---
name: solo-implement
description: Implement a story from start to finish without delegating to subagents
argument-hint: "[story-file-path]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch
---

# Solo Implementation Skill

Implement the story specified in: $ARGUMENTS

**You do ALL the work yourself. Do NOT delegate to subagents. Perform security analysis, implementation, and code review directly.**

## Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     IMPLEMENT SKILL                          │
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │ Security │ → │  Impl    │ → │ Security │ → │  Review  │  │
│  │  (pre)   │   │          │   │  (post)  │   │          │  │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘  │
│       ↑                              │              │        │
│       └────────── if issues ─────────┴──────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Execution Steps

Execute these steps IN ORDER, performing each one yourself.

---

## Step 1: Pre-Implementation Security Analysis

Analyze the story specification for security concerns BEFORE implementing.

### Process

1. **Read** the story file and understand the functionality being implemented
2. **Explore** existing code for security patterns in the codebase using Glob/Grep
3. **Analyze** for vulnerabilities using the Security Checklist below
4. **Research** best practices if needed via WebSearch
5. **Append** findings to the story file

### Security Checklist

| Category | Check For |
|----------|-----------|
| Input | Unvalidated user input, file uploads, URL params |
| Injection | SQL, command, XSS, CSRF, path traversal |
| Auth | Missing access control, session issues, token exposure |
| Data | Sensitive data exposure, PII handling, logging secrets |
| API | Missing rate limits, verbose errors, CORS issues |

**Always flag:** Hardcoded secrets, SQL concatenation, unvalidated redirects, missing auth on sensitive endpoints

### Output Format

Append to the story file:

```markdown
---

## Security Review

**Agent:** security
**Date:** {date}
**Mode:** Pre-Implementation

### Findings

| Concern | Risk | Avoid | Mitigation |
|---------|------|-------|------------|
| {concern} | {Critical/High/Medium/Low} | {anti-pattern} | {secure approach} |

### Details

#### {Concern Title}
- **Risk:** {level}
- **Avoid:** {what not to do}
- **Mitigation:** {how to implement securely}
```

If no concerns found:

```markdown
---

## Security Review

**Agent:** security
**Date:** {date}
**Mode:** Pre-Implementation

No security concerns identified.
```

---

## Step 2: Implementation

Implement the story according to its specification.

### Process

1. **Read** the story file and extract acceptance criteria, technical spec, and security concerns
2. **Verify** prerequisites are met (dependencies, required files exist)
3. **Explore** existing code patterns via Glob/Grep
4. **Implement** changes per technical specification
5. **Install & Build** - REQUIRED before completing:
   - Run `npm install` (or equivalent) if dependencies were added/changed
   - Run the build command (`npm run build`, `pnpm build`, etc.) to verify compilation
   - Fix any build errors before proceeding
6. **Test** by running relevant test commands (if tests exist)
7. **Append** results to the story file

### Implementation Guidelines

- Only implement what's in the spec
- Follow existing code conventions
- Handle edge cases listed in the story
- Address security concerns identified in Step 1
- Add tests for each acceptance criterion

### Error Handling

| Issue | Action |
|-------|--------|
| Missing prerequisites | Append blocker note, stop |
| Build failures | Fix the error, re-run build until it passes |
| Missing dependencies | Run `npm install` / `pnpm install` / `yarn` |
| Test failures | Attempt fix, document if unresolved |
| Ambiguous spec | Make reasonable choice, document it |

### Output Format

Append to the story file:

```markdown
---

## Implementation

**Agent:** worker
**Date:** {date}

### Changes

| File | Action | Description |
|------|--------|-------------|
| {path} | Created/Modified | {description} |

### Build Verification

- **Install:** {Ran `npm install` / Not needed}
- **Build:** {Pass / Fail - reason}

### Tests

| File | Coverage |
|------|----------|
| {path} | {what it tests} |

### Acceptance Criteria

- [x] {Criterion met}
- [ ] {Criterion not met - reason}

### Notes

{Decisions made, issues encountered, follow-up needed}
```

If blocked, append:

```markdown
---

## Implementation

**Agent:** worker
**Date:** {date}
**Status:** Blocked

### Blocker

{What's missing and why implementation cannot proceed}
```

**CRITICAL:** Never mark implementation as complete if the build fails. Fix all build errors first.

---

## Step 3: Post-Implementation Security Verification

Verify that security concerns were properly addressed and no NEW vulnerabilities were introduced.

### Process

1. **Read** the story file including the Security Review and Implementation sections
2. **Review** the actual code changes using git diff:
   ```bash
   git diff HEAD -- <modified files from Implementation section>
   ```
3. **Verify** each pre-implementation concern was addressed correctly
4. **Scan** the diff for NEW security issues not in the original review
5. **Append** findings to the story file

### What to Check

| Check | Description |
|-------|-------------|
| Concerns Addressed | Each concern from pre-implementation review was mitigated |
| No Regressions | Mitigations weren't bypassed or weakened |
| New Vulnerabilities | Code changes didn't introduce new issues |
| Secrets | No hardcoded credentials, API keys, or tokens |
| Input Handling | User input is properly validated/sanitized |

### Output Format

Append to the story file:

```markdown
---

## Security Verification

**Agent:** security
**Date:** {date}
**Mode:** Post-Implementation

### Pre-Implementation Concerns

| Concern | Status | Verification |
|---------|--------|--------------|
| {concern from review} | {Addressed / Not Addressed / Partially Addressed} | {how it was verified} |

### New Issues Found

| Issue | Risk | File | Line | Recommendation |
|-------|------|------|------|----------------|
| {issue} | {Critical/High/Medium/Low} | {path} | {line} | {fix} |

### Verdict

**{PASS / FAIL}**

{Brief explanation}
```

If no issues:

```markdown
---

## Security Verification

**Agent:** security
**Date:** {date}
**Mode:** Post-Implementation

### Pre-Implementation Concerns

{All concerns addressed OR "No pre-implementation concerns were identified"}

### New Issues Found

None

### Verdict

**PASS**

All security requirements satisfied. No new vulnerabilities introduced.
```

**If security verification FAILS:**
- Go back to Step 2 to fix the security issues
- Then repeat Step 3 to re-verify
- Maximum 2 security fix iterations

---

## Step 4: Code Review

Review the implementation changes against the story specification.

### Process

1. **Read** the story file for acceptance criteria, technical spec, and security concerns
2. **Diff** changes using `git diff` (staged and unstaged)
3. **Compare** implementation against requirements
4. **Verify** tests exist and pass
5. **Append** review results to the story file

### Review Checklist

| Category | Verify |
|----------|--------|
| Acceptance Criteria | Each criterion is satisfied by the code |
| Files | Expected files created/modified per spec |
| Edge Cases | Listed edge cases are handled |
| Security | Security concerns addressed (if any) |
| Tests | Test coverage for acceptance criteria |
| Conventions | Code follows existing project patterns |

### Git Commands

```bash
# View all changes
git diff HEAD

# View staged changes
git diff --cached

# View changed files
git diff --name-only HEAD

# View specific file
git diff HEAD -- path/to/file
```

### Output Format

Append to the story file:

```markdown
---

## Code Review

**Agent:** reviewer
**Date:** {date}

### Summary

| Category | Status |
|----------|--------|
| Acceptance Criteria | {✓ Met / ✗ Not Met} |
| Security Concerns | {✓ Addressed / ✗ Issues / N/A} |
| Test Coverage | {✓ Adequate / ✗ Gaps} |
| Code Quality | {✓ Good / ⚠ Minor Issues / ✗ Major Issues} |

### Acceptance Criteria

- [x] {Criterion 1} — {where/how verified}
- [ ] {Criterion 2} — {what's missing}

### Security

{How security concerns were addressed, or issues found}

### Issues Found

| Severity | File | Issue | Suggestion |
|----------|------|-------|------------|
| {High/Medium/Low} | {path} | {problem} | {fix} |

### Recommendations

- {Improvement suggestion}

### Verdict

**{APPROVED / CHANGES REQUESTED}**

{Brief explanation}
```

If no issues found:

```markdown
---

## Code Review

**Agent:** reviewer
**Date:** {date}

### Summary

| Category | Status |
|----------|--------|
| Acceptance Criteria | ✓ Met |
| Security Concerns | ✓ Addressed |
| Test Coverage | ✓ Adequate |
| Code Quality | ✓ Good |

### Verdict

**APPROVED**

All acceptance criteria met. Implementation follows spec and project conventions.
```

---

## Step 5: Handle Review Result

Based on your review verdict:

**If APPROVED:**
- Proceed to Step 6

**If CHANGES REQUESTED:**
- Go back to Step 2 to fix the issues
- Repeat Steps 3-4 to verify fixes
- Maximum 3 total iterations

---

## Step 6: Completion

After approval (or max iterations), append completion summary to the story file:

```markdown
---

## Completion

**Skill:** solo-implement
**Date:** {current date}
**Status:** {Complete / Needs Intervention}

### Execution Log

| Step | Phase | Result |
|------|-------|--------|
| 1 | Security (pre-implementation) | {summary} |
| 2 | Implementation | {summary} |
| 3 | Security (post-implementation) | {PASS/FAIL} |
| 4 | Code Review | {verdict} |

### Final Status

- **Iterations:** {n}
- **Security:** {PASS / FAIL}
- **Verdict:** {APPROVED / NEEDS INTERVENTION}
```

---

## Loop Control

| Review Verdict | Action |
|----------------|--------|
| APPROVED | Complete the story |
| CHANGES REQUESTED | Analyze issues, fix implementation |

**Max iterations:** 3 (security → implementation → security verification → review cycles)

If not approved after 3 iterations, mark as needs human intervention.

---

## Critical Rules

1. **Do ALL work yourself** - No delegation to subagents
2. **Execute steps IN ORDER** - Security → Implementation → Security Verification → Review
3. **ALWAYS run security twice** - Pre-implementation AND post-implementation
4. **ALWAYS append to story file** - Document each phase as you complete it
5. **ALWAYS verify build passes** - Never mark complete with build failures
6. **Respect max iterations** - Stop at 3 cycles and mark needs intervention

---

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
