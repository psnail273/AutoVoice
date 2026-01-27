# Edit and Delete Rules Feature

## Overview
- **Feature Name:** Edit and Delete Rules
- **Document Version:** v1.0
- **Date:** 01/26/2026
- **Status:** Draft

## Problem Statement

Currently, users can create rules but cannot edit or delete them from the rules list interface. Users must manually manage rules through other means or recreate rules if they need to make changes. This creates friction in the user experience and makes rule management cumbersome.

**Current Workaround:** None - users cannot edit or delete rules through the UI.

**Why is this important now:** This is a core CRUD functionality that should be available for a complete rules management system. Users need the ability to modify rules as their needs change or remove rules that are no longer needed.

## Goals & Non-Goals

**Goals:**
- Add edit and delete icons (from lucide-react) to both the active rule and other rules in the rules list
- Enable users to edit existing rules through a form interface
- Enable users to delete rules with appropriate confirmation
- Ensure edit and delete operations work seamlessly with the existing rules management system
- Maintain consistency with existing UI patterns and component structure

**Non-Goals:**
- Bulk edit or delete operations (single rule operations only)
- Rule versioning or history tracking
- Undo functionality for deleted rules
- Drag-and-drop reordering of rules

## User Stories

| # | Title | Priority |
|---|-------|----------|
| 1 | Add edit and delete icons to rules list UI | P0 |
| 2 | Implement delete rule functionality with confirmation | P0 |
| 3 | Implement edit rule functionality | P0 |

## Functional Requirements

### Edit Functionality
- Users can click the edit (pencil) icon on any rule (active or other rules) to open an edit form
- The edit form should pre-populate with the rule's current values
- Users can modify any field: URL pattern, keep selectors, ignore selectors, enabled status, auto_extract status
- After saving, the rule list should update to reflect changes
- If editing the active rule, the UI should update immediately to show the new values
- Form validation should match the create rule form (URL pattern required, etc.)

### Delete Functionality
- Users can click the delete (trash) icon on any rule (active or other rules)
- A confirmation dialog should appear before deletion
- After confirmation, the rule should be removed from the backend and the UI
- If deleting the active rule, the "Active Rule" section should show "No matching rule for this page"
- The rules list should update immediately after deletion
- Deletion should handle errors gracefully (e.g., network failures)

### UI Requirements
- Edit icon (pencil) and delete icon (trash) should be visible on both active rule card and other rule cards
- Icons should be from the lucide-react library (`Pencil` and `Trash2`)
- Icons should be appropriately sized and positioned for easy access
- Icons should have hover states and be clearly clickable
- Icons should be disabled during loading states
- The UI should provide visual feedback during edit/delete operations

## Technical Approach

### High-Level Architecture
- Reuse existing `AddRule` component for editing by adding an optional `initialRule` prop
- Add icon buttons to the `CardHeader` (for active rule) and `CardContent` (for other rules) in `rules.tsx`
- Use existing `updateRule` and `deleteRule` methods from `useRules` hook
- Create a confirmation dialog component for delete operations (or use browser confirm for MVP)

### Key Components Affected
- `frontend/src/components/rules/rules.tsx` - Add edit/delete icons and handlers
- `frontend/src/components/rules/addRule.tsx` - Modify to support edit mode with pre-filled data
- Potentially create `frontend/src/components/rules/EditRule.tsx` if AddRule cannot be easily adapted

### Data Model Changes
- None - existing `RuleResponse`, `RuleUpdate` types are sufficient

### API Changes
- None - existing PUT `/rules/{id}` and DELETE `/rules/{id}` endpoints are sufficient

### Integration Points
- `useRules` hook already provides `updateRule` and `deleteRule` methods
- `api.ts` already has `updateRule` and `deleteRule` functions
- Backend endpoints already exist for update and delete operations

## Dependencies

### External
- lucide-react library (already installed)

### Internal
- `useRules` hook with `updateRule` and `deleteRule` methods
- `AddRule` component (may need modification for edit mode)
- Existing rule API endpoints (`PUT /rules/{id}`, `DELETE /rules/{id}`)

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Accidental deletion of rules | High | Medium | Require confirmation dialog before deletion |
| Edit form not pre-populating correctly | Medium | Low | Thoroughly test form initialization with existing rule data |
| Active rule edit causing UI inconsistencies | Medium | Low | Ensure state updates properly after edit, refresh active rule detection |
| Network errors during edit/delete | Medium | Medium | Show error messages, maintain optimistic UI updates where possible |
| AddRule component becoming too complex | Low | Medium | Consider creating separate EditRule component if AddRule becomes unwieldy |
