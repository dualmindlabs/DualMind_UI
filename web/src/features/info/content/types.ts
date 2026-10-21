/**
 * Types for the info and legal pages (About, How it works, FAQ, Privacy, Terms, Cookies).
 *
 * The pages are plain typed data. A renderer (slice S4) turns them into React with the UI kit.
 * All text is plain text: no HTML and no Markdown. Paragraph breaks are separate blocks.
 */

/**
 * A heading with one optional "human" phrase.
 *
 * The design direction allows at most one Playfair Display italic phrase per heading (the human
 * voice). The renderer shows `text`, then `human` in italic after it. Joined with a space, the two
 * parts read as the full heading, which is also what goes into the document title and outline.
 *
 * Example: `{ text: 'Two minds,', human: 'one verdict.' }`
 */
export interface Heading {
  text: string;
  human?: string;
}

/** A run of text. */
export interface ParagraphBlock {
  type: 'paragraph';
  text: string;
}

/** A bulleted list, or a numbered list when `ordered` is true. */
export interface ListBlock {
  type: 'list';
  ordered?: boolean;
  items: readonly string[];
}

/**
 * A boxed note.
 * - `summary`: the plain-language summary at the top of a legal page.
 * - `note`: extra context the reader may want.
 * - `warning`: something the reader should not miss.
 */
export interface CalloutBlock {
  type: 'callout';
  tone: 'summary' | 'note' | 'warning';
  title?: string;
  text: string;
}

/** One question and its answer. The answer is a list of paragraphs. */
export interface FaqItemBlock {
  type: 'faq';
  question: string;
  answer: readonly string[];
}

/** An ordered sequence of steps, each with a short title and a body. */
export interface StepsBlock {
  type: 'steps';
  items: readonly { title: string; body: string }[];
}

/** Terms and their meanings (modes, vote choices, storage keys). */
export interface DefinitionListBlock {
  type: 'definitions';
  items: readonly { term: string; description: string }[];
}

export type Block =
  ParagraphBlock | ListBlock | CalloutBlock | FaqItemBlock | StepsBlock | DefinitionListBlock;

/** A titled part of a page. `id` is unique within the page and is used for anchors. */
export interface Section {
  /** Lower-case kebab-case, unique within the page. */
  id: string;
  heading: string;
  /** Optional Playfair italic phrase shown after `heading`. Same rule as `Heading.human`. */
  human?: string;
  blocks: readonly Block[];
}

/** One whole page. */
export interface PageContent {
  /** URL segment without slashes, for example `how-it-works`. */
  slug: PageSlug;
  /** Document title, without the site name. */
  title: string;
  /** Meta description, at most 155 characters. */
  description: string;
  /** Short label above the heading (shown in the mono face). */
  eyebrow: string;
  heading: Heading;
  /** Opening paragraph under the heading. */
  intro: string;
  sections: readonly Section[];
  /** Last substantive change, as an ISO date (`YYYY-MM-DD`). Set on legal pages. */
  updated?: string;
}

export type PageSlug =
  'about' | 'credits' | 'how-it-works' | 'faq' | 'privacy' | 'terms' | 'cookies';

/** Longest allowed meta description. */
export const MAX_DESCRIPTION_LENGTH = 155;
