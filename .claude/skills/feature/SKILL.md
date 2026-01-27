---
name: feature
description: Break down a feature into implementable user stories and detailed story specs
argument-hint: "[feature name or description]"
allowed-tools: Read, Write, Glob, AskUserQuestion, Task
---

Break down the following feature into a clear implementation plan with detailed story files: $ARGUMENTS

The output is a **Feature Spec** with prioritized user stories, plus **individual story files** with enough detail for autonomous implementation.

## Process

### Phase 1: Feature Specification

1. **Gather Project Context**: Before anything else, explore the codebase to understand:
   - Read the README.md, CLAUDE.md, and any docs/ folder for project purpose and goals (if they exist)
   - Check `docs/features/` for existing feature specs and match their style/tone (if none exist, reference `.claude/skills/feature/EXAMPLE.md` for the expected style)
   - Identify the tech stack (languages, frameworks, databases, infrastructure)

2. **Determine Next Feature Number**: Check `docs/features/` for existing feature folders:
   - List all folders matching the pattern `N-*` (e.g., `1-UserAuth`, `2-RulesEngine`)
   - Find the highest number and increment by 1
   - If no numbered folders exist, start with `1`

3. **Analyze Relevant Code**: Use the Explore agent to find:
   - Existing architecture and patterns
   - Related features or systems that this feature might interact with
   - Technical constraints or conventions

4. **Ask Clarifying Questions**: Use AskUserQuestion to resolve any unclear requirements BEFORE writing the feature spec. Ask about:
   - Core functionality and expected behavior
   - What "done" looks like for this feature
   - Known constraints or existing patterns to follow
   - Anything needed to break this into implementable steps

5. **Generate the Feature Spec**: Create the feature folder and spec file:
   - Create folder: `docs/features/{N}-{FeatureName}/`
   - Create spec: `docs/features/{N}-{FeatureName}/{FeatureName}.md` following the Feature Template below

### Phase 2: Story Expansion

6. **Ask Story-Specific Questions**: For each user story, use AskUserQuestion to clarify:
   - Specific behavior details not covered in the feature spec
   - Edge cases that need explicit handling
   - UI/UX specifics if applicable
   - Error handling expectations

   **Batch questions by story** so the user can provide context efficiently.

7. **Generate Story Files**: For each user story, create a detailed story file at:
   ```
   docs/features/{N}-{FeatureName}/stories/{StoryNum}-{StoryName}.md
   ```

8. **Create Index**: Create `docs/features/{N}-{FeatureName}/README.md` linking all stories

## Writing Guidelines

- **Focus on User Stories**: This is the core deliverable - make them clear and actionable
- **Be concise elsewhere**: 1-2 paragraphs or bullet points for context sections
- **Mark irrelevant sections as "N/A"**: Keep all sections but mark ones that don't apply
- **Ask, don't assume**: If something is unclear, ask before guessing

## Feature Template

Write the feature spec in markdown format with these sections:

### 1. Overview
- Feature name
- Document version and date (Ex. v1.0 01/26/2026)
- Status: Draft

### 2. Problem Statement
- What problem does this solve?
- What is the current workaround (if any)?
- Why is this important now?

### 3. Goals & Non-Goals
**Goals:**
- List specific, measurable objectives

**Non-Goals:**
- Explicitly state what this feature will NOT do

### 4. User Stories (Primary Focus)
| # | Title | Priority |
|---|-------|----------|
| 1 | [Short title of user story] | P0 |

This is the most important section. Each story should be:
- **Implementable in isolation** - Can be completed and tested independently
- **Ordered by dependency** - Earlier stories must not depend on later ones
- **Minimal but complete** - Include only what's needed to deliver the feature

Priority: P0 (must have), P1 (should have), P2 (nice to have)

### 5. Functional Requirements
- Detailed feature requirements
- Acceptance criteria for each requirement
- Edge cases to handle

### 6. Technical Approach
- High-level architecture
- Key components affected
- Data model changes (if any)
- API changes (if any)
- Integration points

### 7. Dependencies
- External services or APIs
- Other features or systems
- Libraries or packages

### 8. Risks & Mitigations
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|

## Story Template

For each user story, create a file with these sections:

```markdown
# Story {N}: {Title}

## Overview
- **Feature:** {Feature name}
- **Story:** #{N} - {Title}
- **Priority:** {P0/P1/P2}
- **Status:** Not Started
- **Depends On:** {List of prerequisite story numbers, or "None"}

## Context

{Brief summary of the feature and why this story exists.}

## Objective

{Clear, single sentence describing what this story accomplishes.}

## Acceptance Criteria

1. {Specific, testable criterion}
2. {Criterion 2}

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
- {Other stories that must be complete first}
- {Existing code/components this depends on}

## Risks

| Risk | Mitigation |
|------|------------|
| {Risk} | {Mitigation} |

## Implementation Notes

{Additional context, gotchas, or suggestions for the implementing agent}
```

## Index Template

Create `docs/features/{N}-{FeatureName}/README.md`:

```markdown
# {Feature Name} - Implementation Stories

**Feature Spec:** [{FeatureName}.md]({FeatureName}.md)
**Generated:** {date}

## Stories

| # | Title | Priority | Status | Depends On |
|---|-------|----------|--------|------------|
| 1 | [{title}](stories/1-{StoryName}.md) | P0 | Not Started | None |
| 2 | [{title}](stories/2-{StoryName}.md) | P0 | Not Started | #1 |

## Implementation Order

Stories should be implemented in numerical order. Each story is designed to be:
- Implementable in isolation (given dependencies are complete)
- Testable independently
- Deliverable as a single unit of work

## How to Implement

Implement each story using one of:

**With delegation (spawns security, worker, reviewer agents):**
```
/delegated-implement docs/features/{N}-{FeatureName}/stories/{StoryNum}-{StoryName}.md
```

**Without delegation (does all work directly):**
```
/solo-implement docs/features/{N}-{FeatureName}/stories/{StoryNum}-{StoryName}.md
```
```

## Output

### Files Created

1. `docs/features/{N}-{FeatureName}/` - Feature folder (numbered prefix for sorting)
2. `docs/features/{N}-{FeatureName}/{FeatureName}.md` - Feature spec (inside folder)
3. `docs/features/{N}-{FeatureName}/README.md` - Story index
4. `docs/features/{N}-{FeatureName}/stories/{StoryNum}-{StoryName}.md` - One per user story

### Summary

Output a summary including:
- Feature name, number, and number of stories
- List of generated files
- Any unresolved questions or concerns

### Next Steps

After the feature and stories are created, implement the first story using either:

**With delegation (delegated-implement skill):**
```
/delegated-implement docs/features/{N}-{FeatureName}/stories/1-{StoryName}.md
```

**Without delegation (solo-implement skill):**
```
/solo-implement docs/features/{N}-{FeatureName}/stories/1-{StoryName}.md
```