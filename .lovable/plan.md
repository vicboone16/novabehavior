

# Overhaul School FBA Export to Match District Templates

## Problem

The current School FBA export produces a document that does not match the formatting of the actual school district templates you use. Comparing the Jayden export (system output) with your MatCal, LuSa, and JM templates reveals significant structural and formatting gaps.

## Key Differences Found

| Area | Current Output | Template Format |
|------|---------------|-----------------|
| Title/Header | "FUNCTIONAL BEHAVIOR ASSESSMENT" centered, "School-Based Report" subtitle | "CONFIDENTIAL Functional Behavior Assessment" at top |
| Student Info | Label-value table with rows | Compact block: Name, SSID, DOB, Age, School, Grade, Case Manager, Date, FBA Completed By |
| Sources of Information | Plain text paragraph | Checkbox grid table (Parent Interview, Teacher Interview, Student Interview, Medical Records, etc.) |
| Data Collection Tools | Plain text paragraph | Checkbox grid table (ABC Recording, Interval Data, Structured Interviews, Scatterplot, etc.) |
| Observation Setting | Label-value rows | Checkbox format (Home, School, Community, Other) with People Involved and Time of Day |
| FBA Observation Details | Not present | Table with Date, Activities Observed, Data Collection Methods per session |
| Target Behaviors | Simple name/definition/baseline table | Each behavior gets its own block with Operational Definition, Possible Antecedents, Possible Consequences, Hypothesized Function |
| Indirect Assessment | Single text area | Separate subsections: Teacher Interview, Student Interview, Parent/Caregiver Interview |
| Summary of Findings | Not present | Dedicated narrative section before Hypothesized Function |
| Hypothesized Function | Italic block quote with function narratives table | Checkbox list (Attention, Escape, Tangible, Automatic) plus narrative paragraph |
| Recommendations | Plain text | Checkbox options (no intervention, environmental mods, BIP necessary, insufficient data) plus numbered strategy list |
| Signature | Simple line with name/date | "Respectfully Submitted" + signature line + name/title + date |

## Plan

### 1. Rewrite `src/lib/schoolFBAExport.ts`

Restructure the entire document builder to match the template format:

- **Header**: "CONFIDENTIAL Functional Behavior Assessment" left-aligned, bold
- **Student Information block**: Compact table matching template layout (add Age calculated from DOB, add "FBA Completed By" field)
- **Section 1 - Reason for Referral**: Numbered heading, narrative paragraph
- **Section 2 - Sources of Information**: Checkbox grid table (3-column layout with check/uncheck symbols)
- **Section 3 - Relevant Background Information**: Narrative paragraph
- **Section 4 - Data Collection Tools**: Checkbox grid table
- **Section 5 - Indirect Assessment**: Split into subsections (Teacher Interview, Student Interview, Parent/Caregiver Interview) each with their own editable narrative
- **Section 6 - Direct Assessment**: Observation setting checkboxes, People Involved, Time of Day, then FBA Observation Details table (Date | Activities | Methods), then Summary of Direct Observation narrative
- **Target Behaviors section**: Each behavior gets its own heading block with Operational Definition, Possible Antecedents, Possible Consequences, Hypothesized Function -- matching the JM template format
- **Summary of Findings**: New narrative section
- **Hypothesized Function**: Checkbox list plus narrative paragraph explaining what functions mean for this student
- **Recommended Strategies**: Numbered list of strategies
- **Recommendations**: Checkbox options (no further intervention, environmental mods only, BIP necessary, insufficient data) plus any additional text
- **Signature block**: "Respectfully Submitted" + line + name, credentials + date

### 2. Update `SchoolFBAData` Interface

Add new fields:

- `age` (string, calculated from DOB)
- `fbaCompletedBy` (string)
- `sourcesChecklist` (object with boolean flags for each source type)
- `dataToolsChecklist` (object with boolean flags for each tool)
- `observationSetting` (object with checkboxes: home, school, community, other)
- `observationPeopleInvolved` (string)
- `observationTimeOfDay` (string)
- `observationDetails` (array of date/activities/methods per session)
- `teacherInterview` (string)
- `studentInterview` (string)
- `parentInterview` (string)
- `backgroundInfo` (string)
- `summaryOfFindings` (string)
- `hypothesizedFunctions` (object with boolean flags: attention, escape, tangible, automatic)
- `recommendationChecklist` (object with boolean flags for each recommendation type)
- Per-behavior antecedents, consequences, and hypothesized functions

### 3. Update `FBAReportGenerator.tsx` School Fields

Add corresponding editable UI fields in the School FBA section:

- Checkbox toggles for Sources of Information and Data Collection Tools
- Separate text areas for Teacher Interview, Student Interview, Parent Interview
- Background Information text area
- Observation setting checkboxes and details table
- Per-behavior antecedent/consequence/function fields
- Summary of Findings text area
- Hypothesized Function checkboxes
- Recommendation checkboxes
- "FBA Completed By" field

All fields will be pre-populated with available data from the system (editable as suggestions), matching the current "All editable with suggestions" pattern.

### 4. Section Toggles

Each section remains toggleable on/off (existing pattern), so clinicians can include or exclude sections as needed for different districts.

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `src/lib/schoolFBAExport.ts` | Complete rewrite of document structure to match template formatting |
| `src/components/FBAReportGenerator.tsx` | Add new school fields for checklist items, per-behavior details, split interview sections, observation details table, summary of findings, recommendation checkboxes |

### Execution Order

1. Update the `SchoolFBAData` interface with all new fields
2. Rewrite the document builder in `schoolFBAExport.ts` to match the template structure
3. Update the UI in `FBAReportGenerator.tsx` to expose the new editable fields
4. Wire the data flow from the UI to the export engine

