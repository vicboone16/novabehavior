import { BehaviorDefinition } from './behavior';

// Override for editing built-in behavior definitions
export interface BehaviorDefinitionOverride {
  operationalDefinition?: string;
  category?: string;
  updatedAt: Date;
}

// Extended behavior definition for global bank (promoted from custom)
export interface GlobalBankBehavior extends BehaviorDefinition {
  promotedAt: Date;
  promotedFromStudentId?: string;
  studentCount?: number; // Number of students using this behavior
}

// Options for advanced merge
export interface AdvancedMergeOptions {
  sourceBehaviorId: string;  // Behavior to merge FROM
  targetBehaviorId: string;  // Behavior to merge INTO
  useSourceName: boolean;    // If true, rename target to source's name
  sourceName: string;        // Original name of source
  targetName: string;        // Original name of target
}

// Preview data for merge dialog
export interface MergePreview {
  sourceBehavior: {
    id: string;
    name: string;
    definition: string;
    studentCount: number;
    studentNames: string[];
  };
  targetBehavior: {
    id: string;
    name: string;
    definition: string;
    studentCount: number;
    studentNames: string[];
  };
  totalAffectedStudents: number;
  totalDataEntries: {
    frequency: number;
    duration: number;
    interval: number;
    abc: number;
  };
}
