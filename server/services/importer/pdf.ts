import fs from 'fs';
import { createRequire } from 'module';

export async function extractPdfText(filePath: string): Promise<string> {
  const require = createRequire(import.meta.url);
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}
