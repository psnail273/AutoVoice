# Story 2: Implement Delete Rule Functionality with Confirmation

## Overview
- **Feature:** Edit and Delete Rules
- **Story:** #2 - Implement Delete Rule Functionality with Confirmation
- **Priority:** P0
- **Status:** Complete
- **Depends On:** Story #1 (icons must be present)

## Context

Users need the ability to delete rules they no longer need. This story implements the delete functionality, including a confirmation dialog to prevent accidental deletions. The delete operation should work for both active rules and other rules.

## Objective

Implement delete functionality so users can remove rules from their list. The deletion should require confirmation and update both the backend and UI immediately after confirmation.

## Acceptance Criteria

1. Clicking the delete icon on any rule opens a confirmation dialog
2. Confirmation dialog clearly indicates which rule will be deleted (shows URL pattern)
3. User can confirm or cancel the deletion
4. On confirmation, the rule is deleted from the backend via API
5. The rule is immediately removed from the UI after successful deletion
6. If the deleted rule was the active rule, the "Active Rule" section updates to show "No matching rule for this page"
7. Error messages are displayed if deletion fails (e.g., network error)
8. Delete button is disabled during the deletion operation to prevent double-clicks
9. Rules list updates correctly after deletion (other rules section updates, active rule detection updates)

## Technical Specification

### Files to Modify
| File Path | Changes |
|-----------|---------|
| `frontend/src/components/rules/rules.tsx` | Replace placeholder `handleDeleteRule` with actual implementation. Add confirmation dialog (using browser `confirm()` for MVP, or create a custom dialog component). Call `deleteRule` from `useRules` hook. Handle loading and error states. |

### Implementation Details

**Delete Handler:**
- Replace placeholder `handleDeleteRule(ruleId: number)` with actual implementation
- Use `deleteRule` method from `useRules` hook: `const { deleteRule } = useRules();`
- Show confirmation dialog before deletion
- Handle async operation with try/catch for error handling

**Confirmation Dialog:**
- **MVP Approach**: Use browser `confirm()` dialog:
  ```typescript
  const confirmed = confirm(`Are you sure you want to delete the rule for "${rule.url_pattern}"?`);
  if (confirmed) {
    // proceed with deletion
  }
  ```
- **Future Enhancement**: Consider creating a custom dialog component for better UX (not required for this story)

**Error Handling:**
- Catch errors from `deleteRule` call
- Display error message to user (can use existing error display pattern or alert)
- Ensure UI state doesn't get corrupted if deletion fails

**Loading State:**
- Add local state to track deletion in progress: `const [deletingRuleId, setDeletingRuleId] = useState<number | null>(null);`
- Set `deletingRuleId` before deletion, clear after completion
- Disable delete button when `deletingRuleId === rule.id`

**State Updates:**
- The `useRules` hook already handles state updates (removes rule from list, updates cache)
- No additional state management needed in component
- Active rule detection will automatically update since it's derived from `rules` array

**Edge Cases:**
- If deleting active rule while audio is playing: Audio should continue (it's managed separately), but active rule section will update
- Network failure: Show error, don't remove rule from UI
- Rapid clicks: Disable button during deletion prevents double-deletion

### Edge Cases

1. **Deleting active rule**: The `activeRule` is derived from `rules.find()`, so it will automatically become `null` after deletion, showing "No matching rule for this page"
2. **Deleting rule while loading**: Should be prevented by disabling buttons during loading
3. **Network error during deletion**: Error should be caught and displayed, rule remains in UI
4. **Concurrent deletions**: Each deletion is independent, but rapid clicks are prevented by loading state
5. **Deleting last rule**: Both active and other rules sections will show empty states correctly

## Testing Requirements

### Unit Tests
- N/A (manual verification sufficient)

### Integration Tests
- N/A (manual verification sufficient)

### Manual Verification

1. **Delete other rule:**
   - Have multiple rules configured
   - Click delete icon on a rule in "Rules" section
   - Verify: Confirmation dialog appears with rule URL pattern
   - Click "Cancel"
   - Verify: Rule remains in list
   - Click delete icon again, click "OK"
   - Verify: Rule is removed from list immediately
   - Verify: Other rules remain visible

2. **Delete active rule:**
   - Open extension on a page with matching rule
   - Click delete icon on active rule
   - Confirm deletion
   - Verify: Active rule section shows "No matching rule for this page"
   - Verify: Rule is removed from "Rules" section if it was there

3. **Error handling:**
   - Disconnect network or simulate API error
   - Attempt to delete a rule
   - Verify: Error message is displayed
   - Verify: Rule remains in list

4. **Loading state:**
   - Click delete icon
   - Verify: Delete button is disabled during deletion
   - Verify: Button re-enables after completion or error

5. **Multiple deletions:**
   - Delete multiple rules in sequence
   - Verify: Each deletion works correctly
   - Verify: List updates after each deletion

## Dependencies

### External
- None

### Internal
- Story #1 (icons must be present)
- `useRules` hook with `deleteRule` method
- `api.ts` with `deleteRule` function
- Backend `DELETE /rules/{id}` endpoint

## Risks

| Risk | Mitigation |
|------|------------|
| Accidental deletion | Require confirmation dialog before deletion |
| UI state corruption on error | Ensure error handling doesn't modify state, only displays error message |
| Race conditions with rapid clicks | Disable button during deletion operation |
| Active rule state inconsistency | Active rule is derived from rules array, so it updates automatically |

## Implementation Notes

- The `useRules` hook already handles API call, state update, and cache update - component just needs to call it
- Consider adding a visual indicator (spinner) on the delete button during deletion for better UX
- Browser `confirm()` is acceptable for MVP, but a custom dialog component would provide better UX (can be future enhancement)
- Error messages should be user-friendly (e.g., "Failed to delete rule. Please try again.")
- The confirmation dialog message should clearly identify which rule is being deleted

---

## Security Review

**Agent:** security
**Date:** 2026-01-26
**Mode:** Pre-Implementation

### Findings

No security concerns identified.

### Details

1. **Authorization**: The `deleteRule` API call uses `apiRequest` which automatically includes JWT authentication. Only authenticated users can delete rules, and only their own rules (enforced by backend).

2. **Input Validation**: The rule ID comes from the existing `rules` array fetched from the API, not from user input. No injection risk.

3. **CSRF Protection**: The API uses JWT tokens in headers, not cookies, so CSRF attacks are not applicable.

4. **User Confirmation**: Using browser `confirm()` dialog prevents accidental deletions.

5. **Error Handling**: Errors will be caught and displayed with user-friendly messages without exposing internal details.

6. **Race Conditions**: Disabling the delete button during deletion prevents double-click issues.

---

## Implementation

**Agent:** worker
**Date:** 2026-01-26

### Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/rules/rules.tsx` | Modified | Added `deleteRule` to destructured `useRules()`. Added `deletingRuleId` and `deleteError` state variables. Replaced placeholder `handleDeleteRule` with full implementation including confirmation dialog, loading state, and error handling. Updated delete buttons to show spinner during deletion and disable during loading. Added error message display at top of component. |

### Build Verification

- **Install:** Not needed (no dependencies changed)
- **Build:** Pass - TypeScript compilation successful (`npm run compile`)
- **Lint:** Pass - ESLint passed (`npm run lint`)

### Tests

| File | Coverage |
|------|----------|
| N/A | Manual verification required per story spec |

### Acceptance Criteria

- [x] Clicking the delete icon on any rule opens a confirmation dialog — Using browser `confirm()` with URL pattern in message
- [x] Confirmation dialog clearly indicates which rule will be deleted (shows URL pattern) — Message shows `"Are you sure you want to delete the rule for "${urlPattern}"?"`
- [x] User can confirm or cancel the deletion — Browser confirm() provides OK/Cancel options
- [x] On confirmation, the rule is deleted from the backend via API — Using `deleteRule` from `useRules` hook which calls `apiDeleteRule`
- [x] The rule is immediately removed from the UI after successful deletion — `useRules` hook updates state and cache after successful deletion
- [x] If the deleted rule was the active rule, the "Active Rule" section updates to show "No matching rule for this page" — `activeRule` is derived from `rules` array, so it automatically updates
- [x] Error messages are displayed if deletion fails — Added `deleteError` state and error display div
- [x] Delete button is disabled during the deletion operation to prevent double-clicks — Using `deletingRuleId` state and `disabled={deletingRuleId === rule.id}`
- [x] Rules list updates correctly after deletion — `useRules` hook handles state updates automatically

### Notes

- Added spinner (Loader2) inside delete button during deletion for visual feedback
- Error message uses same styling as AddRule component error for consistency
- Error is cleared before each new delete attempt
- Active rule and other rules both use the same delete handling logic

---

## Security Verification

**Agent:** security
**Date:** 2026-01-26
**Mode:** Post-Implementation

### Pre-Implementation Concerns

No pre-implementation concerns were identified.

### New Issues Found

None

### Verdict

**PASS**

All security requirements satisfied. No new vulnerabilities introduced. The diff shows:
- Rule ID comes from existing rules array (not user input) - no injection risk
- URL pattern in confirmation dialog is from rule data (not user input) - safe
- Using `deleteRule` from `useRules` hook which calls authenticated API
- Error messages are user-friendly without exposing internal details
- Browser `confirm()` prevents accidental deletions
- `deletingRuleId` state prevents race conditions from rapid clicks
- No secrets or credentials in the code

---

## Code Review

**Agent:** reviewer
**Date:** 2026-01-26

### Summary

| Category | Status |
|----------|--------|
| Acceptance Criteria | ✓ Met |
| Security Concerns | ✓ Addressed (none identified) |
| Test Coverage | ✓ Adequate (manual verification) |
| Code Quality | ✓ Good |

### Acceptance Criteria

- [x] Clicking the delete icon on any rule opens a confirmation dialog — Implemented with browser `confirm()`
- [x] Confirmation dialog clearly indicates which rule will be deleted — Shows URL pattern in message
- [x] User can confirm or cancel the deletion — Browser confirm() provides OK/Cancel
- [x] On confirmation, the rule is deleted from the backend via API — Uses `deleteRule` from `useRules` hook
- [x] The rule is immediately removed from the UI after successful deletion — `useRules` hook handles state updates
- [x] If the deleted rule was the active rule, the "Active Rule" section updates — `activeRule` is derived from `rules` array
- [x] Error messages are displayed if deletion fails — Added `deleteError` state and error display
- [x] Delete button is disabled during the deletion operation — Using `deletingRuleId` state
- [x] Rules list updates correctly after deletion — Handled by `useRules` hook

### Security

No security concerns identified. Implementation uses authenticated API calls, validates no user input (IDs come from existing data), and provides user-friendly error messages.

### Issues Found

None

### Recommendations

- Implementation correctly shows a spinner during deletion for visual feedback
- Error styling matches existing patterns in the codebase
- Consider adding a custom dialog component in future for better UX (not required for this story)

### Verdict

**APPROVED**

All acceptance criteria met. Implementation follows spec and project conventions. Build and lint pass successfully.

---

## Completion

**Skill:** solo-implement
**Date:** 2026-01-26
**Status:** Complete

### Execution Log

| Step | Phase | Result |
|------|-------|--------|
| 1 | Security (pre-implementation) | No concerns identified |
| 2 | Implementation | Successfully implemented delete functionality with confirmation |
| 3 | Security (post-implementation) | PASS - No new vulnerabilities |
| 4 | Code Review | APPROVED - All criteria met |

### Final Status

- **Iterations:** 1
- **Security:** PASS
- **Verdict:** APPROVED

### Summary

Implemented delete rule functionality with browser confirmation dialog. Added `deletingRuleId` state for loading indication, `deleteError` state for error display, and spinner feedback during deletion. The delete button is disabled during deletion to prevent double-clicks. Error messages are displayed at the top of the component. The `useRules` hook handles API calls, state updates, and cache invalidation.
