// Confidence Scoring Engine for Clinical Document Extraction
// Implements the confidence scoring rules from the specification

import {
  CONFIDENCE_PENALTIES,
  CONFIDENCE_THRESHOLDS,
  type PageExtractionStats,
  type FieldConfidenceEntry,
  type ConfidenceData,
  type SourceReference,
} from '@/types/documentExtraction';

// ============ Page Confidence ============

export function calculatePageConfidence(stats: PageExtractionStats): number {
  let score = 1.0;

  // Classification penalties
  if (stats.method === 'ocr') {
    score -= CONFIDENCE_PENALTIES.SCANNED_PAGE;
  } else if (stats.method === 'hybrid') {
    score -= CONFIDENCE_PENALTIES.MIXED_PAGE;
  }

  // OCR quality penalties
  if (stats.avg_ocr_confidence < 0.65) {
    score -= CONFIDENCE_PENALTIES.OCR_LOW_65;
  } else if (stats.avg_ocr_confidence < 0.75) {
    score -= CONFIDENCE_PENALTIES.OCR_LOW_75;
  } else if (stats.avg_ocr_confidence < 0.85) {
    score -= CONFIDENCE_PENALTIES.OCR_LOW_85;
  }

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, score));
}

// ============ Field Confidence ============

export interface FieldConfidenceInput {
  fieldPath: string;
  source: SourceReference;
  evidenceType: 'labeled' | 'inferred' | 'weak';
  parseStatus: 'valid' | 'partial' | 'heuristic';
  isConsistent: boolean;
  occurrenceCount: number;
}

export function calculateFieldConfidence(input: FieldConfidenceInput): FieldConfidenceEntry {
  // Evidence Score
  let evidenceScore = 1.0;
  switch (input.evidenceType) {
    case 'labeled':
      evidenceScore = 1.0;
      break;
    case 'inferred':
      evidenceScore = 0.8;
      break;
    case 'weak':
      evidenceScore = 0.6;
      break;
  }

  // Parse Score
  let parseScore = 1.0;
  switch (input.parseStatus) {
    case 'valid':
      parseScore = 1.0;
      break;
    case 'partial':
      parseScore = 0.7;
      break;
    case 'heuristic':
      parseScore = 0.4;
      break;
  }

  // Consistency Score
  let consistencyScore = 1.0;
  if (!input.isConsistent) {
    consistencyScore = 0.3; // Conflicts detected
  } else if (input.occurrenceCount === 1) {
    consistencyScore = 0.7; // Only appears once
  }

  const score = evidenceScore * parseScore * consistencyScore;

  return {
    field_path: input.fieldPath,
    score: Math.round(score * 100) / 100,
    source: input.source,
    evidence_type: input.evidenceType,
    parse_status: input.parseStatus,
  };
}

// ============ Overall Confidence ============

export function calculateOverallConfidence(
  pageStats: PageExtractionStats[],
  fieldConfidences: FieldConfidenceEntry[]
): number {
  if (pageStats.length === 0 && fieldConfidences.length === 0) {
    return 0;
  }

  // Calculate average page confidence
  const pageConfidences = pageStats.map(calculatePageConfidence);
  const avgPageConfidence = pageConfidences.length > 0
    ? pageConfidences.reduce((a, b) => a + b, 0) / pageConfidences.length
    : 1.0;

  // Calculate weighted average of field confidences
  // Weight critical fields higher
  const criticalFields = ['$.entities.client.full_name', '$.entities.client.dob'];
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const field of fieldConfidences) {
    const weight = criticalFields.includes(field.field_path) ? 2.0 : 1.0;
    weightedSum += field.score * weight;
    totalWeight += weight;
  }
  
  const avgFieldConfidence = totalWeight > 0 ? weightedSum / totalWeight : 1.0;

  // Combine page and field confidence (60% field, 40% page)
  const overall = (avgFieldConfidence * 0.6) + (avgPageConfidence * 0.4);
  
  return Math.round(overall * 100) / 100;
}

// ============ Review Requirements ============

export interface ReviewCheckResult {
  requires_review: boolean;
  reasons: string[];
}

export function checkReviewRequirements(
  overallConfidence: number,
  fieldConfidences: FieldConfidenceEntry[],
  hasConflicts: boolean
): ReviewCheckResult {
  const reasons: string[] = [];

  // Overall confidence check
  if (overallConfidence < CONFIDENCE_THRESHOLDS.REQUIRES_REVIEW) {
    reasons.push(`Overall confidence (${Math.round(overallConfidence * 100)}%) below threshold`);
  }

  // Identity field checks
  const identityFields = ['$.entities.client.full_name', '$.entities.client.dob'];
  for (const field of fieldConfidences) {
    if (identityFields.includes(field.field_path) && field.score < 0.90) {
      reasons.push(`Identity field "${field.field_path}" has low confidence (${Math.round(field.score * 100)}%)`);
    }
  }

  // Goal/service item checks
  const goalServiceFields = fieldConfidences.filter(f => 
    f.field_path.includes('goal') || f.field_path.includes('service')
  );
  for (const field of goalServiceFields) {
    if (field.score < 0.80) {
      reasons.push(`Goal/service field "${field.field_path}" has low confidence (${Math.round(field.score * 100)}%)`);
    }
  }

  // Conflict check
  if (hasConflicts) {
    reasons.push('Conflicts detected between extracted and existing data');
  }

  return {
    requires_review: reasons.length > 0,
    reasons,
  };
}

// ============ Auto-Apply Eligibility ============

export function canAutoApply(
  overallConfidence: number,
  fieldConfidences: FieldConfidenceEntry[],
  clientMatchConfidence: number,
  hasConflicts: boolean
): boolean {
  // All conditions must be met for auto-apply
  if (overallConfidence < CONFIDENCE_THRESHOLDS.AUTO_APPLY) {
    return false;
  }
  
  if (clientMatchConfidence < CONFIDENCE_THRESHOLDS.IDENTITY_MATCH) {
    return false;
  }
  
  if (hasConflicts) {
    return false;
  }

  // Check all goal/service fields meet threshold
  const goalServiceFields = fieldConfidences.filter(f => 
    f.field_path.includes('goal') || f.field_path.includes('service')
  );
  
  for (const field of goalServiceFields) {
    if (field.score < CONFIDENCE_THRESHOLDS.SAFE_APPLY_FIELD) {
      return false;
    }
  }

  return true;
}

// ============ OCR Trigger Check ============

export function shouldTriggerOCR(pageStats: PageExtractionStats[]): boolean {
  // Check if any page has low embedded text
  const avgCharsPerPage = pageStats.reduce((sum, p) => sum + p.char_count, 0) / pageStats.length;
  if (avgCharsPerPage < 50) {
    return true;
  }

  // Check if any critical page has low confidence
  for (const page of pageStats) {
    const pageConf = calculatePageConfidence(page);
    if (pageConf < 0.80 && (page.has_tables)) {
      return true;
    }
  }

  return false;
}

// ============ Build Confidence Summary ============

export function buildConfidenceSummary(
  pageStats: PageExtractionStats[],
  fieldConfidences: FieldConfidenceEntry[],
  hasConflicts: boolean
): ConfidenceData {
  const overall = calculateOverallConfidence(pageStats, fieldConfidences);
  const reviewCheck = checkReviewRequirements(overall, fieldConfidences, hasConflicts);

  const warnings: string[] = [];
  
  // Add warnings for low-confidence pages
  for (const page of pageStats) {
    const pageConf = calculatePageConfidence(page);
    if (pageConf < 0.70) {
      warnings.push(`Page ${page.page} has low extraction confidence (${Math.round(pageConf * 100)}%)`);
    }
    if (page.method === 'ocr' && page.avg_ocr_confidence < 0.75) {
      warnings.push(`Page ${page.page} OCR quality is low (${Math.round(page.avg_ocr_confidence * 100)}%)`);
    }
  }

  // Add warnings for low-confidence fields
  for (const field of fieldConfidences) {
    if (field.score < 0.60) {
      warnings.push(`Field "${field.field_path}" has very low confidence and may be inaccurate`);
    }
  }

  return {
    overall,
    field_confidence: fieldConfidences,
    warnings,
    requires_review_reasons: reviewCheck.reasons,
    page_confidence: pageStats.map(p => ({
      page: p.page,
      score: calculatePageConfidence(p),
    })),
  };
}

// ============ Confidence Badge Helpers ============

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'critical';

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.90) return 'high';
  if (score >= 0.75) return 'medium';
  if (score >= 0.50) return 'low';
  return 'critical';
}

export function getConfidenceBadgeColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'high':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
  }
}
