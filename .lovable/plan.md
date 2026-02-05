

## Plan: Brief Teacher Interview Validation + Document Extraction Fix (PDF & DOCX)

### Overview

This plan addresses three issues:
1. Add validation to ensure Brief Teacher Interview responses save properly with multi-select fields
2. Fix PDF document extraction that's currently failing
3. Fix Word document (DOCX) extraction that's not working

---

## Issue 1: Brief Teacher Interview Validation

### Current State
The Brief Teacher Interview form in `BriefTeacherInput.tsx` already has basic validation:
- Requires respondent name
- Requires at least one problem behavior

However, there's no visual feedback for section completion or detailed save confirmation.

### Proposed Enhancements

| File | Change | Purpose |
|------|--------|---------|
| `src/components/assessment/BriefTeacherInput.tsx` | Add section completion indicators | Show checkmarks next to completed sections |
| `src/components/assessment/BriefTeacherInput.tsx` | Add warning for empty optional sections | Alert users when triggers/consequences are empty |
| `src/components/assessment/BriefTeacherInput.tsx` | Enhanced save toast with field counts | Show "Saved: 3 behaviors, 2 triggers, 2 consequences" |
| `src/components/assessment/BriefTeacherInputManager.tsx` | Add confirmation dialog before save | Prevent accidental incomplete submissions |

### Validation Indicators to Add
- Green checkmark when section has at least one selection
- Yellow warning icon when section is empty (optional sections)
- Count badges showing number of selections per section

---

## Issue 2 & 3: Document Extraction Not Working

### Root Cause Analysis

Looking at the edge function code (lines 718-751), I found the core problems:

**PDF Extraction Issue (Lines 728-750):**
```typescript
// Current broken approach - sends raw base64 as TEXT
body: JSON.stringify({
  model: "google/gemini-2.5-pro",
  messages: [{
    role: "user",
    content: `Extract ALL text from this PDF document (base64 encoded)...
${base64.substring(0, 60000)}  // <-- Truncated and sent as plain text!
`
  }]
})
```

**Problems:**
1. PDF base64 is being sent as plain text in the prompt, not as a proper file attachment
2. The base64 is truncated to 60,000 characters (only ~45KB of data) - most PDFs are larger
3. Gemini cannot parse raw base64 text - it needs the file sent using the `inline_data` format with proper MIME type

**DOCX Extraction Issue:**
- No DOCX-specific handling exists at all
- DOCX files fall through to the PDF handler which fails

### Solution: Two-Stage Extraction with Proper File Handling

#### Stage 1: Native Text Extraction (Fast, no AI cost for digital docs)
For PDFs: Use `pdf-parse` library to extract text from digitally-created PDFs

#### Stage 2: Vision API Fallback (For scanned/image-based documents)
If native extraction fails or returns poor quality text, send the document to Gemini properly formatted with:
- `inline_data` format (not raw base64 in prompt)
- Correct MIME type
- Full file contents (not truncated)

### Technical Implementation

**File: `supabase/functions/clinical-extract/index.ts`**

#### Add Native PDF Parsing
```text
Import pdf-parse library
Create extractPdfText() function:
  1. Parse PDF using pdf-parse
  2. Check text quality (>500 chars, >100 letters)
  3. Return { text, quality: 'good' | 'poor' }
```

#### Add Native DOCX Parsing
```text
Create extractDocxText() function:
  1. Detect DOCX by MIME type or extension
  2. Locate word/document.xml in ZIP structure
  3. Decompress and extract text from <w:t> tags
  4. Return extracted text
```

#### Fix Vision API Format
```text
Update extractWithVision() to use proper inline_data format:
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Extract ALL text..." },
      { 
        type: "image_url",  
        image_url: { 
          url: `data:application/pdf;base64,${fullBase64}`  // Full file, proper format
        }
      }
    ]
  }]
```

#### Add Smart Routing Logic
```text
if (isPDF) {
  // Try native extraction first
  const native = await extractPdfText(bytes);
  if (native.quality === 'good') {
    documentText = native.text;
  } else {
    // Fallback to vision for scanned PDFs
    documentText = await extractWithVision(base64, 'application/pdf', apiKey);
  }
} else if (isDOCX) {
  documentText = await extractDocxText(bytes);
} else if (isImage) {
  documentText = await extractWithVision(base64, contentType, apiKey);
}
```

---

## Implementation Order

### Phase 1: Brief Teacher Validation
1. Add completion indicators to section headers
2. Add enhanced save toast with counts
3. Add optional confirmation dialog

### Phase 2: Document Extraction Fix
1. Add `pdf-parse` import for native PDF extraction
2. Add DOCX text extraction function
3. Fix the vision API call format (use `inline_data` properly)
4. Add smart routing based on extraction quality
5. Add better error messages for users

---

## Expected Results After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Brief Teacher save | Generic "saved" toast | "Saved: 4 behaviors, 3 triggers, 2 consequences" |
| Digital PDF upload | Fails - sends truncated base64 as text | Extracts text natively, fast and accurate |
| Scanned PDF upload | Fails | Uses vision API with proper format |
| DOCX upload | Fails silently | Extracts text from XML structure |
| Error handling | Generic "Could not extract" | Specific: "Scanned PDF detected, try a clearer image" |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/assessment/BriefTeacherInput.tsx` | Add section completion indicators, enhanced save toast |
| `supabase/functions/clinical-extract/index.ts` | Add pdf-parse, DOCX extraction, fix vision API format |

---

## Technical Notes

### Why the Current PDF Extraction Fails

The current code does this:
```javascript
content: `Extract ALL text from this PDF document (base64 encoded):
${base64.substring(0, 60000)}`
```

This is wrong because:
1. Gemini sees "JVBERi0xLjcKJeLjz9MK..." as literal text, not a file
2. Truncating to 60k chars loses most of the document
3. The model cannot decode base64 from a text prompt

### Correct Vision API Format

For Gemini to actually process a PDF/image file, it must be sent as:
```javascript
content: [
  { type: "text", text: "Extract text from this document" },
  { 
    type: "image_url",
    image_url: { url: `data:${mimeType};base64,${base64}` }
  }
]
```

### DOCX Structure
DOCX files are ZIP archives containing:
```
word/document.xml  <- Main content here
word/styles.xml
[Content_Types].xml
...
```

Text lives in `<w:t>` tags within `document.xml`.

