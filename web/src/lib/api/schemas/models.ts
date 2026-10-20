import { z } from 'zod';

import { flag, listOf, optionalString, withAliases } from './common';

/** Providers seen today. `providerName` stays a plain string so a new provider does not break. */
export const KNOWN_PROVIDERS = ['groq', 'google', 'cloudflare'] as const;

/** `modelName` can carry a provider prefix (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`). */
export function displayNameFromModelName(modelName: string): string {
  return modelName.split('/').pop() ?? modelName;
}

/** One entry of `GET /api/models` (and `GET /api/models/{id}`). Show `displayName`, never `modelName`. */
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
  displayName: model.displayName ?? displayNameFromModelName(model.modelName),
  status: model.status ?? 'active',
}));

export const modelListSchema = listOf(modelSummarySchema);

export type ModelSummary = z.output<typeof modelSummarySchema>;
