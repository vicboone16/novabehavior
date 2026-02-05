

## Fix Brief Teacher Interview and Record Review Crash

### Problem

The **Brief Teacher Interview** and **Record Review** tabs crash to a blank screen when selected. This happens because:

1. `currentItems` returns `undefined` for these assessment types (only defined for FAST/MAS/QABF)
2. Calculations like `progress`, `scores`, and `maxPossibleScore` crash when calling methods on `undefined`
3. UI elements (Reset/Save buttons, progress bar, items list) render incorrectly

### Solution

Fix the crash in `src/components/IndirectAssessmentTools.tsx` by:

1. Adding a flag to detect rating-scale assessments vs. interview/review forms
2. Making `currentItems` return an empty array instead of `undefined`
3. Guarding all calculations to prevent divide-by-zero errors
4. Conditionally hiding rating-scale UI elements for Brief Teacher and Record Review tabs

### Technical Changes

**File: `src/components/IndirectAssessmentTools.tsx`**

| Change | Purpose |
|--------|---------|
| Add `isRatingScale` flag | Distinguish FAST/MAS/QABF from BRIEF/RECORD_REVIEW |
| Add `default: return []` to `currentItems` switch | Prevent `undefined` return value |
| Guard `progress` calculation | Check `currentItems.length > 0` before dividing |
| Wrap Reset/Save buttons in `isRatingScale &&` | Hide for non-rating-scale tabs |
| Wrap progress bar in `isRatingScale &&` | Hide for non-rating-scale tabs |
| Wrap items card in `isRatingScale &&` | Hide for non-rating-scale tabs |
| Remove unused `showRecordReview` state | Clean up dead code |

### Expected Result After Fix

| Tab | What Displays |
|-----|--------------|
| FAST / MAS / QABF | Full rating scale with Reset/Save, progress bar, items list |
| Brief Teacher | Card with "New Response" button and saved responses list |
| Record Review | Card with "Start Review" or "Edit Review" button |

### Notes

- No changes needed to `BriefTeacherInput.tsx` or `BriefRecordReviewManager.tsx` - they already work correctly
- Multi-select support for behaviors, triggers, and consequences is already implemented in the Brief Teacher form

