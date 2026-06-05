import fs from 'fs';
import path from 'path';

interface ParsedPaper {
  metadata: Record<string, string>;
}

function parseMarkdownFile(fileContent: string): ParsedPaper[] {
  const sections = fileContent.split(/(?:^|\n)(?:---\s*)?# Paper Metadata\s*\n/);
  const parsedPapers: ParsedPaper[] = [];

  for (const section of sections) {
    if (!section.trim()) continue;

    const questionStartIndex = section.search(/(?:^|\n)# Question\s+/i);
    let paperPart = section;

    if (questionStartIndex !== -1) {
      paperPart = section.substring(0, questionStartIndex);
    }

    const metadata: Record<string, string> = {};
    const paperLines = paperPart.split('\n');
    for (const line of paperLines) {
      const match = line.match(/^\s*-\s*([^:]+)\s*:\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim();
        metadata[key] = val;
      }
    }

    if (Object.keys(metadata).length > 0) {
      parsedPapers.push({ metadata });
    }
  }

  return parsedPapers;
}

function main() {
  const rawQuestionsDir = path.join(process.cwd(), 'Raw Questions');
  const files = fs.readdirSync(rawQuestionsDir).filter((file) => file.endsWith('.md'));
  
  for (const file of files) {
    const filePath = path.join(rawQuestionsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseMarkdownFile(fileContent);
    console.log(`=== FILE: ${file} ===`);
    for (const paper of parsed) {
      console.log(`Subject: "${paper.metadata['Subject']}" | Code: "${paper.metadata['Subject Code']}"`);
    }
  }
}

main();
