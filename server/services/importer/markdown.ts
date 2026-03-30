import fs from 'fs';

export async function extractMarkdownText(filePath: string): Promise<string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Strip markdown syntax for AI processing, keep structure hints
  return content
    .replace(/^#{1,6}\s+/gm, '\n## ')  // normalize headings
    .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
    .replace(/\*(.+?)\*/g, '$1')        // italic
    .replace(/`{3}[\s\S]*?`{3}/g, '[CODE BLOCK]')  // code blocks
    .replace(/`(.+?)`/g, '$1')          // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .trim();
}

export function extractMarkdownTextFromString(content: string): string {
  return content
    .replace(/^#{1,6}\s+/gm, '\n## ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{3}[\s\S]*?`{3}/g, '[CODE BLOCK]')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim();
}
