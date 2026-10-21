import { z } from 'zod';

import { resolveDisplayName } from '@/lib/models/display-name';

import { flag, listOf, optionalString, withAliases } from './common';

/** Providers seen today. `providerName` stays a plain string so a new provider does not break. */
export const KNOWN_PROVIDERS = ['groq', 'google', 'cloudflare'] as const;

/**
 * A readable name for a model id (`@cf/meta/llama-3.3-70b-instruct-fp8-fast` -> "Llama 3.3 70B
 * Instruct (FP8, fast)"): the curated name or a title built from the id, see lib/models.
 */
export function displayNameFromModelName(modelName: string): string {
  return resolveDisplayName(modelName);
}

/**
 * One entry of `GET /api/models` (and `GET /api/models/{id}`). `displayName` is always a readable
 * title (curated, the API's own, or built from the id); `modelName` is the raw id.
 */
export const modelSummarySchema = withAliases(
  z.object({
    modelId: z.string().min(1),
    modelName: z.string().min(1),
    displayName: optionalString,
    providerName: z.string().min(1),
    isFree: flag(false),
    status: optionalString,
  }),
  { modelId: ['id'], modelName: ['name'], providerName: ['provider'] },
).transform(model => ({
  ...model,
  displayName: resolveDisplayName(model.modelName, model.displayName),
  status: model.status ?? 'active',
}));

export const modelListSchema = listOf(modelSummarySchema);

export type ModelSummary = z.output<typeof modelSummarySchema>;
