type MarkdownBlock = {
  text: string;
  start: number;
  end: number;
};

type MarkdownLine = {
  start: number;
  end: number;
  contentEnd: number;
  text: string;
};

export function extractMarkdownParagraphs(markdown: string): string[] {
  return splitMarkdownBlocks(markdown)
    .filter(isParagraphBlock)
    .map((block) => block.text.trim());
}

export function replaceMarkdownParagraphAt(markdown: string, paragraphIndex: number, replacement: string): string {
  if (!Number.isInteger(paragraphIndex) || paragraphIndex < 0) {
    return markdown;
  }

  const paragraphBlocks = splitMarkdownBlocks(markdown).filter(isParagraphBlock);
  const target = paragraphBlocks[paragraphIndex];
  if (!target) {
    return markdown;
  }

  const nextParagraph = preserveMissingCitations(replacement.trim(), target.text);
  return `${markdown.slice(0, target.start)}${nextParagraph}${markdown.slice(target.end)}`;
}

function splitMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = splitMarkdownLines(markdown);
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    while (index < lines.length && !lines[index].text.trim()) {
      index += 1;
    }
    if (index >= lines.length) {
      break;
    }

    const start = lines[index].start;
    let end = lines[index].contentEnd;
    let fence: string | null = null;

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.text.trim();
      const fenceMatch = trimmed.match(/^(```|~~~)/);
      if (fenceMatch) {
        if (fence === fenceMatch[1]) {
          fence = null;
        } else if (!fence) {
          fence = fenceMatch[1];
        }
      }

      if (!fence && !trimmed) {
        break;
      }

      end = line.contentEnd;
      index += 1;
    }

    blocks.push({
      text: markdown.slice(start, end),
      start,
      end,
    });
  }

  return blocks;
}

function splitMarkdownLines(markdown: string): MarkdownLine[] {
  const lines: MarkdownLine[] = [];
  let start = 0;

  while (start < markdown.length) {
    const newlineIndex = markdown.indexOf("\n", start);
    const hasNewline = newlineIndex >= 0;
    const end = hasNewline ? newlineIndex + 1 : markdown.length;
    const contentEnd = hasNewline ? newlineIndex : markdown.length;
    lines.push({
      start,
      end,
      contentEnd,
      text: markdown.slice(start, contentEnd),
    });
    start = end;
  }

  return lines;
}

function isParagraphBlock(block: MarkdownBlock): boolean {
  const lines = block.text.split("\n");
  const firstLine = lines[0]?.trimStart() ?? "";
  const secondLine = lines[1]?.trim() ?? "";

  return !(
    /^#{1,6}\s+/.test(firstLine) ||
    /^>/.test(firstLine) ||
    /^([-+*]|\d+[.)])\s+/.test(firstLine) ||
    /^(```|~~~)/.test(firstLine) ||
    /^ {4}\S/.test(lines[0] ?? "") ||
    /^([-*_])(?:\s*\1){2,}\s*$/.test(firstLine.trim()) ||
    /^[=-]{2,}$/.test(secondLine) ||
    isTableBlock(lines)
  );
}

function isTableBlock(lines: string[]): boolean {
  if (lines.length < 2) {
    return false;
  }
  return /\|/.test(lines[0] ?? "") && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[1] ?? "");
}

function preserveMissingCitations(replacement: string, original: string): string {
  const originalCitations = Array.from(new Set(original.match(/\[SC:[a-zA-Z0-9_-]+\]/g) ?? []));
  if (originalCitations.length === 0) {
    return replacement;
  }

  const replacementCitations = new Set(replacement.match(/\[SC:[a-zA-Z0-9_-]+\]/g) ?? []);
  const missing = originalCitations.filter((citation) => !replacementCitations.has(citation));
  if (missing.length === 0) {
    return replacement;
  }

  return [replacement, missing.join(" ")].filter(Boolean).join(" ");
}
