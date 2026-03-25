/**
 * Shared template state store for the Behavior Insights module.
 * Connects the SummaryTemplateBuilder output to BehaviorBreakdownSummary
 * and ClinicalSummaryEditor rendering.
 */
import { create } from 'zustand';
import type { ToneProfile } from './summaryEngine';

export interface TemplateSection {
  key: string;
  label: string;
  enabled: boolean;
  required: boolean;
  contentMode: 'auto_generated' | 'manual' | 'hybrid';
  tone: ToneProfile;
  formatStyle: 'paragraph' | 'bullets' | 'checklist' | 'card';
  promptInstructions: string;
  fallbackText: string;
}

export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, any>;
  createdAt: string;
}

interface TemplateStore {
  templateName: string;
  audienceType: string;
  sections: TemplateSection[];
  savedViews: SavedView[];

  setTemplateName: (name: string) => void;
  setAudienceType: (type: string) => void;
  setSections: (sections: TemplateSection[]) => void;
  updateSection: (key: string, updates: Partial<TemplateSection>) => void;
  addSection: (section: TemplateSection) => void;
  removeSection: (key: string) => void;
  moveSection: (key: string, direction: -1 | 1) => void;
  toggleSection: (key: string) => void;

  addSavedView: (view: SavedView) => void;
  removeSavedView: (id: string) => void;

  getEnabledSectionKeys: () => string[];
  getSectionTone: (key: string) => ToneProfile;
}

const DEFAULT_SECTIONS: TemplateSection[] = [
  { key: 'student_header', label: 'Student Header', enabled: true, required: true, contentMode: 'auto_generated', tone: 'clinical', formatStyle: 'card', promptInstructions: '', fallbackText: '' },
  { key: 'behavior_percentages', label: 'Behavior %', enabled: true, required: false, contentMode: 'auto_generated', tone: 'teacher_friendly', formatStyle: 'bullets', promptInstructions: 'Show top behavior percentages.', fallbackText: 'No data.' },
  { key: 'fba_summary', label: 'Data-Informed Summary', enabled: true, required: false, contentMode: 'hybrid', tone: 'clinical', formatStyle: 'paragraph', promptInstructions: 'Use cautious clinical phrasing.', fallbackText: 'No summary available.' },
  { key: 'escalation_chain', label: 'Escalation Pattern', enabled: true, required: false, contentMode: 'auto_generated', tone: 'clinical', formatStyle: 'paragraph', promptInstructions: '', fallbackText: '' },
  { key: 'antecedents', label: 'Antecedents', enabled: true, required: false, contentMode: 'hybrid', tone: 'clinical', formatStyle: 'paragraph', promptInstructions: '', fallbackText: '' },
  { key: 'consequences', label: 'Consequences', enabled: true, required: false, contentMode: 'hybrid', tone: 'clinical', formatStyle: 'paragraph', promptInstructions: '', fallbackText: '' },
  { key: 'replacement_skills', label: 'Replacement Skills', enabled: true, required: false, contentMode: 'hybrid', tone: 'teacher_friendly', formatStyle: 'bullets', promptInstructions: 'List 2-5 priority skills.', fallbackText: '' },
  { key: 'intervention_focus', label: 'Intervention Focus', enabled: true, required: false, contentMode: 'hybrid', tone: 'teacher_friendly', formatStyle: 'bullets', promptInstructions: 'Practical staff-facing interventions.', fallbackText: '' },
  { key: 'staff_response', label: 'Staff Response', enabled: true, required: false, contentMode: 'auto_generated', tone: 'teacher_friendly', formatStyle: 'card', promptInstructions: '', fallbackText: '' },
  { key: 'reinforcement_focus', label: 'Reinforcement Notes', enabled: false, required: false, contentMode: 'hybrid', tone: 'clinical', formatStyle: 'paragraph', promptInstructions: '', fallbackText: '' },
  { key: 'data_quality_note', label: 'Data Quality', enabled: true, required: false, contentMode: 'auto_generated', tone: 'clinical', formatStyle: 'paragraph', promptInstructions: '', fallbackText: '' },
];

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templateName: 'Default Template',
  audienceType: 'teacher',
  sections: DEFAULT_SECTIONS,
  savedViews: [],

  setTemplateName: (name) => set({ templateName: name }),
  setAudienceType: (type) => set({ audienceType: type }),
  setSections: (sections) => set({ sections }),
  
  updateSection: (key, updates) => set(state => ({
    sections: state.sections.map(s => s.key === key ? { ...s, ...updates } : s),
  })),

  addSection: (section) => set(state => ({
    sections: [...state.sections, section],
  })),

  removeSection: (key) => set(state => ({
    sections: state.sections.filter(s => s.key !== key),
  })),

  moveSection: (key, direction) => set(state => {
    const idx = state.sections.findIndex(s => s.key === key);
    if (idx < 0) return state;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= state.sections.length) return state;
    const next = [...state.sections];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    return { sections: next };
  }),

  toggleSection: (key) => set(state => ({
    sections: state.sections.map(s => s.key === key ? { ...s, enabled: !s.enabled } : s),
  })),

  addSavedView: (view) => set(state => ({
    savedViews: [...state.savedViews, view],
  })),

  removeSavedView: (id) => set(state => ({
    savedViews: state.savedViews.filter(v => v.id !== id),
  })),

  getEnabledSectionKeys: () => get().sections.filter(s => s.enabled).map(s => s.key),
  getSectionTone: (key) => get().sections.find(s => s.key === key)?.tone || 'clinical',
}));
