
# Enhanced Behavior Bank Management Plan

## Overview
This plan implements three major enhancements to the Behavior Bank system:
1. **Promote Custom to Standard**: Allow migrating custom behaviors to become permanent bank behaviors
2. **Edit Built-in Definitions**: Allow editing the definitions of default/built-in behaviors
3. **Advanced Merge with Name Selection**: Allow merging any two behaviors (even with different names) and choosing which name appears on student graphs

---

## Current Architecture

The behavior bank currently has two sources:
- **DEFAULT_BEHAVIORS**: A hardcoded array in `BehaviorBank.tsx` and `BehaviorLibrary.tsx` (15 built-in behaviors)
- **Custom Behaviors**: Derived dynamically from student behavior arrays (not persisted globally)

Key limitation: There's no persistent storage for organization-level custom behaviors or edits to default behaviors.

---

## Implementation Plan

### Phase 1: Add Persistent Behavior Bank Storage

**Create a new global behavior bank state in the data store**

Add to `src/store/dataStore.ts`:
- `globalBehaviorBank: BehaviorDefinition[]` - Persistent custom behaviors promoted to global
- `behaviorDefinitionOverrides: Record<string, Partial<BehaviorDefinition>>` - Edits to built-in definitions

New store actions:
- `addToBehaviorBank(behavior)` - Promote a custom behavior to the global bank
- `updateBankBehaviorDefinition(id, operationalDefinition)` - Edit any bank behavior's definition
- `removeBankBehavior(id)` - Remove a promoted behavior from the bank
- `advancedMergeBehaviors(options)` - New merge function with name selection

### Phase 2: Update BehaviorLibrary Page

Add new UI elements to `src/pages/BehaviorLibrary.tsx`:

**For Promoting Custom Behaviors:**
- Add a "Make Standard" button next to custom behaviors
- Clicking opens a confirmation dialog explaining the behavior will now appear for all future use
- Promoted behaviors get an "Organization" badge instead of "Custom"

**For Editing Built-in Definitions:**
- Add an "Edit" icon button next to every behavior (including defaults)
- Opens a dialog to edit the operational definition
- Edited defaults show an "Edited" badge
- Option to "Reset to Default" for edited built-ins

**For Advanced Merge:**
- New "Merge Behaviors" button in sidebar
- Opens a multi-step dialog:
  1. Select the first behavior (source)
  2. Select the second behavior (target) 
  3. Choose which name to keep for student display
  4. Preview affected students
  5. Confirm merge

### Phase 3: Update Merge Logic

Enhance `mergeBehaviors` in the store to support:
- Merging any two behaviors regardless of name
- Renaming behaviors on student profiles when a different name is selected
- Preserving all historical data (frequency, duration, interval, ABC entries)
- Preserving custom student-specific definitions
- Updating all data entries to point to the surviving behavior ID

---

## Technical Details

### Data Structure Changes

```typescript
// In dataStore.ts state
interface DataState {
  // ... existing fields
  
  // New: Persisted custom behaviors promoted to org-level
  globalBehaviorBank: BehaviorDefinition[];
  
  // New: Overrides for built-in behavior definitions
  behaviorDefinitionOverrides: Record<string, {
    operationalDefinition?: string;
    category?: string;
    updatedAt?: Date;
  }>;
}
```

### New Store Actions

```typescript
// Promote custom behavior to global bank
addToBehaviorBank: (behavior: Omit<BehaviorDefinition, 'id' | 'isGlobal'>) => void;

// Edit any behavior's definition (works for defaults and custom)
updateBankBehaviorDefinition: (behaviorId: string, definition: string) => void;

// Reset an edited default back to original
resetBehaviorDefinition: (behaviorId: string) => void;

// Remove a promoted behavior from the bank
removeBankBehavior: (id: string) => void;

// Advanced merge with name selection
advancedMergeBehaviors: (options: {
  sourceBehaviorId: string;  // Behavior to merge FROM
  targetBehaviorId: string;  // Behavior to merge INTO
  useSourceName: boolean;    // If true, rename target to source's name
}) => void;
```

### UI Components

**Edit Behavior Dialog (new)**
- Fields: Name, Category, Operational Definition
- For built-ins: Shows "Reset to Default" button
- Saves to `behaviorDefinitionOverrides` for built-ins, or updates `globalBehaviorBank` for custom

**Promote to Standard Dialog (new)**
- Confirmation message explaining the behavior will be available organization-wide
- Shows current student count using this behavior
- Moves behavior from student-derived list to `globalBehaviorBank`

**Advanced Merge Dialog (enhanced)**
- Step 1: Select behaviors to merge (shows all behaviors with student counts)
- Step 2: Choose surviving name
- Step 3: Review affected students and data points
- Step 4: Confirm with "Merge" button

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/store/dataStore.ts` | Add new state fields, new actions for bank management |
| `src/pages/BehaviorLibrary.tsx` | Add edit buttons, promote buttons, advanced merge UI |
| `src/components/BehaviorBank.tsx` | Read from combined default + global bank, show edited badges |
| `src/types/behavior.ts` | Add any new type definitions if needed |

---

## User Flow Examples

**Promoting a Custom Behavior:**
1. User goes to Behavior Library
2. Sees a custom behavior "Hand Flapping" used by 5 students
3. Clicks "Make Standard" button
4. Confirms in dialog
5. Behavior now shows "Organization" badge and appears in bank for new additions

**Editing a Built-in Definition:**
1. User goes to Behavior Library
2. Clicks edit icon next to "Physical Aggression"
3. Updates the operational definition to match their organization's standards
4. Saves changes
5. Behavior shows "Edited" badge; new students get updated definition
6. Existing student-specific definitions remain unchanged

**Merging Differently-Named Behaviors:**
1. User has "Hitting" (custom) and "Physical Aggression" (built-in)
2. Clicks "Merge Behaviors" 
3. Selects "Hitting" as source, "Physical Aggression" as target
4. Chooses to keep "Physical Aggression" as the display name
5. Reviews: 3 students affected, 47 data points preserved
6. Confirms merge
7. All students now show "Physical Aggression" on graphs
8. Student-specific definitions preserved
9. "Hitting" removed from custom list
