/**
 * How a model is named for people, in one place. The API sends a `modelName` (the id the serving
 * platform uses: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`) and a `displayName` that is sometimes
 * a curated title ("Gemma 3n E2B IT") and often just the id's last segment. Every screen that
 * shows a model goes through `resolveDisplayName`; the raw id stays available (tooltips, the
 * details sheet) through `modelName`.
 *
 * Order: the curated map, then the API's `displayName` when it already reads like a title, then
 * `prettifyModelId`, which rebuilds a title from the id.
 *
 * `modelMaker` answers "who made it" (Meta, DeepSeek, Alibaba Qwen...) and `platformLabel` "who
 * serves it here" (Cloudflare Workers AI, Groq, Google AI). Both come from the id and the
 * provider key, so a new model shows a sensible maker without a code change.
 */

/** An id's last segment, lower case: `@cf/meta/llama-3.1-8b-instruct` -> `llama-3.1-8b-instruct`. */
export function modelSlug(modelName: string): string {
  return (modelName.split('/').pop() ?? modelName).trim().toLowerCase();
}

/**
 * Titles the rules below cannot produce, or where the house style differs from the id. Keyed by
 * `modelSlug`. Keep entries to genuine exceptions: everything else comes from `prettifyModelId`.
 */
export const CURATED_NAMES: Readonly<Record<string, string>> = {
  'compound': 'Compound',
  'compound-mini': 'Compound Mini',
  'gemini-2.0-flash-lite': 'Gemini 2.0 Flash-Lite',
  'gemma-sea-lion-v4-27b-it': 'Gemma SEA-LION v4 27B IT',
  'gpt-oss-20b': 'GPT OSS 20B',
  'gpt-oss-120b': 'GPT OSS 120B',
  'kimi-k2-instruct-0905': 'Kimi K2 Instruct (0905)',
  'llama-3.3-70b-instruct-fp8-fast': 'Llama 3.3 70B Instruct (FP8, fast)',
  'llama-4-scout-17b-16e-instruct': 'Llama 4 Scout 17B 16E Instruct',
  'phi-2': 'Phi-2',
  'qwen3-32b': 'Qwen3 32B',
  'qwq-32b': 'Qwen QwQ 32B',
};

const WORDS: Readonly<Record<string, string>> = {
  llama: 'Llama',
  qwen: 'Qwen',
  qwq: 'QwQ',
  deepseek: 'DeepSeek',
  gemma: 'Gemma',
  mistral: 'Mistral',
  gpt: 'GPT',
  claude: 'Claude',
  gemini: 'Gemini',
  glm: 'GLM',
  sqlcoder: 'SQLCoder',
  r1: 'R1',
  it: 'IT',
  oss: 'OSS',
  vl: 'VL',
  moe: 'MoE',
  ai: 'AI',
  instruct: 'Instruct',
  coder: 'Coder',
  chat: 'Chat',
};

/** Trailing tokens that describe how a model is served, not what it is: shown in parentheses. */
const VARIANTS: Readonly<Record<string, string>> = {
  fp4: 'FP4',
  fp8: 'FP8',
  fp16: 'FP16',
  int4: 'INT4',
  int8: 'INT8',
  awq: 'AWQ',
  gptq: 'GPTQ',
  lora: 'LoRA',
  fast: 'fast',
};

const capitalise = (word: string) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

function titleToken(token: string): string {
  const known = WORDS[token];
  if (known) return known;
  // Sizes and mixture-of-experts tags: 70b -> 70B, e2b -> E2B, a3b -> A3B, 16e -> 16E.
  if (/^(\d+(\.\d+)?b|[ea]\d+b|\d+e)$/.test(token)) return token.toUpperCase();
  // Versions and "3n"-style tags stay as written: 3.1, v0.2, 3n.
  if (/^v?\d[\d.]*n?$/.test(token)) return token;
  // A word glued to a number: qwen2.5 -> Qwen2.5, k2 -> K2.
  const glued = /^([a-z]+)(\d[\d.]*)$/.exec(token);
  if (glued) return `${WORDS[glued[1] ?? ''] ?? capitalise(glued[1] ?? '')}${glued[2] ?? ''}`;
  return capitalise(token);
}

/**
 * A readable title from a model id, for models the curated map does not know: drops the
 * `@cf/<org>/` style prefix, splits on dashes, capitalises known names (Llama, Qwen, DeepSeek,
 * Gemma, Mistral, GPT...), upper-cases sizes (70b -> 70B), and moves quantisation tags to the end
 * in parentheses: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` -> "Llama 3.3 70B Instruct (FP8, fast)".
 */
export function prettifyModelId(modelName: string): string {
  const tokens = modelSlug(modelName)
    .split('-')
    .filter(token => token !== '' && token !== 'hf');

  const variants: string[] = [];
  while (tokens.length > 1) {
    const variant = VARIANTS[tokens[tokens.length - 1] ?? ''];
    if (!variant) break;
    variants.unshift(variant);
    tokens.pop();
  }

  const title = tokens.map(titleToken).join(' ');
  if (title === '') return modelName;
  return variants.length > 0 ? `${title} (${variants.join(', ')})` : title;
}

/** True for a name written for people ("Gemma 3n E2B IT"), false for an id ("gemma-3n-e2b-it"). */
export function isHumanName(name: string | undefined | null): name is string {
  if (!name) return false;
  return /[A-Z]/.test(name) && !/[/@]/.test(name);
}

/**
 * The name to show for a model: curated, else the API's own display name when it reads like a
 * title, else a title rebuilt from the id.
 */
export function resolveDisplayName(modelName: string, apiDisplayName?: string | null): string {
  const curated = CURATED_NAMES[modelSlug(modelName)];
  if (curated) return curated;
  if (isHumanName(apiDisplayName)) return apiDisplayName.trim();
  return prettifyModelId(modelName);
}

export interface ModelMaker {
  /** A stable key for filters: `meta`, `deepseek`, `qwen`. */
  key: string;
  /** The name for people: "Meta", "DeepSeek", "Alibaba Qwen". */
  label: string;
}

const maker = (key: string, label: string): ModelMaker => ({ key, label });

/** The organisation segment of an id (`@cf/<org>/<model>`, `groq/<model>`) -> its maker. */
const MAKERS_BY_ORG: Readonly<Record<string, ModelMaker>> = {
  'meta': maker('meta', 'Meta'),
  'meta-llama': maker('meta', 'Meta'),
  'deepseek-ai': maker('deepseek', 'DeepSeek'),
  'qwen': maker('qwen', 'Alibaba Qwen'),
  'nvidia': maker('nvidia', 'NVIDIA'),
  'mistral': maker('mistral', 'Mistral'),
  'mistralai': maker('mistral', 'Mistral'),
  'google': maker('google', 'Google'),
  'moonshotai': maker('moonshot', 'Moonshot AI'),
  'zai-org': maker('zai', 'Z.ai'),
  'openai': maker('openai', 'OpenAI'),
  'defog': maker('defog', 'Defog'),
  'ibm-granite': maker('ibm', 'IBM'),
  'microsoft': maker('microsoft', 'Microsoft'),
  'aisingapore': maker('ai-singapore', 'AI Singapore'),
  'nousresearch': maker('nous', 'Nous Research'),
  'groq': maker('groq', 'Groq'),
};

/** Ids with no organisation segment (`gemma-3n-e2b-it`): the family name decides. */
const MAKERS_BY_FAMILY: ReadonlyArray<readonly [RegExp, ModelMaker]> = [
  [/^(meta-)?llama/, maker('meta', 'Meta')],
  [/^(gemma|gemini)/, maker('google', 'Google')],
  [/^(qwen|qwq)/, maker('qwen', 'Alibaba Qwen')],
  [/^(mistral|mixtral)/, maker('mistral', 'Mistral')],
  [/^deepseek/, maker('deepseek', 'DeepSeek')],
  [/^gpt/, maker('openai', 'OpenAI')],
  [/^phi/, maker('microsoft', 'Microsoft')],
  [/^claude/, maker('anthropic', 'Anthropic')],
  [/^compound/, maker('groq', 'Groq')],
  [/^glm/, maker('zai', 'Z.ai')],
  [/^kimi/, maker('moonshot', 'Moonshot AI')],
  [/^hermes/, maker('nous', 'Nous Research')],
  [/^granite/, maker('ibm', 'IBM')],
  [/^nemotron/, maker('nvidia', 'NVIDIA')],
];

const PLATFORM_LABELS: Readonly<Record<string, string>> = {
  cloudflare: 'Cloudflare Workers AI',
  groq: 'Groq',
  google: 'Google AI',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  mistral: 'Mistral',
  openrouter: 'OpenRouter',
};

/** The platform that serves a model here, from the API's provider key. */
export function platformLabel(providerName: string): string {
  const key = providerName.trim().toLowerCase();
  const known = PLATFORM_LABELS[key];
  if (known) return known;
  return key === '' ? 'Unknown' : capitalise(key);
}

/**
 * Who made the model: the organisation in the id, else the family name, else the serving
 * platform's own name (a model nobody here recognises is attributed to who serves it).
 */
export function modelMaker(modelName: string, providerName: string): ModelMaker {
  const segments = modelName.toLowerCase().split('/');
  const org = segments.length > 1 ? segments[segments.length - 2] : undefined;
  const byOrg = org === undefined ? undefined : MAKERS_BY_ORG[org];
  if (byOrg) return byOrg;
  const slug = modelSlug(modelName);
  for (const [pattern, found] of MAKERS_BY_FAMILY) {
    if (pattern.test(slug)) return found;
  }
  const key = providerName.trim().toLowerCase();
  return { key: key === '' ? 'unknown' : key, label: platformLabel(providerName) };
}

/**
 * "via Cloudflare Workers AI" for the secondary text next to a maker, or null when the maker
 * serves its own model (Google on Google AI, Groq's Compound on Groq).
 */
export function servedBy(maker: ModelMaker, platform: string): string | null {
  const makerName = maker.label.toLowerCase();
  const platformName = platform.toLowerCase();
  if (platformName === makerName || platformName.startsWith(`${makerName} `)) return null;
  return `via ${platform}`;
}
