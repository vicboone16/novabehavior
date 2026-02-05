 import { format } from 'date-fns';
 import { 
   Document, 
   Packer, 
   Paragraph, 
   TextRun, 
   HeadingLevel, 
   Table, 
   TableRow, 
   TableCell, 
   WidthType,
   BorderStyle,
   AlignmentType,
 } from 'docx';
 import { saveAs } from 'file-saver';
 import { IndirectAssessmentResult, BriefTeacherInputSaved, BriefRecordReviewSavedData, Student } from '@/types/behavior';
 
 // Rating scale items for reference
 const FAST_ITEMS = [
   { id: 'fast_1', text: 'Engages in behavior to get attention from others', function: 'attention' },
   { id: 'fast_2', text: 'Behavior occurs when caregiver attention is directed elsewhere', function: 'attention' },
   { id: 'fast_3', text: 'Behavior stops when attention is provided', function: 'attention' },
   { id: 'fast_4', text: 'Seems to enjoy reactions from others when engaging in behavior', function: 'attention' },
   { id: 'fast_5', text: 'Behavior occurs during difficult or disliked tasks', function: 'escape' },
   { id: 'fast_6', text: 'Behavior occurs when asked to do something', function: 'escape' },
   { id: 'fast_7', text: 'Behavior stops when demands are removed', function: 'escape' },
   { id: 'fast_8', text: 'Behavior seems designed to get out of work or activities', function: 'escape' },
   { id: 'fast_9', text: 'Behavior occurs when preferred item is removed', function: 'tangible' },
   { id: 'fast_10', text: 'Behavior occurs when told "no" to a request', function: 'tangible' },
   { id: 'fast_11', text: 'Behavior stops when given access to preferred item', function: 'tangible' },
   { id: 'fast_12', text: 'Behavior seems designed to get access to things', function: 'tangible' },
   { id: 'fast_13', text: 'Behavior occurs when alone', function: 'sensory' },
   { id: 'fast_14', text: 'Behavior occurs regardless of what is happening around them', function: 'sensory' },
   { id: 'fast_15', text: 'Behavior seems to provide sensory stimulation', function: 'sensory' },
   { id: 'fast_16', text: 'Behavior occurs even when no one is around', function: 'sensory' },
 ];
 
 const MAS_ITEMS = [
   { id: 'mas_1', text: 'Would the behavior occur continuously if left alone for long periods?', function: 'sensory' },
   { id: 'mas_5', text: 'Does the behavior occur following a request to perform a difficult task?', function: 'escape' },
   { id: 'mas_9', text: 'Does the behavior seem to occur when the person has been told they cannot have something?', function: 'tangible' },
   { id: 'mas_13', text: 'When the behavior occurs, do you provide comfort to the person?', function: 'attention' },
   { id: 'mas_2', text: 'Does the behavior occur following a command or request?', function: 'escape' },
   { id: 'mas_6', text: 'Does the behavior occur when any request is made?', function: 'escape' },
   { id: 'mas_10', text: 'Does the behavior stop when you give the person a task to do?', function: 'escape' },
   { id: 'mas_14', text: 'Does the behavior occur when you stop attending to the person?', function: 'attention' },
   { id: 'mas_3', text: 'Does the behavior seem to occur to get a toy, food, or activity?', function: 'tangible' },
   { id: 'mas_7', text: 'Does the behavior occur when a favorite item is taken away?', function: 'tangible' },
   { id: 'mas_11', text: 'Does the behavior seem to occur when the person wants something?', function: 'tangible' },
   { id: 'mas_15', text: 'Does the behavior seem to provide internal stimulation?', function: 'sensory' },
   { id: 'mas_4', text: 'Does the behavior occur when no one is paying attention?', function: 'attention' },
   { id: 'mas_8', text: 'Does the behavior occur when the person is alone?', function: 'sensory' },
   { id: 'mas_12', text: 'Does the person seem calm during the behavior?', function: 'sensory' },
   { id: 'mas_16', text: 'Does the behavior occur to get your attention?', function: 'attention' },
 ];
 
 const QABF_ITEMS = [
   { id: 'qabf_1', text: 'Engages in behavior to get attention', function: 'attention' },
   { id: 'qabf_6', text: 'Engages in behavior when not receiving attention', function: 'attention' },
   { id: 'qabf_11', text: 'Engages in behavior to get a reaction from others', function: 'attention' },
   { id: 'qabf_16', text: 'Engages in behavior when others are not interacting', function: 'attention' },
   { id: 'qabf_21', text: 'Engages in behavior when people are talking and not attending', function: 'attention' },
   { id: 'qabf_2', text: 'Engages in behavior to escape work/learning', function: 'escape' },
   { id: 'qabf_7', text: 'Engages in behavior when asked to do something', function: 'escape' },
   { id: 'qabf_12', text: 'Engages in behavior during difficult tasks', function: 'escape' },
   { id: 'qabf_17', text: 'Engages in behavior when work is too hard', function: 'escape' },
   { id: 'qabf_22', text: 'Engages in behavior to avoid activities', function: 'escape' },
   { id: 'qabf_3', text: 'Engages in behavior when alone', function: 'sensory' },
   { id: 'qabf_8', text: 'Engages in behavior regardless of what is happening around', function: 'sensory' },
   { id: 'qabf_13', text: 'Engages in behavior that provides sensory stimulation', function: 'sensory' },
   { id: 'qabf_18', text: 'Engages in behavior repeatedly in the same way', function: 'sensory' },
   { id: 'qabf_23', text: 'Engages in behavior even when no one is around', function: 'sensory' },
   { id: 'qabf_4', text: 'Engages in behavior to get preferred items', function: 'tangible' },
   { id: 'qabf_9', text: 'Engages in behavior when preferred item is taken', function: 'tangible' },
   { id: 'qabf_14', text: 'Engages in behavior when cannot have something wanted', function: 'tangible' },
   { id: 'qabf_19', text: 'Engages in behavior to get food/drink', function: 'tangible' },
   { id: 'qabf_24', text: 'Engages in behavior to access activities', function: 'tangible' },
   { id: 'qabf_5', text: 'Engages in behavior when a favorite thing is out of reach', function: 'tangible' },
   { id: 'qabf_10', text: 'Engages in behavior when denied access to something', function: 'tangible' },
   { id: 'qabf_15', text: 'Engages in behavior to get something to eat/drink', function: 'tangible' },
   { id: 'qabf_20', text: 'Engages in behavior when waiting for something', function: 'tangible' },
   { id: 'qabf_25', text: 'Engages in behavior when told no', function: 'tangible' },
 ];
 
 const RATING_LABELS: Record<number, string> = {
   0: 'Never',
   1: 'Almost Never',
   2: 'Sometimes',
   3: 'Almost Always',
   4: 'Always',
 };
 
 const FUNCTION_LABELS: Record<string, string> = {
   attention: 'Social Attention',
   escape: 'Escape/Avoidance',
   tangible: 'Tangible/Access',
   sensory: 'Sensory/Automatic',
 };
 
 function getItemsForType(type: 'FAST' | 'MAS' | 'QABF') {
   switch (type) {
     case 'FAST': return FAST_ITEMS;
     case 'MAS': return MAS_ITEMS;
     case 'QABF': return QABF_ITEMS;
     default: return [];
   }
 }
 
 function createTableBorders() {
   return {
     top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
     bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
     left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
     right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
   };
 }
 
 export async function exportRatingScaleToDocx(
   assessment: IndirectAssessmentResult,
   student: Student
 ): Promise<void> {
   const items = getItemsForType(assessment.type);
   const children: Paragraph[] = [];
 
   // Title
   children.push(
     new Paragraph({
       text: 'FUNCTIONAL BEHAVIOR ASSESSMENT - INDIRECT ASSESSMENT',
       heading: HeadingLevel.HEADING_1,
       alignment: AlignmentType.CENTER,
     })
   );
   children.push(
     new Paragraph({
       text: `${assessment.type} Rating Scale`,
       heading: HeadingLevel.HEADING_2,
       alignment: AlignmentType.CENTER,
     })
   );
   children.push(new Paragraph({ text: '' }));
 
   // Header info
   children.push(
     new Paragraph({
       children: [
         new TextRun({ text: 'Student: ', bold: true }),
         new TextRun(student.displayName || student.name),
       ],
     })
   );
   children.push(
     new Paragraph({
       children: [
         new TextRun({ text: 'Target Behavior: ', bold: true }),
         new TextRun(assessment.targetBehavior),
       ],
     })
   );
   children.push(
     new Paragraph({
       children: [
         new TextRun({ text: 'Completed By: ', bold: true }),
         new TextRun(assessment.completedBy),
       ],
     })
   );
   children.push(
     new Paragraph({
       children: [
         new TextRun({ text: 'Date: ', bold: true }),
         new TextRun(format(new Date(assessment.completedAt), 'MMMM d, yyyy')),
       ],
     })
   );
   children.push(new Paragraph({ text: '' }));
 
   // Function Scores Section
   children.push(
     new Paragraph({
       text: 'FUNCTION SCORES',
       heading: HeadingLevel.HEADING_2,
     })
   );
   children.push(new Paragraph({ text: '' }));
 
   // Calculate max scores per function
   const functionCounts: Record<string, number> = { attention: 0, escape: 0, tangible: 0, sensory: 0 };
   items.forEach(item => {
     functionCounts[item.function]++;
   });
 
   // Create scores table
   const tableRows: TableRow[] = [
     new TableRow({
       children: [
         new TableCell({
           children: [new Paragraph({ children: [new TextRun({ text: 'Function', bold: true })] })],
           width: { size: 40, type: WidthType.PERCENTAGE },
           borders: createTableBorders(),
         }),
         new TableCell({
           children: [new Paragraph({ children: [new TextRun({ text: 'Score', bold: true })] })],
           width: { size: 20, type: WidthType.PERCENTAGE },
           borders: createTableBorders(),
         }),
         new TableCell({
           children: [new Paragraph({ children: [new TextRun({ text: 'Max', bold: true })] })],
           width: { size: 20, type: WidthType.PERCENTAGE },
           borders: createTableBorders(),
         }),
         new TableCell({
           children: [new Paragraph({ children: [new TextRun({ text: 'Percentage', bold: true })] })],
           width: { size: 20, type: WidthType.PERCENTAGE },
           borders: createTableBorders(),
         }),
       ],
     }),
   ];
 
   Object.entries(assessment.scores).forEach(([fn, score]) => {
     const maxScore = functionCounts[fn] * 4;
     const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
     const isPrimary = fn === assessment.primaryFunction;
     
     tableRows.push(
       new TableRow({
         children: [
           new TableCell({
             children: [new Paragraph({ 
               children: [new TextRun({ 
                 text: `${FUNCTION_LABELS[fn]}${isPrimary ? ' ★' : ''}`,
                 bold: isPrimary 
               })] 
             })],
             borders: createTableBorders(),
           }),
           new TableCell({
             children: [new Paragraph({ text: String(score) })],
             borders: createTableBorders(),
           }),
           new TableCell({
             children: [new Paragraph({ text: String(maxScore) })],
             borders: createTableBorders(),
           }),
           new TableCell({
             children: [new Paragraph({ 
               children: [new TextRun({ text: `${percentage}%`, bold: isPrimary })] 
             })],
             borders: createTableBorders(),
           }),
         ],
       })
     );
   });
 
   children.push(
     new Paragraph({
       children: [
         new Table({
           rows: tableRows,
           width: { size: 100, type: WidthType.PERCENTAGE },
         }),
       ],
     })
   );
 
   children.push(new Paragraph({ text: '' }));
   children.push(
     new Paragraph({
       children: [
         new TextRun({ text: 'PRIMARY FUNCTION: ', bold: true }),
         new TextRun({ text: FUNCTION_LABELS[assessment.primaryFunction], bold: true }),
       ],
     })
   );
   children.push(new Paragraph({ text: '' }));
 
   // Item Responses Section
   children.push(
     new Paragraph({
       text: 'ITEM RESPONSES',
       heading: HeadingLevel.HEADING_2,
     })
   );
   children.push(new Paragraph({ text: '' }));
 
   items.forEach((item, index) => {
     const response = assessment.responses[item.id];
     const responseLabel = response !== undefined ? RATING_LABELS[response] : 'Not answered';
     
     children.push(
       new Paragraph({
         children: [
           new TextRun({ text: `${index + 1}. `, bold: true }),
           new TextRun(item.text),
         ],
       })
     );
     children.push(
       new Paragraph({
         children: [
           new TextRun({ text: '   Response: ' }),
           new TextRun({ text: responseLabel, bold: true }),
           new TextRun({ text: ` (${FUNCTION_LABELS[item.function]})`, italics: true }),
         ],
       })
     );
     children.push(new Paragraph({ text: '' }));
   });
 
   // Notes Section
   if (assessment.notes) {
     children.push(
       new Paragraph({
         text: 'NOTES',
         heading: HeadingLevel.HEADING_2,
       })
     );
     children.push(new Paragraph({ text: assessment.notes }));
   }
 
   // Create document
   const doc = new Document({
     sections: [{ properties: {}, children }],
   });
 
   const blob = await Packer.toBlob(doc);
   const filename = `${assessment.type}-${(student.displayName || student.name).replace(/\s+/g, '-')}-${format(new Date(assessment.completedAt), 'yyyy-MM-dd')}.docx`;
   saveAs(blob, filename);
 }
 
 export async function exportBriefTeacherInputToDocx(
   response: BriefTeacherInputSaved,
   student: Student
 ): Promise<void> {
   const children: Paragraph[] = [];
 
   // Title
   children.push(
     new Paragraph({
       text: 'BRIEF FBA TEACHER/STAFF INTERVIEW',
       heading: HeadingLevel.HEADING_1,
       alignment: AlignmentType.CENTER,
     })
   );
   children.push(new Paragraph({ text: '' }));
 
   // Header info
   children.push(
     new Paragraph({
       children: [
         new TextRun({ text: 'Student: ', bold: true }),
         new TextRun(student.displayName || student.name),
       ],
     })
   );
   children.push(
     new Paragraph({
       children: [
         new TextRun({ text: 'Respondent: ', bold: true }),
         new TextRun(response.respondentName),
       ],
     })
   );
   children.push(
     new Paragraph({
       children: [
         new TextRun({ text: 'Date: ', bold: true }),
         new TextRun(format(new Date(response.date), 'MMMM d, yyyy')),
       ],
     })
   );
   children.push(new Paragraph({ text: '' }));
 
   // Strengths
   if (response.strengths && response.strengths.length > 0) {
     children.push(
       new Paragraph({
         text: 'STUDENT STRENGTHS',
         heading: HeadingLevel.HEADING_2,
       })
     );
     response.strengths.forEach(s => {
       children.push(new Paragraph({ text: `• ${s}` }));
     });
     children.push(new Paragraph({ text: '' }));
   }
 
   // Problem Behaviors
   children.push(
     new Paragraph({
       text: 'PROBLEM BEHAVIORS',
       heading: HeadingLevel.HEADING_2,
     })
   );
   if (response.problemBehaviors && response.problemBehaviors.length > 0) {
     response.problemBehaviors.forEach(b => {
       children.push(new Paragraph({ text: `☑ ${b}` }));
     });
   }
   if (response.otherBehavior) {
     children.push(new Paragraph({ text: `☑ Other: ${response.otherBehavior}` }));
   }
   children.push(new Paragraph({ text: '' }));
 
   if (response.behaviorDescription) {
     children.push(
       new Paragraph({
         children: [
           new TextRun({ text: 'Description: ', bold: true }),
           new TextRun(response.behaviorDescription),
         ],
       })
     );
     children.push(new Paragraph({ text: '' }));
   }
 
   // Frequency, Duration, Intensity
   const fdiParts: string[] = [];
   if (response.frequency) fdiParts.push(`Frequency: ${response.frequency}`);
   if (response.duration) fdiParts.push(`Duration: ${response.duration}`);
   if (response.intensity) fdiParts.push(`Intensity: ${response.intensity}`);
   
   if (fdiParts.length > 0) {
     children.push(
       new Paragraph({
         text: 'BEHAVIOR DETAILS',
         heading: HeadingLevel.HEADING_2,
       })
     );
     fdiParts.forEach(part => {
       children.push(new Paragraph({ text: part }));
     });
     children.push(new Paragraph({ text: '' }));
   }
 
   // Triggers
   if (response.triggers && response.triggers.length > 0) {
     children.push(
       new Paragraph({
         text: 'ANTECEDENTS (TRIGGERS)',
         heading: HeadingLevel.HEADING_2,
       })
     );
     response.triggers.forEach(t => {
       children.push(new Paragraph({ text: `• ${t}` }));
     });
     if (response.otherTrigger) {
       children.push(new Paragraph({ text: `• Other: ${response.otherTrigger}` }));
     }
     children.push(new Paragraph({ text: '' }));
   }
 
   // Consequences
   children.push(
     new Paragraph({
       text: 'CONSEQUENCES',
       heading: HeadingLevel.HEADING_2,
     })
   );
   
   if (response.thingsObtained && response.thingsObtained.length > 0) {
     children.push(
       new Paragraph({
         children: [
           new TextRun({ text: 'Things Obtained: ', bold: true }),
           new TextRun(response.thingsObtained.join(', ')),
         ],
       })
     );
     if (response.otherObtained) {
       children.push(new Paragraph({ text: `  Other: ${response.otherObtained}` }));
     }
   }
   
   if (response.thingsAvoided && response.thingsAvoided.length > 0) {
     children.push(
       new Paragraph({
         children: [
           new TextRun({ text: 'Things Avoided: ', bold: true }),
           new TextRun(response.thingsAvoided.join(', ')),
         ],
       })
     );
     if (response.otherAvoided) {
       children.push(new Paragraph({ text: `  Other: ${response.otherAvoided}` }));
     }
   }
   children.push(new Paragraph({ text: '' }));
 
   // Inferred Functions
   if (response.inferredFunctions && response.inferredFunctions.length > 0) {
     children.push(
       new Paragraph({
         text: 'INFERRED FUNCTIONS',
         heading: HeadingLevel.HEADING_2,
       })
     );
     response.inferredFunctions.forEach(fn => {
       children.push(new Paragraph({ text: `• ${FUNCTION_LABELS[fn] || fn}` }));
     });
     children.push(new Paragraph({ text: '' }));
   }
 
   // Additional Notes
   if (response.additionalNotes) {
     children.push(
       new Paragraph({
         text: 'ADDITIONAL NOTES',
         heading: HeadingLevel.HEADING_2,
       })
     );
     children.push(new Paragraph({ text: response.additionalNotes }));
   }
 
   // Create document
   const doc = new Document({
     sections: [{ properties: {}, children }],
   });
 
   const blob = await Packer.toBlob(doc);
   const filename = `Brief-Teacher-Input-${(student.displayName || student.name).replace(/\s+/g, '-')}-${format(new Date(response.date), 'yyyy-MM-dd')}.docx`;
   saveAs(blob, filename);
 }
 
 export async function exportBriefRecordReviewToDocx(
   review: BriefRecordReviewSavedData,
   student: Student
 ): Promise<void> {
   const children: Paragraph[] = [];
 
   // Title
   children.push(
     new Paragraph({
       text: 'BRIEF RECORD REVIEW - FBA',
       heading: HeadingLevel.HEADING_1,
       alignment: AlignmentType.CENTER,
     })
   );
   children.push(new Paragraph({ text: '' }));
 
   // Header info
   children.push(
     new Paragraph({
       children: [
         new TextRun({ text: 'Student: ', bold: true }),
         new TextRun(student.displayName || student.name),
         new TextRun('   |   '),
         new TextRun({ text: 'Grade: ', bold: true }),
         new TextRun(review.grade || 'Not specified'),
       ],
     })
   );
   children.push(
     new Paragraph({
       children: [
         new TextRun({ text: 'Reviewer: ', bold: true }),
         new TextRun(review.reviewer || 'Unknown'),
         new TextRun('   |   '),
         new TextRun({ text: 'Date: ', bold: true }),
         new TextRun(review.date ? format(new Date(review.date), 'MMMM d, yyyy') : 'Not specified'),
       ],
     })
   );
   if (review.respondentType || review.respondentName) {
     children.push(
       new Paragraph({
         children: [
           new TextRun({ text: 'Respondent: ', bold: true }),
           new TextRun(`${review.respondentType || ''} - ${review.respondentName || ''}`),
         ],
       })
     );
   }
   children.push(new Paragraph({ text: '' }));
 
   // 1. Health Information
   children.push(
     new Paragraph({
       text: `1. HEALTH INFORMATION ${review.healthReviewed ? '[✓ Reviewed]' : '[Not Reviewed]'}`,
       heading: HeadingLevel.HEADING_2,
     })
   );
   if (review.healthHistory) {
     children.push(new Paragraph({
       children: [new TextRun({ text: 'Health History: ', bold: true }), new TextRun(review.healthHistory)],
     }));
   }
   if (review.medicalDiagnoses) {
     children.push(new Paragraph({
       children: [new TextRun({ text: 'Medical Diagnoses: ', bold: true }), new TextRun(review.medicalDiagnoses)],
     }));
   }
   if (review.mentalHealthDiagnoses) {
     children.push(new Paragraph({
       children: [new TextRun({ text: 'Mental Health Diagnoses: ', bold: true }), new TextRun(review.mentalHealthDiagnoses)],
     }));
   }
   if (review.medications) {
     children.push(new Paragraph({
       children: [new TextRun({ text: 'Medications: ', bold: true }), new TextRun(review.medications)],
     }));
   }
   children.push(new Paragraph({ text: '' }));
 
   // 2. Academic Assessments
   children.push(
     new Paragraph({
       text: `2. ACADEMIC/BENCHMARK ASSESSMENTS ${review.academicReviewed ? '[✓ Reviewed]' : '[Not Reviewed]'}`,
       heading: HeadingLevel.HEADING_2,
     })
   );
   
   if (review.academicAssessments && Array.isArray(review.academicAssessments) && review.academicAssessments.length > 0) {
     const assessmentRows: TableRow[] = [
       new TableRow({
         children: [
           new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Subject', bold: true })] })], borders: createTableBorders() }),
           new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Assessment', bold: true })] })], borders: createTableBorders() }),
           new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'BOY', bold: true })] })], borders: createTableBorders() }),
           new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'MOY', bold: true })] })], borders: createTableBorders() }),
           new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'EOY', bold: true })] })], borders: createTableBorders() }),
         ],
       }),
     ];
     
     review.academicAssessments.forEach((a: any) => {
       assessmentRows.push(
         new TableRow({
           children: [
             new TableCell({ children: [new Paragraph({ text: a.subject || '' })], borders: createTableBorders() }),
             new TableCell({ children: [new Paragraph({ text: a.assessmentName || '' })], borders: createTableBorders() }),
             new TableCell({ children: [new Paragraph({ text: a.boy || '' })], borders: createTableBorders() }),
             new TableCell({ children: [new Paragraph({ text: a.moy || '' })], borders: createTableBorders() }),
             new TableCell({ children: [new Paragraph({ text: a.eoy || '' })], borders: createTableBorders() }),
           ],
         })
       );
     });
     
     children.push(
       new Paragraph({
         children: [
           new Table({
             rows: assessmentRows,
             width: { size: 100, type: WidthType.PERCENTAGE },
           }),
         ],
       })
     );
   }
   children.push(new Paragraph({ text: '' }));
 
   // 3. Previous Interventions
   children.push(
     new Paragraph({
       text: `3. PREVIOUS INTERVENTIONS ${review.interventionsReviewed ? '[✓ Reviewed]' : '[Not Reviewed]'}`,
       heading: HeadingLevel.HEADING_2,
     })
   );
   if (review.behaviorInterventions) {
     children.push(new Paragraph({
       children: [new TextRun({ text: 'Behavior Interventions: ', bold: true }), new TextRun(review.behaviorInterventions)],
     }));
   }
   if (review.academicInterventions) {
     children.push(new Paragraph({
       children: [new TextRun({ text: 'Academic Interventions: ', bold: true }), new TextRun(review.academicInterventions)],
     }));
   }
   if (review.previousFBABIP) {
     children.push(new Paragraph({
       children: [new TextRun({ text: 'Previous FBA/BIP: ', bold: true }), new TextRun(review.previousFBABIP)],
     }));
   }
   children.push(new Paragraph({ text: '' }));
 
   // 4. Attendance
   children.push(
     new Paragraph({
       text: `4. ATTENDANCE ${review.attendanceReviewed ? '[✓ Reviewed]' : '[Not Reviewed]'}`,
       heading: HeadingLevel.HEADING_2,
     })
   );
   children.push(new Paragraph({
     children: [
       new TextRun({ text: 'Previous Attendance Concerns: ', bold: true }),
       new TextRun(review.previousAttendanceConcerns ? 'Yes' : 'No'),
     ],
   }));
   if (review.tardy) {
     children.push(new Paragraph({ children: [new TextRun({ text: 'Tardy: ', bold: true }), new TextRun(review.tardy)] }));
   }
   if (review.earlyDismissal) {
     children.push(new Paragraph({ children: [new TextRun({ text: 'Early Dismissal: ', bold: true }), new TextRun(review.earlyDismissal)] }));
   }
   if (review.absent) {
     children.push(new Paragraph({ children: [new TextRun({ text: 'Absent: ', bold: true }), new TextRun(review.absent)] }));
   }
   children.push(new Paragraph({ text: '' }));
 
   // 5. Discipline
   children.push(
     new Paragraph({
       text: `5. DISCIPLINE ${review.disciplineReviewed ? '[✓ Reviewed]' : '[Not Reviewed]'}`,
       heading: HeadingLevel.HEADING_2,
     })
   );
   
   if (review.disciplineRecords && Array.isArray(review.disciplineRecords) && review.disciplineRecords.length > 0) {
     const disciplineRows: TableRow[] = [
       new TableRow({
         children: [
           new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true })] })], borders: createTableBorders() }),
           new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Incident', bold: true })] })], borders: createTableBorders() }),
           new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Consequence', bold: true })] })], borders: createTableBorders() }),
         ],
       }),
     ];
     
     review.disciplineRecords.forEach((d: any) => {
       disciplineRows.push(
         new TableRow({
           children: [
             new TableCell({ children: [new Paragraph({ text: d.date || '' })], borders: createTableBorders() }),
             new TableCell({ children: [new Paragraph({ text: d.incident || '' })], borders: createTableBorders() }),
             new TableCell({ children: [new Paragraph({ text: d.consequence || '' })], borders: createTableBorders() }),
           ],
         })
       );
     });
     
     children.push(
       new Paragraph({
         children: [
           new Table({
             rows: disciplineRows,
             width: { size: 100, type: WidthType.PERCENTAGE },
           }),
         ],
       })
     );
   }
   if (review.disciplineNotes) {
     children.push(new Paragraph({
       children: [new TextRun({ text: 'Notes: ', bold: true }), new TextRun(review.disciplineNotes)],
     }));
   }
   children.push(new Paragraph({ text: '' }));
 
   // 6. IEP Review
   children.push(
     new Paragraph({
       text: `6. IEP REVIEW ${review.iepReviewed ? '[✓ Reviewed]' : '[Not Reviewed]'}`,
       heading: HeadingLevel.HEADING_2,
     })
   );
   if (review.eligibilityDisability) {
     children.push(new Paragraph({
       children: [new TextRun({ text: 'Eligibility/Disability: ', bold: true }), new TextRun(review.eligibilityDisability)],
     }));
   }
   if (review.services) {
     children.push(new Paragraph({
       children: [new TextRun({ text: 'Services: ', bold: true }), new TextRun(review.services)],
     }));
   }
   if (review.programModifications) {
     children.push(new Paragraph({
       children: [new TextRun({ text: 'Program Modifications: ', bold: true }), new TextRun(review.programModifications)],
     }));
   }
   if (review.otherInformation) {
     children.push(new Paragraph({
       children: [new TextRun({ text: 'Other Information: ', bold: true }), new TextRun(review.otherInformation)],
     }));
   }
 
   // Footer with status
   children.push(new Paragraph({ text: '' }));
   children.push(new Paragraph({
     children: [new TextRun({ text: '─'.repeat(50) })],
   }));
   children.push(new Paragraph({
     children: [
       new TextRun({ text: 'Status: ', bold: true }),
       new TextRun(review.status === 'submitted' ? 'SUBMITTED' : 'DRAFT'),
     ],
   }));
   if (review.updatedAt) {
     children.push(new Paragraph({
       children: [
         new TextRun({ text: 'Last Updated: ', bold: true }),
         new TextRun(format(new Date(review.updatedAt), 'MMMM d, yyyy h:mm a')),
       ],
     }));
   }
 
   // Create document
   const doc = new Document({
     sections: [{ properties: {}, children }],
   });
 
   const blob = await Packer.toBlob(doc);
   const filename = `Brief-Record-Review-${(student.displayName || student.name).replace(/\s+/g, '-')}-${format(new Date(review.date || review.createdAt), 'yyyy-MM-dd')}.docx`;
   saveAs(blob, filename);
 }
 
 // Print helper - opens a print dialog for the current page content
 export function printAssessmentContent(title: string, content: string): void {
   const printWindow = window.open('', '_blank');
   if (!printWindow) {
     alert('Please allow popups to print');
     return;
   }
   
   printWindow.document.write(`
     <!DOCTYPE html>
     <html>
     <head>
       <title>${title}</title>
       <style>
         body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
         h1 { text-align: center; margin-bottom: 20px; }
         h2 { margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
         table { width: 100%; border-collapse: collapse; margin: 10px 0; }
         th, td { border: 1px solid #999; padding: 8px; text-align: left; }
         th { background: #f0f0f0; }
         .header-info { margin-bottom: 20px; }
         .section { margin-bottom: 15px; }
         @media print { body { padding: 0; } }
       </style>
     </head>
     <body>
       ${content}
     </body>
     </html>
   `);
   
   printWindow.document.close();
   printWindow.focus();
   setTimeout(() => {
     printWindow.print();
     printWindow.close();
   }, 250);
 }
 
 // Generate printable HTML for rating scales
 export function generateRatingScalePrintHtml(assessment: IndirectAssessmentResult, student: Student): string {
   const items = getItemsForType(assessment.type);
   const functionCounts: Record<string, number> = { attention: 0, escape: 0, tangible: 0, sensory: 0 };
   items.forEach(item => { functionCounts[item.function]++; });
 
   let html = `
     <h1>FUNCTIONAL BEHAVIOR ASSESSMENT - INDIRECT ASSESSMENT<br/>${assessment.type} Rating Scale</h1>
     <div class="header-info">
       <p><strong>Student:</strong> ${student.displayName || student.name}</p>
       <p><strong>Target Behavior:</strong> ${assessment.targetBehavior}</p>
       <p><strong>Completed By:</strong> ${assessment.completedBy}</p>
       <p><strong>Date:</strong> ${format(new Date(assessment.completedAt), 'MMMM d, yyyy')}</p>
     </div>
     
     <h2>Function Scores</h2>
     <table>
       <tr><th>Function</th><th>Score</th><th>Max</th><th>%</th></tr>
   `;
   
   Object.entries(assessment.scores).forEach(([fn, score]) => {
     const maxScore = functionCounts[fn] * 4;
     const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
     const isPrimary = fn === assessment.primaryFunction;
     html += `<tr${isPrimary ? ' style="font-weight:bold;background:#e8f4e8;"' : ''}>
       <td>${FUNCTION_LABELS[fn]}${isPrimary ? ' ★' : ''}</td>
       <td>${score}</td><td>${maxScore}</td><td>${pct}%</td>
     </tr>`;
   });
   
   html += `</table>
     <p><strong>PRIMARY FUNCTION: ${FUNCTION_LABELS[assessment.primaryFunction]}</strong></p>
     
     <h2>Item Responses</h2>
   `;
   
   items.forEach((item, i) => {
     const resp = assessment.responses[item.id];
     html += `<p><strong>${i + 1}.</strong> ${item.text}<br/>
       <em>Response: ${resp !== undefined ? RATING_LABELS[resp] : 'Not answered'} (${FUNCTION_LABELS[item.function]})</em></p>`;
   });
   
   if (assessment.notes) {
     html += `<h2>Notes</h2><p>${assessment.notes}</p>`;
   }
   
   return html;
 }
 
 // Generate printable HTML for Brief Teacher Input
 export function generateBriefTeacherInputPrintHtml(response: BriefTeacherInputSaved, student: Student): string {
   let html = `
     <h1>BRIEF FBA TEACHER/STAFF INTERVIEW</h1>
     <div class="header-info">
       <p><strong>Student:</strong> ${student.displayName || student.name}</p>
       <p><strong>Respondent:</strong> ${response.respondentName}</p>
       <p><strong>Date:</strong> ${format(new Date(response.date), 'MMMM d, yyyy')}</p>
     </div>
   `;
   
   if (response.strengths?.length) {
     html += `<h2>Student Strengths</h2><ul>${response.strengths.map(s => `<li>${s}</li>`).join('')}</ul>`;
   }
   
   html += `<h2>Problem Behaviors</h2><ul>`;
   response.problemBehaviors?.forEach(b => { html += `<li>☑ ${b}</li>`; });
   if (response.otherBehavior) html += `<li>☑ Other: ${response.otherBehavior}</li>`;
   html += `</ul>`;
   
   if (response.behaviorDescription) {
     html += `<p><strong>Description:</strong> ${response.behaviorDescription}</p>`;
   }
   
   if (response.frequency || response.duration || response.intensity) {
     html += `<h2>Behavior Details</h2>`;
     if (response.frequency) html += `<p><strong>Frequency:</strong> ${response.frequency}</p>`;
     if (response.duration) html += `<p><strong>Duration:</strong> ${response.duration}</p>`;
     if (response.intensity) html += `<p><strong>Intensity:</strong> ${response.intensity}</p>`;
   }
   
   if (response.triggers?.length) {
     html += `<h2>Antecedents (Triggers)</h2><ul>${response.triggers.map(t => `<li>${t}</li>`).join('')}`;
     if (response.otherTrigger) html += `<li>Other: ${response.otherTrigger}</li>`;
     html += `</ul>`;
   }
   
   html += `<h2>Consequences</h2>`;
   if (response.thingsObtained?.length) {
     html += `<p><strong>Things Obtained:</strong> ${response.thingsObtained.join(', ')}</p>`;
   }
   if (response.thingsAvoided?.length) {
     html += `<p><strong>Things Avoided:</strong> ${response.thingsAvoided.join(', ')}</p>`;
   }
   
   if (response.inferredFunctions?.length) {
     html += `<h2>Inferred Functions</h2><ul>${response.inferredFunctions.map(fn => `<li>${FUNCTION_LABELS[fn] || fn}</li>`).join('')}</ul>`;
   }
   
   if (response.additionalNotes) {
     html += `<h2>Additional Notes</h2><p>${response.additionalNotes}</p>`;
   }
   
   return html;
 }
 
 // Generate printable HTML for Brief Record Review
 export function generateBriefRecordReviewPrintHtml(review: BriefRecordReviewSavedData, student: Student): string {
   let html = `
     <h1>BRIEF RECORD REVIEW - FBA</h1>
     <div class="header-info">
       <p><strong>Student:</strong> ${student.displayName || student.name} | <strong>Grade:</strong> ${review.grade || 'N/A'}</p>
       <p><strong>Reviewer:</strong> ${review.reviewer || 'Unknown'} | <strong>Date:</strong> ${review.date ? format(new Date(review.date), 'MMMM d, yyyy') : 'N/A'}</p>
     </div>
     
     <h2>1. Health Information ${review.healthReviewed ? '[✓ Reviewed]' : ''}</h2>
   `;
   
   if (review.healthHistory) html += `<p><strong>Health History:</strong> ${review.healthHistory}</p>`;
   if (review.medicalDiagnoses) html += `<p><strong>Medical Diagnoses:</strong> ${review.medicalDiagnoses}</p>`;
   if (review.mentalHealthDiagnoses) html += `<p><strong>Mental Health Diagnoses:</strong> ${review.mentalHealthDiagnoses}</p>`;
   if (review.medications) html += `<p><strong>Medications:</strong> ${review.medications}</p>`;
   
   html += `<h2>2. Academic/Benchmark Assessments ${review.academicReviewed ? '[✓ Reviewed]' : ''}</h2>`;
   if (review.academicAssessments && Array.isArray(review.academicAssessments) && review.academicAssessments.length > 0) {
     html += `<table><tr><th>Subject</th><th>Assessment</th><th>BOY</th><th>MOY</th><th>EOY</th></tr>`;
     review.academicAssessments.forEach((a: any) => {
       html += `<tr><td>${a.subject || ''}</td><td>${a.assessmentName || ''}</td><td>${a.boy || ''}</td><td>${a.moy || ''}</td><td>${a.eoy || ''}</td></tr>`;
     });
     html += `</table>`;
   }
   
   html += `<h2>3. Previous Interventions ${review.interventionsReviewed ? '[✓ Reviewed]' : ''}</h2>`;
   if (review.behaviorInterventions) html += `<p><strong>Behavior:</strong> ${review.behaviorInterventions}</p>`;
   if (review.academicInterventions) html += `<p><strong>Academic:</strong> ${review.academicInterventions}</p>`;
   if (review.previousFBABIP) html += `<p><strong>Previous FBA/BIP:</strong> ${review.previousFBABIP}</p>`;
   
   html += `<h2>4. Attendance ${review.attendanceReviewed ? '[✓ Reviewed]' : ''}</h2>`;
   html += `<p><strong>Previous Concerns:</strong> ${review.previousAttendanceConcerns ? 'Yes' : 'No'}</p>`;
   if (review.tardy) html += `<p><strong>Tardy:</strong> ${review.tardy}</p>`;
   if (review.earlyDismissal) html += `<p><strong>Early Dismissal:</strong> ${review.earlyDismissal}</p>`;
   if (review.absent) html += `<p><strong>Absent:</strong> ${review.absent}</p>`;
   
   html += `<h2>5. Discipline ${review.disciplineReviewed ? '[✓ Reviewed]' : ''}</h2>`;
   if (review.disciplineRecords && Array.isArray(review.disciplineRecords) && review.disciplineRecords.length > 0) {
     html += `<table><tr><th>Date</th><th>Incident</th><th>Consequence</th></tr>`;
     review.disciplineRecords.forEach((d: any) => {
       html += `<tr><td>${d.date || ''}</td><td>${d.incident || ''}</td><td>${d.consequence || ''}</td></tr>`;
     });
     html += `</table>`;
   }
   if (review.disciplineNotes) html += `<p><strong>Notes:</strong> ${review.disciplineNotes}</p>`;
   
   html += `<h2>6. IEP Review ${review.iepReviewed ? '[✓ Reviewed]' : ''}</h2>`;
   if (review.eligibilityDisability) html += `<p><strong>Eligibility/Disability:</strong> ${review.eligibilityDisability}</p>`;
   if (review.services) html += `<p><strong>Services:</strong> ${review.services}</p>`;
   if (review.programModifications) html += `<p><strong>Program Modifications:</strong> ${review.programModifications}</p>`;
   if (review.otherInformation) html += `<p><strong>Other Information:</strong> ${review.otherInformation}</p>`;
   
   html += `<hr/><p><strong>Status:</strong> ${review.status === 'submitted' ? 'SUBMITTED' : 'DRAFT'}</p>`;
   
   return html;
 }