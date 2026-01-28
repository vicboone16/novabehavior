import { useState, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { 
  FileText, Download, Printer, Heart, Users, 
  Lightbulb, CheckCircle2, HelpCircle, Home,
  Star, ThumbsUp, MessageCircle, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useDataStore } from '@/store/dataStore';
import { 
  Student, 
  BehaviorFunction, 
  FUNCTION_OPTIONS,
} from '@/types/behavior';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

interface ParentFriendlyFBASummaryProps {
  student?: Student;
}

// Parent-friendly function explanations
const FUNCTION_EXPLANATIONS: Record<string, {
  simple: string;
  detailed: string;
  homeStrategies: string[];
  whatYouCanDo: string[];
}> = {
  attention: {
    simple: 'Your child is trying to get noticed or connect with others.',
    detailed: 'When children engage in certain behaviors to get attention, they are communicating a need to feel seen, heard, or connected. This is a very normal and healthy need - all children want attention from the people they love! The goal is to help them learn positive ways to get the attention they need.',
    homeStrategies: [
      'Set aside special one-on-one time each day (even 10-15 minutes helps!)',
      'Catch your child being good and give specific praise ("I love how you\'re playing quietly!")',
      'Give attention before they need to ask for it',
      'When problem behavior occurs, try to stay calm and give minimal attention',
      'Teach and practice words they can use to get your attention',
    ],
    whatYouCanDo: [
      'Notice and praise positive behaviors throughout the day',
      'Create predictable routines for quality time together',
      'Teach your child to say "Watch me!" or "Can you help me?"',
      'Avoid giving long lectures when they misbehave',
    ],
  },
  escape: {
    simple: 'Your child is trying to avoid or get away from something difficult or unpleasant.',
    detailed: 'When a child tries to escape or avoid tasks, it usually means they find something too hard, too boring, or overwhelming. This is actually your child telling you they need support! We want to help them build skills to handle difficult situations and ask for help appropriately.',
    homeStrategies: [
      'Break big tasks into smaller, manageable steps',
      'Use "first-then" language (first homework, then screen time)',
      'Give choices when possible ("Do you want to do math or reading first?")',
      'Praise effort, not just completion',
      'Teach them to ask for a break or help',
    ],
    whatYouCanDo: [
      'Stay calm when they resist - avoid power struggles',
      'Offer help before frustration builds',
      'Use visual schedules showing when breaks happen',
      'Celebrate small successes along the way',
    ],
  },
  tangible: {
    simple: 'Your child is trying to get something they want.',
    detailed: 'When children engage in behaviors to get things they want, they are learning about patience, asking appropriately, and understanding that we can\'t always have everything right away. This is a skill that takes time to develop, and we can help them learn better ways to ask for and wait for things they want.',
    homeStrategies: [
      'Create a visual schedule showing when favorite items/activities are available',
      'Teach and practice asking nicely for things',
      'Use timers to show how long they need to wait',
      'Offer choices between available options',
      'Avoid giving in to tantrums - stay consistent',
    ],
    whatYouCanDo: [
      'Praise your child when they ask nicely or wait patiently',
      'Be consistent with rules about when things are available',
      'Use "first-then" (first dinner, then dessert)',
      'Practice waiting games to build patience skills',
    ],
  },
  sensory: {
    simple: 'Your child\'s behavior may be meeting a sensory need or helping them feel calm.',
    detailed: 'Some behaviors happen because they feel good or help a child regulate their body. All of us have sensory needs - some people tap their foot, twirl their hair, or need to move around. Your child may need more or different sensory input than others, and we can find safe, appropriate ways to meet those needs.',
    homeStrategies: [
      'Provide appropriate sensory activities (playdough, fidget toys, exercise)',
      'Notice patterns - when does the behavior happen most?',
      'Create a calm-down corner with sensory tools',
      'Build movement breaks into daily routines',
      'Consult with an occupational therapist if needed',
    ],
    whatYouCanDo: [
      'Offer alternative ways to get similar sensory input',
      'Provide physical activity throughout the day',
      'Keep a calm, low-stimulation space available',
      'Be patient - sensory needs are real and valid',
    ],
  },
  automatic: {
    simple: 'This behavior may happen automatically and feel good to your child.',
    detailed: 'Some behaviors happen because they provide internal satisfaction or relief, regardless of what\'s happening around the child. These behaviors can be harder to change because they\'re not influenced by attention or access to things. We focus on finding appropriate alternatives that meet the same need.',
    homeStrategies: [
      'Observe when the behavior happens most to understand triggers',
      'Provide engaging activities to reduce boredom',
      'Offer safe alternatives that might meet the same need',
      'Work with professionals for specific strategies',
      'Be patient - these behaviors take longer to change',
    ],
    whatYouCanDo: [
      'Keep your child engaged in activities they enjoy',
      'Don\'t punish or shame - it won\'t help',
      'Work closely with the school team',
      'Celebrate any reduction in the behavior',
    ],
  },
  unknown: {
    simple: 'We\'re still learning about what your child needs.',
    detailed: 'Sometimes it takes more time and observation to fully understand why a behavior is happening. Your child\'s team is working hard to gather more information so we can provide the best support possible.',
    homeStrategies: [
      'Keep notes about when the behavior happens',
      'Note what happened right before and right after',
      'Share observations with the school team',
      'Try to stay consistent with routines',
      'Be patient while we learn more',
    ],
    whatYouCanDo: [
      'Keep a simple log of behavior occurrences',
      'Communicate regularly with the school',
      'Try different positive approaches',
      'Ask questions - your input is valuable!',
    ],
  },
};

export function ParentFriendlyFBASummary({ student: propStudent }: ParentFriendlyFBASummaryProps) {
  const { students, abcEntries } = useDataStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(propStudent?.id || '');
  const [assessorName, setAssessorName] = useState('');
  const [assessorContact, setAssessorContact] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  const activeStudents = useMemo(() => 
    students.filter(s => !s.isArchived), 
    [students]
  );

  const selectedStudent = useMemo(() => 
    students.find(s => s.id === selectedStudentId),
    [students, selectedStudentId]
  );

  // Analyze data
  const analysisData = useMemo(() => {
    if (!selectedStudent) return null;

    const studentABC = abcEntries.filter(e => e.studentId === selectedStudentId);

    // Count functions
    const functionCounts = new Map<BehaviorFunction, number>();
    studentABC.forEach(entry => {
      const functions = entry.functions || ['unknown' as BehaviorFunction];
      functions.forEach(fn => {
        functionCounts.set(fn, (functionCounts.get(fn) || 0) + 1);
      });
    });

    const sortedFunctions = Array.from(functionCounts.entries())
      .map(([fn, count]) => ({ function: fn, count }))
      .sort((a, b) => b.count - a.count);

    const primaryFunction = sortedFunctions[0]?.function || 'unknown';

    return {
      primaryFunction,
      functionLabel: FUNCTION_OPTIONS.find(f => f.value === primaryFunction)?.label || 'Unknown',
      abcCount: studentABC.length,
      behaviors: selectedStudent.behaviors,
      explanation: FUNCTION_EXPLANATIONS[primaryFunction] || FUNCTION_EXPLANATIONS.unknown,
    };
  }, [selectedStudent, selectedStudentId, abcEntries]);

  const handlePrint = () => {
    const printContent = reportRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Behavior Summary for Families - ${selectedStudent?.name}</title>
        <style>
          body { 
            font-family: Georgia, 'Times New Roman', serif; 
            padding: 40px; 
            max-width: 700px; 
            margin: 0 auto; 
            line-height: 1.6;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 20px; 
            border-bottom: 3px solid #3b82f6; 
          }
          .header h1 { margin: 0 0 10px 0; font-size: 24px; color: #1e40af; }
          .header .subtitle { color: #666; font-style: italic; }
          .section { margin-bottom: 30px; }
          .section-title { 
            font-size: 18px; 
            font-weight: bold; 
            color: #1e40af; 
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
          }
          .highlight-box { 
            background: #eff6ff; 
            border-left: 4px solid #3b82f6; 
            padding: 15px 20px; 
            margin: 15px 0;
            border-radius: 0 8px 8px 0;
          }
          .strategy-list { list-style: none; padding: 0; }
          .strategy-list li { 
            padding: 10px 0 10px 30px; 
            position: relative; 
            border-bottom: 1px solid #f3f4f6;
          }
          .strategy-list li:before { 
            content: "✓"; 
            position: absolute; 
            left: 0; 
            color: #22c55e; 
            font-weight: bold;
            font-size: 16px;
          }
          .tip-box {
            background: #fef3c7;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
          }
          .tip-box .tip-title {
            font-weight: bold;
            color: #92400e;
            margin-bottom: 8px;
          }
          .contact-box {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
          }
          @media print { 
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generateWordDocument = async () => {
    if (!selectedStudent || !analysisData) return;

    const explanation = analysisData.explanation;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: '💙 Understanding Your Child\'s Behavior',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: `A Family-Friendly Summary for ${selectedStudent.name}`, italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({ text: `Prepared: ${format(new Date(), 'MMMM dd, yyyy')}`, spacing: { after: 100 } }),
          assessorName && new Paragraph({ text: `Contact: ${assessorName}${assessorContact ? ` - ${assessorContact}` : ''}`, spacing: { after: 200 } }),

          new Paragraph({
            text: 'What We Learned',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: `The main reason behind the behavior: ${analysisData.functionLabel}`,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: explanation.simple,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: explanation.detailed,
            spacing: { after: 300 },
          }),

          new Paragraph({
            text: 'Strategies for Home',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...explanation.homeStrategies.map(s => 
            new Paragraph({ text: `• ${s}`, spacing: { after: 100 } })
          ),

          new Paragraph({
            text: 'What You Can Do Today',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...explanation.whatYouCanDo.map(s => 
            new Paragraph({ text: `✓ ${s}`, spacing: { after: 100 } })
          ),

          additionalNotes && new Paragraph({
            text: 'Additional Notes',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          additionalNotes && new Paragraph({ text: additionalNotes, spacing: { after: 200 } }),

          new Paragraph({
            text: 'Questions?',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: 'We are here to help! Please reach out with any questions about your child\'s behavior plan.',
          }),
          assessorName && new Paragraph({
            text: `Contact: ${assessorName}${assessorContact ? ` - ${assessorContact}` : ''}`,
            spacing: { before: 100 },
          }),
        ].filter(Boolean) as Paragraph[],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Family_Summary_${selectedStudent.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.docx`);
    toast.success('Family summary downloaded');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Heart className="w-4 h-4" />
          Parent Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Parent-Friendly FBA Summary
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="settings" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="flex-1 overflow-auto space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeStudents.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Your Name</Label>
                <Input
                  placeholder="Assessor/Teacher name"
                  value={assessorName}
                  onChange={(e) => setAssessorName(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Contact Information</Label>
                <Input
                  placeholder="Email or phone for questions"
                  value={assessorContact}
                  onChange={(e) => setAssessorContact(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Additional Notes for Family</Label>
                <Textarea
                  placeholder="Add any personalized notes, encouragement, or specific information for this family..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[55vh]">
              <div ref={reportRef} className="p-6 bg-white text-gray-800">
                {!selectedStudent || !analysisData ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a student to preview the summary</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="header text-center border-b-4 border-blue-500 pb-4">
                      <h1 className="text-2xl font-bold text-blue-800 mb-2">
                        💙 Understanding Your Child's Behavior
                      </h1>
                      <p className="text-gray-600 italic subtitle">
                        A Family-Friendly Summary for {selectedStudent.name}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        {format(new Date(), 'MMMM dd, yyyy')}
                      </p>
                    </div>

                    {/* What We Learned */}
                    <div className="section">
                      <h2 className="section-title text-lg font-bold text-blue-800 border-b-2 border-gray-200 pb-2 mb-4 flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        What We Learned
                      </h2>
                      
                      <div className="highlight-box bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4">
                        <p className="font-medium text-blue-900 mb-2">
                          The main reason behind the behavior: {analysisData.functionLabel}
                        </p>
                        <p className="text-blue-800">{analysisData.explanation.simple}</p>
                      </div>

                      <p className="text-gray-700 leading-relaxed">
                        {analysisData.explanation.detailed}
                      </p>
                    </div>

                    {/* Behaviors */}
                    {analysisData.behaviors.length > 0 && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold text-blue-800 border-b-2 border-gray-200 pb-2 mb-4 flex items-center gap-2">
                          <MessageCircle className="w-5 h-5" />
                          Behaviors We're Working On
                        </h2>
                        <div className="space-y-2">
                          {analysisData.behaviors.map(b => (
                            <div key={b.id} className="p-3 bg-gray-50 rounded-lg">
                              <p className="font-medium">{b.name}</p>
                              {b.operationalDefinition && (
                                <p className="text-sm text-gray-600 mt-1">{b.operationalDefinition}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Home Strategies */}
                    <div className="section">
                      <h2 className="section-title text-lg font-bold text-blue-800 border-b-2 border-gray-200 pb-2 mb-4 flex items-center gap-2">
                        <Home className="w-5 h-5" />
                        Strategies for Home
                      </h2>
                      <ul className="strategy-list space-y-2">
                        {analysisData.explanation.homeStrategies.map((s, i) => (
                          <li key={i} className="flex items-start gap-3 py-2 border-b border-gray-100">
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* What You Can Do */}
                    <div className="section">
                      <div className="tip-box bg-amber-50 p-4 rounded-lg">
                        <h3 className="tip-title font-bold text-amber-800 flex items-center gap-2 mb-3">
                          <Star className="w-5 h-5" />
                          What You Can Do Today
                        </h3>
                        <ul className="space-y-2">
                          {analysisData.explanation.whatYouCanDo.map((s, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <ThumbsUp className="w-4 h-4 text-amber-600 flex-shrink-0 mt-1" />
                              <span className="text-amber-900">{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Additional Notes */}
                    {additionalNotes && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold text-blue-800 border-b-2 border-gray-200 pb-2 mb-4 flex items-center gap-2">
                          <Lightbulb className="w-5 h-5" />
                          Additional Notes
                        </h2>
                        <p className="text-gray-700 whitespace-pre-wrap">{additionalNotes}</p>
                      </div>
                    )}

                    {/* Contact */}
                    <div className="contact-box bg-gray-100 p-5 rounded-lg mt-6">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                        <HelpCircle className="w-5 h-5" />
                        Questions?
                      </h3>
                      <p className="text-gray-600 mb-3">
                        We are here to help! Please reach out with any questions about your child's behavior plan.
                      </p>
                      {assessorName && (
                        <p className="font-medium">
                          Contact: {assessorName}
                          {assessorContact && ` - ${assessorContact}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="flex-1 overflow-auto py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:border-primary/50" onClick={handlePrint}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Print Summary
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Print to share with families
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" disabled={!selectedStudent}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary/50" onClick={generateWordDocument}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download Document
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Send via email as Word doc
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" disabled={!selectedStudent}>
                    <Download className="w-4 h-4 mr-2" />
                    Download .docx
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
