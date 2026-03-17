import { useState, useEffect } from 'react';
import { User, Users, Calendar, School, GraduationCap, Briefcase, FlaskConical, Save, X, Edit2, FileText, Stethoscope, MapPin, UserCheck, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

const PRONOUN_OPTIONS = [
  'he/him',
  'she/her',
  'they/them',
  'he/they',
  'she/they',
  'other'
];

const PRIMARY_SETTING_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'school', label: 'School' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'community', label: 'Community' },
  { value: 'telehealth', label: 'Telehealth' },
];

const ACTIVATION_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_activation', label: 'Pending Activation' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'discharged', label: 'Discharged' },
];

export function StudentProfileInfo({ student, onUpdate }: StudentProfileInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [bcbaStaff, setBcbaStaff] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  
  // Basic Name Fields
  const [firstName, setFirstName] = useState(student.firstName || '');
  const [lastName, setLastName] = useState(student.lastName || '');
  const [displayName, setDisplayName] = useState(student.displayName || '');
  const [legalFirstName, setLegalFirstName] = useState(student.legalFirstName || '');
  const [legalLastName, setLegalLastName] = useState(student.legalLastName || '');
  const [pronouns, setPronouns] = useState(student.pronouns || '');
  
  // Parse date without timezone shift - treat as local date
  const formatDateForInput = (date: Date | string | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [dob, setDob] = useState(student.dateOfBirth ? formatDateForInput(new Date(student.dateOfBirth)) : '');
  const [dataCollectionStartDate, setDataCollectionStartDate] = useState(
    student.dataCollectionStartDate ? formatDateForInput(new Date(student.dataCollectionStartDate)) : ''
  );
  const [grade, setGrade] = useState(student.grade || '');
  const [school, setSchool] = useState(student.school || '');
  const [schoolName, setSchoolName] = useState(student.schoolName || '');
  const [districtName, setDistrictName] = useState(student.districtName || '');
  const [caseTypes, setCaseTypes] = useState<CaseType[]>(student.caseTypes || []);
  const [assessmentMode, setAssessmentMode] = useState(student.assessmentModeEnabled || false);
  
  // Clinical Milestones
  const [iepDate, setIepDate] = useState(formatDateForInput(student.iepDate));
  const [iepEndDate, setIepEndDate] = useState(formatDateForInput(student.iepEndDate));
  const [nextIepReviewDate, setNextIepReviewDate] = useState(formatDateForInput(student.nextIepReviewDate));
  const [fbaDate, setFbaDate] = useState(formatDateForInput(student.fbaDate));
  const [bipDate, setBipDate] = useState(formatDateForInput(student.bipDate));
  
  // Diagnoses
  const [diagnosesText, setDiagnosesText] = useState((student.diagnoses || []).join(', '));
  
  // Settings
  const [primarySetting, setPrimarySetting] = useState<string>(student.primarySetting || '');
  const [primarySupervisorStaffId, setPrimarySupervisorStaffId] = useState(student.primarySupervisorStaffId || '');
  const [midTierSupervisorStaffId, setMidTierSupervisorStaffId] = useState(student.midTierSupervisorStaffId || '');
  
  // Case Status
  const [caseOpenedDate, setCaseOpenedDate] = useState(formatDateForInput(student.caseOpenedDate));
  const [activationStatus, setActivationStatus] = useState(student.activationStatus || '');
  
  // Contact
  const [contactEmail, setContactEmail] = useState(student.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(student.contactPhone || '');
  const [clientExternalId, setClientExternalId] = useState(student.clientExternalId || '');

  // Load staff with credentials from staff_credentials table
  useEffect(() => {
    const loadStaffWithCredentials = async () => {
      // Get all approved profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, credential')
        .eq('is_approved', true);
      
      // Get verified credentials from staff_credentials
      const { data: credentials } = await supabase
        .from('staff_credentials')
        .select('user_id, credential_type, is_verified')
        .in('credential_type', ['BCBA', 'BCBA-D', 'BCaBA', 'RBT', 'QBA'])
        .eq('is_verified', true);
      
      const allProfiles = profiles || [];
      const credMap = new Map<string, string[]>();
      (credentials || []).forEach(c => {
        const existing = credMap.get(c.user_id) || [];
        existing.push(c.credential_type);
        credMap.set(c.user_id, existing);
      });
      
      // Enrich profiles with credential info
      const enriched = allProfiles.map(p => ({
        ...p,
        credentials: credMap.get(p.user_id) || (p.credential ? [p.credential] : []),
      }));
      
      setAllStaff(enriched);
      
      // BCBAs for primary supervisor
      const bcbas = enriched.filter(p => 
        p.credentials.some((c: string) => ['BCBA', 'BCBA-D', 'BCaBA'].includes(c))
      );
      setBcbaStaff(bcbas);
      
      // All staff can be mid-tier supervisors
      setSupervisors(enriched);
    };
    loadStaffWithCredentials();
  }, []);

  const toggleCaseType = (type: CaseType) => {
    setCaseTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const handleSave = () => {
    // If first/last name are set, update the main name field too
    let fullName = student.name;
    if (firstName.trim() || lastName.trim()) {
      fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    }
    
    // Parse diagnoses from comma-separated text
    const diagnosesArray = diagnosesText
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);
    
    onUpdate({
      name: fullName,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      displayName: displayName.trim() || undefined,
      legalFirstName: legalFirstName.trim() || undefined,
      legalLastName: legalLastName.trim() || undefined,
      pronouns: pronouns || undefined,
      dateOfBirth: parseDate(dob),
      dataCollectionStartDate: parseDate(dataCollectionStartDate),
      grade: grade || undefined,
      school: school || undefined,
      schoolName: schoolName || undefined,
      districtName: districtName || undefined,
      caseTypes: caseTypes.length > 0 ? caseTypes : undefined,
      assessmentModeEnabled: assessmentMode,
      iepDate: parseDate(iepDate),
      iepEndDate: parseDate(iepEndDate),
      nextIepReviewDate: parseDate(nextIepReviewDate),
      fbaDate: parseDate(fbaDate),
      bipDate: parseDate(bipDate),
      diagnoses: diagnosesArray.length > 0 ? diagnosesArray : undefined,
      primarySetting: primarySetting as Student['primarySetting'] || undefined,
      primarySupervisorStaffId: primarySupervisorStaffId || undefined,
      midTierSupervisorStaffId: midTierSupervisorStaffId || undefined,
      caseOpenedDate: parseDate(caseOpenedDate),
      activationStatus: activationStatus as Student['activationStatus'] || undefined,
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
    });
    setIsEditing(false);
    toast.success('Profile saved');
  };

  const handleCancel = () => {
    setFirstName(student.firstName || '');
    setLastName(student.lastName || '');
    setDisplayName(student.displayName || '');
    setLegalFirstName(student.legalFirstName || '');
    setLegalLastName(student.legalLastName || '');
    setPronouns(student.pronouns || '');
    setDob(student.dateOfBirth ? formatDateForInput(new Date(student.dateOfBirth)) : '');
    setDataCollectionStartDate(student.dataCollectionStartDate ? formatDateForInput(new Date(student.dataCollectionStartDate)) : '');
    setGrade(student.grade || '');
    setSchool(student.school || '');
    setSchoolName(student.schoolName || '');
    setDistrictName(student.districtName || '');
    setCaseTypes(student.caseTypes || []);
    setAssessmentMode(student.assessmentModeEnabled || false);
    setIepDate(formatDateForInput(student.iepDate));
    setIepEndDate(formatDateForInput(student.iepEndDate));
    setNextIepReviewDate(formatDateForInput(student.nextIepReviewDate));
    setFbaDate(formatDateForInput(student.fbaDate));
    setBipDate(formatDateForInput(student.bipDate));
    setDiagnosesText((student.diagnoses || []).join(', '));
    setPrimarySetting(student.primarySetting || '');
    setPrimarySupervisorStaffId(student.primarySupervisorStaffId || '');
    setMidTierSupervisorStaffId(student.midTierSupervisorStaffId || '');
    setCaseOpenedDate(formatDateForInput(student.caseOpenedDate));
    setActivationStatus(student.activationStatus || '');
    setContactEmail(student.contactEmail || '');
    setContactPhone(student.contactPhone || '');
    setIsEditing(false);
  };

  // Get age info if DOB is set
  const ageInfo = student.dateOfBirth ? calculateAge(new Date(student.dateOfBirth)) : null;
  const zodiacSign = student.dateOfBirth ? getZodiacSign(new Date(student.dateOfBirth)) : null;

  // Find supervisor names
  const getStaffName = (userId: string | undefined) => {
    if (!userId) return '';
    const s = allStaff.find(s => s.user_id === userId);
    if (!s) return '';
    const name = s.display_name || `${s.first_name || ''} ${s.last_name || ''}`.trim();
    const creds = s.credentials?.length ? ` (${s.credentials.join(', ')})` : '';
    return `${name}${creds}`;
  };
  const supervisorName = getStaffName(student.primarySupervisorStaffId);
  const midTierName = getStaffName(student.midTierSupervisorStaffId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Client Information
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
          <div className="space-y-6">
            {/* === PERSONAL INFORMATION SECTION === */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground border-b pb-1">Personal Information</h4>
              
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

              {/* Legal Names (for billing) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Legal First Name (for billing)</Label>
                  <Input
                    value={legalFirstName}
                    onChange={(e) => setLegalFirstName(e.target.value)}
                    placeholder="Legal first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Legal Last Name (for billing)</Label>
                  <Input
                    value={legalLastName}
                    onChange={(e) => setLegalLastName(e.target.value)}
                    placeholder="Legal last name"
                  />
                </div>
              </div>

              {/* Display Name & Pronouns */}
              <div className="grid grid-cols-2 gap-3">
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
                </div>
                <div className="space-y-2">
                  <Label>Pronouns</Label>
                  <Select value={pronouns} onValueChange={setPronouns}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pronouns" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRONOUN_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date of Birth & Data Start */}
              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data Collection Start Date
                    <Badge variant="outline" className="text-xs">Required</Badge>
                  </Label>
                  <Input
                    type="date"
                    value={dataCollectionStartDate}
                    onChange={(e) => setDataCollectionStartDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Grade & Primary Setting */}
              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Primary Setting
                  </Label>
                  <Select value={primarySetting} onValueChange={setPrimarySetting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select setting" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIMARY_SETTING_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* School & District */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <School className="w-4 h-4" />
                    School / Site
                  </Label>
                  <Input
                    value={school || schoolName}
                    onChange={(e) => {
                      setSchool(e.target.value);
                      setSchoolName(e.target.value);
                    }}
                    placeholder="Enter school or site name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>District</Label>
                  <Input
                    value={districtName}
                    onChange={(e) => setDistrictName(e.target.value)}
                    placeholder="School district"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Contact Email
                  </Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contact Phone
                  </Label>
                  <Input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* === CLINICAL MILESTONES SECTION === */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground border-b pb-1">Clinical Milestones</h4>
              
              {/* IEP Dates */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    IEP Start Date
                  </Label>
                  <Input
                    type="date"
                    value={iepDate}
                    onChange={(e) => setIepDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>IEP End Date</Label>
                  <Input
                    type="date"
                    value={iepEndDate}
                    onChange={(e) => setIepEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Next IEP Review</Label>
                  <Input
                    type="date"
                    value={nextIepReviewDate}
                    onChange={(e) => setNextIepReviewDate(e.target.value)}
                  />
                </div>
              </div>

              {/* FBA & BIP Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    FBA Date
                  </Label>
                  <Input
                    type="date"
                    value={fbaDate}
                    onChange={(e) => setFbaDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>BIP Date</Label>
                  <Input
                    type="date"
                    value={bipDate}
                    onChange={(e) => setBipDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Diagnoses */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  Diagnoses
                </Label>
                <Textarea
                  value={diagnosesText}
                  onChange={(e) => setDiagnosesText(e.target.value)}
                  placeholder="Enter diagnoses, separated by commas (e.g., ASD, ADHD, Anxiety)"
                  className="min-h-[60px]"
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple diagnoses with commas
                </p>
              </div>
            </div>

            {/* === CASE MANAGEMENT SECTION === */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground border-b pb-1">Case Management</h4>

              {/* Supervising BCBA */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Supervising BCBA
                  </Label>
                  <Select value={primarySupervisorStaffId} onValueChange={setPrimarySupervisorStaffId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select BCBA supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {bcbaStaff.map((s) => (
                        <SelectItem key={s.user_id} value={s.user_id}>
                          {s.display_name || `${s.first_name} ${s.last_name}`} ({s.credentials.join(', ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Mid-Tier Supervisor
                  </Label>
                  <Select value={midTierSupervisorStaffId} onValueChange={setMidTierSupervisorStaffId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Lead RBT / BCaBA (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {allStaff.filter(s => s.user_id !== primarySupervisorStaffId).map((s) => (
                        <SelectItem key={s.user_id} value={s.user_id}>
                          {s.display_name || `${s.first_name} ${s.last_name}`}
                          {s.credentials.length > 0 ? ` (${s.credentials.join(', ')})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    A Lead RBT or BCaBA who supervises day-to-day but reports to the BCBA above
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Activation Status</Label>
                  <Select value={activationStatus} onValueChange={setActivationStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVATION_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Case Opened Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Case Opened Date</Label>
                  <Input
                    type="date"
                    value={caseOpenedDate}
                    onChange={(e) => setCaseOpenedDate(e.target.value)}
                  />
                </div>
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
            </div>
          </div>
        ) : (
          /* Display Mode */
          <div className="space-y-3">
            {/* Name Info */}
            {(student.firstName || student.lastName) && (
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{student.firstName} {student.lastName}</span>
                {student.displayName && (
                  <Badge variant="outline" className="text-xs">
                    "{student.displayName}"
                  </Badge>
                )}
                {student.pronouns && (
                  <Badge variant="secondary" className="text-xs">
                    {student.pronouns}
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

            {/* Data Collection Start Date */}
            {student.dataCollectionStartDate && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Data collection since: {format(new Date(student.dataCollectionStartDate), 'MMM d, yyyy')}</span>
              </div>
            )}

            {/* Grade & Setting */}
            {(student.grade || student.primarySetting) && (
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                {student.grade && <span>{student.grade}</span>}
                {student.primarySetting && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {student.primarySetting}
                  </Badge>
                )}
              </div>
            )}

            {/* School & District */}
            {(student.school || student.schoolName || student.districtName) && (
              <div className="flex items-center gap-3 text-sm">
                <School className="w-4 h-4 text-muted-foreground" />
                <span>{student.school || student.schoolName}</span>
                {student.districtName && (
                  <span className="text-muted-foreground">({student.districtName})</span>
                )}
              </div>
            )}

            {/* Supervisors */}
            {supervisorName && (
              <div className="flex items-center gap-3 text-sm">
                <UserCheck className="w-4 h-4 text-muted-foreground" />
                <span>Supervising BCBA: {supervisorName}</span>
              </div>
            )}
            {midTierName && (
              <div className="flex items-center gap-3 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>Mid-Tier Supervisor: {midTierName}</span>
              </div>
            )}

            {/* Clinical Milestones */}
            {(student.iepDate || student.fbaDate || student.bipDate) && (
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <FileText className="w-4 h-4 text-muted-foreground" />
                {student.iepDate && (
                  <Badge variant="outline" className="text-xs">
                    IEP: {format(new Date(student.iepDate), 'MMM yyyy')}
                  </Badge>
                )}
                {student.fbaDate && (
                  <Badge variant="outline" className="text-xs">
                    FBA: {format(new Date(student.fbaDate), 'MMM yyyy')}
                  </Badge>
                )}
                {student.bipDate && (
                  <Badge variant="outline" className="text-xs">
                    BIP: {format(new Date(student.bipDate), 'MMM yyyy')}
                  </Badge>
                )}
              </div>
            )}

            {/* Diagnoses */}
            {student.diagnoses && student.diagnoses.length > 0 && (
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <Stethoscope className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {student.diagnoses.map((dx, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {dx}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info */}
            {(student.contactEmail || student.contactPhone) && (
              <div className="flex items-center gap-3 text-sm flex-wrap">
                {student.contactEmail && (
                  <>
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{student.contactEmail}</span>
                  </>
                )}
                {student.contactPhone && (
                  <>
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{student.contactPhone}</span>
                  </>
                )}
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

            {/* Activation Status */}
            {student.activationStatus && (
              <div className="flex items-center gap-3 text-sm">
                <Badge 
                  variant={student.activationStatus === 'active' ? 'default' : 'outline'}
                  className="text-xs capitalize"
                >
                  {student.activationStatus.replace('_', ' ')}
                </Badge>
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
