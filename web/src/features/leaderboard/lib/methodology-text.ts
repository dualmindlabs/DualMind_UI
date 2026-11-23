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

/**
 * Turns `GET /api/leaderboard/methodology` (plain text: a title line, then blank-line separated
 * blocks) into blocks to render. The first line is the title ("... methodology (bt-v1)"), kept
 * only for the method id; a block of one short line without a closing full stop is a heading; any
 * other block is a paragraph with its line breaks folded into spaces. Pure and tolerant: it never
 * throws and an empty text gives no blocks.
 */
export function parseMethodology(text: string): ParsedMethodology {
  const blocks = text
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
  const first = blocks[0];
  if (first !== undefined && first.length === 1) {
    const title = first[0] ?? '';
    const match = /\(([A-Za-z0-9._-]+)\)\s*$/.exec(title);
    if (/methodology/i.test(title)) {
      methodId = match?.[1] ?? null;
      blocks.shift();
    }
  }

  return {
    methodId,
    blocks: blocks.map(lines => {
      const joined = lines.join(' ');
      const heading =
        lines.length === 1 && joined.length <= HEADING_MAX_LENGTH && !/[.:;]$/.test(joined);
      return { kind: heading ? 'heading' : 'paragraph', text: joined };
    }),
  };
}
