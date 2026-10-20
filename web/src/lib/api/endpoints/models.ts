import type { Transport } from '../http/transport';
import type { CallOptions } from '../http/types';
import { pathSegment } from '../http/url';
import { modelListSchema, type ModelSummary, modelSummarySchema } from '../schemas/models';

export interface ModelEndpoints {
  /** `GET /api/models`: active models for the picker, newest first. Needs a token. */
  listModels: (options?: CallOptions) => Promise<ModelSummary[]>;
  /**
   * `GET /api/models/{id}`. The API answers 404 for every id today (KNOWN_ISSUES N7), so this
   * rejects with kind `not_found` until the route exists; use `listModels` meanwhile.
   */
  getModel: (modelId: string, options?: CallOptions) => Promise<ModelSummary>;
}

export function createModelEndpoints(transport: Transport): ModelEndpoints {
  return {
    listModels: options =>
      transport.json(
        { method: 'GET', path: '/api/models', auth: 'required', schema: modelListSchema },
        options,
      ),

    // async, so invalid input rejects the promise instead of throwing synchronously.
    getModel: async (modelId, options) =>
      await transport.json(
        {
          method: 'GET',
          path: `/api/models/${pathSegment(modelId, 'modelId')}`,
          auth: 'required',
          schema: modelSummarySchema,
        },
        options,
      ),
  };
}
