import { useState } from 'react';
import { User, Calendar, School, GraduationCap, Briefcase, FlaskConical, Save, X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Student, CaseType, CASE_TYPE_LABELS, calculateAge, getZodiacSign, ZODIAC_SYMBOLS, ZODIAC_LABELS } from '@/types/behavior';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StudentProfileInfoProps {
  student: Student;
  onUpdate: (updates: Partial<Student>) => void;
}

const CASE_TYPES: CaseType[] = ['school-based', 'fba-only', 'direct-services', 'consultation'];

const GRADE_OPTIONS = [
  'Pre-K', 'Kindergarten',
  '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade',
  '6th Grade', '7th Grade', '8th Grade',
  '9th Grade', '10th Grade', '11th Grade', '12th Grade',
  'Post-Secondary', 'Adult Services'
];

export function StudentProfileInfo({ student, onUpdate }: StudentProfileInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(student.firstName || '');
  const [lastName, setLastName] = useState(student.lastName || '');
  const [displayName, setDisplayName] = useState(student.displayName || '');
  // Parse date without timezone shift - treat as local date
  const formatDateForInput = (date: Date | string): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [dob, setDob] = useState(student.dateOfBirth ? formatDateForInput(new Date(student.dateOfBirth)) : '');
  const [grade, setGrade] = useState(student.grade || '');
  const [school, setSchool] = useState(student.school || '');
  const [caseTypes, setCaseTypes] = useState<CaseType[]>(student.caseTypes || []);
  const [assessmentMode, setAssessmentMode] = useState(student.assessmentModeEnabled || false);

  const toggleCaseType = (type: CaseType) => {
    setCaseTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSave = () => {
    // If first/last name are set, update the main name field too
    let fullName = student.name;
    if (firstName.trim() || lastName.trim()) {
      fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    }
    
    // Parse date without timezone issues - split and create local date
    let parsedDate: Date | undefined;
    if (dob) {
      const [year, month, day] = dob.split('-').map(Number);
      parsedDate = new Date(year, month - 1, day);
    }
    
    onUpdate({
      name: fullName,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      displayName: displayName.trim() || undefined,
      dateOfBirth: parsedDate,
      grade: grade || undefined,
      school: school || undefined,
      caseTypes: caseTypes.length > 0 ? caseTypes : undefined,
      assessmentModeEnabled: assessmentMode
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFirstName(student.firstName || '');
    setLastName(student.lastName || '');
    setDisplayName(student.displayName || '');
    setDob(student.dateOfBirth ? format(new Date(student.dateOfBirth), 'yyyy-MM-dd') : '');
    setGrade(student.grade || '');
    setSchool(student.school || '');
    setCaseTypes(student.caseTypes || []);
    setAssessmentMode(student.assessmentModeEnabled || false);
    setIsEditing(false);
  };

  // Get age info if DOB is set
  const ageInfo = student.dateOfBirth ? calculateAge(new Date(student.dateOfBirth)) : null;
  const zodiacSign = student.dateOfBirth ? getZodiacSign(new Date(student.dateOfBirth)) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Student Information
            {zodiacSign && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-lg cursor-help" title={ZODIAC_LABELS[zodiacSign]}>
                      {ZODIAC_SYMBOLS[zodiacSign]}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{ZODIAC_LABELS[zodiacSign]}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardTitle>
          {!isEditing ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            {/* First Name / Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Display Name
                <span className="text-xs text-muted-foreground">(for data collection)</span>
              </Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Preferred name or nickname"
              />
              <p className="text-xs text-muted-foreground">
                This name will be shown on the dashboard during data collection sessions.
              </p>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date of Birth
              </Label>
              <Input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>

            {/* Grade */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Grade
              </Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* School/Site */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <School className="w-4 h-4" />
                School / Site
              </Label>
              <Input
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="Enter school or site name"
              />
            </div>

            {/* Case Types - Multi-select */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Case Type(s)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {CASE_TYPES.map((type) => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      id={`case-${type}`}
                      checked={caseTypes.includes(type)}
                      onCheckedChange={() => toggleCaseType(type)}
                    />
                    <Label htmlFor={`case-${type}`} className="text-sm cursor-pointer">
                      {CASE_TYPE_LABELS[type]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Assessment Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-warning" />
                <div>
                  <Label className="font-medium">Assessment Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Hides long-term programming, shows FBA tools only
                  </p>
                </div>
              </div>
              <Switch
                checked={assessmentMode}
                onCheckedChange={setAssessmentMode}
              />
            </div>
          </>
        ) : (
          /* Display Mode */
          <div className="space-y-3">
            {/* Name Info */}
            {(student.firstName || student.lastName) && (
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{student.firstName} {student.lastName}</span>
                {student.displayName && (
                  <Badge variant="outline" className="text-xs">
                    "{student.displayName}"
                  </Badge>
                )}
              </div>
            )}

            {/* DOB & Age */}
            {student.dateOfBirth && ageInfo && (
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{format(new Date(student.dateOfBirth), 'MMM d, yyyy')}</span>
                <Badge variant="outline">
                  {ageInfo.years}y {ageInfo.months}m ({ageInfo.totalMonths} months)
                </Badge>
              </div>
            )}

            {/* Grade */}
            {student.grade && (
              <div className="flex items-center gap-3 text-sm">
                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                <span>{student.grade}</span>
              </div>
            )}

            {/* School */}
            {student.school && (
              <div className="flex items-center gap-3 text-sm">
                <School className="w-4 h-4 text-muted-foreground" />
                <span>{student.school}</span>
              </div>
            )}

            {/* Case Types */}
            {student.caseTypes && student.caseTypes.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {student.caseTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {CASE_TYPE_LABELS[type]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Assessment Mode */}
            {student.assessmentModeEnabled && (
              <div className="flex items-center gap-3 text-sm p-2 bg-warning/10 rounded-md">
                <FlaskConical className="w-4 h-4 text-warning" />
                <span className="text-warning font-medium">Assessment Mode Active</span>
              </div>
            )}

            {/* Empty state */}
            {!student.dateOfBirth && !student.grade && !student.school && 
             (!student.caseTypes || student.caseTypes.length === 0) &&
             !student.firstName && !student.lastName && (
              <p className="text-sm text-muted-foreground">
                No profile information set. Click Edit to add details.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
