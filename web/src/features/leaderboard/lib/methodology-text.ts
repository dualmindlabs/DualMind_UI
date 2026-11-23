/** One block of the plain-text methodology: a section heading or a paragraph. */
export interface MethodologyBlock {
  kind: 'heading' | 'paragraph';
  text: string;
}

export interface ParsedMethodology {
  /** The method id from the title line, for example `bt-v1`; null when it has none. */
  methodId: string | null;
  blocks: MethodologyBlock[];
}

/** A section heading is one short line without a closing full stop ("Scale", "Few votes"). */
const HEADING_MAX_LENGTH = 40;

function isHeading(line: string): boolean {
  return line.length <= HEADING_MAX_LENGTH && !/[.:;]$/.test(line);
}

/**
 * Turns `GET /api/leaderboard/methodology` (plain text: a title line, then sections separated by
 * blank lines, each a heading line followed by its text) into blocks to render. The first line is
 * the title ("... methodology (bt-v1)"), kept only for the method id. In every block, a short first
 * line without a closing full stop is a heading (alone, or above the lines that follow it); the
 * remaining lines form one paragraph with their line breaks folded into spaces. Pure and tolerant:
 * it never throws and an empty text gives no blocks.
 */
export function parseMethodology(text: string): ParsedMethodology {
  const groups = text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map(block =>
      block
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== ''),
    )
    .filter(lines => lines.length > 0);

  let methodId: string | null = null;
  const first = groups[0];
  if (first !== undefined && first.length === 1) {
    const title = first[0] ?? '';
    if (/methodology/i.test(title)) {
      methodId = /\(([A-Za-z0-9._-]+)\)\s*$/.exec(title)?.[1] ?? null;
      groups.shift();
    }
  }

  const blocks: MethodologyBlock[] = [];
  for (const lines of groups) {
    const head = lines[0] ?? '';
    const rest = isHeading(head) ? lines.slice(1) : lines;
    if (rest.length < lines.length) blocks.push({ kind: 'heading', text: head });
    if (rest.length > 0) blocks.push({ kind: 'paragraph', text: rest.join(' ') });
  }
  return { methodId, blocks };
}
