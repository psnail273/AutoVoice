# Story 3: Implement Edit Rule Functionality

## Overview
- **Feature:** Edit and Delete Rules
- **Story:** #3 - Implement Edit Rule Functionality
- **Priority:** P0
- **Status:** Complete
- **Depends On:** Story #1 (icons must be present)

## Context

Users need the ability to edit existing rules to update URL patterns, selectors, or other rule properties. This story implements the edit functionality by reusing the existing `AddRule` component in edit mode, pre-populated with the rule's current values.

## Objective

Implement edit functionality so users can modify existing rules. Clicking the edit icon should open a form pre-filled with the rule's current values, and saving should update the rule in both backend and UI.

## Acceptance Criteria

1. Clicking the edit icon on any rule opens an edit form
2. The edit form is pre-populated with the rule's current values (URL pattern, keep selectors, ignore selectors, enabled, auto_extract)
3. Users can modify any field in the edit form
4. Form validation matches the create rule form (URL pattern required, etc.)
5. On save, the rule is updated in the backend via API
6. The rule list updates immediately after successful save to show the new values
7. If editing the active rule, the active rule section updates to show the new URL pattern
8. Users can cancel editing to return to the rules list without changes
9. Error messages are displayed if update fails (e.g., network error, validation error)
10. Save button is disabled during the update operation to prevent double-submission

## Technical Specification

### Files to Modify
| File Path | Changes |
|-----------|---------|
| `frontend/src/components/rules/rules.tsx` | Replace placeholder `handleEditRule` with actual implementation. Add state to track which rule is being edited. Pass rule data to AddRule component when editing. Handle save and cancel for edit mode. |
| `frontend/src/components/rules/addRule.tsx` | Add optional `initialRule` prop of type `RuleResponse | null`. When provided, pre-populate form fields with rule values. Update component title to show "Edit Rule" vs "Add New Rule". Update submit handler to call `onUpdate` instead of `onSave` when in edit mode. |

### Implementation Details

**Edit Handler:**
- Replace placeholder `handleEditRule(ruleId: number)` with actual implementation
- Set state to show edit form: `const [editingRule, setEditingRule] = useState<RuleResponse | null>(null);`
- Find rule by ID and set it as `editingRule`
- Show `AddRule` component with `initialRule` prop set to the rule being edited

**AddRule Component Modifications:**
- Add prop: `initialRule?: RuleResponse | null`
- Add prop: `onUpdate?: (id: number, rule: RuleUpdate) => Promise<void>` (for edit mode)
- When `initialRule` is provided:
  - Pre-populate `urlPattern` with `initialRule.url_pattern`
  - Pre-populate `keepSelectors` with `initialRule.keep_selectors` (or `['']` if empty)
  - Pre-populate `ignoreSelectors` with `initialRule.ignore_selectors` (or `['']` if empty)
  - Set form title to "Edit Rule" instead of "Add New Rule"
- In `handleSubmit`:
  - If `initialRule` exists and `onUpdate` is provided, call `onUpdate(initialRule.id, ruleData)`
  - Otherwise, call `onSave(ruleData)` (existing behavior)

**Save Handler:**
- Create `handleUpdateRule` function that calls `updateRule` from `useRules` hook
- Pass rule ID and updated rule data
- Handle async operation with try/catch
- After successful update, clear `editingRule` state to return to rules list
- Handle errors and display error messages

**Cancel Handler:**
- Clear `editingRule` state to return to rules list
- Can reuse existing `handleCancel` function or create separate handler

**State Management:**
- Use `editingRule` state to track which rule is being edited (or `null` when not editing)
- When `editingRule` is set, show `AddRule` component instead of rules list
- The `useRules` hook handles updating the rules array and cache automatically

**Form Pre-population:**
- Ensure `keepSelectors` and `ignoreSelectors` arrays are never empty (at least `['']`)
- Handle case where selectors arrays might be empty in the rule data
- Use `useEffect` to initialize form when `initialRule` changes

**UI Updates:**
- Active rule detection is derived from `rules` array, so it updates automatically after edit
- The `CardTitle` in active rule section will show updated URL pattern automatically
- Other rules section will show updated URL pattern automatically

### Edge Cases

1. **Editing active rule**: The active rule section will update automatically since `activeRule` is derived from `rules.find()`
2. **Empty selectors**: Handle rules with empty `keep_selectors` or `ignore_selectors` arrays by initializing with `['']`
3. **Network error during update**: Show error message, keep form open so user can retry
4. **Validation errors**: Form validation should prevent submission, show error messages
5. **Concurrent edits**: Each edit is independent, but rapid clicks are prevented by loading state
6. **Cancel during edit**: Form state should be discarded, return to rules list without changes

## Testing Requirements

### Unit Tests
- N/A (manual verification sufficient)

### Integration Tests
- N/A (manual verification sufficient)

### Manual Verification

1. **Edit other rule:**
   - Have multiple rules configured
   - Click edit icon on a rule in "Rules" section
   - Verify: Edit form opens with rule data pre-populated
   - Modify URL pattern and selectors
   - Click "Save Rule"
   - Verify: Rule is updated in list with new values
   - Verify: Form closes and returns to rules list

2. **Edit active rule:**
   - Open extension on a page with matching rule
   - Click edit icon on active rule
   - Modify URL pattern
   - Save changes
   - Verify: Active rule section shows updated URL pattern
   - Verify: If new pattern doesn't match current page, active rule section updates accordingly

3. **Cancel edit:**
   - Click edit icon on any rule
   - Make changes to form
   - Click "Cancel"
   - Verify: Form closes without saving changes
   - Verify: Rule remains unchanged in list

4. **Form validation:**
   - Click edit icon
   - Clear URL pattern
   - Attempt to save
   - Verify: Error message appears, form doesn't submit

5. **Error handling:**
   - Disconnect network or simulate API error
   - Edit a rule and attempt to save
   - Verify: Error message is displayed
   - Verify: Form remains open for retry

6. **Loading state:**
   - Click edit and save
   - Verify: Save button shows "Saving..." and is disabled during update
   - Verify: Button re-enables after completion or error

7. **Pre-population accuracy:**
   - Edit a rule with multiple keep selectors and ignore selectors
   - Verify: All selectors are pre-populated correctly
   - Verify: Empty arrays are handled (show at least one empty input)

## Dependencies

### External
- None

### Internal
- Story #1 (icons must be present)
- `useRules` hook with `updateRule` method
- `api.ts` with `updateRule` function
- Backend `PUT /rules/{id}` endpoint
- `AddRule` component (to be modified for edit mode)

## Risks

| Risk | Mitigation |
|------|------------|
| AddRule component becomes too complex | Keep edit mode logic simple, use conditional rendering and optional props |
| Form pre-population fails | Thoroughly test with various rule configurations, handle empty arrays |
| Active rule state inconsistency | Active rule is derived from rules array, so it updates automatically |
| Validation errors not handled | Ensure form validation matches create rule validation |

## Implementation Notes

- Reusing `AddRule` component reduces code duplication and maintains consistency
- The `initialRule` prop approach allows the component to work in both create and edit modes
- Consider extracting form state initialization logic into a `useEffect` hook for clarity
- The component title change ("Add New Rule" vs "Edit Rule") helps users understand the context
- Error handling should be consistent with the create rule flow
- The `RuleUpdate` type allows partial updates, so we only need to send changed fields (though sending all fields is also acceptable)
- Ensure that when `initialRule` is provided, the form initializes correctly even if component remounts

---

## Security Review

**Agent:** security
**Date:** 2026-01-26
**Mode:** Pre-Implementation

### Findings

No security concerns identified.

### Details

1. **Authorization**: The `updateRule` API call uses `apiRequest` which automatically includes JWT authentication. Only authenticated users can update rules, and only their own rules (enforced by backend).

2. **Input Validation**: 
   - Rule ID comes from the existing `rules` array fetched from the API, not from user input - no injection risk for ID
   - Form field values (URL pattern, selectors) are user input but validated on backend
   - Frontend validation (URL pattern required) matches create flow

3. **CSRF Protection**: The API uses JWT tokens in headers, not cookies, so CSRF attacks are not applicable.

4. **Data Exposure**: No sensitive data in rule objects. Rule data is user-created content.

5. **Error Handling**: Errors will be caught and displayed with user-friendly messages without exposing internal details.

6. **XSS Prevention**: React automatically escapes content rendered in JSX. No `dangerouslySetInnerHTML` usage.

---

## Implementation

**Agent:** worker
**Date:** 2026-01-26

### Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/rules/addRule.tsx` | Modified | Added `initialRule` and `onUpdate` props. Added `isEditMode` derived state. Updated `useEffect` to initialize form with `initialRule` data. Updated `handleSubmit` to call `onUpdate` in edit mode. Changed title to show "Edit Rule" vs "Add New Rule". |
| `frontend/src/components/rules/rules.tsx` | Modified | Added `updateRule` from `useRules` hook. Added `editingRule` state. Replaced placeholder `handleEditRule` with actual implementation. Added `handleUpdateRule` and `handleCancelEdit` functions. Added conditional rendering to show edit form when `editingRule` is set. |

### Build Verification

- **Install:** Not needed (no dependencies changed)
- **Build:** Pass - TypeScript compilation successful (`npm run compile`)
- **Lint:** Pass - ESLint passed (`npm run lint`)

### Tests

| File | Coverage |
|------|----------|
| N/A | Manual verification required per story spec |

### Acceptance Criteria

- [x] Clicking the edit icon on any rule opens an edit form — `handleEditRule` sets `editingRule` state, which triggers edit form render
- [x] The edit form is pre-populated with the rule's current values — `useEffect` in AddRule initializes form with `initialRule` data
- [x] Users can modify any field in the edit form — Same form inputs as create mode, all editable
- [x] Form validation matches the create rule form — Same validation logic (URL pattern required)
- [x] On save, the rule is updated in the backend via API — `handleUpdateRule` calls `updateRule` from `useRules` hook
- [x] The rule list updates immediately after successful save — `useRules` hook handles state updates and cache
- [x] If editing the active rule, the active rule section updates — `activeRule` is derived from `rules` array
- [x] Users can cancel editing to return to the rules list — `handleCancelEdit` sets `editingRule` to null
- [x] Error messages are displayed if update fails — Error handling in `handleSubmit` with appropriate message
- [x] Save button is disabled during the update operation — `isLoading` state disables all inputs and buttons

### Notes

- Reused `AddRule` component for edit mode to maintain consistency and reduce code duplication
- Empty selector arrays from existing rules are handled by initializing with `['']`
- The `isEditMode` derived state simplifies conditional logic throughout the component
- Error messages are context-aware ("Failed to update rule" vs "Failed to create rule")

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
- Rule ID comes from existing rules array (not user input) - no injection risk for ID
- Form field values are sanitized (trimmed, empty values filtered) before API call
- Using `updateRule` from `useRules` hook which calls authenticated API
- Error messages are user-friendly without exposing internal details
- React auto-escapes JSX content - no XSS risk
- No secrets or credentials in the code
- `initialRule` data comes from existing fetched rules, not from untrusted source

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

- [x] Clicking the edit icon on any rule opens an edit form — `handleEditRule` sets `editingRule` state
- [x] The edit form is pre-populated with the rule's current values — `useEffect` initializes form with `initialRule`
- [x] Users can modify any field in the edit form — Same form inputs work in both modes
- [x] Form validation matches the create rule form — Same validation (URL pattern required)
- [x] On save, the rule is updated in the backend via API — `handleUpdateRule` calls `updateRule`
- [x] The rule list updates immediately after successful save — `useRules` handles state updates
- [x] If editing the active rule, the active rule section updates — `activeRule` derived from `rules` array
- [x] Users can cancel editing to return to the rules list — `handleCancelEdit` clears `editingRule`
- [x] Error messages are displayed if update fails — Error handling in `handleSubmit`
- [x] Save button is disabled during the update operation — `isLoading` disables inputs/buttons

### Security

No security concerns identified. Implementation follows existing patterns with authenticated API calls and proper input handling.

### Issues Found

None

### Recommendations

- Implementation correctly reuses `AddRule` component for consistency
- Good handling of empty selector arrays (initializes with `['']`)
- Consider adding unit tests for form initialization logic in future

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
| 2 | Implementation | Successfully implemented edit functionality |
| 3 | Security (post-implementation) | PASS - No new vulnerabilities |
| 4 | Code Review | APPROVED - All criteria met |

### Final Status

- **Iterations:** 1
- **Security:** PASS
- **Verdict:** APPROVED

### Summary

Implemented edit rule functionality by extending the `AddRule` component to support edit mode. Added `initialRule` and `onUpdate` props to `AddRule` component, with form pre-population from existing rule data. The `rules.tsx` component now tracks `editingRule` state and shows the edit form when a rule is selected for editing. The `useRules` hook's `updateRule` method handles API calls and state updates. All acceptance criteria are met.
