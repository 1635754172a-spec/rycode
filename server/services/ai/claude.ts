import type { AIAdapter, AIMessage, AIResponse, ChatOptions } from './types.js';
import { stripToJson } from './utils.js';

interface ClaudeContent { type: string; text: string; }
interface ClaudeResponseBody { content: ClaudeContent[]; model: string; }

export class ClaudeAdapter implements AIAdapter {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-5') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(messages: AIMessage[], options: ChatOptions = {}): Promise<AIResponse> {
    const { temperature = 0.7, maxTokens = 8192, systemPrompt, jsonMode } = options;

    const systemMsg = systemPrompt ?? messages.find(m => m.role === 'system')?.content;
    const filtered = messages.filter(m => m.role !== 'system');

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: maxTokens,
      temperature,
      messages: filtered.map(m => ({ role: m.role, content: m.content })),
    };
    if (systemMsg) body.system = systemMsg;
    if (jsonMode) {
      // Anthropic JSON mode: append instruction
      const last = filtered[filtered.length - 1];
      if (last) {
        body.messages = [
          ...filtered.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          { role: last.role, content: last.content + '\n\nRespond with valid JSON only, no markdown.' },
        ];
      }
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API error ${res.status}: ${err}`);
    }

    const data = await res.json() as ClaudeResponseBody;
    const content = data.content.find(c => c.type === 'text')?.text ?? '';
    return { content, model: data.model, provider: 'claude' };
  }

  async chatJSON<T = unknown>(messages: AIMessage[], options: ChatOptions = {}): Promise<T> {
    const response = await this.chat(messages, { ...options, jsonMode: true });
    try {
      return JSON.parse(stripToJson(response.content)) as T;
    } catch {
      throw new Error(`Claude returned invalid JSON: ${response.content.slice(0, 200)}`);
    }
  }
}
