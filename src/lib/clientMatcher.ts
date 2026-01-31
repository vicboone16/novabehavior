// Client Identity Matching Engine
// Implements client matching logic with confidence scoring

import { CONFIDENCE_THRESHOLDS, type ClientIdentity } from '@/types/documentExtraction';

// ============ Name Similarity (Jaro-Winkler) ============

function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3
  );
}

function jaroWinkler(s1: string, s2: string, prefixScale = 0.1): number {
  const jaro = jaroSimilarity(s1.toLowerCase(), s2.toLowerCase());
  
  // Common prefix (up to 4 chars)
  let prefixLength = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i].toLowerCase() === s2[i].toLowerCase()) {
      prefixLength++;
    } else {
      break;
    }
  }
  
  return jaro + prefixLength * prefixScale * (1 - jaro);
}

// ============ Date Matching ============

function parseDateFlexible(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try various date formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // ISO
    /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
    /(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // M/D/YY or M/D/YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      // Handle different date order assumptions
      const parts = match.slice(1).map(Number);
      let year: number, month: number, day: number;
      
      if (parts[0] > 1000) {
        // YYYY-MM-DD
        [year, month, day] = parts;
      } else if (parts[2] > 1000) {
        // MM/DD/YYYY
        [month, day, year] = parts;
      } else {
        // MM/DD/YY
        [month, day, year] = parts;
        year = year < 100 ? year + 2000 : year;
      }
      
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
}

function datesMatch(date1: string, date2: string): boolean {
  const d1 = parseDateFlexible(date1);
  const d2 = parseDateFlexible(date2);
  
  if (!d1 || !d2) return false;
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// ============ Client Match Scoring ============

export interface ExistingClient {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  school?: string | null;
  grade?: string | null;
}

export interface ClientMatchResult {
  client_id: string;
  match_score: number;
  match_breakdown: {
    name_score: number;
    dob_score: number;
    school_score: number;
  };
  match_method: 'exact' | 'fuzzy' | 'partial';
  confidence_level: 'high' | 'medium' | 'low';
}

export function calculateClientMatchScore(
  extracted: ClientIdentity,
  existing: ExistingClient
): ClientMatchResult {
  const breakdown = {
    name_score: 0,
    dob_score: 0,
    school_score: 0,
  };

  // Name matching (up to 0.35)
  const extractedName = extracted.full_name.toLowerCase().trim();
  const existingName = existing.name.toLowerCase().trim();
  
  // Try full name comparison
  const fullNameSimilarity = jaroWinkler(extractedName, existingName);
  
  // Also try first + last if available
  let firstLastSimilarity = 0;
  if (extracted.first_name && extracted.last_name && existing.first_name && existing.last_name) {
    const firstSim = jaroWinkler(extracted.first_name, existing.first_name);
    const lastSim = jaroWinkler(extracted.last_name, existing.last_name);
    firstLastSimilarity = (firstSim + lastSim) / 2;
  }
  
  breakdown.name_score = Math.max(fullNameSimilarity, firstLastSimilarity) * 0.35;

  // DOB matching (up to 0.55)
  if (extracted.dob && existing.date_of_birth) {
    if (datesMatch(extracted.dob, existing.date_of_birth)) {
      breakdown.dob_score = 0.55;
    }
  }

  // School matching (up to 0.10)
  if (extracted.school && existing.school) {
    const schoolSimilarity = jaroWinkler(extracted.school, existing.school);
    breakdown.school_score = schoolSimilarity * 0.10;
  }

  const totalScore = breakdown.name_score + breakdown.dob_score + breakdown.school_score;

  // Determine match method
  let matchMethod: 'exact' | 'fuzzy' | 'partial' = 'partial';
  if (fullNameSimilarity > 0.95 && breakdown.dob_score > 0) {
    matchMethod = 'exact';
  } else if (fullNameSimilarity > 0.85 || (fullNameSimilarity > 0.75 && breakdown.dob_score > 0)) {
    matchMethod = 'fuzzy';
  }

  // Determine confidence level
  let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
  if (totalScore >= CONFIDENCE_THRESHOLDS.CLIENT_MATCH_HIGH) {
    confidenceLevel = 'high';
  } else if (totalScore >= CONFIDENCE_THRESHOLDS.CLIENT_MATCH_SUGGEST) {
    confidenceLevel = 'medium';
  }

  return {
    client_id: existing.id,
    match_score: Math.round(totalScore * 100) / 100,
    match_breakdown: breakdown,
    match_method: matchMethod,
    confidence_level: confidenceLevel,
  };
}

// ============ Find Best Client Match ============

export interface ClientMatchSearchResult {
  best_match: ClientMatchResult | null;
  all_matches: ClientMatchResult[];
  should_auto_link: boolean;
  should_suggest: boolean;
  should_create_new: boolean;
}

export function findBestClientMatch(
  extracted: ClientIdentity,
  existingClients: ExistingClient[]
): ClientMatchSearchResult {
  if (existingClients.length === 0) {
    return {
      best_match: null,
      all_matches: [],
      should_auto_link: false,
      should_suggest: false,
      should_create_new: true,
    };
  }

  const matches = existingClients
    .map(client => calculateClientMatchScore(extracted, client))
    .filter(m => m.match_score > 0.3) // Filter out very low matches
    .sort((a, b) => b.match_score - a.match_score);

  const bestMatch = matches[0] || null;

  return {
    best_match: bestMatch,
    all_matches: matches.slice(0, 5), // Return top 5 matches
    should_auto_link: bestMatch ? bestMatch.match_score >= CONFIDENCE_THRESHOLDS.CLIENT_MATCH_HIGH : false,
    should_suggest: bestMatch 
      ? bestMatch.match_score >= CONFIDENCE_THRESHOLDS.CLIENT_MATCH_SUGGEST && 
        bestMatch.match_score < CONFIDENCE_THRESHOLDS.CLIENT_MATCH_HIGH
      : false,
    should_create_new: !bestMatch || bestMatch.match_score < CONFIDENCE_THRESHOLDS.CLIENT_MATCH_SUGGEST,
  };
}

// ============ Name Parser ============

export function parseFullName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: '' };
  }
  
  // Handle "Last, First" format
  if (parts[0].endsWith(',')) {
    const lastName = parts[0].slice(0, -1);
    const firstName = parts.slice(1).join(' ');
    return { first_name: firstName, last_name: lastName };
  }
  
  // Assume "First Last" or "First Middle Last"
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  
  return { first_name: firstName, last_name: lastName };
}
