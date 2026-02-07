// AFLS - Assessment of Functional Living Skills
// Static item definitions extracted from AFLS Grid AUTOMATIC Excel files
// Scoring: 0-4 per item, max score = 4

export interface AFLSSkillArea {
  code: string;
  name: string;
  itemCount: number;
}

export interface AFLSModule {
  id: string;
  name: string;
  skillAreas: AFLSSkillArea[];
}

export interface AFLSItem {
  id: string;       // e.g., "afls_bls_SM01"
  code: string;     // e.g., "SM1"
  skillAreaCode: string;
  moduleId: string;
  itemNumber: number;
  maxScore: number;  // Always 4 for AFLS
}

export const AFLS_MAX_SCORE = 4;
export const AFLS_SCORE_OPTIONS = [0, 1, 2, 3, 4] as const;

export const AFLS_MODULES: AFLSModule[] = [
  {
    id: 'bls',
    name: 'Basic Living Skills',
    skillAreas: [
      { code: 'SM', name: 'Self Management', itemCount: 25 },
      { code: 'BC', name: 'Basic Communication', itemCount: 22 },
      { code: 'DR', name: 'Dressing', itemCount: 37 },
      { code: 'TL', name: 'Toileting', itemCount: 41 },
      { code: 'GR', name: 'Grooming', itemCount: 34 },
      { code: 'BT', name: 'Bathing', itemCount: 13 },
      { code: 'HS', name: 'Health, Safety & First Aid', itemCount: 39 },
      { code: 'NR', name: 'Nighttime Routine', itemCount: 14 },
    ],
  },
  {
    id: 'hs',
    name: 'Home Skills',
    skillAreas: [
      { code: 'MH', name: 'Meals at Home', itemCount: 29 },
      { code: 'DS', name: 'Dishes', itemCount: 18 },
      { code: 'CL', name: 'Clothing & Laundry', itemCount: 30 },
      { code: 'HC', name: 'Housekeeping & Chores', itemCount: 34 },
      { code: 'HM', name: 'Household Mechanics', itemCount: 35 },
      { code: 'LS', name: 'Leisure', itemCount: 25 },
      { code: 'KT', name: 'Kitchen', itemCount: 37 },
      { code: 'CG', name: 'Cooking', itemCount: 43 },
    ],
  },
  {
    id: 'ss',
    name: 'School Skills',
    skillAreas: [
      { code: 'CM', name: 'Classroom Mechanics', itemCount: 18 },
      { code: 'MS', name: 'Meals at School', itemCount: 34 },
      { code: 'RE', name: 'Routines & Expectations', itemCount: 54 },
      { code: 'SS', name: 'Social Skills', itemCount: 35 },
      { code: 'TN', name: 'Technology', itemCount: 39 },
      { code: 'KC', name: 'Common Knowledge', itemCount: 51 },
      { code: 'CA', name: 'Core Academics', itemCount: 51 },
      { code: 'AA', name: 'Applied Academics', itemCount: 55 },
    ],
  },
  {
    id: 'vs',
    name: 'Vocational Skills',
    skillAreas: [
      { code: 'JS', name: 'Job Search', itemCount: 25 },
      { code: 'IN', name: 'Interview', itemCount: 22 },
      { code: 'BS', name: 'Basic Skills', itemCount: 44 },
      { code: 'CR', name: 'Coworker Relations', itemCount: 15 },
      { code: 'WS', name: 'Workplace Safety', itemCount: 35 },
      { code: 'FA', name: 'Fixed Activity', itemCount: 9 },
      { code: 'CC', name: 'Custodial & Cleaning', itemCount: 47 },
      { code: 'LY', name: 'Laundry', itemCount: 14 },
      { code: 'RT', name: 'Retail', itemCount: 22 },
      { code: 'SP', name: 'Support Personnel', itemCount: 6 },
      { code: 'OF', name: 'Office Skills', itemCount: 40 },
      { code: 'CP', name: 'Computer Skills', itemCount: 31 },
      { code: 'RS', name: 'Restaurant Skills', itemCount: 33 },
      { code: 'RK', name: 'Restaurant Kitchen', itemCount: 23 },
      { code: 'WH', name: 'Warehouse', itemCount: 13 },
      { code: 'TO', name: 'Tools', itemCount: 30 },
      { code: 'TC', name: 'Trades & Construction', itemCount: 40 },
      { code: 'LN', name: 'Landscaping', itemCount: 15 },
    ],
  },
  {
    id: 'cps',
    name: 'Community Participation Skills',
    skillAreas: [
      { code: 'MB', name: 'Basic Mobility', itemCount: 41 },
      { code: 'CK', name: 'Community Knowledge', itemCount: 32 },
      { code: 'SH', name: 'Shopping', itemCount: 48 },
      { code: 'EP', name: 'Eat in Public', itemCount: 27 },
      { code: 'MO', name: 'Money', itemCount: 15 },
      { code: 'PH', name: 'Phone', itemCount: 29 },
      { code: 'TS', name: 'Time', itemCount: 20 },
      { code: 'SA', name: 'Social Awareness & Manners', itemCount: 47 },
    ],
  },
  {
    id: 'ils',
    name: 'Independent Living Skills',
    skillAreas: [
      { code: 'OS', name: 'Organizational Skills', itemCount: 23 },
      { code: 'SC', name: 'Self Care', itemCount: 37 },
      { code: 'MC', name: 'Maintenance & Cleaning', itemCount: 36 },
      { code: 'MR', name: 'Mechanics & Repairs', itemCount: 21 },
      { code: 'CT', name: 'Community Travel', itemCount: 26 },
      { code: 'TR', name: 'Transportation', itemCount: 37 },
      { code: 'KA', name: 'Kitchen Tools & Appliances', itemCount: 23 },
      { code: 'FM', name: 'Food & Meal Planning', itemCount: 19 },
      { code: 'MM', name: 'Money Management', itemCount: 30 },
      { code: 'IS', name: 'Independent Shopping', itemCount: 20 },
      { code: 'PM', name: 'Personal Management', itemCount: 30 },
      { code: 'ST', name: 'Safety', itemCount: 34 },
      { code: 'PS', name: 'Problem Solving', itemCount: 19 },
      { code: 'SI', name: 'Social Interactions', itemCount: 29 },
      { code: 'LO', name: 'Living with Others', itemCount: 18 },
      { code: 'IR', name: 'Interpersonal Relationships', itemCount: 34 },
    ],
  },
];

// Generate all AFLS items from module definitions
export function generateAFLSItems(): AFLSItem[] {
  const items: AFLSItem[] = [];
  for (const mod of AFLS_MODULES) {
    for (const area of mod.skillAreas) {
      for (let i = 1; i <= area.itemCount; i++) {
        const paddedNum = i.toString().padStart(2, '0');
        items.push({
          id: `afls_${mod.id}_${area.code}${paddedNum}`,
          code: `${area.code}${i}`,
          skillAreaCode: area.code,
          moduleId: mod.id,
          itemNumber: i,
          maxScore: AFLS_MAX_SCORE,
        });
      }
    }
  }
  return items;
}

// Get items for a specific module
export function getAFLSModuleItems(moduleId: string): AFLSItem[] {
  const mod = AFLS_MODULES.find(m => m.id === moduleId);
  if (!mod) return [];
  const items: AFLSItem[] = [];
  for (const area of mod.skillAreas) {
    for (let i = 1; i <= area.itemCount; i++) {
      const paddedNum = i.toString().padStart(2, '0');
      items.push({
        id: `afls_${mod.id}_${area.code}${paddedNum}`,
        code: `${area.code}${i}`,
        skillAreaCode: area.code,
        moduleId: mod.id,
        itemNumber: i,
        maxScore: AFLS_MAX_SCORE,
      });
    }
  }
  return items;
}

// Get skill area name from code
export function getSkillAreaName(code: string): string {
  for (const mod of AFLS_MODULES) {
    const area = mod.skillAreas.find(a => a.code === code);
    if (area) return area.name;
  }
  return code;
}

// Total item count
export function getAFLSTotalItemCount(): number {
  return AFLS_MODULES.reduce(
    (total, mod) => total + mod.skillAreas.reduce((sum, area) => sum + area.itemCount, 0),
    0
  );
}
