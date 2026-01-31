// Goal Deduplication and Merge Engine
// Implements goal fingerprinting and similarity matching

import {
  type ExtractedGoal,
  type DuplicateMatch,
  type ProgramArea,
  CONFIDENCE_THRESHOLDS,
  normalizeGoalText,
  generateGoalFingerprint,
  determineGoalProgramArea,
} from '@/types/documentExtraction';

// ============ Goal Similarity ============

export function calculateGoalSimilarity(goal1: string, goal2: string): number {
  const norm1 = normalizeGoalText(goal1);
  const norm2 = normalizeGoalText(goal2);
  
  if (norm1 === norm2) return 1.0;
  
  // Jaccard similarity on word sets
  const words1 = new Set(norm1.split(/\s+/));
  const words2 = new Set(norm2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  if (union.size === 0) return 0;
  
  const jaccard = intersection.size / union.size;
  
  // Also consider n-gram overlap for better accuracy
  const ngrams1 = getNgrams(norm1, 3);
  const ngrams2 = getNgrams(norm2, 3);
  
  const ngramIntersection = new Set([...ngrams1].filter(n => ngrams2.has(n)));
  const ngramUnion = new Set([...ngrams1, ...ngrams2]);
  
  const ngramSimilarity = ngramUnion.size > 0 ? ngramIntersection.size / ngramUnion.size : 0;
  
  // Weight both approaches
  return (jaccard * 0.4) + (ngramSimilarity * 0.6);
}

function getNgrams(text: string, n: number): Set<string> {
  const ngrams = new Set<string>();
  for (let i = 0; i <= text.length - n; i++) {
    ngrams.add(text.substring(i, i + n));
  }
  return ngrams;
}

// ============ Find Duplicates ============

export interface ExistingTarget {
  id: string;
  title: string;
  description?: string;
  domain_id?: string;
  mastery_criteria?: string;
  data_collection_type?: string;
  status: string;
  source_type: string;
}

export async function findDuplicateGoals(
  extractedGoal: ExtractedGoal,
  existingTargets: ExistingTarget[]
): Promise<DuplicateMatch[]> {
  const matches: DuplicateMatch[] = [];
  
  // Generate fingerprint for extracted goal
  const extractedFingerprint = await generateGoalFingerprint(extractedGoal);
  
  for (const existing of existingTargets) {
    // Skip mastered/discontinued unless specifically looking for them
    if (existing.status === 'discontinued') continue;
    
    // Calculate similarity
    const textSimilarity = calculateGoalSimilarity(
      extractedGoal.text,
      existing.title + ' ' + (existing.description || '')
    );
    
    // Generate fingerprint for existing
    const existingFingerprint = await generateGoalFingerprint({
      text: existing.title,
      domain: undefined,
      program_area: determineGoalProgramArea({ text: existing.title, domain: undefined, program_area: 'UNKNOWN', source: { page: 1, snippet: '' }, confidence: 1 }),
      measurement_type: existing.data_collection_type as ExtractedGoal['measurement_type'],
      mastery_criteria: existing.mastery_criteria,
      source: { page: 1, snippet: '' },
      confidence: 1,
    });
    
    // Check for exact match (same fingerprint)
    if (extractedFingerprint === existingFingerprint) {
      matches.push({
        existing_id: existing.id,
        match_type: 'exact',
        similarity_score: 1.0,
        differences: [],
      });
      continue;
    }
    
    // Check for near match
    if (textSimilarity >= CONFIDENCE_THRESHOLDS.GOAL_DUPLICATE) {
      const differences = findGoalDifferences(extractedGoal, existing);
      matches.push({
        existing_id: existing.id,
        match_type: 'near',
        similarity_score: textSimilarity,
        differences,
      });
      continue;
    }
    
    // Check for potential match (lower threshold)
    if (textSimilarity >= 0.65) {
      const differences = findGoalDifferences(extractedGoal, existing);
      matches.push({
        existing_id: existing.id,
        match_type: 'potential',
        similarity_score: textSimilarity,
        differences,
      });
    }
  }
  
  // Sort by similarity score
  return matches.sort((a, b) => b.similarity_score - a.similarity_score);
}

function findGoalDifferences(
  extracted: ExtractedGoal,
  existing: ExistingTarget
): Array<{ field: string; existing: string; extracted: string }> {
  const differences: Array<{ field: string; existing: string; extracted: string }> = [];
  
  // Compare key fields
  const normExtracted = normalizeGoalText(extracted.text);
  const normExisting = normalizeGoalText(existing.title);
  
  if (normExtracted !== normExisting) {
    differences.push({
      field: 'goal_text',
      existing: existing.title,
      extracted: extracted.text,
    });
  }
  
  if (extracted.mastery_criteria && existing.mastery_criteria) {
    const normExtCrit = normalizeGoalText(extracted.mastery_criteria);
    const normExCrit = normalizeGoalText(existing.mastery_criteria);
    if (normExtCrit !== normExCrit) {
      differences.push({
        field: 'mastery_criteria',
        existing: existing.mastery_criteria,
        extracted: extracted.mastery_criteria,
      });
    }
  }
  
  if (extracted.measurement_type && existing.data_collection_type) {
    if (extracted.measurement_type !== existing.data_collection_type) {
      differences.push({
        field: 'measurement_type',
        existing: existing.data_collection_type,
        extracted: extracted.measurement_type,
      });
    }
  }
  
  return differences;
}

// ============ Merge Strategies ============

export type MergeStrategy = 'keep_existing' | 'use_extracted' | 'create_version' | 'skip';

export interface MergeDecision {
  goal_id: string;
  strategy: MergeStrategy;
  merged_data?: Partial<ExtractedGoal>;
  notes?: string;
}

export function suggestMergeStrategy(
  match: DuplicateMatch,
  extractedConfidence: number,
  existingStatus: string
): MergeStrategy {
  // If existing is mastered, create a new version (don't overwrite)
  if (existingStatus === 'mastered') {
    return 'create_version';
  }
  
  // Exact matches - skip (no changes needed)
  if (match.match_type === 'exact') {
    return 'skip';
  }
  
  // Near matches with high confidence - suggest using extracted
  if (match.match_type === 'near' && extractedConfidence >= 0.9) {
    return 'use_extracted';
  }
  
  // Near matches with lower confidence - keep existing
  if (match.match_type === 'near') {
    return 'keep_existing';
  }
  
  // Potential matches should be reviewed
  return 'create_version';
}

// ============ Accommodation Normalization ============

export function normalizeAccommodation(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\\w\\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findDuplicateAccommodations(
  extracted: string[],
  existing: string[]
): { unique: string[]; duplicates: Array<{ extracted: string; existing: string }> } {
  const normalizedExisting = existing.map(e => ({
    original: e,
    normalized: normalizeAccommodation(e),
  }));
  
  const unique: string[] = [];
  const duplicates: Array<{ extracted: string; existing: string }> = [];
  
  for (const ext of extracted) {
    const normExt = normalizeAccommodation(ext);
    
    // Check for exact match
    const exactMatch = normalizedExisting.find(e => e.normalized === normExt);
    if (exactMatch) {
      duplicates.push({ extracted: ext, existing: exactMatch.original });
      continue;
    }
    
    // Check for near match
    let foundNear = false;
    for (const ex of normalizedExisting) {
      const similarity = calculateGoalSimilarity(normExt, ex.normalized);
      if (similarity >= 0.92) {
        duplicates.push({ extracted: ext, existing: ex.original });
        foundNear = true;
        break;
      }
    }
    
    if (!foundNear) {
      unique.push(ext);
    }
  }
  
  return { unique, duplicates };
}

// ============ Service Merging ============

export interface ServiceKey {
  service: string;
  provider_role: string;
  setting: string;
  frequency: string;
}

export function getServiceKey(service: {
  service: string;
  provider_role?: string;
  setting?: string;
  frequency?: string;
}): string {
  return [
    service.service.toLowerCase().trim(),
    (service.provider_role || '').toLowerCase().trim(),
    (service.setting || '').toLowerCase().trim(),
    (service.frequency || '').toLowerCase().trim(),
  ].join('|');
}

export interface ServiceMergeResult {
  action: 'create' | 'update' | 'skip';
  existingId?: string;
  changes?: Array<{ field: string; from: number | string; to: number | string }>;
  requiresReview: boolean;
}

export function compareServices(
  extracted: { service: string; minutes_per_session?: number; provider_role?: string; setting?: string; frequency?: string },
  existing: { id: string; service: string; minutes_per_session?: number; provider_role?: string; setting?: string; frequency?: string }[]
): ServiceMergeResult {
  const extKey = getServiceKey(extracted);
  
  const match = existing.find(e => getServiceKey(e) === extKey);
  
  if (!match) {
    return { action: 'create', requiresReview: false };
  }
  
  // Check if minutes differ
  if (extracted.minutes_per_session && match.minutes_per_session) {
    const diff = Math.abs(extracted.minutes_per_session - match.minutes_per_session);
    const percentChange = diff / match.minutes_per_session;
    
    if (percentChange > 0.4) {
      // Significant change - requires review
      return {
        action: 'update',
        existingId: match.id,
        changes: [{
          field: 'minutes_per_session',
          from: match.minutes_per_session,
          to: extracted.minutes_per_session,
        }],
        requiresReview: true,
      };
    } else if (diff > 0) {
      // Minor change
      return {
        action: 'update',
        existingId: match.id,
        changes: [{
          field: 'minutes_per_session',
          from: match.minutes_per_session,
          to: extracted.minutes_per_session,
        }],
        requiresReview: false,
      };
    }
  }
  
  // No changes needed
  return { action: 'skip', existingId: match.id, requiresReview: false };
}
