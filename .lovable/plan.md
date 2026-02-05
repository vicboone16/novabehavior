

## Brief Teacher Interview Assessment - Fix Plan

### Summary of the Issue

The Brief Teacher Interview assessment appears blank when clicked because of a **duplicate rendering bug** in `IndirectAssessmentTools.tsx`. The component renders BOTH:
1. `BriefTeacherInputManager` inside the main Card (correct)
2. `BriefTeacherInput` form outside the Card (incorrect duplicate)

This causes UI conflicts and may result in a blank or broken display.

### Current Questions/Flow (Already Implemented)

The Brief Teacher Input form has a complete set of questions organized in sections:

| Section | Questions/Fields |
|---------|-----------------|
| **Student Strengths** | 2+ text fields for student strengths |
| **Problem Behaviors** | 11 checkboxes (Destruction of property, Physical aggression, Disruptive, Work refusal, Unresponsive, Inappropriate language, Insubordinate, Withdrawn, Verbally inappropriate, Verbal harassment, Self-injury) + custom "Other" field |
| **Behavior Details** | Description, Frequency, Duration, Intensity |
| **Triggers/Antecedents** | 6 checkboxes (Academic tasks, Unstructured time, Isolated, Transitions, Reprimands, Non-academic activities) |
| **Things Obtained** | 4 checkboxes (Adult attention, Peer attention, Activity, Preferred objects) |
| **Things Avoided** | 5 checkboxes (Hard tasks, Physical effort, Reprimands, Peer negatives, Adult attention) |
| **Inferred Functions** | Auto-calculated from selections (Attention, Escape, Tangible, Sensory) |
| **Additional Notes** | Free-text field |

### The Fix

**File: `src/components/IndirectAssessmentTools.tsx`**

Remove the duplicate `BriefTeacherInput` rendering block (lines 436-459). The `BriefTeacherInputManager` already handles the complete flow properly:
- Shows empty state when no responses exist
- Has "New Response" button that opens a dialog with the form
- Lists saved responses with view/delete capabilities

### Technical Details

```text
Current (broken):
┌─────────────────────────────────────────┐
│  IndirectAssessmentTools                │
│  ┌───────────────────────────────────┐  │
│  │ Card with BriefTeacherInputManager│  │  ← Correct
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ BriefTeacherInput (duplicate)     │  │  ← REMOVE THIS
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

Fixed:
┌─────────────────────────────────────────┐
│  IndirectAssessmentTools                │
│  ┌───────────────────────────────────┐  │
│  │ Card with BriefTeacherInputManager│  │  ← Only this
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Changes Summary

1. **Remove duplicate rendering** - Delete lines 436-459 in `IndirectAssessmentTools.tsx` that render `BriefTeacherInput` outside the main structure
2. **Remove unused state** - Delete `showBriefTeacherInput` state variable (line 137) since it's no longer needed
3. **Clean up tab change handler** - Remove the `setShowBriefTeacherInput` call in the tab change logic (line 350)

### Expected Behavior After Fix

When clicking the "Brief Teacher" tab:
1. The `BriefTeacherInputManager` card displays
2. If no responses exist: Shows "No Teacher Input responses yet" with "New Response" button
3. Clicking "New Response" opens a dialog with the full form (all questions listed above)
4. Saved responses appear as clickable cards with respondent name, date, and inferred functions

