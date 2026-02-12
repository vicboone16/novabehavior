import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, PageBreak,
  ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';

// ── Types ──────────────────────────────────────────────────────────────

export interface ClientInfo {
  clientName: string;
  parents: string;
  dob: string;
  address: string;
  age: string;
  grade: string;
  phone: string;
  diagnosisCode: string;
  evaluator: string;
  primaryLanguage: string;
  dateOfReport: string;
}

export interface ProviderInfo {
  agencyName: string;
  phone: string;
  taxId: string;
  email: string;
  address: string;
  npi: string;
}

export interface NarrativeSections {
  reasonForReferral: string;
  background: string;
  parentInterview: string;
  clientInterview: string;
  teacherInterview: string;
  behavioralObservations: string;
}

export interface DomainScoreRow {
  domain: string;
  raw: number;
  max: number;
  percent: number;
}

export interface ReportData {
  assessmentType: 'vbmapp' | 'ablls-r' | 'afls';
  aflsModule?: string;
  clientInfo: ClientInfo;
  providerInfo: ProviderInfo;
  narrativeSections: NarrativeSections;
  domainScores: DomainScoreRow[];
  domainNarratives: Record<string, string>;
  summary: string;
  recommendations: string[];
  bcbaName: string;
  bcbaNpi: string;
  bcbaCertNumber: string;
}

// ── Instrument Descriptions ────────────────────────────────────────────

const VBMAPP_DESCRIPTION = `The Verbal Behavior Milestones Assessment and Placement Program (VB-MAPP; Sundberg, 2008) is an assessment that is based upon B.F. Skinner's Verbal Behavior (1957), an analysis in the study of language. There are five components to the VB-MAPP (i.e., Milestones Assessment, Barriers Assessment, Transition Assessment, Task Analysis, and Curriculum Placement Guide) that are used to assess language and other skills, to determine appropriate educational placements and to assist in developing instructional objectives. The Milestones Assessment is designed to evaluate the learner's existing verbal and related skills. Language and learning milestones are sequenced according to typical development and are separated into three levels. Level 1 ranges from birth to 18-months-old, Level 2 from 18-months-old to 30-months-old, and Level 3 from 30-months-old to 48-months-old. By assessing skill development across these milestones, more effective and appropriate instructional objectives can be identified. The Barriers Assessment provides an assessment of 24 common learning and language acquisition barriers confronted by children with autism or other developmental disabilities. By identifying these barriers or variables that interfere with learning, specific instructional practices can be developed to help overcome these issues and lead to more effective learning. Performance on the Verbal Behavior Milestones Assessment and Placement Program is provided below.`;

const ABLLS_R_DESCRIPTION = `The Assessment of Basic Language and Learning Skills – Revised (ABLLS-R) is an assessment, curriculum guide, and skills tracking system based on the science of Applied Behavior Analysis that is designed to evaluate individuals with language delays and various disabilities. It is a tool that can help to identify deficits in 25 repertoire areas covering 544 skills, including language skills, academic ability, self-help, and motor skills. Performance on the Assessment of Basic Language and Learning Skills – Revised (ABLLS-R) is provided below.`;

const AFLS_INTRO = `The AFLS was administered to explore functional skills and understand the levels of functioning within various settings (e.g., home, school, community, and place of employment). By understanding abilities within these domains, it will provide an opportunity to develop a comprehensive and well-rounded ABA program that would include important functional skills that will be needed later on in life. An ABA program with this focus will be important to foster independence for the client. The AFLS is designed to assess functional, practical, and essential skills of everyday life. This assessment battery is designed to develop overarching goals for maximizing a learner's freedom, independence, and opportunities in life.`;

const AFLS_MODULE_DESCRIPTIONS: Record<string, string> = {
  'Basic Living Skills': `The Basic Living Skills module explores basic self-help, self-care, self-management, hygiene, routines, and core communication skills of clients. This module identifies the prerequisite for any functional skills program for any learner regardless of age, setting, or disability. These essential skills, if not mastered, could have a profound impact on a learner's ability to live independently, to be successful in school, and to take advantage of various social and recreational activities throughout the learner's life (Partington & Mueller, 2015). Performance on the AFLS – Basic Living Skills module is provided below.`,
  'Home Skills': `The Home Skills module of the AFLS provides an essential review of skills required for living in a home. Basic and advanced home skills of preparing and eating meals at home, cleaning tasks around the home, clothing, laundry, leisure skills, and the day-to-day mechanics of living in a home are assessed (Partington & Mueller, 2015). Performance on the AFLS – Home Skills module is provided below.`,
  'School Skills': `The School Skills module of the AFLS examines the ability of a learner to be an active participant in a variety of skills, routines, and social situations in educational settings. These skills are essential in striving for independence and successful functioning in different types of classrooms, in all parts of the school, and with peers and various staff. This assessment covers all age levels of education (i.e., elementary school, middle school, high school, college). It also incorporates skills that are necessary in a wide range of classroom environments (i.e., special day classes, "pull out" classrooms, inclusion, regular education), and considers the individual's level of development (e.g., language, behavior, and cognitive abilities) (Partington & Mueller, 2015). Performance on the AFLS – School Skills module is provided below.`,
  'Community Participation Skills': `The Community Participation Skills module of the AFLS examines the ability to participate in the community safely and independently. Furthermore, it explores skills associated with being able to independently shop in grocery and department stores, ordering and having meals in public, and social awareness and manners. Additionally, the ability to tell time and use time related concepts, making and keeping appointments, using a phone, and other skills to help learners stay connected and interact with others in the community are also assessed (Partington & Mueller, 2015). Performance on the AFLS – Community Participation Skills module is provided below.`,
  'Independent Living Skills': `The Independent Living Skills module of the AFLS examines the skills to prepare learners to live either independently or in a shared residence with others. This criterion-referenced assessment covers a wide variety of skills that promote independent living. There are many skills that are critical in order to live independently including organizing possessions, cleaning and cooking as well as money management skills related to financial planning, banking, bill paying, using debit and credit cards, and shopping. Each learner needs to know how to travel in the community, must also have good hygiene practices, and take medication as prescribed. This module also assesses the ability to assert personal rights, awareness of the motivation of others, as well as managing relationships with others in various settings (Partington & Mueller, 2015). Performance on the AFLS – Independent Living Skills module is provided below.`,
  'Vocational Skills': `The Vocational Skills module of the AFLS examines the essential skills for learners to be prepared to enter the workforce or those who are already working, but want to further develop skills for a wide variety of settings. This criterion-referenced assessment covers skills related to obtaining employment, searching for job openings, creating resumes, completing applications, and preparing for interviews. This protocol also includes a wide range of basic work-related skills such as job safety, payroll, financial issues, and interacting with supervisors and co-workers. It also includes a review of skills required in specific types of jobs in a variety of settings (Partington & Mueller, 2015). Performance on the AFLS – Vocational Skills module is provided below.`,
};

// ── Helpers ────────────────────────────────────────────────────────────

function infoRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 3000, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: `${label}:`, bold: true, size: 20 })] })],
        borders: noBorders(),
      }),
      new TableCell({
        width: { size: 6000, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: value || '', size: 20 })] })],
        borders: noBorders(),
      }),
    ],
  });
}

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: none, bottom: none, left: none, right: none };
}

function heading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1): Paragraph {
  return new Paragraph({ heading: level, children: [new TextRun({ text, bold: true })] });
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text, size: 22 })],
  });
}

function emptyLine(): Paragraph {
  return new Paragraph({ spacing: { after: 100 }, children: [] });
}

// ── Report Title ────────────────────────────────────────────────────────

function getTitle(data: ReportData): string {
  if (data.assessmentType === 'vbmapp') return 'Verbal Behavior Milestones Assessment and Placement Program (VB-MAPP) Evaluation';
  if (data.assessmentType === 'ablls-r') return 'Assessment of Basic Language and Learning Skills – Revised (ABLLS-R) Evaluation';
  return `Assessment of Functional Living Skills – ${data.aflsModule || 'Module'} Evaluation`;
}

// ── Build Document ──────────────────────────────────────────────────────

export function buildAssessmentReport(data: ReportData): Document {
  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: getTitle(data), bold: true, size: 28 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: '-CONFIDENTIAL-', italics: true, size: 20 })],
    })
  );

  // Client Information Table
  sections.push(heading('CLIENT INFORMATION'));
  const clientTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      infoRow("Client's Name", data.clientInfo.clientName),
      infoRow('Parent(s)', data.clientInfo.parents),
      infoRow('Date of Birth', data.clientInfo.dob),
      infoRow('Home Address', data.clientInfo.address),
      infoRow('Chronological Age', data.clientInfo.age),
      infoRow('Current Grade', data.clientInfo.grade),
      infoRow('Phone', data.clientInfo.phone),
      infoRow('Diagnosis Code', data.clientInfo.diagnosisCode),
      infoRow('Evaluator', data.clientInfo.evaluator),
      infoRow('Primary Language', data.clientInfo.primaryLanguage),
      infoRow('Date of Report', data.clientInfo.dateOfReport),
    ],
  });

  // Provider Information Table
  const providerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      infoRow("Agency/Provider's Name", data.providerInfo.agencyName),
      infoRow('Phone', data.providerInfo.phone),
      infoRow('Tax ID#', data.providerInfo.taxId),
      infoRow('Email', data.providerInfo.email),
      infoRow('Provider Address', data.providerInfo.address),
      infoRow('NPI#', data.providerInfo.npi),
    ],
  });

  // Narrative Sections
  const narrativeParagraphs: Paragraph[] = [
    heading('REASON FOR REFERRAL'),
    bodyParagraph(data.narrativeSections.reasonForReferral || ''),
    heading('BACKGROUND'),
    bodyParagraph(data.narrativeSections.background || ''),
    heading('PARENT/GUARDIAN/CAREGIVER INTERVIEW'),
    bodyParagraph(data.narrativeSections.parentInterview || ''),
    heading('CLIENT INTERVIEW'),
    bodyParagraph(data.narrativeSections.clientInterview || ''),
    heading('TEACHER INTERVIEW'),
    bodyParagraph(data.narrativeSections.teacherInterview || ''),
    heading('BEHAVIORAL OBSERVATIONS DURING ASSESSMENT'),
    bodyParagraph(data.narrativeSections.behavioralObservations || ''),
  ];

  // Instrument Description
  let instrumentDesc = '';
  if (data.assessmentType === 'vbmapp') instrumentDesc = VBMAPP_DESCRIPTION;
  else if (data.assessmentType === 'ablls-r') instrumentDesc = ABLLS_R_DESCRIPTION;
  else {
    instrumentDesc = AFLS_INTRO + '\n\n' + (AFLS_MODULE_DESCRIPTIONS[data.aflsModule || ''] || '');
  }

  const instrumentParagraphs: Paragraph[] = [];
  if (data.assessmentType === 'afls') {
    instrumentParagraphs.push(heading('Assessment of Functional Living Skills (AFLS)'));
    instrumentParagraphs.push(bodyParagraph(AFLS_INTRO));
    instrumentParagraphs.push(heading(data.aflsModule || 'Module', HeadingLevel.HEADING_1));
    instrumentParagraphs.push(bodyParagraph(AFLS_MODULE_DESCRIPTIONS[data.aflsModule || ''] || ''));
  } else {
    const instTitle = data.assessmentType === 'vbmapp'
      ? 'Verbal Behavior Milestones Assessment and Placement Program (VB-MAPP)'
      : 'Assessment of Basic Language and Learning Skills – Revised (ABLLS-R)';
    instrumentParagraphs.push(heading(instTitle));
    instrumentParagraphs.push(bodyParagraph(instrumentDesc));
  }

  // Graph placeholder
  instrumentParagraphs.push(emptyLine());
  instrumentParagraphs.push(bodyParagraph('[Graph placeholder – Add graph here]'));
  instrumentParagraphs.push(emptyLine());

  // Domain Narratives
  const domainParagraphs: Paragraph[] = [];
  data.domainScores.forEach((ds, i) => {
    domainParagraphs.push(heading(ds.domain, HeadingLevel.HEADING_1));
    const narrative = data.domainNarratives[ds.domain] || `${ds.domain}: ${ds.raw}/${ds.max} (${ds.percent}% mastery).`;
    domainParagraphs.push(bodyParagraph(narrative));
  });

  // Summary
  const summaryParagraphs = [
    heading('SUMMARY'),
    bodyParagraph(data.summary || ''),
  ];

  // Recommendations
  const recParagraphs: Paragraph[] = [heading('RECOMMENDATIONS')];
  if (data.recommendations.length > 0) {
    data.recommendations.forEach((rec, i) => {
      recParagraphs.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: `${i + 1}. ${rec}`, size: 22 })],
        })
      );
    });
  }

  // Signature Block
  const sigParagraphs = [
    emptyLine(),
    emptyLine(),
    new Paragraph({ children: [new TextRun({ text: `Printed Name of BCBA: ${data.bcbaName}`, size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: `NPI#: ${data.bcbaNpi}`, size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: `BCBA Certification #: ${data.bcbaCertNumber}`, size: 22 })] }),
    emptyLine(),
    new Paragraph({ children: [new TextRun({ text: 'Signature of BCBA: _____________________________________', size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: `Date: _____/ _____/ _____`, size: 22 })] }),
  ];

  // Assemble
  const doc = new Document({
    sections: [
      {
        children: [
          ...sections,
          clientTable as any,
          emptyLine(),
          heading('PROVIDER INFORMATION'),
          providerTable as any,
          emptyLine(),
          ...narrativeParagraphs,
          ...instrumentParagraphs,
          ...domainParagraphs,
          ...summaryParagraphs,
          ...recParagraphs,
          ...sigParagraphs,
        ],
      },
    ],
  });

  return doc;
}

export async function downloadAssessmentReport(data: ReportData): Promise<void> {
  const doc = buildAssessmentReport(data);
  const blob = await Packer.toBlob(doc);
  const typeLabel = data.assessmentType === 'afls'
    ? `AFLS_${(data.aflsModule || 'Module').replace(/\s+/g, '_')}`
    : data.assessmentType === 'vbmapp'
    ? 'VB-MAPP'
    : 'ABLLS-R';
  const fileName = `${data.clientInfo.clientName.replace(/\s+/g, '_')}_${typeLabel}_Report.docx`;
  saveAs(blob, fileName);
}
