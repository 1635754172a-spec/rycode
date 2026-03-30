/**
 * Strip non-JSON content from an LLM response.
 * Handles:
 * - <think>...</think> reasoning blocks (DeepSeek-R1, QwQ, etc.)
 * - ```json ... ``` markdown code fences
 * - Leading/trailing whitespace
 * - JSON embedded anywhere in mixed-content responses
 */
export function stripToJson(raw: string): string {
  let s = raw;

  // 1. Remove <think>...</think> blocks (DeepSeek-R1, QwQ reasoning models)
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // 2. Remove other XML-like thinking tags
  s = s.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  s = s.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');

  // 3. Extract from markdown code fences — only json fences, not code fences
  const jsonFenceMatch = s.match(/```json\s*([\s\S]*?)```/);
  if (jsonFenceMatch) {
    s = jsonFenceMatch[1];
  } else {
    // Try bare ``` fence only if content looks like JSON (starts with { or [)
    const bareFenceMatch = s.match(/```\s*(\{[\s\S]*?\})\s*```/);
    if (bareFenceMatch) s = bareFenceMatch[1];
  }

  s = s.trim();

  // 4. Try to extract first balanced { } block (object takes priority over array)
  if (!s.startsWith('{') && !s.startsWith('[')) {
    const objBlock = extractBalancedBlock(s, '{', '}');
    const arrBlock = extractBalancedBlock(s, '[', ']');
    s = objBlock ?? arrBlock ?? s;
  }

  // 5. Final attempt: slice from the last '{' found
  if (!s.startsWith('{') && !s.startsWith('[')) {
    const lastBrace = s.lastIndexOf('{');
    if (lastBrace !== -1) s = s.slice(lastBrace);
  }

  return s.trim();
}

/**
 * Extract the first balanced block starting with `open` char.
 * Tries each occurrence of `open` until a valid JSON is found.
 */
function extractBalancedBlock(text: string, open: string, close: string): string | null {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== open) continue;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (escape) { escape = false; continue; }
      if (c === '\\' && inString) { escape = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(i, j + 1);
          try { JSON.parse(candidate); return candidate; } catch { break; } // break inner, continue outer
        }
      }
    }
  }
  return null;
}
