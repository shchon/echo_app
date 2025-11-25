
export interface Improvement {
  segment: string;
  meaning: string; // Native language translation of the segment
  userVersion: string;
  betterAlternative: string;
  reason: string;
  type: 'grammar' | 'vocabulary' | 'style' | 'nuance';
}

export interface AnalysisResult {
  score: number;
  summary: string;
  strengths: string[];
  improvements: Improvement[];
}

export enum AppStep {
  INPUT_SOURCE = 'INPUT_SOURCE',
  TRANSLATING_TO_TARGET = 'TRANSLATING_TO_TARGET',
  PRACTICE_BACK_TRANSLATION = 'PRACTICE_BACK_TRANSLATION',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
}

export interface VocabularyItem {
  id: string;
  original: string;
  better: string;
  reason: string;
  context?: string; // Original source sentence
  meaning?: string; // Native language meaning
  timestamp: number;
}

export interface HistoryItem {
  id: string;
  sourceText: string;
  userBackTranslation: string;
  score: number;
  summary: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface AIConfig {
  useCustom: boolean;
  selectedPresetId: string;
  customBaseUrl?: string;
  customApiKey?: string;
  customModelName?: string;
  provider?: 'gemini' | 'openai'; 
  customAnalysisPrompt?: string; // New field for custom prompt
}
