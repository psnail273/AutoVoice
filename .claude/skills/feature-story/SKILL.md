---
name: feature-story
description: Create a single comprehensive story file for a simple feature
argument-hint: "[feature name or description]"
allowed-tools: Read, Write, Glob, AskUserQuestion, Task
---

Create a single, comprehensive story file for the following simple feature: $ARGUMENTS

The output is a **single story file** with enough detail for autonomous implementation using `/delegated-implement` or `/solo-implement`.

## When to Use This Skill

Use `/feature-story` instead of `/feature` when:
- The feature can be implemented in a single focused unit of work
- There's no natural breakdown into multiple independent stories
- The scope is small enough that separate stories would be overhead

## Process

### Phase 1: Gather Context

1. **Gather Project Context**: Explore the codebase to understand:
   - Read the README.md, CLAUDE.md, and any docs/ folder for project purpose and goals (if they exist)
   - Identify the tech stack (languages, frameworks, databases, infrastructure)

2. **Determine Next Feature Number**: Check `docs/features/` for existing feature folders:
   - List all folders matching the pattern `N-*` (e.g., `1-UserAuth`, `2-RulesEngine`)
   - Find the highest number and increment by 1
   - If no numbered folders exist, start with `1`

3. **Analyze Relevant Code**: Use the Explore agent to find:
   - Existing architecture and patterns
   - Related features or systems that this feature might interact with
   - Technical constraints or conventions

### Phase 2: Clarify Requirements

4. **Ask Clarifying Questions**: Use AskUserQuestion to resolve unclear requirements BEFORE writing the story. Ask about:
   - Core functionality and expected behavior
   - What "done" looks like for this feature
   - Known constraints or existing patterns to follow
   - Edge cases that need explicit handling
   - Error handling expectations

### Phase 3: Generate Story

5. **Generate the Feature Folder and Story File**: 
   - Create folder: `docs/features/{N}-{FeatureName}/`
   - Create story: `docs/features/{N}-{FeatureName}/{FeatureName}.md`

   Use PascalCase for the feature name (e.g., `1-AddUserAuth/AddUserAuth.md`, `2-FixLoginBug/FixLoginBug.md`).

## Writing Guidelines

- **Be comprehensive**: This single story must contain everything needed to implement the feature
- **Be specific**: Include exact file paths, function names, and implementation details
- **Be testable**: Every acceptance criterion must be verifiable
- **Mark irrelevant sections as "N/A"**: Keep all sections but mark ones that don't apply
- **Ask, don't assume**: If something is unclear, ask before guessing

## Story Template

```markdown
# Story: {Title}

## Overview
- **Feature:** {Feature name/description}
- **Priority:** {P0/P1/P2}
- **Status:** Not Started
- **Created:** {date}

## Context

{Brief summary of why this feature/change is needed. Include relevant background information.}

## Objective

{Clear, single sentence describing what this story accomplishes.}

## Acceptance Criteria

1. {Specific, testable criterion}
2. {Criterion 2}
3. {Criterion N}

## Technical Specification

### Files to Create
| File Path | Purpose |
|-----------|---------|
| {path} | {description} |

### Files to Modify
| File Path | Changes |
|-----------|---------|
| {path} | {description of modifications} |

### Implementation Details

{Specific technical guidance: architecture, patterns, data structures, API contracts, integration points}

### Edge Cases

1. **{Edge case}**: {How to handle}

## Testing Requirements

### Unit Tests
- {Test case}

### Integration Tests
- {Test case}

### Manual Verification
- {Step to manually verify}

## Dependencies

### External
- {External services, APIs, libraries}

### Internal
- {Existing code/components this depends on}

## Risks

| Risk | Mitigation |
|------|------------|
| {Risk} | {Mitigation} |

## Implementation Notes

{Additional context, gotchas, or suggestions for the implementing agent}
```

## Output

### Files Created

1. `docs/features/{N}-{FeatureName}/` - Feature folder (numbered prefix for sorting)
2. `docs/features/{N}-{FeatureName}/{FeatureName}.md` - The complete story file (inside folder)

### Summary

Output a summary including:
- Feature number, title, and file path
- Brief description of what will be implemented
- Any unresolved questions or concerns

### Next Steps

After the story is created, implement it using either:

**With delegation (delegated-implement skill):**
```
/delegated-implement docs/features/{N}-{FeatureName}/{FeatureName}.md
```

**Without delegation (solo-implement skill):**
```
/solo-implement docs/features/{N}-{FeatureName}/{FeatureName}.md
```
