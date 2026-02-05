

## Fix Brief Teacher Interview Crash - Complete Solution

### Problem Identified

The **Brief Teacher Interview** and **Record Review** tabs crash because of unsafe `useMemo` calculations in `IndirectAssessmentTools.tsx`. When switching to these tabs:

1. `currentItems` returns `undefined` (only defined for FAST/MAS/QABF)
2. `progress` computation calls `currentItems.some()` and `currentItems.length` on `undefined`
3. `scores` computation calls `currentItems.forEach()` on `undefined`
4. `maxPossibleScore` does the same

This causes a runtime error that blanks the entire component.

---

### Solution Overview

| Change | Purpose |
|--------|---------|
| Add `isRatingScale` flag | Distinguish FAST/MAS/QABF from BRIEF/RECORD_REVIEW |
| Safe `currentItems` default | Return empty array `[]` instead of `undefined` |
| Guard all computations | Avoid divide-by-zero and undefined access |
| Hide rating-scale UI | Don't show Reset/Save/Progress for BRIEF/RECORD_REVIEW |

---

### Technical Changes

**File: `src/components/IndirectAssessmentTools.tsx`**

#### 1. Add rating scale detection
```typescript
const isRatingScale = activeAssessment === 'FAST' || 
                      activeAssessment === 'MAS' || 
                      activeAssessment === 'QABF';
```

#### 2. Fix `currentItems` to always return an array
```typescript
const currentItems = useMemo(() => {
  switch (activeAssessment) {
    case 'FAST': return FAST_ITEMS;
    case 'MAS': return MAS_ITEMS;
    case 'QABF': return QABF_ITEMS;
    default: return []; // Safe fallback for BRIEF/RECORD_REVIEW
  }
}, [activeAssessment]);
```

#### 3. Fix `progress` to avoid divide-by-zero
```typescript
const progress = useMemo(() => {
  if (currentItems.length === 0) return 0; // Prevent NaN
  const answered = Object.keys(responses).filter(k => 
    currentItems.some(i => i.id === k)
  ).length;
  return (answered / currentItems.length) * 100;
}, [responses, currentItems]);
```

#### 4. Conditionally show header action buttons
```typescript
{/* Only show Reset/Save for rating scale assessments */}
{isRatingScale && (
  <div className="flex gap-2">
    <Button variant="outline" size="sm" onClick={handleReset}>
      <RotateCcw className="w-3 h-3 mr-1" />
      Reset
    </Button>
    <Button size="sm" onClick={handleSave} disabled={progress < 100}>
      <Save className="w-3 h-3 mr-1" />
      Save
    </Button>
  </div>
)}
```

#### 5. Fix items rendering condition
Currently checks `activeAssessment !== 'BRIEF'` which still tries to render for RECORD_REVIEW with empty items. Change to:
```typescript
{isRatingScale && currentItems.length > 0 && (
  <Card>
    {/* ... Items list ... */}
  </Card>
)}
```

#### 6. Fix notes section condition
```typescript
{isRatingScale && (
  <Card>
    {/* ... Notes ... */}
  </Card>
)}
```

---

### Multi-Select Support Confirmation

The Brief Teacher Interview form **already supports multi-select** for:
- Problem Behaviors (11 checkboxes)
- Triggers/Antecedents (6 checkboxes + Other)
- Things Obtained (4 checkboxes + Other)
- Things Avoided (5 checkboxes + Other)

This is implemented in `BriefTeacherInput.tsx` using the `toggleCheckbox` helper function and `Checkbox` components. The multi-select data is saved correctly as arrays in the student profile.

---

### Expected Behavior After Fix

| Tab | What Should Appear |
|-----|-------------------|
| FAST/MAS/QABF | Full rating scale with Reset/Save, progress bar, items list |
| Brief Teacher | Card with "New Response" button, saved responses list |
| Record Review | Card with "Start Review"/"Edit Review" button |

---

### Files to Modify

1. **`src/components/IndirectAssessmentTools.tsx`** - Fix crash and conditional rendering

No changes needed to:
- `BriefTeacherInput.tsx` - Questions and multi-select already work correctly
- `BriefTeacherInputManager.tsx` - Manager component is properly structured

