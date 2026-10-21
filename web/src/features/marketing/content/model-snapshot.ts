/**
 * The first 24 models of the public leaderboard as listed on 2026-10-20 (names and providers only,
 * from `GET https://api.dualmindlab.tech/api/arena/model-stats`). The model strip starts with this
 * list so the prerendered page is not empty, labels it with its date, and swaps in the live list
 * as soon as the API answers. No numbers come from here.
 */
export const MODEL_SNAPSHOT_DATE = '20 Oct 2026';

export const MODEL_SNAPSHOT: ReadonlyArray<{ name: string; providerId: string }> = [
  { name: 'llama-3.3-70b-instruct-fp8-fast', providerId: 'cloudflare' },
  { name: 'llama-3.1-70b-instruct', providerId: 'cloudflare' },
  { name: 'deepseek-r1-distill-qwen-32b', providerId: 'cloudflare' },
  { name: 'qwq-32b', providerId: 'cloudflare' },
  { name: 'qwen2.5-coder-32b-instruct', providerId: 'cloudflare' },
  { name: 'qwen3-30b-a3b-fp8', providerId: 'cloudflare' },
  { name: 'nemotron-3-120b-a12b', providerId: 'cloudflare' },
  { name: 'mistral-small-3.1-24b-instruct', providerId: 'cloudflare' },
  { name: 'Compound Mini', providerId: 'groq' },
  { name: 'llama-3.1-8b-instruct-fast', providerId: 'cloudflare' },
  { name: 'Llama 3.1 8B Instant', providerId: 'groq' },
  { name: 'meta-llama-3-8b-instruct', providerId: 'cloudflare' },
  { name: 'Llama 3.3 70B Versatile', providerId: 'groq' },
  { name: 'gemma-sea-lion-v4-27b-it', providerId: 'cloudflare' },
  { name: 'mistral-7b-instruct-v0.2', providerId: 'cloudflare' },
  { name: 'Gemma 3n E2B IT', providerId: 'google' },
  { name: 'Gemma 3n E4B IT', providerId: 'google' },
  { name: 'llama-3.2-11b-vision-instruct', providerId: 'cloudflare' },
  { name: 'hermes-2-pro-mistral-7b', providerId: 'cloudflare' },
  { name: 'llama-3.1-8b-instruct-fp8', providerId: 'cloudflare' },
  { name: 'llama-3.1-8b-instruct-awq', providerId: 'cloudflare' },
  { name: 'Kimi K2 Instruct', providerId: 'groq' },
  { name: 'mistral-7b-instruct-v0.1', providerId: 'cloudflare' },
  { name: 'glm-4.7-flash', providerId: 'cloudflare' },
];
