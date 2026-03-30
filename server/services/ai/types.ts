export type AIProvider = 'gemini' | 'openai' | 'claude' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;   // for custom OpenAI-compatible providers
  customName?: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: AIProvider;
}

export interface AIAdapter {
  chat(messages: AIMessage[], options?: ChatOptions): Promise<AIResponse>;
  chatJSON<T = unknown>(messages: AIMessage[], options?: ChatOptions): Promise<T>;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
}

// ── Domain-specific request/response types ──────────────────

export interface OutlineGenerationRequest {
  content: string;       // raw extracted text
  sourceTitle?: string;
  targetAudience?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface GeneratedLesson {
  title: string;
  difficulty: 'EASY' | 'MID' | 'HARD' | 'ELITE';
  children?: { title: string; difficulty: 'EASY' | 'MID' | 'HARD' | 'ELITE' }[];
}

export interface GeneratedOutline {
  title: string;
  description: string;
  units: {
    title: string;
    subtitle: string;
    lessons: GeneratedLesson[];
  }[];
}

export interface ProblemGenerationRequest {
  lessonTitle: string;
  lessonContent?: string;
  difficulty: '简单' | '中等' | '困难';
  language?: string;
  weakPoints?: string[];
}

export interface GeneratedProblem {
  title: string;
  description: string;
  difficulty: '简单' | '中等' | '困难';
  starterCode: string;
  testCases: { input: string; expected: string; description: string }[];
  hints: string[];
  xp: number;
}

export interface CodeReviewRequest {
  code: string;
  language: string;
  problemTitle: string;
  problemDescription: string;
  execResult?: {
    stdout?: string;
    stderr?: string;
    status?: string;
    time?: number;
  };
}

export interface CodeReviewResult {
  score: number;          // 0-100
  grade: string;          // A+, A, B+, ...
  efficiency: number;     // 0-100
  readability: number;    // 0-100
  correctness: number;    // 0-100
  commentary: string;     // markdown
  suggestedCode: string;
  weakPoints: string[];   // topics to improve
}
