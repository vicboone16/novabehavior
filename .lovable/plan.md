

# VB-MAPP Complete Overhaul: Milestones, Barriers, Transition, and EESA

## Overview
This plan adds the three missing VB-MAPP subtests (Barriers, Transition, EESA) and corrects/completes the Milestones Assessment from the current 112 items to the full 170. All item descriptions will be updated to match the official manual text from the uploaded PDFs.

---

## Part 1: Database Corrections -- Milestones (170 items)

The current database has 112 items and is missing entire domains and levels. Here is what needs to be added or corrected:

**Missing domains (create new):**
- Spontaneous Vocal Behavior (Level 1 only, items 1-5)
- Linguistic Structure (Level 2: items 6-10, Level 3: items 11-15)

**Missing levels in existing domains:**
- Listener Responding: Level 3 (items 11-15) -- 5 items
- VP/MTS: Level 2 (items 6-10) and Level 3 (items 11-15) -- 10 items
- Independent Play: Level 2 (items 6-10) and Level 3 (items 11-15) -- 10 items
- Social Behavior & Social Play: Level 2 (items 6-10) and Level 3 (items 11-15) -- 10 items
- Motor Imitation: Level 2 (items 6-10) -- 5 items
- Echoic: Level 2 (items 6-10) -- 5 items
- LRFFC: Missing items 6, 7 (adding a Level 2 item 6 for animal sounds), and Level 3 items 11-15 completion
- Intraverbal: Missing Level 2 item 6 and Level 3 items to fill gaps
- Classroom Routines: Missing Level 2 items 6-10 and Level 3 items 11-15 completion

**Description corrections:** All 112 existing items will have their descriptions updated to match the exact official manual text from the uploaded Milestones PDF.

**Net result:** 170 total milestone items across 16 domains and 3 levels.

---

## Part 2: Barriers Assessment (24 items)

A new curriculum system entry `VB-MAPP Barriers` will be created with 24 barrier categories, each scored 0-4:

1. Negative Behaviors
2. Instructional Control
3. Absent/Weak Mand Repertoire
4. Absent/Weak Tact Repertoire
5. Absent/Weak Motor Imitation
6. Absent/Weak Echoic Repertoire
7. Absent/Weak VP/MTS
8. Absent/Weak Listener Repertoires
9. Absent/Weak Intraverbal Repertoire
10. Absent/Weak Social Skills
11. Prompt Dependent
12. Scrolling Responses
13. Impaired Scanning Skills
14. Failure to Make Conditional Discriminations
15. Failure to Generalize
16. Weak/Atypical Motivating Operations
17. Response Requirement Weakens the MO
18. Reinforcement Dependent
19. Self-Stimulation
20. Articulation Problems
21. Obsessive-Compulsive Behavior
22. Hyperactive Behavior
23. Failure to Make Eye Contact
24. Sensory Defensiveness

Each item stores the 5 scoring levels (0-4) in its description for reference.

**Grid display:** A vertical list of barriers, each with a 0-4 radio/button selector. No level tabs needed -- all 24 items displayed in a single scrollable view.

---

## Part 3: Transition Assessment (18 areas)

A new curriculum system entry `VB-MAPP Transition` with 18 areas, each scored 1-5:

1. VB-MAPP Milestones Score
2. VB-MAPP Barriers Score
3. Negative Behaviors and Instructional Control
4. Classroom Routines and Group Skills
5. Social Skills and Social Play
6. Independent Academic Work
7. Generalization
8. Range of Reinforcers
9. Rate of Skill Acquisition
10. Retention of New Skills
11. Natural Environment Learning
12. Transfer Without Training
13. Adaptability to Change
14. Spontaneous Behaviors
15. Self-Directed Leisure Time
16. General Self-Help
17. Toileting Skills
18. Eating Skills

**Grid display:** 3 rows of 6 areas each (matching the official VB-MAPP layout), each area as a vertical bar chart where the clinician clicks a score 1-5. Up to 4 testing dates shown side-by-side.

---

## Part 4: EESA Subtest (100 items)

A new curriculum system entry `VB-MAPP EESA` with 100 echoic items scored 0 or 1, organized in 10 groups of 10:

- Group 1: Animal sounds & song fill-ins
- Group 2: Name, fill-ins, associations
- Group 3: Simple "What" questions
- Group 4: Simple "Who, Where" & age
- Group 5: Categories, function, features
- Group 6: Adjectives, prepositions, adverbs
- Group 7: Multiple-part questions (set 1)
- Group 8: Multiple-part questions (set 2)
- Group 9: Complex questions (set 1)
- Group 10: Complex questions (set 2)

Each group has a max of 10 points. Total possible = 100.

**Grid display:** Tabbed by group, with a simple pass/fail toggle for each item and running totals per group and overall.

---

## Part 5: UI Integration

### VB-MAPP Grid Updates
- The existing `VBMAPPGrid.tsx` component continues to handle Milestones with the 0/0.5/1 scoring
- Add a subtest selector (Milestones | Barriers | Transition | EESA) as tabs within the grid view

### New Grid Components
- `VBMAPPBarriersGrid.tsx` -- 24-item list with 0-4 scale buttons
- `VBMAPPTransitionGrid.tsx` -- 18-area visual bar chart grid (3x6 layout)
- `VBMAPPEESAGrid.tsx` -- 100-item pass/fail grid organized by 10 groups

### Entry Point Changes
- `InternalVBMAPPEntry.tsx` updated to show VB-MAPP subtests as a unified assessment package
- When creating a new VB-MAPP assessment, all 4 subtests share the same `student_assessment` record but store results in separate keys within `results_json`

---

## Technical Details

### Database Migrations
1. Insert 2 new domains (Spontaneous Vocal Behavior, Linguistic Structure) into `domains` table
2. Insert ~58 new `curriculum_items` for missing milestones
3. Update descriptions on ~112 existing items to match official manual text
4. Create 3 new curriculum systems: `VB-MAPP Barriers`, `VB-MAPP Transition`, `VB-MAPP EESA`
5. Create domains and items for each new system

### Results JSON Structure
```text
results_json: {
  // Milestones (existing): item_id -> { score: 0|0.5|1, date_scored }
  // Barriers: "barrier_1" -> { score: 0-4, date_scored }
  // Transition: "transition_1" -> { score: 1-5, date_scored }
  // EESA: "eesa_g1_1" -> { score: 0|1, date_scored }
}
```

### Files to Create
- `src/components/skills/VBMAPPBarriersGrid.tsx`
- `src/components/skills/VBMAPPTransitionGrid.tsx`
- `src/components/skills/VBMAPPEESAGrid.tsx`

### Files to Modify
- `src/components/skills/VBMAPPGrid.tsx` -- Add subtest tab navigation
- `src/components/assessment/InternalVBMAPPEntry.tsx` -- Show unified VB-MAPP package with all subtests

### Execution Order
1. Run database migration (add domains, items, systems)
2. Update existing item descriptions
3. Create Barriers grid component
4. Create Transition grid component
5. Create EESA grid component
6. Update VBMAPPGrid with subtest navigation
7. Update InternalVBMAPPEntry for unified display

