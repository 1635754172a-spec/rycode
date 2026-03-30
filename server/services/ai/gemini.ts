import { GoogleGenAI } from '@google/genai';
import type { AIAdapter, AIMessage, AIResponse, ChatOptions } from './types.js';
import { stripToJson } from './utils.js';

export class GeminiAdapter implements AIAdapter {
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model = 'gemini-2.0-flash') {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async chat(messages: AIMessage[], options: ChatOptions = {}): Promise<AIResponse> {
    const { temperature = 0.7, maxTokens = 8192, systemPrompt, jsonMode } = options;

    // Build contents — Gemini uses user/model roles
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // Merge system messages into first user message if present
    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const effectiveSystem = systemPrompt ?? systemMsg;

    const response = await this.client.models.generateContent({
      model: this.model,
      contents,
      config: {
        ...(effectiveSystem ? { systemInstruction: effectiveSystem } : {}),
        temperature,
        maxOutputTokens: maxTokens,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    });

    const text = response.text ?? '';
    return { content: text, model: this.model, provider: 'gemini' };
  }

  async chatJSON<T = unknown>(messages: AIMessage[], options: ChatOptions = {}): Promise<T> {
    const response = await this.chat(messages, { ...options, jsonMode: true });
    try {
      return JSON.parse(stripToJson(response.content)) as T;
    } catch {
      throw new Error(`Gemini returned invalid JSON: ${response.content.slice(0, 200)}`);
    }
  }
}
