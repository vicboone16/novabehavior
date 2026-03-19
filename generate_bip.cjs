const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
        LevelFormat, Header, Footer, PageNumber, PageBreak } = require('docx');
const fs = require('fs');

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders,
    margins: cellMargins,
    shading: { fill: "1B3A5C", type: ShadingType.CLEAR },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial", size: 20 })] })]
  });
}

function dataCell(text, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders,
    margins: cellMargins,
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun({ text: text || "", font: "Arial", size: 20, bold: opts.bold, color: opts.color })] })]
  });
}

function sectionHeading(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 }, children: [new TextRun({ text: text.toUpperCase(), bold: true, font: "Arial", size: 28, color: "1B3A5C" })] });
}

function subHeading(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, bold: true, font: "Arial", size: 24, color: "2E5F8A" })] });
}

function bodyText(text) {
  return new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text, font: "Arial", size: 20 })] });
}

function bulletItem(text, ref = "bullets", level = 0) {
  return new Paragraph({ numbering: { reference: ref, level }, spacing: { after: 60 }, children: [new TextRun({ text, font: "Arial", size: 20 })] });
}

function exampleBox(text) {
  return new Paragraph({ spacing: { after: 80 }, indent: { left: 360 }, border: { left: { style: BorderStyle.SINGLE, size: 6, color: "2E5F8A", space: 8 } }, children: [new TextRun({ text, font: "Arial", size: 20, italics: true, color: "333333" })] });
}

function checkRow(behavior, access, attention, escape) {
  const check = (v) => v ? "\u2713" : "";
  return new TableRow({ children: [
    dataCell(behavior, 3400, { bold: true }),
    dataCell(check(access), 1987, { center: true, color: access ? "008000" : undefined }),
    dataCell(check(attention), 1987, { center: true, color: attention ? "008000" : undefined }),
    dataCell(check(escape), 1987, { center: true, color: escape ? "008000" : undefined }),
  ]});
}

function scheduleRow(beh, sched, shade) {
  return new TableRow({ children: [
    dataCell(beh, 4680, { bold: true, shading: shade }),
    dataCell(sched, 4680, { shading: shade }),
  ]});
}

function tokenRow(tokens, reinforcer, shade) {
  return new TableRow({ children: [
    dataCell(tokens, 2340, { center: true, bold: true, shading: shade }),
    dataCell(reinforcer, 7020, { shading: shade }),
  ]});
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "1B3A5C" },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "2E5F8A" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
      ]},
      { reference: "numbers", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "1B3A5C", space: 4 } }, children: [
        new TextRun({ text: "BEHAVIOR INTERVENTION PLAN", font: "Arial", size: 16, color: "999999" }),
        new TextRun({ text: "  |  ", font: "Arial", size: 16, color: "CCCCCC" }),
        new TextRun({ text: "CONFIDENTIAL", font: "Arial", size: 16, color: "CC0000", bold: true }),
      ]})]})
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: "Zeppelin Graham-Bailey \u2014 BIP \u2014 Page ", font: "Arial", size: 16, color: "999999" }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "999999" }),
      ]})]})
    },
    children: [
      // TITLE
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "BEHAVIOR INTERVENTION PLAN", bold: true, font: "Arial", size: 36, color: "1B3A5C" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "Enhanced Clinical Version", font: "Arial", size: 24, color: "2E5F8A" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1B3A5C", space: 8 } }, children: [] }),
      
      // Student info table
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 7020],
        rows: [
          new TableRow({ children: [
            dataCell("Student:", 2340, { bold: true, shading: "E8EEF4" }),
            dataCell("Zeppelin Graham-Bailey", 7020),
          ]}),
          new TableRow({ children: [
            dataCell("Placement:", 2340, { bold: true, shading: "E8EEF4" }),
            dataCell("SDC Classroom", 7020),
          ]}),
          new TableRow({ children: [
            dataCell("Date:", 2340, { bold: true, shading: "E8EEF4" }),
            dataCell(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 7020),
          ]}),
        ]
      }),

      // FUNCTION-BASED BEHAVIOR SUMMARY TABLE
      sectionHeading("Function-Based Behavior Summary"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3400, 1987, 1987, 1987],
        rows: [
          new TableRow({ children: [
            headerCell("Behavior", 3400),
            headerCell("Access", 1987),
            headerCell("Attention", 1987),
            headerCell("Escape", 1987),
          ]}),
          checkRow("Sexualized Communication", false, true, false),
          checkRow("Verbal Aggression", false, true, true),
          checkRow("Disruptive Audible Behavior", false, true, false),
          checkRow("Disruptive / Off-Task", false, false, true),
          checkRow("Tantrum", false, false, true),
          checkRow("Vocal Protest", false, false, true),
          checkRow("Non-Compliance / Task Avoidance", false, false, true),
          checkRow("Elopement", true, true, true),
        ]
      }),

      subHeading("Summary Interpretation"),
      bulletItem("Primary driver: Escape (task avoidance)"),
      bulletItem("Secondary driver: Attention"),
      bulletItem("High-risk behavior (Elopement): Multi-function (Access + Escape + Attention)"),
      bodyText(""),
      bodyText("Reinforcement and structure must outcompete escape. Attention must be delivered proactively, not after behavior. Access must be controlled with classroom-contained reinforcement."),

      // ANTECEDENT STRATEGIES
      new Paragraph({ children: [new PageBreak()] }),
      sectionHeading("Antecedent Strategies"),

      subHeading("1. Instructional Control & Structure"),
      bulletItem("Maintain predictable routine with visual schedule"),
      bulletItem("Preview transitions 2\u20135 minutes before change"),
      bulletItem("Use \u201CFirst\u2013Then\u201D language consistently"),
      bulletItem("Provide clear start and end expectations"),
      exampleBox("Example: \u201CFirst 3 problems, then music.\u201D"),

      subHeading("2. Demand Shaping (Critical for Escape Function)"),
      bulletItem("Break tasks into micro-demands"),
      bulletItem("Use behavioral momentum (easy \u2192 hard \u2192 easy)"),
      bulletItem("Reduce workload initially, then gradually increase"),
      bulletItem("Provide guided start support (do not wait for refusal)"),

      subHeading("3. Choice & Autonomy"),
      bulletItem("Offer forced choice to reduce power struggles"),
      exampleBox("\u201CDo you want to write or type?\u201D"),
      exampleBox("\u201CDo 2 now or 3 later?\u201D"),
      bodyText("Reduces vocal protest, noncompliance, and tantrum likelihood."),

      subHeading("4. Pre-Correction & Reinforcement Preview"),
      bodyText("Before every demand:"),
      exampleBox("\u201CRemember\u2014stay in class, use respectful language, finish your work \u2192 earn phone or snacks.\u201D"),
      bodyText("Directly competes with escape behavior, elopement, and attention-seeking."),

      subHeading("5. Attention Saturation (Prevention of Attention-Seeking)"),
      bodyText("Provide noncontingent attention every 3\u20135 minutes:"),
      bulletItem("Praise"),
      bulletItem("Check-ins"),
      bulletItem("Brief conversation"),
      bulletItem("Positive statements"),
      bodyText("Prevents sexualized communication, verbal aggression, and disruptive behavior."),

      subHeading("6. Reinforcement Containment (Critical for Elopement)"),
      bulletItem("ALL reinforcement is classroom-based only"),
      bulletItem("No access outside classroom for snacks, social time, or preferred items"),
      bodyText("This removes the payoff for elopement behavior."),

      subHeading("7. Pre-Scheduled Breaks"),
      bulletItem("Provide structured breaks BEFORE escalation"),
      bulletItem("Every 10\u201315 minutes initially"),
      bodyText("Break is not escape, but controlled reinforcement."),

      // CONSEQUENCE STRATEGIES
      new Paragraph({ children: [new PageBreak()] }),
      sectionHeading("Consequence Strategies (Function-Based Response System)"),
      bodyText("Core Rule: Do not reinforce the function of the behavior."),

      subHeading("1. Attention-Maintained Behaviors"),
      bodyText("Applies to: Sexualized communication, disruption, verbal aggression."),
      bulletItem("Neutral tone"),
      bulletItem("Minimal reaction"),
      bulletItem("Brief correction"),
      exampleBox("\u201CThat\u2019s not school language. Try again.\u201D"),
      bodyText("Then immediately reinforce appropriate language."),

      subHeading("2. Escape-Maintained Behaviors"),
      bodyText("Applies to: Noncompliance, tantrum, protest."),
      bulletItem("DO NOT remove demand completely"),
      bulletItem("Modify demand instead"),
      exampleBox("\u201CLet\u2019s just do 1 together.\u201D"),
      bodyText("Prevents escape reinforcement and task avoidance cycle."),

      subHeading("3. Elopement (High Priority)"),
      bodyText("Response Protocol:"),
      bulletItem("Block calmly (no emotion)"),
      bulletItem("Redirect immediately"),
      bulletItem("Offer structured choice"),
      exampleBox("\u201CStay and finish 2 or take a 2-minute break.\u201D"),
      bodyText("After return: reinforce immediately."),

      subHeading("4. Tantrum / Escalation"),
      bulletItem("Reduce verbal input"),
      bulletItem("Maintain safety"),
      bulletItem("Offer regulated break"),
      bodyText("After calm: return to task (modified if needed), reinforce compliance."),

      // REINFORCEMENT SCHEDULE MATRIX
      new Paragraph({ children: [new PageBreak()] }),
      sectionHeading("Reinforcement Schedule Matrix"),

      subHeading("Phase 1: Acquisition (Start Here)"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [
          new TableRow({ children: [headerCell("Behavior", 4680), headerCell("Schedule", 4680)] }),
          scheduleRow("Task completion", "FR1 (every success)"),
          scheduleRow("Staying in class", "FR1 (every success)", "F5F8FA"),
          scheduleRow("Appropriate language", "FR1 (every success)"),
          scheduleRow("Break request", "FR1 (every success)", "F5F8FA"),
        ]
      }),
      bodyText("Reinforce EVERYTHING appropriate during acquisition phase."),

      subHeading("Phase 2: Stabilization"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [
          new TableRow({ children: [headerCell("Behavior", 4680), headerCell("Schedule", 4680)] }),
          scheduleRow("Task completion", "FR2"),
          scheduleRow("Staying in class", "Every 3\u20135 minutes", "F5F8FA"),
          scheduleRow("Appropriate language", "Intermittent"),
        ]
      }),

      subHeading("Phase 3: Maintenance"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [
          new TableRow({ children: [headerCell("Behavior", 4680), headerCell("Schedule", 4680)] }),
          scheduleRow("Task completion", "VR2\u2013VR3"),
          scheduleRow("Behavior regulation", "VR schedule", "F5F8FA"),
        ]
      }),

      // TOKEN ECONOMY
      sectionHeading("Token Economy System"),
      subHeading("Earning Tokens"),
      bulletItem("Staying in classroom"),
      bulletItem("Completing work"),
      bulletItem("Using appropriate language"),
      bulletItem("Requesting help or break"),

      subHeading("Exchange Menu"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 7020],
        rows: [
          new TableRow({ children: [headerCell("Tokens", 2340), headerCell("Reinforcer", 7020)] }),
          tokenRow("2", "Music"),
          tokenRow("3", "Phone", "F5F8FA"),
          tokenRow("4", "Snack"),
          tokenRow("5", "Game", "F5F8FA"),
          tokenRow("6", "Social / Free Time"),
        ]
      }),

      subHeading("Bonus Reinforcement"),
      bulletItem("\u201CMystery reward\u201D"),
      bulletItem("Double tokens for strong compliance blocks"),
      bulletItem("\u201CBeat your last score\u201D system"),

      // REPLACEMENT BEHAVIOR PLAN
      new Paragraph({ children: [new PageBreak()] }),
      sectionHeading("Replacement Behavior Plan"),
      bodyText("The following replacement behaviors must be explicitly taught, modeled, prompted, and reinforced immediately:"),

      subHeading("1. Break Request"),
      bulletItem("\u201CCan I take a break?\u201D"),
      bulletItem("Break card"),

      subHeading("2. Help Request"),
      bulletItem("\u201CI need help\u201D"),
      bulletItem("\u201CThis is hard\u201D"),

      subHeading("3. Attention Request"),
      bulletItem("Raise hand"),
      bulletItem("Ask appropriately"),

      // STAFF IMPLEMENTATION PROTOCOL
      sectionHeading("Staff Implementation Protocol"),

      subHeading("1. Be Consistent"),
      bulletItem("Same language across all staff"),
      bulletItem("Same expectations"),
      bulletItem("Same reinforcement system"),

      subHeading("2. Reinforce More Than Correct"),
      bodyText("Goal ratio: 4:1 positive to correction."),

      subHeading("3. Avoid Power Struggles"),
      bulletItem("Use choices"),
      bulletItem("Avoid arguing"),
      bulletItem("Keep tone neutral"),

      subHeading("4. Catch Early Signs"),
      bodyText("Early signs: off-task, talking, refusal."),
      bodyText("Intervene EARLY, not after escalation."),

      // ELOPEMENT SAFETY PROTOCOL
      sectionHeading("Elopement Safety Protocol (IEP Critical)"),
      bulletItem("Student must be within visual supervision at all times"),
      bulletItem("Staff positioned near exit during high-risk times"),
      bulletItem("Immediate response to movement toward exit"),
      bulletItem("No unsupervised transitions"),
      bulletItem("Reinforce staying in class and returning immediately"),

      // DATA COLLECTION PLAN
      new Paragraph({ children: [new PageBreak()] }),
      sectionHeading("Data Collection Plan"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [
          new TableRow({ children: [headerCell("Behavior", 4680), headerCell("Measurement", 4680)] }),
          scheduleRow("Elopement", "Frequency"),
          scheduleRow("Verbal aggression", "Frequency", "F5F8FA"),
          scheduleRow("Sexualized communication", "Frequency"),
          scheduleRow("Noncompliance", "Frequency", "F5F8FA"),
          scheduleRow("Tantrum", "Frequency"),
          scheduleRow("Replacement behaviors", "Frequency", "F5F8FA"),
        ]
      }),

      // PROGRESS MONITORING GOALS
      sectionHeading("Progress Monitoring Goals"),
      bulletItem("80% reduction in elopement"),
      bulletItem("70\u201380% reduction in verbal aggression"),
      bulletItem("4/5 appropriate break requests"),
      bulletItem("Increased task completion"),

      // CLINICAL SUMMARY
      sectionHeading("Clinical Summary (IEP-Ready Language)"),
      bodyText("The student\u2019s behaviors are primarily maintained by escape from academic demands, with secondary functions of attention and access to preferred items. Intervention focuses on increasing structured reinforcement, teaching functional communication, and ensuring that appropriate behaviors are consistently reinforced while problem behaviors no longer result in access to escape, attention, or tangible reinforcement."),
      bodyText(""),
      bodyText("The reinforcement schedule follows a three-phase model (Acquisition \u2192 Stabilization \u2192 Maintenance) to systematically shape and sustain replacement behaviors. The elopement safety protocol ensures student safety while maintaining the integrity of the reinforcement containment strategy. All staff are expected to implement with fidelity using consistent language, proactive attention delivery, and a minimum 4:1 positive-to-correction ratio."),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/mnt/documents/Zeppelin_Graham-Bailey_BIP.docx", buffer);
  console.log("DOCX written:", buffer.length, "bytes");
});
