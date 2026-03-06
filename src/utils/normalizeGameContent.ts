import { v4 as uuidv4 } from 'uuid';
import type { GameContent, GameQuestion, GameOption, GameScenario } from '@/types/behaviorLab';

/**
 * Normalizes raw DB game content (which may use a simple format)
 * into the structured GameContent format the player expects.
 *
 * DB simple format:
 *   { type: "quiz", questions: [{ prompt, options: string[], answer, rationale }], micro_tips?, instructions? }
 *
 * Expected format:
 *   { scenarios: GameScenario[], questions: GameQuestion[] }
 */
export function normalizeGameContent(raw: any): GameContent {
  if (!raw || typeof raw !== 'object') {
    return { scenarios: [], questions: [] };
  }

  // Already normalized (has structured options with id/is_correct)?
  const firstQ = raw.questions?.[0];
  if (firstQ?.question_id && firstQ?.options?.[0]?.id) {
    return raw as GameContent;
  }

  const scenarios: GameScenario[] = [];

  // If instructions exist, create a scenario from them
  if (raw.instructions) {
    scenarios.push({
      scenario_text: raw.instructions,
      behavior_description: '',
    });
  }

  // If scenarios array already exists in proper format, use them
  if (Array.isArray(raw.scenarios)) {
    for (const s of raw.scenarios) {
      if (typeof s === 'object' && s.scenario_text) {
        scenarios.push(s);
      }
    }
  }

  const questions: GameQuestion[] = [];

  if (Array.isArray(raw.questions)) {
    for (const q of raw.questions) {
      // Simple format: options is string[], answer is string, rationale is string
      if (Array.isArray(q.options) && typeof q.options[0] === 'string') {
        const options: GameOption[] = q.options.map((label: string) => ({
          id: uuidv4(),
          label,
          description: '',
          is_correct: label === q.answer,
          feedback: label === q.answer
            ? (q.rationale || 'Correct!')
            : `Not quite. The correct answer is "${q.answer}".${q.rationale ? ' ' + q.rationale : ''}`,
        }));

        questions.push({
          question_id: q.question_id || uuidv4(),
          question_type: q.question_type || inferQuestionType(q),
          prompt: q.prompt || q.question || '',
          options,
          explanation: q.rationale || q.explanation || '',
          aba_term_note: q.aba_term_note,
          lay_prompt: q.lay_prompt,
          lay_explanation: q.lay_explanation,
        });
      } else if (Array.isArray(q.options) && typeof q.options[0] === 'object') {
        // Already structured options - just ensure required fields
        const options: GameOption[] = q.options.map((o: any) => ({
          id: o.id || uuidv4(),
          label: o.label || o.text || '',
          description: o.description || '',
          is_correct: o.is_correct ?? (o.label === q.answer),
          feedback: o.feedback || '',
          lay_label: o.lay_label,
          lay_feedback: o.lay_feedback,
          function_match: o.function_match,
        }));

        questions.push({
          question_id: q.question_id || uuidv4(),
          question_type: q.question_type || inferQuestionType(q),
          prompt: q.prompt || q.question || '',
          options,
          explanation: q.explanation || q.rationale || '',
          aba_term_note: q.aba_term_note,
          lay_prompt: q.lay_prompt,
          lay_explanation: q.lay_explanation,
        });
      }
    }
  }

  // Add micro_tips as a scenario if present
  if (Array.isArray(raw.micro_tips) && raw.micro_tips.length > 0 && scenarios.length === 0) {
    scenarios.push({
      scenario_text: raw.micro_tips.join(' • '),
      behavior_description: 'Quick Tips',
      lay_language: raw.micro_tips.join(' • '),
    });
  }

  return { scenarios, questions };
}

function inferQuestionType(q: any): GameQuestion['question_type'] {
  const prompt = (q.prompt || q.question || '').toLowerCase();
  if (prompt.includes('function') || prompt.includes('why')) return 'function_id';
  if (prompt.includes('reinforce') || prompt.includes('strengthen') || prompt.includes('weaken')) return 'reinforcement';
  if (prompt.includes('replace') || prompt.includes('alternative') || prompt.includes('instead')) return 'replacement_skill';
  if (prompt.includes('consequence') || prompt.includes('what happen')) return 'consequence_match';
  return 'function_id';
}
