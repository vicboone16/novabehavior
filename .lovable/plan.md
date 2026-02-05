
# Comprehensive Fix Plan: Document Extraction + Wizard Scrolling + Agency Isolation + Document Consolidation

## Overview

This plan addresses four interconnected issues:

1. **Behavior Intervention Wizard** - Scrolling broken on mobile, cannot edit previous steps
2. **Document Extraction Accuracy** - Student names incorrectly extracted (pulling staff names instead)
3. **Agency Data Isolation** - Staff seeing clients outside their agency
4. **Document/Files Consolidation** - Two separate systems need merging with unified labeling

---

## Part 1: Fix Behavior Intervention Wizard Scrolling & Navigation

### Problem
- Cannot scroll on Step 4 (mobile) to see the "Add to Plan" button
- Cannot navigate back to edit previous selections from the final step

### Solution

#### 1.1 Fix Scrolling Layout
**File**: `src/components/behavior-interventions/GuidedInterventionTracker.tsx`

Replace the `ScrollArea` component with native scrolling:
- Change content area from `overflow-hidden` to `overflow-y-auto`
- Make footer buttons sticky with `shrink-0 border-t bg-background`
- Add `pb-24` padding to content for safe scroll area on mobile

```text
Fixed Layout Structure:
+---------------------------------------+
| DialogContent (flex flex-col          |
|   max-h-[90vh] p-0)                   |
| +-----------------------------------+ |
| | Header (shrink-0 p-6)             | |
| +-----------------------------------+ |
| | Step Indicator (shrink-0 px-6)    | |
| +-----------------------------------+ |
| | Content (flex-1 min-h-0           | |
| |   overflow-y-auto px-6 pb-24)     | |
| +-----------------------------------+ |
| | Footer (shrink-0 border-t p-4     | |
| |   bg-background)                  | |
+---------------------------------------+
```

#### 1.2 Make Step Indicators Clickable
**File**: `src/components/behavior-interventions/GuidedInterventionTracker.tsx`

- Add `onClick` handler to step circles
- Allow navigation to any completed or current step
- Add visual cursor feedback: `cursor-pointer hover:ring-2 hover:ring-primary/20`

#### 1.3 Add Edit Buttons to Summary Panel
**File**: `src/components/behavior-interventions/TunnelSummaryPanel.tsx`

- Add `onEditStep?: (step: TunnelStep) => void` prop
- Show "Edit" buttons next to each section header when on Step 4
- Clicking "Edit" navigates back to that step

#### 1.4 Add Mobile Summary on Step 4
**File**: `src/components/behavior-interventions/steps/InterventionsStep.tsx`

- Add collapsible inline summary at top for mobile (since sidebar is hidden)
- Show Problem, Goal, Objectives with edit links
- Use `Collapsible` component

---

## Part 2: Fix Document Extraction Student Name Accuracy

### Problem
The document extraction in the Assessment Dashboard sometimes pulls staff names (BCBA, teacher) instead of the student's name from clinical documents.

### Root Causes Identified
1. The `extract-document` function (used by DocumentUpload in Assessment Dashboard) does NOT extract student identity at all - it only extracts behavioral content
2. The `clinical-extract` function has student name extraction but the prompts aren't strict enough about rejecting staff names
3. No two-stage OCR fallback for scanned PDFs (per project documentation)

### Solution

#### 2.1 Add Student Identity Extraction to `extract-document`
**File**: `supabase/functions/extract-document/index.ts`

Update all extraction prompts (IEP, FBA, BIP, etc.) to include student identity extraction:

```typescript
// Add to each prompt:
CRITICAL - EXTRACT CLIENT IDENTITY FIRST:
1. The CLIENT/STUDENT is the person RECEIVING services (usually a child)
2. Look for these labels ONLY: "Student Name:", "Student:", "Client:", "Child's Name:", "Examinee:", "Learner:"
3. REJECT any name appearing near: "BCBA", "Teacher", "Parent", "Evaluator", "Prepared by:", "Signature:"
4. Include the EXACT label you found (e.g., "Found after 'Student Name:'")
5. If no labeled student name exists, set studentConfidence to 0.3

Return: {
  "student": {
    "name": "string",
    "dob": "string",
    "grade": "string", 
    "school": "string",
    "confidence": number,
    "sourceLabel": "string"
  },
  ...existing fields...
}
```

#### 2.2 Strengthen `clinical-extract` Prompts
**File**: `supabase/functions/clinical-extract/index.ts`

Update `CLINICAL_SYSTEM_PROMPT` with explicit rejection rules:

```typescript
ENTITY IDENTIFICATION (CRITICAL - ZERO TOLERANCE FOR ERRORS):
- ONLY extract a name as CLIENT/STUDENT if it appears IMMEDIATELY AFTER one of these labels:
  * "Student Name:", "Student:", "Client:", "Child's Name:", "Examinee:", "Learner:", "Individual:"
- If no such labeled name exists, return confidence: 0.3 and flag for review
- EXPLICITLY REJECT any name that appears with these patterns:
  * Near "BCBA", "Teacher", "Parent", "Evaluator", "Case Manager", "Prepared by"
  * In signature blocks: "Signature:", "Signed:", "Approved by:", "Reviewed by:"
  * With professional suffixes: "MA", "M.Ed.", "PhD", "BCBA-D", "RBT", "LPC", "LCSW"
- Cross-validate: If DOB indicates adult (18+), flag for review
- Always include evidence_type: "labeled" (found after explicit label) vs "inferred" (pattern-based)
```

#### 2.3 Add Two-Stage OCR Fallback
**File**: `supabase/functions/extract-document/index.ts`

Implement quality check and vision fallback for scanned PDFs:

```typescript
// After PDF text extraction:
function checkTextQuality(text: string): boolean {
  // Minimum 500 chars and 100+ letters indicates good extraction
  const hasGoodText = text.length > 500 && 
    (text.match(/[a-zA-Z]/g) || []).length > 100;
  return hasGoodText;
}

// If native extraction is poor, fall back to Vision API
if (!checkTextQuality(extractedText)) {
  console.log('Native extraction poor, using Vision API...');
  extractedText = await extractWithVision(pdfBase64, 'application/pdf', apiKey);
}
```

#### 2.4 Add Expected Student Name Parameter
**File**: `supabase/functions/clinical-extract/index.ts`

When document is uploaded from a student profile (studentId is known):
- Look up the student's name from the database
- Add to prompt: "Expected student name: '{name}'. Verify this matches extraction."
- If mismatch, add warning and lower confidence

#### 2.5 UI Warning for Low-Confidence Names
**File**: `src/components/DocumentUpload.tsx`

After extraction, display warning if student confidence is low:

```tsx
{extractedData?.student?.confidence < 0.9 && (
  <div className="p-3 bg-warning/10 text-warning rounded-lg flex items-center gap-2">
    <AlertTriangle className="w-4 h-4" />
    <span>Student name confidence is low. Please verify: "{extractedData.student.name}"</span>
  </div>
)}
```

---

## Part 3: Agency Data Isolation

### Problem
Staff can see all students regardless of agency assignment. Need to enforce agency-based data isolation.

### Solution

#### 3.1 Create Agency Access Helper Function
**Migration SQL**:

```sql
CREATE OR REPLACE FUNCTION has_agency_student_access(
  _user_id UUID,
  _student_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  _student_agency_id UUID;
  _user_in_agency BOOLEAN;
BEGIN
  SELECT agency_id INTO _student_agency_id
  FROM students WHERE id = _student_id;
  
  IF _student_agency_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM agency_memberships
    WHERE user_id = _user_id
    AND agency_id = _student_agency_id
    AND status = 'active'
  ) INTO _user_in_agency;
  
  RETURN _user_in_agency;
END;
$$;
```

#### 3.2 Update RLS Policies
**Migration SQL**:

```sql
-- Update students SELECT policy
DROP POLICY IF EXISTS "Users can view accessible students" ON students;
CREATE POLICY "Users can view accessible students" ON students
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR has_student_access(id, auth.uid())
    OR has_tag_based_access(auth.uid(), id)
    OR has_agency_student_access(auth.uid(), id)
    OR is_admin(auth.uid())
  );
```

Apply similar changes to related tables:
- `student_files`
- `client_documents`
- `session_data`
- `behaviors`
- `student_targets`

#### 3.3 Add Staff Profile Agency Filtering
**Migration SQL**:

```sql
CREATE POLICY "Users can view staff in their agencies"
ON staff_profiles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS(
    SELECT 1 FROM agency_memberships am1
    JOIN agency_memberships am2 ON am1.agency_id = am2.agency_id
    WHERE am1.user_id = auth.uid()
    AND am2.user_id = staff_profiles.user_id
    AND am1.status = 'active'
    AND am2.status = 'active'
  )
  OR is_admin(auth.uid())
);
```

#### 3.4 Update AgencySwitcher to Refresh Data
**File**: `src/components/AgencySwitcher.tsx`

After switching agencies:
- Clear cached student data from dataStore
- Re-fetch students for the new agency context
- Invalidate React Query caches

---

## Part 4: Document/Files Consolidation

### Problem
Two separate document systems exist:
1. `client_documents` table - Rich metadata, permissions, clinical labeling
2. `student_files` table - Basic file storage

### Solution

#### 4.1 Migrate student_files to client_documents
**Migration SQL**:

```sql
-- Add columns to track migration
ALTER TABLE client_documents
ADD COLUMN IF NOT EXISTS legacy_file_id UUID,
ADD COLUMN IF NOT EXISTS uploaded_by_user_id UUID REFERENCES auth.users(id);

-- Migrate existing files
INSERT INTO client_documents (
  client_id, doc_type, title, file_url, file_name, file_size, mime_type,
  visibility_permission, uploaded_by_user_id, legacy_file_id, upload_date
)
SELECT
  student_id, 'other', file_name, file_path, file_name, file_size, file_type,
  'internal_only', user_id, id, created_at
FROM student_files
WHERE NOT EXISTS (
  SELECT 1 FROM client_documents cd 
  WHERE cd.legacy_file_id = student_files.id
);
```

#### 4.2 Extend Document Types
**File**: `src/types/clientProfile.ts`

Add assessment sub-types and categories:

```typescript
export const DOCUMENT_TYPES = [
  // Clinical
  { value: 'consent', label: 'Consent Form', category: 'clinical' },
  { value: 'iep', label: 'IEP', category: 'clinical' },
  { value: 'fba', label: 'FBA', category: 'clinical' },
  { value: 'bip', label: 'BIP', category: 'clinical' },
  { value: 'progress_report', label: 'Progress Report', category: 'clinical' },
  
  // Assessments (sub-types)
  { value: 'assessment_vbmapp', label: 'VB-MAPP', category: 'assessment' },
  { value: 'assessment_ablls', label: 'ABLLS-R', category: 'assessment' },
  { value: 'assessment_vineland', label: 'Vineland', category: 'assessment' },
  { value: 'assessment_abas', label: 'ABAS-3', category: 'assessment' },
  { value: 'assessment_other', label: 'Other Assessment', category: 'assessment' },
  
  // Administrative
  { value: 'medical', label: 'Medical Record', category: 'administrative' },
  { value: 'authorization', label: 'Authorization', category: 'administrative' },
  { value: 'insurance', label: 'Insurance Document', category: 'administrative' },
  { value: 'correspondence', label: 'Correspondence', category: 'administrative' },
  { value: 'other', label: 'Other', category: 'other' },
];
```

#### 4.3 Update StudentFileManager to Use Unified System
**File**: `src/components/StudentFileManager.tsx`

Refactor to:
- Query `client_documents` instead of `student_files`
- Use same upload flow as DocumentsTab
- Add doc_type selector with all categories
- Add visibility_permission selector

#### 4.4 Add Visibility-Based RLS
**Migration SQL**:

```sql
CREATE POLICY "Users can view documents based on visibility"
ON client_documents FOR SELECT TO authenticated
USING (
  uploaded_by_user_id = auth.uid()
  OR (
    visibility_permission = 'clinical_team' AND
    has_agency_student_access(auth.uid(), client_id)
  )
  OR (
    visibility_permission = 'internal_only' AND
    (has_student_access(client_id, auth.uid()) OR auth.uid() = uploaded_by_user_id)
  )
  OR is_admin(auth.uid())
);
```

---

## Implementation Phases

### Phase 1: Immediate Fixes (Scrolling + Extraction)
1. Fix wizard scrolling in `GuidedInterventionTracker.tsx`
2. Add clickable step navigation
3. Add edit buttons to summary panel
4. Strengthen extraction prompts in both edge functions
5. Add OCR fallback for scanned PDFs

### Phase 2: Agency Isolation
1. Create `has_agency_student_access` function
2. Update RLS policies for students and related tables
3. Add staff profile filtering
4. Update AgencySwitcher refresh logic

### Phase 3: Document Consolidation
1. Run migration to move student_files to client_documents
2. Extend document types with assessment categories
3. Update StudentFileManager to use unified system
4. Add visibility-based RLS policies

---

## Files to Create/Modify

| Phase | File | Action |
|-------|------|--------|
| 1 | `src/components/behavior-interventions/GuidedInterventionTracker.tsx` | Modify - fix scrolling, clickable steps |
| 1 | `src/components/behavior-interventions/TunnelSummaryPanel.tsx` | Modify - add edit buttons |
| 1 | `src/components/behavior-interventions/steps/InterventionsStep.tsx` | Modify - mobile summary |
| 1 | `supabase/functions/extract-document/index.ts` | Modify - add student extraction, OCR fallback |
| 1 | `supabase/functions/clinical-extract/index.ts` | Modify - strengthen prompts |
| 1 | `src/components/DocumentUpload.tsx` | Modify - low-confidence warning |
| 2 | Migration SQL | Create - agency access function + RLS |
| 2 | `src/components/AgencySwitcher.tsx` | Modify - refresh on switch |
| 3 | Migration SQL | Create - migrate files, visibility RLS |
| 3 | `src/types/clientProfile.ts` | Modify - extend document types |
| 3 | `src/components/StudentFileManager.tsx` | Modify - use unified system |

---

## Technical Notes

### Extraction Accuracy Approach
The key insight is that the AI model needs explicit "rejection rules" not just "preference rules". By telling it to explicitly reject names near professional credentials and requiring a labeled anchor ("Student Name:"), accuracy should significantly improve.

### OCR Fallback Logic
Following the project's documented pattern: try native PDF text extraction first (faster, free), check quality (500+ chars, 100+ letters), fall back to Gemini Vision API only if poor quality indicates a scanned document.

### Agency Isolation Security
Using `SECURITY DEFINER` function to avoid recursive RLS issues. The function runs with elevated privileges but only returns a boolean, maintaining security while enabling cross-table checks.
