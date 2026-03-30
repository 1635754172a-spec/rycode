import type { AIAdapter, AIMessage, AIResponse, ChatOptions } from './types.js';
import { stripToJson } from './utils.js';

interface OpenAIMessage { role: string; content: string; }
interface OpenAIChoice { message: OpenAIMessage; }
interface OpenAIResponseBody { choices: OpenAIChoice[]; model: string; }

export class OpenAIAdapter implements AIAdapter {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey: string, model = 'gpt-4o', baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
  }

  private async doChat(messages: AIMessage[], options: ChatOptions, useJsonMode: boolean): Promise<AIResponse> {
    const { temperature = 0.7, maxTokens = 8192, systemPrompt } = options;

    const msgs: OpenAIMessage[] = [];
    if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
    msgs.push(...messages.map(m => ({ role: m.role, content: m.content })));

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: msgs,
        temperature,
        max_tokens: maxTokens,
        ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }

    const data = await res.json() as OpenAIResponseBody;
    const content = data.choices[0]?.message?.content ?? '';
    return { content, model: data.model, provider: 'openai' };
  }

  async chat(messages: AIMessage[], options: ChatOptions = {}): Promise<AIResponse> {
    return this.doChat(messages, options, options.jsonMode ?? false);
  }

  async chatJSON<T = unknown>(messages: AIMessage[], options: ChatOptions = {}): Promise<T> {
    // Try with json_object mode first; fall back to plain if provider doesn't support it
    let content: string;
    try {
      const response = await this.doChat(messages, options, true);
      content = response.content;
    } catch (err: any) {
      const msg: string = err.message ?? '';
      const isJsonModeUnsupported =
        msg.includes('response_format') ||
        msg.includes('json_object') ||
        msg.includes('unknown response_format') ||
        (msg.includes('400') && msg.includes('invalid params'));
      if (!isJsonModeUnsupported) throw err;
      // Retry without json_object
      // For reasoning models (DeepSeek-R1, QwQ etc.), append an assistant prefix
      // to force the model to continue from '{' rather than generate free text
      const jsonSystemPrompt = (options.systemPrompt ?? '') +
        '\n\nCRITICAL: Output ONLY a valid JSON object. No explanations, no markdown, no text before or after the JSON.';
      const jsonMessages: AIMessage[] = [
        ...messages.map((m, i) =>
          i === messages.length - 1 && m.role === 'user'
            ? { ...m, content: m.content + '\n\nOutput only the JSON object, nothing else:' }
            : m
        ),
        // Inject assistant prefix to force JSON continuation
        { role: 'assistant' as const, content: '{' },
      ];
      const response = await this.doChat(jsonMessages, { ...options, systemPrompt: jsonSystemPrompt }, false);
      // Prepend the '{' we injected
      content = '{' + response.content;
    }
    try {
      return JSON.parse(stripToJson(content)) as T;
    } catch {
      throw new Error(`OpenAI returned invalid JSON: ${content.slice(0, 200)}`);
    }
  }
}
